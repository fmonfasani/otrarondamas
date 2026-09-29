import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { FidelizacionService } from '../fidelizacion/fidelizacion.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { CotizarVentaDto } from './dto/cotizar-venta.dto';
import { CrearPagoVentaDto } from './dto/crear-pago-venta.dto';
import { ListarVentasDto } from './dto/listar-ventas.dto';

/**
 * RF-05 (ventas presenciales).
 *
 * Inc-1: validaciones de integridad (RN-VTA-06, 07, 11, 18, INV-VTA-07).
 * Inc-2: cálculo con Prisma.Decimal y redondeo a 2 dec por línea (RN-VTA-02).
 * Inc-3: número comercial correlativo (D-VTA-10), POST /ventas/:id/pagos con
 *        montoRecibido/vuelto/referencia (RF-VTA-14-15-16), bloqueo de efectivo
 *        con caja cerrada (D-VTA-07/A), saldo derivado en GET /ventas/:id.
 */
@Injectable()
export class VentasService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly inventarioService: InventarioService,
    private readonly fidelizacionService: FidelizacionService,
    private readonly clientesService: ClientesService,
  ) {}

  // Inc-2: subtotal por línea con Decimal, redondeo mitad-arriba a 2 dec.
  private calcularSubtotalLinea(
    precioUnitario: Prisma.Decimal,
    cantidad: Prisma.Decimal,
    descuentoFidelizacionPorcentaje: Prisma.Decimal | null,
    descuentoItem: Prisma.Decimal,
  ): Prisma.Decimal {
    const bruto = precioUnitario.times(cantidad);
    const trasFidelizacion = descuentoFidelizacionPorcentaje
      ? bruto.times(new Prisma.Decimal(1).minus(descuentoFidelizacionPorcentaje.dividedBy(100)))
      : bruto;
    return trasFidelizacion.minus(descuentoItem).toDecimalPlaces(2);
  }

  private async resolverItems(
    empresaId: string,
    items: Array<{ productoId: string; cantidad: number; descuentoItem?: number }>,
    clienteId?: string,
  ) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const productoIds = [...new Set(items.map((i) => i.productoId))];
    const productos = await db.producto.findMany({ where: { id: { in: productoIds } } });
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    for (const item of items) {
      const producto = productoPorId.get(item.productoId);
      if (!producto) throw new NotFoundException('PRODUCTO_NO_ENCONTRADO');
      if (!producto.activo) throw new UnprocessableEntityException('PRODUCTO_INACTIVO');
      if (item.descuentoItem && item.descuentoItem > 0)
        throw new ForbiddenException('DESCUENTO_NO_AUTORIZADO');
    }

    const nivelCliente = clienteId
      ? await this.clientesService.calcularNivel(empresaId, clienteId)
      : null;
    const reglasActivas = nivelCliente
      ? await this.fidelizacionService.listarReglasActivas(empresaId)
      : [];

    return items.map((item) => {
      const producto = productoPorId.get(item.productoId)!;
      const descuentoFidelizacion = this.fidelizacionService.calcularDescuentoAplicable(
        reglasActivas,
        nivelCliente,
        {
          familiaId: producto.familiaId,
          subfamiliaId: producto.subfamiliaId,
          tipoId: producto.tipoId,
          subtipoId: producto.subtipoId,
          marca: producto.marca,
          cantidad: item.cantidad,
        },
      );
      return {
        ...item,
        precioUnitario: producto.precioMinorista,
        descuentoFidelizacionPorcentaje: descuentoFidelizacion?.descuentoPorcentaje ?? null,
        reglaFidelizacionId: descuentoFidelizacion?.reglaId ?? null,
      };
    });
  }

  // Inc-3 (D-VTA-07/A): verifica si hay apertura de caja vigente.
  // La empresa puede no tener caja configurada (arranque inicial) — en ese
  // caso se trata como caja cerrada.
  private async cajaEstaAbierta(empresaId: string): Promise<boolean> {
    const db = this.prismaFactory.forEmpresa(empresaId);
    const caja = await db.caja.findUnique({ where: { empresaId } });
    if (!caja) return false;
    const apertura = await db.aperturaCaja.findFirst({
      where: { cajaId: caja.id, fechaCierre: null },
    });
    return !!apertura;
  }

  async create(dto: CreateVentaDto, empresaId: string, usuarioId: string) {
    // Inc-1: idempotencia
    if (dto.idempotencyKey) {
      const db = this.prismaFactory.forEmpresa(empresaId);
      const existente = await db.venta.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { ventaItems: true, pagos: true },
      });
      if (existente) {
        const totalPagado = existente.pagos
          .filter((p) => p.estado === 'APROBADO')
          .reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));
        const saldo = new Prisma.Decimal(existente.total.toString()).minus(totalPagado);
        return { ...existente, saldo: saldo.toString(), advertenciasStockVencido: [] };
      }
    }

    // Inc-1: cliente válido para esta empresa
    if (dto.clienteId) {
      const cliente = await this.clientesService.obtener(empresaId, dto.clienteId);
      if (!cliente.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsConPrecio = await this.resolverItems(empresaId, dto.items, dto.clienteId);

    // Inc-2: total con Decimal
    const total = itemsConPrecio.reduce((acc, item) => {
      const subtotal = this.calcularSubtotalLinea(
        new Prisma.Decimal(item.precioUnitario.toString()),
        new Prisma.Decimal(item.cantidad),
        item.descuentoFidelizacionPorcentaje
          ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
          : null,
        new Prisma.Decimal(item.descuentoItem ?? 0),
      );
      return acc.plus(subtotal);
    }, new Prisma.Decimal(0));

    const db = this.prismaFactory.forEmpresa(empresaId);

    return db.$transaction(async (tx) => {
      // Inc-3 (D-VTA-10/A): número correlativo por empresa dentro de la
      // transacción — SELECT MAX + 1 con bloqueo implícito de la fila en
      // la transacción serializable de Postgres.
      const maxNumero = await tx.venta.aggregate({
        where: { empresaId },
        _max: { numero: true },
      });
      const numero = (maxNumero._max.numero ?? 0) + 1;

      const venta = await tx.venta.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: dto.clienteId,
          canal: dto.canal,
          total,
          numero,
          estado: 'CONFIRMADA',
          idempotencyKey: dto.idempotencyKey ?? null,
          ventaItems: {
            create: itemsConPrecio.map((item) => ({
              productoId: item.productoId,
              cantidad: new Prisma.Decimal(item.cantidad),
              precioUnitario: new Prisma.Decimal(item.precioUnitario.toString()),
              descuentoItem: new Prisma.Decimal(item.descuentoItem ?? 0),
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje
                ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
                : null,
              reglaFidelizacionId: item.reglaFidelizacionId,
            })),
          },
        },
        include: { ventaItems: true },
      });

      // Inc-1: AuditLog en la misma transacción
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          accion: 'CREATE',
          entidadAfectada: 'Venta',
          entidadId: venta.id,
          valoresPosteriores: {
            numero,
            total: total.toString(),
            canal: dto.canal,
            items: dto.items.length,
          },
          ventaId: venta.id,
        },
      });

      const productosConLoteVencido = new Set<string>();
      for (const item of itemsConPrecio) {
        const tuvoLoteVencido = await this.inventarioService.descontarStock(
          tx,
          empresaId,
          item.productoId,
          item.cantidad,
          'Venta',
          venta.id,
          usuarioId,
        );
        if (tuvoLoteVencido) {
          productosConLoteVencido.add(item.productoId);
        }
      }

      return {
        ...venta,
        saldo: total.toString(),
        advertenciasStockVencido: [...productosConLoteVencido],
      };
    });
  }

  // Inc-2: cotización previa sin crear la venta
  async cotizar(dto: CotizarVentaDto, empresaId: string) {
    if (dto.clienteId) {
      const cliente = await this.clientesService.obtener(empresaId, dto.clienteId);
      if (!cliente.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsConPrecio = await this.resolverItems(empresaId, dto.items, dto.clienteId);

    const lineas = itemsConPrecio.map((item) => {
      const precioDecimal = new Prisma.Decimal(item.precioUnitario.toString());
      const cantidadDecimal = new Prisma.Decimal(item.cantidad);
      const fidPct = item.descuentoFidelizacionPorcentaje
        ? new Prisma.Decimal(item.descuentoFidelizacionPorcentaje.toString())
        : null;
      const descManual = new Prisma.Decimal(item.descuentoItem ?? 0);
      const subtotal = this.calcularSubtotalLinea(
        precioDecimal,
        cantidadDecimal,
        fidPct,
        descManual,
      );
      return {
        productoId: item.productoId,
        precioUnitario: precioDecimal.toString(),
        cantidad: cantidadDecimal.toString(),
        descuentoFidelizacionPorcentaje: fidPct?.toString() ?? null,
        reglaFidelizacionId: item.reglaFidelizacionId ?? null,
        descuentoItem: descManual.toString(),
        subtotal: subtotal.toString(),
      };
    });

    const total = lineas
      .reduce((acc, l) => acc.plus(new Prisma.Decimal(l.subtotal)), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    return { lineas, total: total.toString() };
  }

  // Inc-3 (RF-VTA-14, RF-VTA-15, RF-VTA-16): registrar un pago sobre una venta.
  // D-VTA-07/A: bloquear efectivo si la caja está cerrada.
  // D-VTA-04/B: se permite salir con saldo — el saldo derivado lo calcula findOne().
  async crearPago(ventaId: string, dto: CrearPagoVentaDto, empresaId: string, usuarioId: string) {
    const db = this.prismaFactory.forEmpresa(empresaId);

    const venta = await db.venta.findUnique({
      where: { id: ventaId },
      include: { pagos: { where: { estado: 'APROBADO' } } },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.empresaId !== empresaId) throw new NotFoundException('Venta no encontrada');
    if (venta.estado === 'ANULADA') throw new ConflictException('VENTA_ANULADA');

    const totalPagado = venta.pagos.reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));
    const saldo = new Prisma.Decimal(venta.total.toString()).minus(totalPagado);

    if (saldo.lessThanOrEqualTo(0)) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    const montoDecimal = new Prisma.Decimal(dto.monto);
    if (montoDecimal.greaterThan(saldo.plus(new Prisma.Decimal('0.001')))) {
      throw new BadRequestException('PAGO_EXCEDE_SALDO');
    }

    // Inc-3 D-VTA-07/A: efectivo requiere caja abierta
    if (dto.medio === 'efectivo') {
      const abierta = await this.cajaEstaAbierta(empresaId);
      if (!abierta) throw new ConflictException('CAJA_CERRADA');

      // RN-VTA-12: en efectivo el montoRecibido puede superar el importe
      const recibido = dto.montoRecibido ? new Prisma.Decimal(dto.montoRecibido) : montoDecimal;
      if (recibido.lessThan(montoDecimal)) {
        throw new BadRequestException('MONTO_RECIBIDO_INSUFICIENTE');
      }
    }

    return db.$transaction(async (tx) => {
      const montoRecibido =
        dto.medio === 'efectivo' && dto.montoRecibido
          ? new Prisma.Decimal(dto.montoRecibido)
          : null;
      const vuelto = montoRecibido ? montoRecibido.minus(montoDecimal).toDecimalPlaces(2) : null;

      const pago = await tx.pago.create({
        data: {
          empresaId,
          usuarioId,
          ventaId,
          monto: montoDecimal,
          medio: dto.medio,
          estado: 'APROBADO',
          montoRecibido,
          vuelto,
          referencia: dto.referencia ?? null,
        },
      });

      // Inc-1 (RN-VTA-18): AuditLog del cobro
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          accion: 'PAGO',
          entidadAfectada: 'Pago',
          entidadId: pago.id,
          valoresPosteriores: {
            ventaId,
            monto: montoDecimal.toString(),
            medio: dto.medio,
            vuelto: vuelto?.toString() ?? null,
          },
          ventaId,
        },
      });

      const nuevoSaldo = saldo.minus(montoDecimal).toDecimalPlaces(2);
      return { pago, saldo: nuevoSaldo.toString() };
    });
  }

  private calcularEstadoCobro(
    saldo: Prisma.Decimal,
    total: Prisma.Decimal,
  ): 'PENDIENTE' | 'PARCIAL' | 'COBRADA' {
    if (saldo.equals(total)) return 'PENDIENTE';
    if (saldo.isZero()) return 'COBRADA';
    return 'PARCIAL';
  }

  async findAll(empresaId: string, dto: ListarVentasDto = {}) {
    const {
      desde,
      hasta,
      estadoCobro,
      usuarioId,
      clienteId,
      numero,
      page = 1,
      pageSize = 25,
    } = dto;

    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      desde || hasta
        ? { ...(desde ? { gte: new Date(desde) } : {}), ...(hasta ? { lte: new Date(hasta) } : {}) }
        : undefined;

    const where: Prisma.VentaWhereInput = {
      empresaId,
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      ...(usuarioId ? { usuarioId } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(numero ? { numero } : {}),
    };

    const [ventas, total] = await Promise.all([
      this.prismaFactory.forEmpresa(empresaId).venta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          usuario: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, nombre: true } },
          pagos: { where: { estado: 'APROBADO' }, select: { monto: true, medio: true } },
          _count: { select: { pagos: true } },
        },
      }),
      this.prismaFactory.forEmpresa(empresaId).venta.count({ where }),
    ]);

    // Calcular saldo y estadoCobro para filtrado y respuesta
    const filas = ventas.map((v) => {
      const totalDecimal = new Prisma.Decimal(v.total);
      const sumaPagos = v.pagos.reduce(
        (acc, p) => acc.plus(new Prisma.Decimal(p.monto)),
        new Prisma.Decimal(0),
      );
      const saldoDecimal = totalDecimal.minus(sumaPagos);
      const ec = this.calcularEstadoCobro(saldoDecimal, totalDecimal);
      const numeroFormateado = v.numero ? `#${String(v.numero).padStart(8, '0')}` : null;
      return {
        ...v,
        saldo: saldoDecimal.toDecimalPlaces(2).toString(),
        estadoCobro: ec,
        numeroFormateado,
        medios: [...new Set(v.pagos.map((p) => p.medio))],
      };
    });

    // Filtrar por estadoCobro en memoria (es derivado, no está en DB)
    const filasFiltradas = estadoCobro ? filas.filter((f) => f.estadoCobro === estadoCobro) : filas;

    return { data: filasFiltradas, total, page, pageSize };
  }

  async findOne(id: string, empresaId: string) {
    const venta = await this.prismaFactory.forEmpresa(empresaId).venta.findFirst({
      where: { id },
      include: {
        usuario: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
        ventaItems: {
          include: { producto: { select: { id: true, nombre: true, codigoInterno: true } } },
        },
        pagos: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const totalDecimal = new Prisma.Decimal(venta.total);
    const sumaPagos = venta.pagos
      .filter((p) => p.estado === 'APROBADO')
      .reduce((acc, p) => acc.plus(new Prisma.Decimal(p.monto)), new Prisma.Decimal(0));
    const saldoDecimal = totalDecimal.minus(sumaPagos);
    const estadoCobro = this.calcularEstadoCobro(saldoDecimal, totalDecimal);
    const numeroFormateado = venta.numero ? `#${String(venta.numero).padStart(8, '0')}` : null;

    return {
      ...venta,
      saldo: saldoDecimal.toDecimalPlaces(2).toString(),
      estadoCobro,
      numeroFormateado,
      ventaItems: venta.ventaItems.map((item) => ({
        ...item,
        nombre: item.producto?.nombre ?? item.productoId,
        codigoInterno: item.producto?.codigoInterno ?? null,
      })),
    };
  }

  async getComprobante(id: string, empresaId: string) {
    const venta = await this.findOne(id, empresaId);
    // Retorna la misma estructura que findOne — el frontend la formatea para impresión
    return venta;
  }

  // Inc-1: búsqueda de productos para el POS
  async buscarProductos(empresaId: string, search: string) {
    if (!search || search.length < 2) {
      throw new BadRequestException('El término de búsqueda debe tener al menos 2 caracteres');
    }

    const db = this.prismaFactory.forEmpresa(empresaId);
    const productos = await db.producto.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { codigoInterno: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { equals: search } },
        ],
      },
      take: 50,
      include: {
        familia: { select: { id: true, nombre: true } },
        subfamilia: { select: { id: true, nombre: true } },
        lotes: { select: { cantidad: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    return productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      codigoInterno: p.codigoInterno,
      codigoBarras: p.codigoBarras,
      marca: p.marca,
      precioMinorista: p.precioMinorista,
      unidadBase: p.unidadBase,
      activo: p.activo,
      familia: p.familia,
      subfamilia: p.subfamilia,
      stockDisponible: p.lotes.reduce((sum, l) => sum + Number(l.cantidad), 0),
      stockMinimo: Number(p.stockMinimo),
    }));
  }
}
