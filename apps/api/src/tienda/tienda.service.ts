import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmpresaScopedPrismaService } from '../prisma/empresa-scoped-prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { CrearPedidoDto } from './dto/crear-pedido.dto';

// Mismo patrón que ventas.service.ts/inventario.service.ts: el cliente
// de EmpresaScopedPrismaService.forEmpresa() es un tipo dinámico de
// Prisma Client Extensions, no calza con Prisma.TransactionClient base.
type EmpresaScopedClient = ReturnType<EmpresaScopedPrismaService['forEmpresa']>;
type EmpresaScopedTx = Parameters<Parameters<EmpresaScopedClient['$transaction']>[0]>[0];

/**
 * Fase 1-3 de Tienda Online (RF-06). Superficie PÚBLICA (sin login) —
 * ver tienda.controller.ts, todo acá marcado @Public().
 *
 * Sin sesión no hay AuthenticatedUser.empresaId de dónde sacar el scope
 * multiempresa (ver empresa-scoped-prisma.service.ts). Se resuelve leyendo
 * TIENDA_EMPRESA_ID de una env var fija — mismo patrón ya usado para el
 * alta automática de Google OAuth (ver GOOGLE_SIGNUP_EMPRESA_ID en
 * auth.google.service.ts): una sola tienda pública por deploy, sin
 * inventar a qué empresa pertenece un visitante anónimo. Si el día de
 * mañana hace falta más de una tienda pública, ese es un rediseño
 * aparte (resolver la empresa por dominio/subdominio de la request),
 * no algo a anticipar sin un caso real.
 */
@Injectable()
export class TiendaService {
  constructor(
    private readonly prismaFactory: EmpresaScopedPrismaService,
    private readonly inventarioService: InventarioService,
  ) {}

  private empresaId(): string {
    const empresaId = process.env.TIENDA_EMPRESA_ID;
    if (!empresaId) {
      // No se adivina la empresa: sin esta variable, la tienda pública
      // está deshabilitada de hecho (falla explícito, no muestra un
      // catálogo de "cualquier" empresa).
      throw new InternalServerErrorException(
        'TIENDA_EMPRESA_ID no configurado: la tienda pública está deshabilitada',
      );
    }
    return empresaId;
  }

  /**
   * Fase 6 (RF-06/RF-04): aplica el descuento único y global del
   * producto (si tiene) sobre precioMinorista. El SDD limita la tienda
   * a "un precio base único, con posibilidad de aplicar descuentos" —
   * no hay reglas por cantidad/cliente (D-01/D-02 siguen sin definir).
   * Redondeado a 2 decimales (moneda), nunca se devuelve un precio con
   * más precisión que la que tiene sentido mostrar/cobrar.
   */
  private precioConDescuento(
    precioMinorista: Prisma.Decimal,
    descuentoPorcentaje: Prisma.Decimal | null,
  ): string {
    if (!descuentoPorcentaje || descuentoPorcentaje.isZero()) {
      return precioMinorista.toFixed(2);
    }
    const factor = new Prisma.Decimal(1).minus(descuentoPorcentaje.dividedBy(100));
    return precioMinorista.times(factor).toFixed(2);
  }

  /**
   * Catálogo público — reusa InventarioService.stockConsolidado() para
   * la disponibilidad (RF-06: "se actualizará la disponibilidad según
   * el stock del sistema"), sin duplicar ese cálculo. Le agrega el
   * precio, que ese método no expone (pensado para el panel interno,
   * donde el precio ya se ve en otro lado).
   */
  async catalogo(search?: string) {
    const empresaId = this.empresaId();
    const db = this.prismaFactory.forEmpresa(empresaId);
    const stock = await this.inventarioService.stockConsolidado(empresaId, search);

    const productos = await db.producto.findMany({
      where: { id: { in: stock.map((s) => s.productoId) } },
      select: { id: true, precioMinorista: true, descuentoPorcentaje: true },
    });
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    // Nunca se expone costo, stockMinimo ni ningún otro campo interno —
    // stockConsolidado() ya filtra a activo=true, acá solo se agrega el
    // precio público. Fase 6 (RF-06/RF-04): descuento único y global
    // sobre precioMinorista, sin reglas por cantidad/cliente
    // (D-01/D-02 siguen sin definir).
    return stock.map((item) => {
      const producto = productoPorId.get(item.productoId);
      const precioBase = producto?.precioMinorista ?? new Prisma.Decimal(0);
      const descuentoPorcentaje = producto?.descuentoPorcentaje ?? null;
      return {
        productoId: item.productoId,
        nombre: item.nombre,
        codigoInterno: item.codigoInterno,
        categoriaId: item.categoriaId,
        unidadBase: item.unidadBase,
        precio: this.precioConDescuento(precioBase, descuentoPorcentaje),
        precioSinDescuento:
          descuentoPorcentaje && !descuentoPorcentaje.isZero() ? precioBase.toFixed(2) : null,
        descuentoPorcentaje: descuentoPorcentaje?.toNumber() ?? null,
        disponible: item.stockTotal > 0,
        stockTotal: item.stockTotal,
      };
    });
  }

  /**
   * Crea un Pedido de tienda online. Sin reserva de stock (decisión
   * confirmada del dueño, ver roadmap): esto NO descuenta stock — el
   * descuento ocurre recién cuando un vendedor confirma el pedido desde
   * el panel (Fase 4) o al confirmarse el pago (Fase 5). Acá solo se
   * valida que haya stock disponible al momento de pedir, sin apartarlo.
   */
  async crearPedido(dto: CrearPedidoDto) {
    const empresaId = this.empresaId();
    const db = this.prismaFactory.forEmpresa(empresaId);

    const productoIds = [...new Set(dto.items.map((i) => i.productoId))];
    const productos = await db.producto.findMany({
      where: { id: { in: productoIds }, activo: true },
    });
    const productoPorId = new Map(productos.map((p) => [p.id, p]));

    for (const item of dto.items) {
      if (!productoPorId.has(item.productoId)) {
        throw new BadRequestException(`Producto ${item.productoId} no disponible`);
      }
    }

    // Precio congelado del catálogo al momento del pedido — mismo
    // criterio que VentasService (INV-12): nunca se acepta un precio
    // que mande el cliente. Fase 6: el precio congelado YA incluye el
    // descuento del producto si tenía uno — es el precio real que se
    // le mostró y cobró al comprador, no el precio bruto sin descontar.
    const itemsConPrecio = dto.items.map((item) => {
      const producto = productoPorId.get(item.productoId)!;
      const precioUnitario = this.precioConDescuento(
        producto.precioMinorista,
        producto.descuentoPorcentaje,
      );
      return { ...item, precioUnitario };
    });

    const total = itemsConPrecio.reduce((acc, item) => {
      return acc + Number(item.precioUnitario) * item.cantidad;
    }, 0);

    return db.$transaction(async (tx: EmpresaScopedTx) => {
      // Decisión confirmada: un pedido de tienda online SIEMPRE
      // crea/reusa un Cliente por email (dentro de la empresa), nunca
      // guarda datos de contacto sueltos en Pedido — evita duplicar lo
      // que Cliente ya modela y deja compras repetidas del mismo email
      // reconocibles bajo el mismo Cliente (útil para RF-10 después).
      //
      // findFirst + create/update en vez de upsert: empresaScopeExtension
      // (INV-01) solo tiene manejo explícito de aislamiento para un set
      // fijo de operaciones — upsert no está en esa lista (mismo motivo
      // que groupBy en inventario.service.ts) y falla ruidoso en vez de
      // dejarlo pasar sin scope. findFirst con `where` sí está cubierto.
      const clienteExistente = await tx.cliente.findFirst({ where: { email: dto.email } });
      /* eslint-disable indent -- falso positivo conocido de la regla
         `indent` base con un ternario que devuelve una llamada con
         objeto anidado (mismo patrón que catalogo.controller.ts) */
      const cliente = clienteExistente
        ? await tx.cliente.update({
            where: { id: clienteExistente.id },
            data: { nombre: dto.nombre, telefono: dto.telefono },
          })
        : await tx.cliente.create({
            data: {
              empresaId,
              nombre: dto.nombre,
              email: dto.email,
              telefono: dto.telefono,
            } satisfies Prisma.ClienteUncheckedCreateInput,
          });
      /* eslint-enable indent */

      // usuarioId queda null: nadie gestionó este pedido todavía (ver
      // comentario en schema.prisma) — se puebla cuando un vendedor lo
      // toma desde la bandeja de pedidos (Fase 4 del roadmap).
      const pedido = await tx.pedido.create({
        data: {
          empresaId,
          clienteId: cliente.id,
          usuarioId: null,
          estado: 'RECIBIDO',
          canalOrigen: 'web',
          total,
          pedidoItems: {
            create: itemsConPrecio.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
            })),
          },
        } satisfies Prisma.PedidoUncheckedCreateInput,
        include: { pedidoItems: true },
      });

      return pedido;
    });
  }

  /**
   * Seguimiento sin login: cualquiera con el id del pedido puede
   * consultar su estado. No expone datos de OTRO cliente (el id es un
   * UUID no adivinable, no hay listado público de pedidos) ni campos
   * internos como usuarioId.
   */
  async seguimiento(pedidoId: string) {
    const empresaId = this.empresaId();
    const db = this.prismaFactory.forEmpresa(empresaId);
    const pedido = await db.pedido.findUnique({
      where: { id: pedidoId },
      include: { pedidoItems: { include: { producto: { select: { nombre: true } } } } },
    });
    if (!pedido) {
      throw new BadRequestException('Pedido no encontrado');
    }
    return {
      id: pedido.id,
      estado: pedido.estado,
      total: pedido.total,
      createdAt: pedido.createdAt,
      items: pedido.pedidoItems.map((i) => ({
        producto: i.producto.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
      })),
    };
  }
}
