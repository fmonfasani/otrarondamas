import { Prisma } from '@prisma/client';

/**
 * OR-B4-046 §4.4 (D4) and D5, stage C3 — the price an offer leaves, and which price the customer
 * pays when there are several. Offers and the product's own discount never add up: the lowest
 * price wins (the best one for the customer). Pure: the offers come already filtered to the ones
 * in force for the product, the moment and the channel.
 */
export type OfferRow = {
  id: string;
  nombre: string;
  tipo: 'PORCENTAJE' | 'PRECIO';
  descuentoPorcentaje: Prisma.Decimal | null;
  precioOferta: Prisma.Decimal | null;
  hasta: Date;
};

const ZERO = new Prisma.Decimal(0);
const HUNDRED = new Prisma.Decimal(100);

/** The price of one product under one offer, in cents. */
export function offerPrice(listPrice: Prisma.Decimal, offer: OfferRow): Prisma.Decimal {
  if (offer.tipo === 'PRECIO') return (offer.precioOferta ?? listPrice).toDecimalPlaces(2);
  const off = offer.descuentoPorcentaje ?? ZERO;
  return listPrice.times(HUNDRED.minus(off)).dividedBy(HUNDRED).toDecimalPlaces(2);
}

/** The offer with the lowest price, when it is below the list price. */
export function bestOffer(
  listPrice: Prisma.Decimal,
  offers: readonly OfferRow[],
): { offer: OfferRow; price: Prisma.Decimal } | null {
  let best: { offer: OfferRow; price: Prisma.Decimal } | null = null;
  for (const offer of offers) {
    const price = offerPrice(listPrice, offer);
    if (price.gte(listPrice) || price.lte(ZERO)) continue;
    if (!best || price.lt(best.price)) best = { offer, price };
  }
  return best;
}

export type PriceShown = {
  /** What the customer pays, with 2 decimals. */
  precio: string;
  /** The list price, crossed out, when something lowers it. */
  precioSinDescuento: string | null;
  /** How much lower, in whole percent, when something lowers it. */
  descuentoPorcentaje: number | null;
  /** The offer that set the price, if it was an offer. */
  oferta: { id: string; nombre: string; hasta: string } | null;
};

/**
 * The price a product is sold at: the list price, its own discount (`productDiscount`, the store's
 * «Descuento %»; null where it does not apply) or the best offer, whichever is lowest.
 */
export function sellingPrice(
  listPrice: Prisma.Decimal,
  productDiscount: Prisma.Decimal | null,
  offers: readonly OfferRow[],
): PriceShown {
  const discounted =
    productDiscount && productDiscount.gt(ZERO)
      ? listPrice.times(HUNDRED.minus(productDiscount)).dividedBy(HUNDRED).toDecimalPlaces(2)
      : null;
  const best = bestOffer(listPrice, offers);
  if (best && (!discounted || best.price.lt(discounted))) {
    return {
      precio: best.price.toFixed(2),
      precioSinDescuento: listPrice.toFixed(2),
      descuentoPorcentaje: HUNDRED.minus(best.price.times(HUNDRED).dividedBy(listPrice))
        .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
        .toNumber(),
      oferta: {
        id: best.offer.id,
        nombre: best.offer.nombre,
        hasta: best.offer.hasta.toISOString(),
      },
    };
  }
  if (discounted && discounted.lt(listPrice)) {
    return {
      precio: discounted.toFixed(2),
      precioSinDescuento: listPrice.toFixed(2),
      descuentoPorcentaje: (productDiscount as Prisma.Decimal).toNumber(),
      oferta: null,
    };
  }
  return {
    precio: listPrice.toFixed(2),
    precioSinDescuento: null,
    descuentoPorcentaje: null,
    oferta: null,
  };
}

/**
 * The days of an offer, as the business picks them (Argentina, UTC−3, no daylight saving): from the
 * start of `desde` to the end of `hasta`. `hasta` is stored exclusive (the next midnight).
 */
export function offerWindow(desde: string, hasta: string): { desde: Date; hasta: Date } {
  const start = new Date(`${desde}T00:00:00.000-03:00`);
  const end = new Date(`${hasta}T00:00:00.000-03:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { desde: start, hasta: end };
}

/** Where an offer stands at `now`. */
export function offerState(
  offer: { desde: Date; hasta: Date; terminadaEn: Date | null },
  now: Date,
): 'programada' | 'vigente' | 'terminada' {
  if (offer.terminadaEn || offer.hasta <= now) return 'terminada';
  return offer.desde > now ? 'programada' : 'vigente';
}
