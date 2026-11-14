import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const TZ = 'America/Argentina/Buenos_Aires';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;
/** OR-B4-035 rule 2: credit from a return used on an exchange sale; not money coming in. */
const EXCHANGE_METHOD = 'cambio';

const round2 = (n: number) => Math.round(n * 100) / 100;

const SALE_CHANNELS: Record<string, string> = {
  presencial: 'Mostrador',
  mayorista: 'Mayorista',
  online: 'Online',
};
const ORDER_CHANNELS: Record<string, string> = {
  messaging: 'Mensajes',
  web: 'Tienda online',
  tienda: 'Tienda online',
  WhatsApp: 'WhatsApp',
};

type Line = {
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  descuentoItem: Prisma.Decimal;
  descuentoFidelizacionPorcentaje: Prisma.Decimal | null;
  Producto: { nombre: string };
};

/** Amount of one line after the customer's discount and the line discount. */
const lineAmount = (l: Line) =>
  Number(l.precioUnitario) *
    Number(l.cantidad) *
    (1 -
      (l.descuentoFidelizacionPorcentaje ? Number(l.descuentoFidelizacionPorcentaje) : 0) / 100) -
  Number(l.descuentoItem);

/** YYYY-MM-DD of an instant, in Argentina. */
const dayOf = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

/**
 * Reportes (OR-B4-036): what the Business sold in a period, net of returns.
 *  - Sold: counter sales not cancelled + store orders paid or delivered (not cancelled), by
 *    their stored total (already net of discounts).
 *  - Returns: refunds made or left to make by hand (EXITO, PENDIENTE_MANUAL), including the
 *    credit used on exchanges, whose new sale counts as sold.
 *  - Net = sold − returns. Ticket, channels, payment methods and products use the same set.
 * Days are Argentina days. Every query is scoped by the Business.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `desde`/`hasta` (YYYY-MM-DD, both included, Argentina) as an instant range [from, to). */
  range(desde: string, hasta: string) {
    const valid = /^\d{4}-\d{2}-\d{2}$/;
    if (!valid.test(desde) || !valid.test(hasta)) {
      throw new BadRequestException('Las fechas van como AAAA-MM-DD.');
    }
    const from = new Date(`${desde}T00:00:00-03:00`);
    const to = new Date(new Date(`${hasta}T00:00:00-03:00`).getTime() + DAY_MS);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
      throw new BadRequestException('El período no es válido.');
    }
    if ((to.getTime() - from.getTime()) / DAY_MS > MAX_DAYS) {
      throw new BadRequestException(`El período puede tener como máximo ${MAX_DAYS} días.`);
    }
    return { from, to };
  }

  private async totals(companyId: string, from: Date, to: Date) {
    const lineSelect = {
      productoId: true,
      cantidad: true,
      precioUnitario: true,
      descuentoItem: true,
      descuentoFidelizacionPorcentaje: true,
      Producto: { select: { nombre: true } },
    } as const;
    const [sales, orders, refunds] = await Promise.all([
      this.prisma.venta.findMany({
        where: {
          empresaId: companyId,
          estado: { not: 'ANULADA' },
          createdAt: { gte: from, lt: to },
        },
        select: {
          total: true,
          canal: true,
          createdAt: true,
          VentaItem: { select: lineSelect },
          Pago: { where: { estado: 'APROBADO' }, select: { medio: true, monto: true } },
        },
      }),
      this.prisma.pedido.findMany({
        where: {
          empresaId: companyId,
          estado: { not: 'CANCELADO' },
          createdAt: { gte: from, lt: to },
          OR: [{ estado: 'ENTREGADO' }, { Pago: { some: { estado: 'APROBADO' } } }],
        },
        select: {
          total: true,
          canalOrigen: true,
          createdAt: true,
          PedidoItem: { select: lineSelect },
          Pago: { where: { estado: 'APROBADO' }, select: { medio: true, monto: true } },
        },
      }),
      this.prisma.reembolso.findMany({
        where: {
          empresaId: companyId,
          estado: { in: ['EXITO', 'PENDIENTE_MANUAL'] },
          createdAt: { gte: from, lt: to },
        },
        select: { montoActual: true, createdAt: true },
      }),
    ]);

    const tx = [
      ...sales.map((s) => ({
        total: Number(s.total),
        canal: SALE_CHANNELS[s.canal] ?? s.canal,
        createdAt: s.createdAt,
        lines: s.VentaItem,
        pagos: s.Pago,
      })),
      ...orders.map((o) => ({
        total: Number(o.total),
        canal: ORDER_CHANNELS[o.canalOrigen] ?? o.canalOrigen,
        createdAt: o.createdAt,
        lines: o.PedidoItem,
        pagos: o.Pago,
      })),
    ];
    const vendido = round2(tx.reduce((sum, t) => sum + t.total, 0));
    const devoluciones = round2(refunds.reduce((sum, r) => sum + Number(r.montoActual), 0));
    return { tx, refunds, vendido, devoluciones, neto: round2(vendido - devoluciones) };
  }

  async summary(companyId: string, desde: string, hasta: string) {
    const { from, to } = this.range(desde, hasta);
    const span = to.getTime() - from.getTime();
    const [current, previous] = await Promise.all([
      this.totals(companyId, from, to),
      this.totals(companyId, new Date(from.getTime() - span), from),
    ]);
    const { tx, refunds, vendido, devoluciones, neto } = current;
    const operaciones = tx.length;

    const byDay = new Map<string, { vendido: number; devoluciones: number }>();
    for (let t = from.getTime(); t < to.getTime(); t += DAY_MS) {
      byDay.set(dayOf(new Date(t + 12 * 60 * 60 * 1000)), { vendido: 0, devoluciones: 0 });
    }
    for (const t of tx) {
      const d = byDay.get(dayOf(t.createdAt));
      if (d) d.vendido += t.total;
    }
    for (const r of refunds) {
      const d = byDay.get(dayOf(r.createdAt));
      if (d) d.devoluciones += Number(r.montoActual);
    }

    const channels = new Map<string, { operaciones: number; vendido: number }>();
    const methods = new Map<string, number>();
    const products = new Map<string, { nombre: string; cantidad: number; vendido: number }>();
    for (const t of tx) {
      const c = channels.get(t.canal) ?? { operaciones: 0, vendido: 0 };
      c.operaciones += 1;
      c.vendido += t.total;
      channels.set(t.canal, c);
      for (const p of t.pagos) {
        if (p.medio === EXCHANGE_METHOD) continue;
        methods.set(p.medio, (methods.get(p.medio) ?? 0) + Number(p.monto));
      }
      for (const l of t.lines) {
        const p = products.get(l.productoId) ?? {
          nombre: l.Producto.nombre,
          cantidad: 0,
          vendido: 0,
        };
        p.cantidad += Number(l.cantidad);
        p.vendido += lineAmount(l);
        products.set(l.productoId, p);
      }
    }

    return {
      desde,
      hasta,
      vendido,
      devoluciones,
      neto,
      operaciones,
      ticketPromedio: operaciones ? round2(vendido / operaciones) : 0,
      anterior: {
        neto: previous.neto,
        operaciones: previous.tx.length,
        variacion: previous.neto
          ? round2(((neto - previous.neto) / Math.abs(previous.neto)) * 100)
          : null,
      },
      porDia: [...byDay].map(([dia, d]) => ({
        dia,
        vendido: round2(d.vendido),
        devoluciones: round2(d.devoluciones),
        neto: round2(d.vendido - d.devoluciones),
      })),
      porCanal: [...channels]
        .map(([canal, c]) => ({ canal, operaciones: c.operaciones, vendido: round2(c.vendido) }))
        .sort((a, b) => b.vendido - a.vendido),
      porMedio: [...methods]
        .map(([medio, monto]) => ({ medio, monto: round2(monto) }))
        .sort((a, b) => b.monto - a.monto),
      productos: [...products]
        .map(([productoId, p]) => ({
          productoId,
          nombre: p.nombre,
          cantidad: p.cantidad,
          vendido: round2(p.vendido),
        }))
        .sort((a, b) => b.vendido - a.vendido)
        .slice(0, 10),
    };
  }
}
