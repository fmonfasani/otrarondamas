import { Prisma } from '@prisma/client';

/**
 * Phase 6 (RF-06/RF-04): the price the store charges, the product's single discount (if any)
 * applied over precioMinorista, rounded to cents. A price with more precision than makes sense to
 * show or charge is never returned.
 */
export function priceWithDiscount(
  retailPrice: Prisma.Decimal,
  discountPercentage: Prisma.Decimal | null,
): string {
  if (!discountPercentage || discountPercentage.isZero()) {
    return retailPrice.toFixed(2);
  }
  const factor = new Prisma.Decimal(1).minus(discountPercentage.dividedBy(100));
  return retailPrice.times(factor).toFixed(2);
}

/** What the store shows next to a product: the price, the crossed-out one and the discount. */
export function storePrice(retailPrice: Prisma.Decimal, discountPercentage: Prisma.Decimal | null) {
  const discounted = Boolean(discountPercentage && !discountPercentage.isZero());
  return {
    precio: priceWithDiscount(retailPrice, discountPercentage),
    precioSinDescuento: discounted ? retailPrice.toFixed(2) : null,
    descuentoPorcentaje: discounted ? (discountPercentage as Prisma.Decimal).toNumber() : null,
  };
}
