import { Prisma } from '@prisma/client';

/**
 * OR-B4-046 §4.3, stage C2 — a bulk price update: the same rule for many products at once.
 * - `porcentaje`: the current price goes up (or down, with a negative value) by that percent;
 * - `margen`: the price is the last cost plus that markup over cost (the same reading of the
 *   margin as stage C1: «Ganancia: X % sobre el costo»).
 * The result is rounded to the nearest multiple of `redondeo` (1, 10 or 100 pesos).
 */
export type PriceRule = {
  modo: 'porcentaje' | 'margen';
  valor: number;
  redondeo: 1 | 10 | 100;
};

const ZERO = new Prisma.Decimal(0);

/** The new price under `rule`, or null when there is none (no cost for a margin, or not above 0). */
export function priceUnder(
  product: { costo: Prisma.Decimal; precioMinorista: Prisma.Decimal },
  rule: PriceRule,
): Prisma.Decimal | null {
  const factor = new Prisma.Decimal(rule.valor).dividedBy(100).plus(1);
  let base: Prisma.Decimal;
  if (rule.modo === 'margen') {
    if (product.costo.lte(ZERO)) return null;
    base = product.costo.times(factor);
  } else {
    base = product.precioMinorista.times(factor);
  }
  const step = new Prisma.Decimal(rule.redondeo);
  const rounded = base.dividedBy(step).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).times(step);
  return rounded.gt(ZERO) ? rounded : null;
}

/** How the audit trail and the panel read the rule. */
export function describeRule(rule: PriceRule): string {
  const value = String(rule.valor).replace('.', ',');
  const what =
    rule.modo === 'margen'
      ? `costo + ${value} %`
      : `${rule.valor >= 0 ? '+' : '−'}${value.replace('-', '')} %`;
  return rule.redondeo === 1 ? what : `${what}, redondeado a $ ${rule.redondeo}`;
}
