import { Injectable, NotFoundException } from '@nestjs/common';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { FidelizacionService } from '../fidelizacion/fidelizacion.service';
import { ClientesService } from '../clientes/clientes.service';
import { CreateVentaDto } from './dto/create-venta.dto';

/**
 * RF-05 (ventas presenciales). No implementa pagos mixtos ni conciliación
 * de Mercado Pago (RF-08) — esos son un incremento aparte. Esta primera
 * versión registra la venta, descuenta stock y calcula el total; el
 * cobro/pago de esa venta se modela después.
 *
 * Fase 5 del roadmap de Fidelización: además del descuento manual
 * (descuentoItem), cada ítem puede recibir un descuento AUTOMÁTICO según
 * el nivel de fidelidad del cliente — ver
 * FidelizacionService.calcularDescuentoAplicable(), usado en create()
 * más abajo. Solo venta presencial por ahora (TiendaService/pedidos
 * online queda para un incremento aparte).
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
    //
    // Fase 5 de Fidelización: el nivel del cliente se calcula con el
    // historial existente ANTES de esta venta (la venta todavía no
    // existe en la base en este punto) — confirmado con el dueño: evita
    // el caso "esta compra me hace VIP Y esta misma compra ya tiene el
    // descuento VIP". Sin clienteId, nivelCliente queda null y
    // calcularDescuentoAplicable() no aplica ninguna regla.
    const nivelCliente = dto.clienteId
      ? await this.clientesService.calcularNivel(empresaId, dto.clienteId)
      : null;
    // Una sola consulta para toda la venta, no una por ítem — ver
    // comentario en calcularDescuentoAplicable().
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
        // TODO(D-01): aplicar precioMayorista según ReglaPrecio cuando
        // exista esa entidad — hoy todo canal usa precioMinorista.
        descuentoFidelizacionPorcentaje: descuentoFidelizacion?.descuentoPorcentaje ?? null,
        reglaFidelizacionId: descuentoFidelizacion?.reglaId ?? null,
      };
    });

    // Orden de aplicación (sobre el subtotal bruto precioUnitario*cantidad):
    // 1) % de fidelización (automático, calculado arriba).
    // 2) descuentoItem (monto absoluto, manual del vendedor) se resta
    //    después, sobre lo que ya quedó tras el % de fidelización — un
    //    descuento manual adicional siempre pisa encima del automático,
    //    nunca al revés (el vendedor puede afinar el precio final a mano
    //    incluso cuando ya hay un descuento automático aplicado).
    const total = itemsConPrecio.reduce((acc, item) => {
      const bruto = Number(item.precioUnitario) * item.cantidad;
      const trasFidelizacion = item.descuentoFidelizacionPorcentaje
        ? bruto * (1 - item.descuentoFidelizacionPorcentaje / 100)
        : bruto;
      const subtotal = trasFidelizacion - (item.descuentoItem ?? 0);
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
              descuentoFidelizacionPorcentaje: item.descuentoFidelizacionPorcentaje,
              reglaFidelizacionId: item.reglaFidelizacionId,
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
        // Fase 4 de Tienda Online (RF-06): descontarStock() se movió a
        // InventarioService — mismo método que usa PedidosService al
        // confirmar un pedido online, nunca dos caminos de descuento en
        // paralelo (INV-DISP-01/INV-INV-04).
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
}
