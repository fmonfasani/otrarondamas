import {
  BadRequestException,
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

/**
 * RF-05 (ventas presenciales).
 *
 * Inc-1: validaciones de integridad (RN-VTA-06, 07, 11, 18, INV-VTA-07).
 * Inc-2: cálculo con Prisma.Decimal y redondeo a 2 decimales por línea
 *        (RN-VTA-02, CA-VTA-06). POST /ventas/cotizacion para preview.
 */
@Injectable()
export class VentasService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly inventarioService: InventarioService,
    private readonly fidelizacionService: FidelizacionService,
    private readonly clientesService: ClientesService,
  ) {}

  // Inc-2 (RN-VTA-02): subtotal por línea con Decimal, redondeo mitad-arriba
  // a 2 decimales. El descuento fidelización se aplica sobre el bruto (precio
  // × cantidad) y el descuento manual se resta del resultado, en ese orden.
  // round() de Prisma.Decimal usa ROUND_HALF_UP por defecto.
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
    const subtotal = trasFidelizacion.minus(descuentoItem);
    return subtotal.toDecimalPlaces(2);
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

  async create(dto: CreateVentaDto, empresaId: string, usuarioId: string) {
    // Inc-1 (INV-VTA-07): idempotencia
    if (dto.idempotencyKey) {
      const db = this.prismaFactory.forEmpresa(empresaId);
      const existente = await db.venta.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { ventaItems: true },
      });
      if (existente) {
        return { ...existente, advertenciasStockVencido: [] };
      }
    }

    // Inc-1 (RN-VTA-11): cliente válido para esta empresa
    if (dto.clienteId) {
      const cliente = await this.clientesService.obtener(empresaId, dto.clienteId);
      if (!cliente.activo) throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
    }

    const itemsConPrecio = await this.resolverItems(empresaId, dto.items, dto.clienteId);

    // Inc-2 (RN-VTA-02): total como suma de subtotales redondeados a 2 dec
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
      const venta = await tx.venta.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: dto.clienteId,
          canal: dto.canal,
          total,
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

      // Inc-1 (RN-VTA-18): AuditLog en la misma transacción
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          accion: 'CREATE',
          entidadAfectada: 'Venta',
          entidadId: venta.id,
          valoresPosteriores: {
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

      return { ...venta, advertenciasStockVencido: [...productosConLoteVencido] };
    });
  }

  // Inc-2 (RF-VTA-09, RF-VTA-10): preview del total con cálculo Decimal,
  // sin crear la venta ni tocar stock. El frontend la llama 300 ms después
  // del último cambio en el carrito para mostrar el total exacto.
  async cotizar(dto: CotizarVentaDto, empresaId: string) {
    // Inc-1 (RN-VTA-11): cliente válido para esta empresa
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
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return venta;
  }

  // Inc-1: búsqueda de productos para el POS (GET /ventas/productos?search=).
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
