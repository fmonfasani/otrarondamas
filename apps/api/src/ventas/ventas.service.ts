import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

// El cliente que devuelve EmpresaScopedPrismaService.forEmpresa() es un
// tipo dinámico generado por Prisma Client Extensions — no calza con
// Prisma.TransactionClient del cliente base. Se extrae el tipo del
// parámetro `tx` directamente desde la firma real de `$transaction` de
// ESE cliente (mismo patrón ya usado en empresa-scoped-prisma.service.ts
// para el tipo de `client`), en vez de anotar un tipo genérico de Prisma
// que no es estructuralmente compatible.
type EmpresaScopedClient = ReturnType<EmpresaScopedPrismaService['forEmpresa']>;
type EmpresaScopedTx = Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0];

/**
 * RF-05 (ventas presenciales). No implementa pagos mixtos ni conciliación
 * de Mercado Pago (RF-08) — esos son un incremento aparte. Esta primera
 * versión registra la venta, descuenta stock y calcula el total; el
 * cobro/pago de esa venta se modela después.
 */
@Injectable()
export class VentasService {
  constructor(private readonly prismaFactory: EmpresaScopedPrismaService) {}

  async create(dto: CreateVentaDto, empresaId: string, usuarioId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    // Los productos deben existir y pertenecer a la empresa. Se resuelven
    // ANTES de entrar a la transacción para poder validar todo el pedido
    // de una vez y devolver un único error claro (ej. "no existe X"), en
    // vez de fallar a mitad de la transacción por el segundo ítem.
    const productoIds = [...new Set(dto.items.map((i) => i.productoId))];
    const productos = await db.producto.findMany({ where: { id: { in: productoIds } } });
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!productoPorId.has(item.productoId)) {
        throw new NotFoundException(`Producto ${item.productoId} no encontrado`);
      }
    }

    // Precio congelado al momento de la venta, tomado del catálogo — no
    // se acepta un precioUnitario del cliente (INV-12: los cambios de
    // precio no modifican retrospectivamente ventas anteriores, lo que
    // implica que el precio de una venta se fija en el momento, desde el
    // catálogo, no desde el request).
    const itemsConPrecio = dto.items.map((item) => {
      const producto = productoPorId.get(item.productoId)!;
      return {
        ...item,
        precioUnitario: producto.precioMinorista,
        // TODO(D-01): aplicar precioMayorista según ReglaPrecio cuando
        // exista esa entidad — hoy todo canal usa precioMinorista.
      };
    });

    const total = itemsConPrecio.reduce((acc, item) => {
      const subtotal = Number(item.precioUnitario) * item.cantidad - (item.descuentoItem ?? 0);
      return acc + subtotal;
    }, 0);

    // INV-03/INV-06: el descuento de stock y la validación de que no
    // quede negativo ocurren DENTRO de la misma transacción que crea la
    // venta — no como una verificación previa separada, porque bajo
    // concurrencia (dos ventas simultáneas del mismo producto) una
    // verificación previa no atómica no garantiza el invariante.
    return db.$transaction(async (tx) => {
      const venta = await tx.venta.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: dto.clienteId,
          canal: dto.canal,
          total,
          estado: 'CONFIRMADA',
          ventaItems: {
            create: itemsConPrecio.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              descuentoItem: item.descuentoItem ?? 0,
            })),
          },
        },
        include: { ventaItems: true },
      });

      // D-09 (Fase 5 de Inventario): no se bloquea la venta de un producto
      // con lotes vencidos, solo se advierte — ver descontarStock(). Se
      // acumulan los productos afectados de esta venta para devolverlos
      // en la respuesta (advertenciasStockVencido), además de quedar
      // auditados por MovimientoStock.loteVencidoAlMomento de forma
      // permanente sin depender de esta respuesta puntual.
      const productosConLoteVencido = new Set<string>();
      for (const item of itemsConPrecio) {
        const tuvoLoteVencido = await this.descontarStock(
          tx,
          empresaId,
          item.productoId,
          item.cantidad,
          venta.id,
          usuarioId,
        );
        if (tuvoLoteVencido) {
          productosConLoteVencido.add(item.productoId);
        }
      }

      return { ...venta, advertenciasStockVencido: [...productosConLoteVencido] };
    });
  }

  /**
   * Descuenta `cantidad` del stock de un producto, tomando de los lotes
   * disponibles en orden FIFO por vencimiento (el lote que vence más
   * pronto se consume primero).
   *
   * D-09: no se filtran lotes vencidos de la selección — un lote vencido
   * puede seguir vendiéndose (decisión explícita del dueño, no bloqueo),
   * pero cada MovimientoStock que salga de un lote ya vencido al momento
   * de la venta queda marcado con `loteVencidoAlMomento: true`, para
   * auditoría permanente. Devuelve `true` si algún lote afectado por esta
   * venta estaba vencido, para que el caller pueda armar una advertencia.
   *
   * Genera un MovimientoStock tipo "Salida" por cada lote afectado.
   * Rechaza la operación completa (revierte la transacción) si la suma
   * de cantidad disponible en todos los lotes del producto no alcanza —
   * D-09 dejó esto sin cambios: el stock insuficiente se sigue
   * rechazando siempre, no tiene mecanismo de excepción/autorización.
   */
  private async descontarStock(
    tx: EmpresaScopedTx,
    empresaId: string,
    productoId: string,
    cantidadRequerida: number,
    ventaId: string,
    usuarioId: string,
  ): Promise<boolean> {
    const lotes = await tx.lote.findMany({
      where: { empresaId, productoId, cantidad: { gt: 0 } },
      orderBy: { vencimiento: 'asc' },
    });

    const stockTotal = lotes.reduce((acc, l) => acc + Number(l.cantidad), 0);
    if (stockTotal < cantidadRequerida) {
      throw new BadRequestException(
        `Stock insuficiente para el producto ${productoId}: disponible ${stockTotal}, requerido ${cantidadRequerida}`,
      );
    }

    const ahora = new Date();
    let restante = cantidadRequerida;
    let huboLoteVencido = false;
    for (const lote of lotes) {
      if (restante <= 0) break;
      const cantidadDeEsteLote = Math.min(restante, Number(lote.cantidad));
      const loteVencido = lote.vencimiento <= ahora;
      if (loteVencido) {
        huboLoteVencido = true;
      }

      await tx.lote.update({
        where: { id: lote.id },
        data: { cantidad: { decrement: cantidadDeEsteLote } },
      });

      await tx.movimientoStock.create({
        data: {
          empresaId,
          productoId,
          loteId: lote.id,
          tipoMovimiento: 'Salida',
          cantidad: cantidadDeEsteLote,
          motivo: 'Venta',
          referenciaId: ventaId,
          usuarioId,
          loteVencidoAlMomento: loteVencido,
        },
      });

      restante -= cantidadDeEsteLote;
    }

    return huboLoteVencido;
  }

  async findAll(empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    return db.venta.findMany({
      include: { ventaItems: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const venta = await db.venta.findUnique({ where: { id }, include: { ventaItems: true } });
    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }
    return venta;
  }
}
