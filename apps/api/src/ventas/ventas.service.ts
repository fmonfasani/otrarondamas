import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { FidelizacionService } from '../fidelizacion/fidelizacion.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateVentaDto } from './dto/create-venta.dto';

/**
 * RF-05 (ventas presenciales).
 *
 * Inc-1 agrega las validaciones de integridad del spec-modulos_ventas §15:
 * - RN-VTA-07: rechazar productos inactivos (PRODUCTO_INACTIVO / 422)
 * - RN-VTA-06: rechazar descuento manual > 0 (DESCUENTO_NO_AUTORIZADO / 403)
 * - RN-VTA-11: validar que el cliente pertenezca a la empresa y esté activo
 * - RN-VTA-18: AuditLog en la misma transacción que la venta
 * - INV-VTA-07: idempotencia por idempotencyKey (retorna la venta existente sin
 *   duplicar stock ni pagos)
 */
@Injectable()
export class VentasService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly inventarioService: InventarioService,
    private readonly fidelizacionService: FidelizacionService,
    private readonly clientesService: ClientesService,
  ) {}

  async create(dto: CreateVentaDto, empresaId: string, usuarioId: string) {
    // Inc-1 (INV-VTA-07): si la clave de idempotencia ya existe, devolver la
    // venta original sin hacer nada. El check es fuera de la transacción
    // intencionalmente: es solo lectura y permite el short-circuit antes de
    // evaluar productos, stock, etc.
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

    const db = this.prismaFactory.forEmpresa(empresaId);

    // Inc-1 (RN-VTA-11): validar que el cliente pertenezca a la empresa y
    // esté activo. ClientesService.obtener() ya lanza NotFoundException si no
    // existe o es de otra empresa. El chequeo de activo es adicional.
    if (dto.clienteId) {
      const cliente = await this.clientesService.obtener(empresaId, dto.clienteId);
      if (!cliente.activo) {
        throw new NotFoundException('CLIENTE_NO_ENCONTRADO');
      }
    }

    const productoIds = [...new Set(dto.items.map((i) => i.productoId))];
    const productos = await db.producto.findMany({ where: { id: { in: productoIds } } });
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const producto = productoPorId.get(item.productoId);
      if (!producto) {
        throw new NotFoundException('PRODUCTO_NO_ENCONTRADO');
      }
      // Inc-1 (RN-VTA-07, C5, C27): rechazar productos inactivos
      if (!producto.activo) {
        throw new UnprocessableEntityException('PRODUCTO_INACTIVO');
      }
      // Inc-1 (RN-VTA-06, C1): descuento manual bloqueado hasta D-VTA-03
      if (item.descuentoItem && item.descuentoItem > 0) {
        throw new ForbiddenException('DESCUENTO_NO_AUTORIZADO');
      }
    }

    // Precio congelado al momento de la venta, tomado del catálogo (INV-12).
    // Nivel del cliente calculado con historial PREVIO a esta venta (ver
    // comentario original en el service pre-Inc-1 sobre Fase 5 de Fidelización).
    const nivelCliente = dto.clienteId
      ? await this.clientesService.calcularNivel(empresaId, dto.clienteId)
      : null;
    const reglasActivas = nivelCliente
      ? await this.fidelizacionService.listarReglasActivas(empresaId)
      : [];

    const itemsConPrecio = dto.items.map((item) => {
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

    const total = itemsConPrecio.reduce((acc, item) => {
      const bruto = Number(item.precioUnitario) * item.cantidad;
      const trasFidelizacion = item.descuentoFidelizacionPorcentaje
        ? bruto * (1 - item.descuentoFidelizacionPorcentaje / 100)
        : bruto;
      const subtotal = trasFidelizacion - (item.descuentoItem ?? 0);
      return acc + subtotal;
    }, 0);

    // INV-03/INV-06: descuento de stock y creación de venta en la misma
    // transacción — garantía de atomicidad bajo concurrencia.
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
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              descuentoItem: item.descuentoItem ?? 0,
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje,
              reglaFidelizacionId: item.reglaFidelizacionId,
            })),
          },
        },
        include: { ventaItems: true },
      });

      // Inc-1 (RN-VTA-18, C12): AuditLog de creación en la misma transacción.
      await tx.auditLog.create({
        data: {
          empresaId,
          usuarioId,
          accion: 'CREATE',
          entidadAfectada: 'Venta',
          entidadId: venta.id,
          valoresPosteriores: { total, canal: dto.canal, items: dto.items.length },
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

  // Inc-1: búsqueda de productos para el POS (GET /ventas/productos?search=).
  // Solo productos activos. Devuelve hasta 50 resultados con stock consolidado.
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
