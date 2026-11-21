import { Prisma } from '@prisma/client';
import { bestOffer, type OfferRow } from './offer-price';

/**
 * OR-B4-051 (OR-B4-046 D5, D6), stage C4 — the price of one line. Every discount that may apply is a
 * candidate, and the customer pays the lowest: they never add up. The candidates:
 * - the list price;
 * - the product's own «Descuento %» (every channel);
 * - the best offer in force for the channel;
 * - the wholesale price, for a customer marked as wholesale;
 * - the payment-method discount, at the counter, when the whole sale is paid with that method;
 * - the loyalty discount of the customer's level.
 * On a tie the first one in this order wins (an offer, then the product's discount…), so the line
 * keeps the most specific reason.
 */
export type PriceOrigin =
  'LISTA' | 'DESCUENTO_PRODUCTO' | 'OFERTA' | 'MAYORISTA' | 'MEDIO_PAGO' | 'FIDELIZACION';

export type PriceCandidates = {
  list: Prisma.Decimal;
  productDiscount?: Prisma.Decimal | null;
  offers?: readonly OfferRow[];
  /** The product's wholesale price, only when the customer is wholesale. */
  wholesale?: Prisma.Decimal | null;
  /** The payment-method discount, only when the sale is paid with that method. */
  paymentDiscount?: Prisma.Decimal | null;
  /** The loyalty discount of the customer's level for this line. */
  loyalty?: { reglaId: string; porcentaje: number } | null;
};

export type LinePrice = {
  /** The unit price written on the line. For FIDELIZACION it is the list price (see below). */
  precioUnitario: Prisma.Decimal;
  /** What the customer pays per unit, whatever the reason. */
  precioEfectivo: Prisma.Decimal;
  origen: PriceOrigin;
  ofertaId: string | null;
  /**
   * When loyalty wins, the line keeps the list price and the percent, as lines always did (reports
   * and returns read the percent); otherwise both are null.
   */
  descuentoFidelizacionPorcentaje: number | null;
  reglaFidelizacionId: string | null;
};

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);
const off = (list: Prisma.Decimal, percent: Prisma.Decimal.Value) =>
  list.times(HUNDRED.minus(percent)).dividedBy(HUNDRED).toDecimalPlaces(2);

export function bestLinePrice(c: PriceCandidates): LinePrice {
  const list = c.list.toDecimalPlaces(2);
  type Option = { origen: PriceOrigin; price: Prisma.Decimal; ofertaId?: string };
  const options: Option[] = [];
  const offer = bestOffer(list, c.offers ?? []);
  if (offer) options.push({ origen: 'OFERTA', price: offer.price, ofertaId: offer.offer.id });
  if (c.productDiscount && c.productDiscount.gt(ZERO)) {
    options.push({ origen: 'DESCUENTO_PRODUCTO', price: off(list, c.productDiscount) });
  }
  if (c.wholesale && c.wholesale.gt(ZERO)) {
    options.push({ origen: 'MAYORISTA', price: c.wholesale.toDecimalPlaces(2) });
  }
  if (c.paymentDiscount && c.paymentDiscount.gt(ZERO)) {
    options.push({ origen: 'MEDIO_PAGO', price: off(list, c.paymentDiscount) });
  }
  if (c.loyalty && c.loyalty.porcentaje > 0) {
    options.push({ origen: 'FIDELIZACION', price: off(list, c.loyalty.porcentaje) });
  }
  let best: Option = { origen: 'LISTA', price: list };
  for (const option of options) {
    if (option.price.lt(best.price) && option.price.gt(ZERO)) best = option;
  }
  const loyaltyWins = best.origen === 'FIDELIZACION';
  return {
    precioUnitario: loyaltyWins ? list : best.price,
    precioEfectivo: best.price,
    origen: best.origen,
    ofertaId: best.ofertaId ?? null,
    descuentoFidelizacionPorcentaje: loyaltyWins ? (c.loyalty?.porcentaje ?? null) : null,
    reglaFidelizacionId: loyaltyWins ? (c.loyalty?.reglaId ?? null) : null,
  };
}
