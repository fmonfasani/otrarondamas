import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { CreateCompraDto } from './dto/create-compra.dto';
import { RecibirCompraDto } from './dto/recibir-compra.dto';
import { CrearPagoProveedorDto } from './dto/crear-pago-proveedor.dto';
import { CrearDevolucionProveedorDto } from './dto/crear-devolucion-proveedor.dto';

// Mismo patrón que ventas.service.ts / inventario.service.ts: el
// cliente de EmpresaScopedPrismaService.forEmpresa() es un tipo
// dinámico generado por Prisma Client Extensions, no calza con
// Prisma.TransactionClient del cliente base.
type EmpresaScopedClient = ReturnType<EmpresaScopedPrismaService['forEmpresa']>;
type EmpresaScopedTx = Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0];

/**
 * RF-12 (compras y proveedores), Fase 1 del alcance acordado: CRUD de
 * Proveedor, crear/emitir una Compra, y confirmar su recepción (total o
 * parcial) generando Lote + MovimientoStock reales.
 *
 * Fuera de esta fase (ver docs/scaffolding-notas.md): pagos a
 * proveedor, adjuntar facturas/documentación, devoluciones a
 * proveedor. RF-12 pide "mantener historial de costos por producto y
 * compra" — CompraItem.costoUnitario ya lo registra, no se agrega
 * nada aparte todavía.
 */
@Injectable()
export class ComprasService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  // --- Proveedores -------------------------------------------------

  async listarProveedores(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.proveedor.findMany({ orderBy: { nombre: 'asc' } });
  }

  async crearProveedor(empresaId: string, dto: CreateProveedorDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    // Prisma.ProveedorUncheckedCreateInput explícito: sin esta
    // anotación, a través del tipo genérico que devuelve
    // empresaScopeExtension, TypeScript no logra resolver el
    // Exact<XOR<...>> que Prisma exige para `create` (mismo patrón que
    // catalogo.controller.ts con Producto). empresaId igual se pasa acá
    // (redundante con lo que el extension inyecta, pero mismo criterio
    // ya usado en ventas.service.ts: más explícito en código que
    // termina en la base, menos "confiar en la magia del extension").
    const data: Prisma.ProveedorUncheckedCreateInput = { ...dto, empresaId };
    return db.proveedor.create({ data });
  }

  async actualizarProveedor(empresaId: string, id: string, dto: UpdateProveedorDto) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const existente = await db.proveedor.findUnique({ where: { id } });
    if (!existente) {
      throw new NotFoundException('Proveedor no encontrado');
    }
    return db.proveedor.update({ where: { id }, data: dto });
  }

  // --- Compras -------------------------------------------------------

  async listarCompras(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.compra.findMany({
      include: { items: true, proveedor: true },
      orderBy: { fechaOrden: 'desc' },
    });
  }

  async getCompra(empresaId: string, id: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const compra = await db.compra.findUnique({
      where: { id },
      include: { items: true, proveedor: true, recepciones: true },
    });
    if (!compra) {
      throw new NotFoundException('Compra no encontrada');
    }
    return compra;
  }

  /**
   * Crea la orden de compra en estado BORRADOR. No reserva ni modifica
   * stock — eso ocurre recién en recibirCompra(). Igual que
   * VentasService.create(), los productos se resuelven ANTES de la
   * transacción para poder validar el pedido completo de una vez.
   *
   * TODO: no valida productoId duplicado dentro de dto.items — una
   * Compra con dos CompraItem del mismo producto es válida hoy en el
   * schema (sin @@unique([compraId, productoId])) pero no tiene un caso
   * de uso claro y complica recibirCompra() al no poder asumir "un
   * producto, un item". No se agrega la restricción sin confirmar que
   * de verdad no hace falta permitirlo (ej. dos lotes distintos del
   * mismo producto en una sola orden).
   */
  async crearCompra(empresaId: string, dto: CreateCompraDto, usuarioId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const proveedor = await db.proveedor.findUnique({ where: { id: dto.proveedorId } });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const productoIds = [...new Set(dto.items.map((i) => i.productoId))];
    const productos = await db.producto.findMany({ where: { id: { in: productoIds } } });
    const productoIdsExistentes = new Set(productos.map((p) => p.id));
    for (const item of dto.items) {
      if (!productoIdsExistentes.has(item.productoId)) {
        throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
      }
    }

    const total = dto.items.reduce(
      (acc, item) => acc + item.cantidadPedida * item.costoUnitario,
      0,
    );

    const data: Prisma.CompraUncheckedCreateInput = {
      empresaId,
      proveedorId: dto.proveedorId,
      usuarioId,
      estado: 'BORRADOR',
      total,
      fechaRecepcionEsperada: dto.fechaRecepcionEsperada,
      items: {
        create: dto.items.map((item) => ({
          productoId: item.productoId,
          cantidadPedida: item.cantidadPedida,
          costoUnitario: item.costoUnitario,
        })),
      },
    };
    return db.compra.create({ data, include: { items: true } });
  }

  /**
   * BORRADOR -> EMITIDA. Paso explícito y separado de crearCompra():
   * una orden en borrador todavía se puede revisar/corregir (no hay
   * endpoint de edición todavía, pero el estado lo deja preparado) antes
   * de considerarla enviada al proveedor. Solo una Compra en BORRADOR
   * puede emitirse — no tiene sentido re-emitir una ya emitida o
   * recibida.
   */
  async emitirCompra(empresaId: string, id: string) {
    const compra = await this.getCompra(empresaId, id);
    if (compra.estado !== 'BORRADOR') {
      throw new BadRequestException(
        `Solo se puede emitir una compra en estado BORRADOR (actual: ${compra.estado})`,
      );
    }
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.compra.update({ where: { id }, data: { estado: 'EMITIDA' } });
  }

  /**
   * Confirma la recepción de mercadería (RF-12: "recibir mercadería
   * total o parcialmente... el ingreso físico debe actualizar el stock
   * cuando la recepción sea confirmada"). Por cada item recibido:
   * - Valida que no se reciba más de lo que falta (cantidadPedida -
   *   cantidadRecibida acumulada de recepciones anteriores) — D-10:
   *   "diferencias de recepción quedan identificadas", no se permite
   *   una recepción que deje cantidadRecibida > cantidadPedida sin que
   *   eso sea una decisión de negocio aparte (no implementada).
   * - Crea un Lote nuevo con los datos declarados en el DTO.
   * - Crea un MovimientoStock tipo Entrada, motivo Compra, vinculado a
   *   la RecepcionCompra (mismo mecanismo que VentasService usa para
   *   Salida/Venta — no se duplica lógica de movimiento de stock).
   * - Actualiza CompraItem.cantidadRecibida (acumulado).
   * - Recalcula Compra.estado: RECIBIDA si todos los items están
   *   completos, RECEPCION_PARCIAL si falta alguno.
   *
   * Todo dentro de una única $transaction — una recepción parcial en
   * cantidad de items nunca debe dejar el stock y el estado de la
   * compra desincronizados entre sí.
   */
  async recibirCompra(
    empresaId: string,
    compraId: string,
    dto: RecibirCompraDto,
    usuarioId: string,
  ) {
    const compra = await this.getCompra(empresaId, compraId);
    if (compra.estado !== 'EMITIDA' && compra.estado !== 'RECEPCION_PARCIAL') {
      throw new BadRequestException(
        `No se puede recibir mercadería de una compra en estado ${compra.estado}`,
      );
    }

    const itemsPorId = new Map(compra.items.map((item) => [item.id, item]));
    for (const recibo of dto.items) {
      const item = itemsPorId.get(recibo.compraItemId);
      if (!item) {
        throw new NotFoundException(`El item ${recibo.compraItemId} no pertenece a esta compra`);
      }
      const pendiente = Number(item.cantidadPedida) - Number(item.cantidadRecibida);
      if (recibo.cantidadRecibida > pendiente) {
        throw new BadRequestException(
          `El item ${recibo.compraItemId} tiene ${pendiente} unidades pendientes, no se pueden recibir ${recibo.cantidadRecibida}`,
        );
      }
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.$transaction(async (tx) => {
      const dataRecepcion: Prisma.RecepcionCompraUncheckedCreateInput = {
        empresaId,
        compraId,
        usuarioId,
        observaciones: dto.observaciones,
      };
      const recepcion = await tx.recepcionCompra.create({ data: dataRecepcion });

      for (const recibo of dto.items) {
        const item = itemsPorId.get(recibo.compraItemId)!;

        const dataLote: Prisma.LoteUncheckedCreateInput = {
          empresaId,
          productoId: item.productoId,
          numeroLote: recibo.numeroLote,
          vencimiento: new Date(recibo.vencimiento),
          cantidad: recibo.cantidadRecibida,
        };
        const lote = await tx.lote.create({ data: dataLote });

        await tx.movimientoStock.create({
          data: {
            empresaId,
            productoId: item.productoId,
            loteId: lote.id,
            tipoMovimiento: 'Entrada',
            cantidad: recibo.cantidadRecibida,
            motivo: 'Compra',
            referenciaId: compraId,
            usuarioId,
            recepcionCompraId: recepcion.id,
          },
        });

        await tx.compraItem.update({
          where: { id: item.id },
          data: { cantidadRecibida: { increment: recibo.cantidadRecibida } },
        });
      }

      const nuevoEstado = await this.calcularEstadoTrasRecepcion(tx, compraId);
      await tx.compra.update({ where: { id: compraId }, data: { estado: nuevoEstado } });

      return tx.recepcionCompra.findUniqueOrThrow({
        where: { id: recepcion.id },
        include: { movimientosStock: true },
      });
    });
  }

  private async calcularEstadoTrasRecepcion(tx: EmpresaScopedTx, compraId: string) {
    const items = await tx.compraItem.findMany({ where: { compraId } });
    const todoCompleto = items.every(
      (item) => Number(item.cantidadRecibida) >= Number(item.cantidadPedida),
    );
    return todoCompleto ? 'RECIBIDA' : 'RECEPCION_PARCIAL';
  }

  // --- Pagos a proveedor -------------------------------------------

  async listarPagos(empresaId: string, compraId: string) {
    const compra = await this.getCompra(empresaId, compraId);
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.pagoProveedor.findMany({
      where: { compraId: compra.id },
      orderBy: { fecha: 'desc' },
    });
  }

  /**
   * Registra un pago parcial o total contra una Compra y recalcula
   * totalPagado + saldo de la Compra dentro de la misma transacción.
   * No se permite pagar más de lo que se debe (saldo actual).
   */
  async crearPago(
    empresaId: string,
    compraId: string,
    dto: CrearPagoProveedorDto,
    usuarioId: string,
  ) {
    const compra = await this.getCompra(empresaId, compraId);
    const saldoActual = Number(compra.saldo ?? compra.total);
    if (dto.monto > saldoActual + 0.001) {
      throw new BadRequestException(
        `El monto ($${dto.monto}) supera el saldo pendiente ($${saldoActual.toFixed(2)})`,
      );
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.$transaction(async (tx) => {
      const pago = await tx.pagoProveedor.create({
        data: {
          empresaId,
          compraId,
          proveedorId: compra.proveedorId,
          usuarioId,
          monto: dto.monto,
          medioPago: dto.medioPago,
          referencia: dto.referencia,
          notas: dto.notas,
        } as Prisma.PagoProveedorUncheckedCreateInput,
      });

      const nuevoTotalPagado = Number(compra.totalPagado) + dto.monto;
      const nuevoSaldo = Number(compra.total) - nuevoTotalPagado;
      await tx.compra.update({
        where: { id: compraId },
        data: { totalPagado: nuevoTotalPagado, saldo: Math.max(0, nuevoSaldo) },
      });

      return pago;
    });
  }

  // --- Devoluciones a proveedor ------------------------------------

  async listarDevoluciones(empresaId: string, compraId: string) {
    const compra = await this.getCompra(empresaId, compraId);
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.devolucionProveedor.findMany({
      where: { compraId: compra.id },
      include: { items: true },
      orderBy: { fecha: 'desc' },
    });
  }

  /**
   * Registra una devolución de mercadería al proveedor. Por cada item:
   * - Valida que el lote (si se especifica) pertenezca al producto.
   * - Genera un MovimientoStock Salida/Devolucion.
   * - Reduce la cantidad del Lote.
   * No reduce el total de la Compra (la deuda sigue siendo la misma —
   * la devolución se negocia con el proveedor como nota de crédito o
   * descuento en una futura compra, fuera del sistema por ahora).
   */
  async crearDevolucion(
    empresaId: string,
    compraId: string,
    dto: CrearDevolucionProveedorDto,
    usuarioId: string,
  ) {
    const compra = await this.getCompra(empresaId, compraId);
    const db = this.prismaFactory.forEmpresa(empresaId);

    return db.$transaction(async (tx) => {
      const devolucion = await tx.devolucionProveedor.create({
        data: {
          empresaId,
          compraId,
          proveedorId: compra.proveedorId,
          usuarioId,
          motivo: dto.motivo,
          items: {
            create: dto.items.map((item) => ({
              productoId: item.productoId,
              loteId: item.loteId,
              cantidad: item.cantidad,
              costoUnitario: item.costoUnitario,
            })),
          },
        } as Prisma.DevolucionProveedorUncheckedCreateInput,
        include: { items: true },
      });

      // Generar un MovimientoStock de Salida por cada item devuelto
      for (const item of dto.items) {
        await tx.movimientoStock.create({
          data: {
            empresaId,
            productoId: item.productoId,
            loteId: item.loteId,
            tipoMovimiento: 'Salida',
            cantidad: item.cantidad,
            motivo: 'Devolucion',
            referenciaId: devolucion.id,
            usuarioId,
          },
        });

        // Reduce la cantidad del lote si se especificó
        if (item.loteId) {
          await tx.lote.update({
            where: { id: item.loteId },
            data: { cantidad: { decrement: item.cantidad } },
          });
        }
      }

      return devolucion;
    });
  }
}
