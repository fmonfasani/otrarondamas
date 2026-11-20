import { Prisma } from '@prisma/client';
import type { AuditEntry } from '../auditoria/audit-catalog';
import type { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';

const ZERO = new Prisma.Decimal(0);

export type CostState = {
  costo: Prisma.Decimal;
  costoPromedio: Prisma.Decimal | null;
  precioMinorista: Prisma.Decimal;
  precioSugerido: Prisma.Decimal | null;
};

export type CostEntry = { cantidad: Prisma.Decimal.Value; costoUnitario: Prisma.Decimal.Value };

/**
 * OR-B4-046 stage C1 — what an entry of goods with a cost (a purchase reception, the opening stock)
 * does to the product's cost (ADR-DAT-009) and price (D10):
 * - `costo` becomes the last cost;
 * - `costoPromedio` is the moving weighted average of the stock on hand and what enters. With no
 *   stock on hand (or less than none), it starts over at the new cost;
 * - when the last cost changes, `precioSugerido` is the price that keeps the product's markup over
 *   cost, rounded to whole pesos. It is a suggestion: the price itself never changes here. No
 *   suggestion when the old cost was zero, or when the suggested price is the current one.
 */
export function costAfterEntry(
  product: CostState,
  stockOnHand: Prisma.Decimal.Value,
  entry: CostEntry,
): CostState {
  const quantity = new Prisma.Decimal(entry.cantidad);
  const cost = new Prisma.Decimal(entry.costoUnitario);
  const onHand = Prisma.Decimal.max(new Prisma.Decimal(stockOnHand), ZERO);
  const previousAverage = product.costoPromedio ?? product.costo;
  const total = onHand.plus(quantity);
  const average = total.lte(ZERO)
    ? cost
    : onHand.times(previousAverage).plus(quantity.times(cost)).dividedBy(total);

  return {
    costo: cost,
    costoPromedio: average.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP),
    precioMinorista: product.precioMinorista,
    precioSugerido: suggestedPrice(product, cost),
  };
}

/**
 * D10: after the last cost goes from `product.costo` to `cost`, the price that keeps the markup,
 * rounded to whole pesos. The suggestion already pending stays when the cost did not change; there
 * is none when the old cost was zero or when it would be the current price.
 */
export function suggestedPrice(
  product: Pick<CostState, 'costo' | 'precioMinorista' | 'precioSugerido'>,
  cost: Prisma.Decimal,
): Prisma.Decimal | null {
  if (cost.equals(product.costo)) return product.precioSugerido;
  if (product.costo.lte(ZERO)) return product.precioSugerido;
  // A pending suggestion already carries the markup for the current cost: chain from it.
  const base = product.precioSugerido ?? product.precioMinorista;
  const price = base
    .times(cost)
    .dividedBy(product.costo)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  return price.equals(product.precioMinorista) ? null : price;
}

/**
 * ADR-DAT-009: what leaves the stock (a sale, an adjustment, a count) is valued at the product's
 * average cost; before anything entered with a cost, at its cost.
 */
export function valuationCost(product: {
  costo: Prisma.Decimal;
  costoPromedio: Prisma.Decimal | null;
}): Prisma.Decimal {
  return product.costoPromedio ?? product.costo;
}

/** Markup over cost, in percent with one decimal; null when the cost is zero. */
export function markupPercent(
  price: Prisma.Decimal.Value,
  cost: Prisma.Decimal.Value,
): number | null {
  const c = new Prisma.Decimal(cost);
  if (c.lte(ZERO)) return null;
  return new Prisma.Decimal(price).minus(c).dividedBy(c).times(100).toDecimalPlaces(1).toNumber();
}

const plain = (v: Prisma.Decimal | null) => (v === null ? null : v.toNumber());

/** The audit entry of a cost change (OR-B4-041: every cost and price change is recorded). */
export function costAuditEntry(
  product: { id: string; nombre: string },
  before: CostState,
  after: CostState,
  motivo: string,
): AuditEntry | null {
  const changed =
    !before.costo.equals(after.costo) ||
    plain(before.costoPromedio) !== plain(after.costoPromedio) ||
    plain(before.precioSugerido) !== plain(after.precioSugerido);
  if (!changed) return null;
  return {
    accion: 'PRODUCTO_COSTO_CAMBIADO',
    entidad: 'Producto',
    entidadId: product.id,
    antes: {
      nombre: product.nombre,
      costo: before.costo.toNumber(),
      costoPromedio: plain(before.costoPromedio),
      precioSugerido: plain(before.precioSugerido),
    },
    despues: {
      nombre: product.nombre,
      costo: after.costo.toNumber(),
      costoPromedio: plain(after.costoPromedio),
      precioMinorista: after.precioMinorista.toNumber(),
      precioSugerido: plain(after.precioSugerido),
    },
    motivo,
  };
}

type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];

export type CostedEntry = CostEntry & { productoId: string };

/**
 * Applies {@link costAfterEntry} to every entry, in order, inside the caller's transaction, BEFORE
 * the entries' lots are created (the stock on hand is read once and carried forward). Returns the
 * audit entries of the products whose cost changed.
 */
export async function applyEntryCosts(
  tx: CompanyScopedTx,
  entries: readonly CostedEntry[],
  motivo: string,
): Promise<AuditEntry[]> {
  const ids = [...new Set(entries.map((e) => e.productoId))];
  if (ids.length === 0) return [];
  const products = await tx.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nombre: true,
      costo: true,
      costoPromedio: true,
      precioMinorista: true,
      precioSugerido: true,
    },
  });
  const lots = await tx.lote.findMany({
    where: { productoId: { in: ids } },
    select: { productoId: true, cantidad: true },
  });
  const stock = new Map<string, Prisma.Decimal>();
  for (const lot of lots) {
    stock.set(lot.productoId, (stock.get(lot.productoId) ?? ZERO).plus(lot.cantidad));
  }
  const state = new Map<string, CostState>(products.map((p) => [p.id, p]));
  const before = new Map(state);
  for (const entry of entries) {
    const current = state.get(entry.productoId);
    if (!current) continue;
    const onHand = stock.get(entry.productoId) ?? ZERO;
    state.set(entry.productoId, costAfterEntry(current, onHand, entry));
    stock.set(entry.productoId, onHand.plus(entry.cantidad));
  }
  const audit: AuditEntry[] = [];
  for (const product of products) {
    const first = before.get(product.id)!;
    // Several lines of one product in one entry: the suggestion compares with the cost before all of them.
    const last = state.get(product.id)!;
    const after = { ...last, precioSugerido: suggestedPrice(first, last.costo) };
    const entry = costAuditEntry(product, first, after, motivo);
    if (!entry) continue;
    await tx.producto.update({
      where: { id: product.id },
      data: {
        costo: after.costo,
        costoPromedio: after.costoPromedio,
        precioSugerido: after.precioSugerido,
      },
    });
    audit.push(entry);
  }
  return audit;
}
