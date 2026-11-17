import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordResetService } from '../auth/password-reset.service';
import { SLUG_PATTERN, createBusinessWithOwner } from './create-business';
import { assertBusinessCreationAllowed } from './business-creation-gate';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;

/** Sold in a window: counter sales not cancelled + store orders paid or delivered (OR-B4-036). */
const soldOrdersWhere = (from: Date): Prisma.PedidoWhereInput => ({
  estado: { not: 'CANCELADO' },
  createdAt: { gte: from },
  OR: [{ estado: 'ENTREGADO' }, { Pago: { some: { estado: 'APROBADO' } } }],
});

const mercadoPagoConnected = (configuracion: Prisma.JsonValue | null) => {
  const mp = ((configuracion ?? {}) as { mercadoPago?: { userId?: unknown } }).mercadoPago;
  return Boolean(mp && mp.userId);
};

/**
 * Wapsell platform administration, first stage (OR-B4-038): read-only and aggregates only.
 * It sees every Business by design (PLATFORM_BUSINESSES_VIEW, OR-B4-020), never the
 * personal data of their customers: names and contact of the Business and its Owner, sizes,
 * counts and totals. Opening a Business's detail is written to that Business's audit log.
 */
@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordResetService,
  ) {}

  /**
   * OR-B4-039 — a new Business with its Owner, from the platform. Strict: if the store
   * address, the name or the Owner's email already exist, nothing is created. The Owner gets
   * a welcome email with a 7-day single-use link to create their password; the link is also
   * returned so it can be passed on if the email does not arrive. Written to the new
   * Business's audit log.
   */
  async createBusiness(
    input: { nombre: string; slug: string; ownerNombre: string; ownerEmail: string },
    viewerUsuarioId: string,
  ) {
    // OR-B4-042: closed until MFA exists (OR-B4-009).
    assertBusinessCreationAllowed();
    const nombre = input.nombre.trim();
    const slug = input.slug.trim().toLowerCase();
    const ownerNombre = input.ownerNombre.trim();
    const ownerEmail = input.ownerEmail.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 40) {
      throw new BadRequestException(
        'La dirección de la tienda va en minúsculas, números y guiones (3 a 40).',
      );
    }
    const [bySlug, byName, byEmail] = await Promise.all([
      this.prisma.empresa.findUnique({ where: { slug }, select: { id: true } }),
      this.prisma.empresa.findUnique({ where: { nombre }, select: { id: true } }),
      this.prisma.usuario.findFirst({
        where: { email: { equals: ownerEmail, mode: 'insensitive' } },
        select: { id: true },
      }),
    ]);
    if (bySlug) throw new ConflictException('Ya hay un negocio con esa dirección de tienda.');
    if (byName) throw new ConflictException('Ya hay un negocio con ese nombre.');
    if (byEmail) throw new ConflictException('Ese email ya tiene una cuenta en Wapsell.');

    const created = await this.prisma.$transaction(async (tx) => {
      const result = await createBusinessWithOwner(tx, { nombre, slug, ownerNombre, ownerEmail });
      await tx.auditLog.create({
        data: {
          empresaId: result.empresaId,
          usuarioId: viewerUsuarioId,
          accion: 'PLATFORM_CREATE',
          entidadAfectada: 'Empresa',
          entidadId: result.empresaId,
          valoresPosteriores: { nombre, slug, ownerNombre, ownerEmail },
        },
      });
      return result;
    });
    const welcome = await this.passwords.issueWelcomeLink(created.usuarioId, nombre);
    return {
      id: created.empresaId,
      nombre,
      slug,
      owner: { nombre: ownerNombre, email: ownerEmail },
      enlace: welcome.link,
      mailEnviado: welcome.sent,
      venceEl: welcome.expiresAt,
    };
  }

  async overview(now = new Date()) {
    const from30 = new Date(now.getTime() - 30 * DAY_MS);
    const [businesses, newBusinesses, users, customers, orders, recentBusinesses] =
      await Promise.all([
        this.prisma.empresa.count(),
        this.prisma.empresa.count({ where: { createdAt: { gte: from30 } } }),
        this.prisma.membership.count({ where: { status: MembershipStatus.ACTIVE } }),
        this.prisma.cliente.count(),
        this.prisma.pedido.count(),
        this.prisma.empresa.findMany({
          select: { id: true, nombre: true, slug: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);
    return {
      generatedAt: now.toISOString(),
      metrics: { businesses, newBusinesses, users, customers, orders },
      recentBusinesses,
    };
  }

  async listBusinesses(query: { search?: string; page?: number }, now = new Date()) {
    const search = query.search?.trim();
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const where: Prisma.EmpresaWhereInput = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.empresa.count({ where }),
      this.prisma.empresa.findMany({
        where,
        select: { id: true, nombre: true, slug: true, createdAt: true, configuracion: true },
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
    ]);
    const stats = await this.stats(
      rows.map((r) => r.id),
      now,
    );
    return {
      total,
      page,
      pageSize: PAGE_SIZE,
      items: rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        slug: r.slug,
        createdAt: r.createdAt,
        cobraOnline: mercadoPagoConnected(r.configuracion),
        ...stats.get(r.id)!,
      })),
    };
  }

  async businessDetail(businessId: string, viewerUsuarioId: string, now = new Date()) {
    const business = await this.prisma.empresa.findUnique({
      where: { id: businessId },
      select: { id: true, nombre: true, slug: true, createdAt: true, configuracion: true },
    });
    if (!business) throw new NotFoundException('Negocio no encontrado');
    const from30 = new Date(now.getTime() - 30 * DAY_MS);
    const [stats, team, returns, conversations, sales30, orders30] = await Promise.all([
      this.stats([businessId], now),
      this.prisma.membership.groupBy({
        by: ['role'],
        where: { businessId, status: MembershipStatus.ACTIVE },
        _count: { _all: true },
      }),
      this.prisma.devolucionCliente.count({ where: { empresaId: businessId } }),
      this.prisma.conversation.count({ where: { businessId, deletedAt: null } }),
      this.prisma.venta.aggregate({
        where: { empresaId: businessId, estado: { not: 'ANULADA' }, createdAt: { gte: from30 } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.pedido.aggregate({
        where: { empresaId: businessId, ...soldOrdersWhere(from30) },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);
    const contact =
      ((business.configuracion ?? {}) as { negocio?: Record<string, unknown> }).negocio ?? {};
    // Written to the Business's own audit log: its Owner can see that Wapsell looked.
    await this.prisma.auditLog.create({
      data: {
        empresaId: businessId,
        usuarioId: viewerUsuarioId,
        accion: 'PLATFORM_VIEW',
        entidadAfectada: 'Empresa',
        entidadId: businessId,
      },
    });
    return {
      id: business.id,
      nombre: business.nombre,
      slug: business.slug,
      createdAt: business.createdAt,
      cobraOnline: mercadoPagoConnected(business.configuracion),
      telefono: typeof contact.telefono === 'string' ? contact.telefono : '',
      direccion: typeof contact.direccion === 'string' ? contact.direccion : '',
      ...stats.get(businessId)!,
      equipoPorRol: Object.fromEntries(team.map((t) => [t.role, t._count._all])),
      devoluciones: returns,
      conversaciones: conversations,
      ultimos30: {
        mostrador: { operaciones: sales30._count._all, total: Number(sales30._sum.total ?? 0) },
        tienda: { operaciones: orders30._count._all, total: Number(orders30._sum.total ?? 0) },
      },
    };
  }

  /** Per Business: Owner, team size, counts, sold in the last 30 days and last activity. */
  private async stats(ids: string[], now: Date) {
    const from30 = new Date(now.getTime() - 30 * DAY_MS);
    const byBusiness = { in: ids };
    const [
      owners,
      team,
      products,
      customers,
      orders,
      sales,
      soldOrders,
      lastSale,
      lastOrder,
      lastMessage,
    ] = await Promise.all([
      this.prisma.membership.findMany({
        where: { businessId: byBusiness, role: 'OWNER', status: MembershipStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
        select: { businessId: true, User: { select: { nombre: true, email: true } } },
      }),
      this.prisma.membership.groupBy({
        by: ['businessId'],
        where: { businessId: byBusiness, status: MembershipStatus.ACTIVE },
        _count: { _all: true },
      }),
      this.prisma.producto.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness, activo: true },
        _count: { _all: true },
      }),
      this.prisma.cliente.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness },
        _count: { _all: true },
      }),
      this.prisma.pedido.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness },
        _count: { _all: true },
      }),
      this.prisma.venta.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness, estado: { not: 'ANULADA' }, createdAt: { gte: from30 } },
        _sum: { total: true },
      }),
      this.prisma.pedido.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness, ...soldOrdersWhere(from30) },
        _sum: { total: true },
      }),
      this.prisma.venta.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness },
        _max: { createdAt: true },
      }),
      this.prisma.pedido.groupBy({
        by: ['empresaId'],
        where: { empresaId: byBusiness },
        _max: { createdAt: true },
      }),
      this.prisma.message.groupBy({
        by: ['businessId'],
        where: { businessId: byBusiness },
        _max: { createdAt: true },
      }),
    ]);
    const count = <T extends { _count: { _all: number } }>(rows: T[], key: (r: T) => string) =>
      new Map(rows.map((r) => [key(r), r._count._all]));
    const teamOf = count(team, (r) => r.businessId);
    const productsOf = count(products, (r) => r.empresaId);
    const customersOf = count(customers, (r) => r.empresaId);
    const ordersOf = count(orders, (r) => r.empresaId);
    const salesOf = new Map(sales.map((r) => [r.empresaId, Number(r._sum.total ?? 0)]));
    const soldOrdersOf = new Map(soldOrders.map((r) => [r.empresaId, Number(r._sum.total ?? 0)]));
    const latest = new Map<string, Date>();
    for (const [id, at] of [
      ...lastSale.map((r) => [r.empresaId, r._max.createdAt] as const),
      ...lastOrder.map((r) => [r.empresaId, r._max.createdAt] as const),
      ...lastMessage.map((r) => [r.businessId, r._max.createdAt] as const),
    ]) {
      if (at && (!latest.has(id) || latest.get(id)! < at)) latest.set(id, at);
    }
    const ownerOf = new Map<string, { nombre: string; email: string }>();
    for (const o of owners) if (!ownerOf.has(o.businessId)) ownerOf.set(o.businessId, o.User);
    return new Map(
      ids.map((id) => [
        id,
        {
          owner: ownerOf.get(id) ?? null,
          equipo: teamOf.get(id) ?? 0,
          productos: productsOf.get(id) ?? 0,
          clientes: customersOf.get(id) ?? 0,
          pedidos: ordersOf.get(id) ?? 0,
          vendido30: Math.round(((salesOf.get(id) ?? 0) + (soldOrdersOf.get(id) ?? 0)) * 100) / 100,
          ultimaActividad: latest.get(id) ?? null,
        },
      ]),
    );
  }
}
