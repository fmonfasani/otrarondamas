import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'America/Argentina/Buenos_Aires';

export type HealthAlert = {
  tipo:
    | 'OWNER_SIN_ACCESO'
    | 'SIN_OWNER'
    | 'SIN_ACTIVIDAD'
    | 'SIN_PRODUCTOS'
    | 'LEGAJOS_PENDIENTES'
    | 'DEVOLUCIONES_DEMORADAS'
    | 'SIN_COBROS_ONLINE';
  severidad: 'alta' | 'media' | 'baja';
  detalle: string;
  accion: string;
};

const SEVERITY_ORDER = { alta: 0, media: 1, baja: 2 } as const;

/** Month key YYYY-MM in Argentina, for the last `months` months including the current one. */
function monthKeys(months: number, now: Date) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(local.getFullYear(), local.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** Start of the first month of the window, in UTC (Argentina is UTC-3, no DST). */
const windowStart = (firstKey: string) => new Date(`${firstKey}-01T03:00:00Z`);

/**
 * Wapsell platform insights (OR-B4-038 read-only scope; OR-B4-040): health alerts per
 * Business, monthly activity and growth, feature adoption and the platform's own audit.
 * Aggregates only; never the personal data of the Businesses' customers.
 */
@Injectable()
export class PlatformInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Businesses that need attention, most urgent first. */
  async health(now = new Date()) {
    const businesses = await this.prisma.empresa.findMany({
      select: { id: true, nombre: true, slug: true, createdAt: true, configuracion: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = businesses.map((b) => b.id);
    const since14 = new Date(now.getTime() - 14 * DAY_MS);
    const since2 = new Date(now.getTime() - 2 * DAY_MS);
    const [
      owners,
      products,
      pendingDossiers,
      lateReturns,
      recentSales,
      recentOrders,
      recentMessages,
    ] = await Promise.all([
      this.prisma.membership.findMany({
        where: { businessId: { in: ids }, role: 'OWNER', status: MembershipStatus.ACTIVE },
        select: {
          businessId: true,
          User: { select: { nombre: true, usuarioId: true, googleId: true } },
        },
      }),
      this.prisma.producto.groupBy({
        by: ['empresaId'],
        where: { empresaId: { in: ids }, activo: true },
        _count: { _all: true },
      }),
      this.prisma.usuario.groupBy({
        by: ['empresaId'],
        where: { empresaId: { in: ids }, activo: true, estadoLegajo: 'PENDIENTE' },
        _count: { _all: true },
      }),
      this.prisma.devolucionCliente.groupBy({
        by: ['empresaId'],
        where: {
          empresaId: { in: ids },
          estado: { in: ['SOLICITADA', 'AUTORIZADA', 'RECIBIDA'] },
          updatedAt: { lt: since2 },
        },
        _count: { _all: true },
      }),
      this.prisma.venta.groupBy({
        by: ['empresaId'],
        where: { empresaId: { in: ids }, createdAt: { gte: since14 } },
        _count: { _all: true },
      }),
      this.prisma.pedido.groupBy({
        by: ['empresaId'],
        where: { empresaId: { in: ids }, createdAt: { gte: since14 } },
        _count: { _all: true },
      }),
      this.prisma.message.groupBy({
        by: ['businessId'],
        where: { businessId: { in: ids }, createdAt: { gte: since14 } },
        _count: { _all: true },
      }),
    ]);
    const counts = <T extends { _count: { _all: number } }>(rows: T[], key: (r: T) => string) =>
      new Map(rows.map((r) => [key(r), r._count._all]));
    const productsOf = counts(products, (r) => r.empresaId);
    const dossiersOf = counts(pendingDossiers, (r) => r.empresaId);
    const returnsOf = counts(lateReturns, (r) => r.empresaId);
    const active = new Set([
      ...recentSales.map((r) => r.empresaId),
      ...recentOrders.map((r) => r.empresaId),
      ...recentMessages.map((r) => r.businessId),
    ]);
    // The password lives on the legacy Usuario row (login and the welcome link use it).
    const accounts = await this.prisma.usuario.findMany({
      where: {
        id: { in: owners.map((o) => o.User.usuarioId).filter((x): x is string => Boolean(x)) },
      },
      select: { id: true, passwordHash: true, googleId: true },
    });
    const accountOf = new Map(accounts.map((a) => [a.id, a]));
    const ownersOf = new Map<string, Array<{ nombre: string; sinAcceso: boolean }>>();
    for (const o of owners) {
      const list = ownersOf.get(o.businessId) ?? [];
      const u = o.User.usuarioId ? accountOf.get(o.User.usuarioId) : undefined;
      const access = Boolean(u?.passwordHash || u?.googleId || o.User.googleId);
      list.push({ nombre: o.User.nombre, sinAcceso: !access });
      ownersOf.set(o.businessId, list);
    }

    const items = businesses
      .map((b) => {
        const alerts: HealthAlert[] = [];
        const ownerList = ownersOf.get(b.id) ?? [];
        const ageDays = Math.floor((now.getTime() - b.createdAt.getTime()) / DAY_MS);
        if (ownerList.length === 0) {
          alerts.push({
            tipo: 'SIN_OWNER',
            severidad: 'alta',
            detalle: 'No tiene un Owner activo.',
            accion: 'Revisar quién administra el negocio.',
          });
        } else if (ownerList.every((o) => o.sinAcceso)) {
          alerts.push({
            tipo: 'OWNER_SIN_ACCESO',
            severidad: 'alta',
            detalle: `${ownerList[0].nombre} todavía no creó su contraseña.`,
            accion: 'Reenviarle el enlace o pedirle que use «Olvidé mi contraseña».',
          });
        }
        if (ageDays >= 7 && !active.has(b.id)) {
          alerts.push({
            tipo: 'SIN_ACTIVIDAD',
            severidad: 'media',
            detalle: 'Sin ventas, pedidos ni mensajes en 14 días.',
            accion: 'Contactar al Owner para ver si necesita ayuda.',
          });
        }
        if ((productsOf.get(b.id) ?? 0) === 0) {
          alerts.push({
            tipo: 'SIN_PRODUCTOS',
            severidad: 'media',
            detalle: 'No tiene productos activos.',
            accion: 'Ayudarlo a cargar su catálogo.',
          });
        }
        const dossiers = dossiersOf.get(b.id) ?? 0;
        if (dossiers > 0) {
          alerts.push({
            tipo: 'LEGAJOS_PENDIENTES',
            severidad: 'media',
            detalle: `${dossiers} ${dossiers === 1 ? 'persona espera' : 'personas esperan'} que el Owner apruebe su legajo.`,
            accion: 'Recordarle al Owner que los apruebe en Equipo.',
          });
        }
        const late = returnsOf.get(b.id) ?? 0;
        if (late > 0) {
          alerts.push({
            tipo: 'DEVOLUCIONES_DEMORADAS',
            severidad: 'media',
            detalle: `${late} ${late === 1 ? 'devolución lleva' : 'devoluciones llevan'} más de 2 días sin avanzar.`,
            accion: 'Avisarle al Owner: el cliente está esperando.',
          });
        }
        const mp = ((b.configuracion ?? {}) as { mercadoPago?: { userId?: unknown } }).mercadoPago;
        if (!mp?.userId) {
          alerts.push({
            tipo: 'SIN_COBROS_ONLINE',
            severidad: 'baja',
            detalle: 'No conectó Mercado Pago: sus clientes no pagan online.',
            accion: 'Contarle cómo conectar Cobros.',
          });
        }
        alerts.sort((x, y) => SEVERITY_ORDER[x.severidad] - SEVERITY_ORDER[y.severidad]);
        return { id: b.id, nombre: b.nombre, slug: b.slug, alertas: alerts };
      })
      .filter((b) => b.alertas.length > 0)
      .sort(
        (x, y) =>
          SEVERITY_ORDER[x.alertas[0].severidad] - SEVERITY_ORDER[y.alertas[0].severidad] ||
          y.alertas.length - x.alertas.length,
      );
    const resumen = { alta: 0, media: 0, baja: 0 };
    for (const b of items) for (const a of b.alertas) resumen[a.severidad] += 1;
    return { negocios: businesses.length, conAlertas: items.length, resumen, items };
  }

  /** Month by month (Argentina): new and active Businesses, sold, orders and messages. */
  async activity(months = 6, now = new Date()) {
    const span = Math.min(Math.max(Math.floor(months) || 6, 1), 24);
    const keys = monthKeys(span, now);
    const from = windowStart(keys[0]);
    const month = (column: string) =>
      Prisma.raw(
        `to_char(date_trunc('month', "${column}" AT TIME ZONE 'UTC' AT TIME ZONE '${TZ}'), 'YYYY-MM')`,
      );
    type Row = { m: string; n: number; v: number };
    const [created, sales, orders, messages, activeRows] = await Promise.all([
      this.prisma.$queryRaw<
        Row[]
      >`SELECT ${month('createdAt')} AS m, count(*)::int AS n, 0::float AS v
        FROM "Empresa" WHERE "createdAt" >= ${from} GROUP BY 1`,
      this.prisma.$queryRaw<
        Row[]
      >`SELECT ${month('createdAt')} AS m, count(*)::int AS n, coalesce(sum(total), 0)::float AS v
        FROM "Venta" WHERE estado::text <> 'ANULADA' AND "createdAt" >= ${from} GROUP BY 1`,
      this.prisma.$queryRaw<Row[]>`SELECT ${month('createdAt')} AS m, count(*)::int AS n,
        coalesce(sum(CASE WHEN p.estado::text <> 'CANCELADO' AND (p.estado::text = 'ENTREGADO'
          OR EXISTS (SELECT 1 FROM "Pago" g WHERE g."pedidoId" = p.id AND g.estado::text = 'APROBADO')) THEN p.total ELSE 0 END), 0)::float AS v
        FROM "Pedido" p WHERE p."createdAt" >= ${from} GROUP BY 1`,
      this.prisma.$queryRaw<
        Row[]
      >`SELECT ${month('createdAt')} AS m, count(*)::int AS n, 0::float AS v
        FROM "Message" WHERE "createdAt" >= ${from} GROUP BY 1`,
      this.prisma.$queryRaw<Row[]>`SELECT m, count(DISTINCT b)::int AS n, 0::float AS v FROM (
          SELECT ${month('createdAt')} AS m, "empresaId" AS b FROM "Venta" WHERE "createdAt" >= ${from}
          UNION ALL SELECT ${month('createdAt')}, "empresaId" FROM "Pedido" WHERE "createdAt" >= ${from}
          UNION ALL SELECT ${month('createdAt')}, "businessId" FROM "Message" WHERE "createdAt" >= ${from}
        ) a GROUP BY m`,
    ]);
    const byMonth = (rows: Row[]) => new Map(rows.map((r) => [r.m, r]));
    const c = byMonth(created);
    const s = byMonth(sales);
    const o = byMonth(orders);
    const msg = byMonth(messages);
    const act = byMonth(activeRows);
    const meses = keys.map((k) => ({
      mes: k,
      negociosNuevos: c.get(k)?.n ?? 0,
      negociosActivos: act.get(k)?.n ?? 0,
      vendido: Math.round(((s.get(k)?.v ?? 0) + (o.get(k)?.v ?? 0)) * 100) / 100,
      ventas: s.get(k)?.n ?? 0,
      pedidos: o.get(k)?.n ?? 0,
      mensajes: msg.get(k)?.n ?? 0,
    }));
    return { meses };
  }

  /** How many Businesses use each part of Wapsell (in the last 30 days where it is an activity). */
  async adoption(now = new Date()) {
    const since30 = new Date(now.getTime() - 30 * DAY_MS);
    const total = await this.prisma.empresa.count();
    const recent = { createdAt: { gte: since30 } };
    const [mostrador, tienda, chat, devoluciones, configs] = await Promise.all([
      this.prisma.venta.findMany({
        where: recent,
        distinct: ['empresaId'],
        select: { empresaId: true },
      }),
      this.prisma.pedido.findMany({
        where: recent,
        distinct: ['empresaId'],
        select: { empresaId: true },
      }),
      this.prisma.message.findMany({
        where: recent,
        distinct: ['businessId'],
        select: { businessId: true },
      }),
      this.prisma.devolucionCliente.findMany({
        where: recent,
        distinct: ['empresaId'],
        select: { empresaId: true },
      }),
      this.prisma.empresa.findMany({ select: { configuracion: true } }),
    ]);
    let cobros = 0;
    let respuestas = 0;
    let contacto = 0;
    for (const { configuracion } of configs) {
      const cfg = (configuracion ?? {}) as {
        mercadoPago?: { userId?: unknown };
        respuestasRapidas?: unknown[];
        negocio?: Record<string, unknown>;
      };
      if (cfg.mercadoPago?.userId) cobros += 1;
      if (Array.isArray(cfg.respuestasRapidas) && cfg.respuestasRapidas.length > 0) respuestas += 1;
      if (cfg.negocio && Object.values(cfg.negocio).some((v) => typeof v === 'string' && v.trim()))
        contacto += 1;
    }
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    const funciones = [
      {
        clave: 'mostrador',
        nombre: 'Ventas en el mostrador',
        periodo: '30 días',
        negocios: mostrador.length,
      },
      {
        clave: 'tienda',
        nombre: 'Pedidos (tienda y chat)',
        periodo: '30 días',
        negocios: tienda.length,
      },
      { clave: 'chat', nombre: 'Mensajes', periodo: '30 días', negocios: chat.length },
      {
        clave: 'devoluciones',
        nombre: 'Devoluciones',
        periodo: '30 días',
        negocios: devoluciones.length,
      },
      {
        clave: 'cobros',
        nombre: 'Cobros online conectados',
        periodo: 'configurado',
        negocios: cobros,
      },
      {
        clave: 'respuestas',
        nombre: 'Respuestas rápidas',
        periodo: 'configurado',
        negocios: respuestas,
      },
      {
        clave: 'contacto',
        nombre: 'Datos de contacto en la tienda',
        periodo: 'configurado',
        negocios: contacto,
      },
    ].map((f) => ({ ...f, porcentaje: pct(f.negocios) }));
    return { negocios: total, funciones };
  }

  /** What the Wapsell team did in the platform: views and creations, newest first. */
  async audit(page = 1) {
    const size = 50;
    const current = Math.max(1, Math.floor(page) || 1);
    const where: Prisma.AuditLogWhereInput = { accion: { startsWith: 'PLATFORM_' } };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { fechaHora: 'desc' },
        take: size,
        skip: (current - 1) * size,
        select: { id: true, fechaHora: true, accion: true, empresaId: true, usuarioId: true },
      }),
    ]);
    const [businesses, people] = await Promise.all([
      this.prisma.empresa.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.empresaId))] } },
        select: { id: true, nombre: true },
      }),
      this.prisma.usuario.findMany({
        where: {
          id: {
            in: [...new Set(rows.map((r) => r.usuarioId).filter((x): x is string => Boolean(x)))],
          },
        },
        select: { id: true, nombre: true, email: true },
      }),
    ]);
    const nameOf = new Map(businesses.map((b) => [b.id, b.nombre]));
    const personOf = new Map(people.map((p) => [p.id, p]));
    return {
      total,
      page: current,
      pageSize: size,
      items: rows.map((r) => ({
        id: r.id,
        fecha: r.fechaHora,
        accion: r.accion,
        negocio: { id: r.empresaId, nombre: nameOf.get(r.empresaId) ?? '(borrado)' },
        quien: r.usuarioId ? (personOf.get(r.usuarioId) ?? null) : null,
      })),
    };
  }
}
