import type { CompanyScopedPrismaService } from '../prisma/company-scoped-prisma.service';
import type { OfferRow } from './offer-price';

type CompanyScopedClient = ReturnType<CompanyScopedPrismaService['forCompany']>;
type CompanyScopedTx = Parameters<Parameters<CompanyScopedClient['$transaction']>[0]>[0];
/** The business's scoped client, or a transaction of it: both read offers the same way. */
type Reader = Pick<CompanyScopedTx, 'oferta'>;

/** Where the sale happens: the store sees every offer; the counter and the chat skip «solo tienda». */
export type SalesChannel = 'tienda' | 'mostrador';

/**
 * OR-B4-046 §4.4, stage C3 — the offers in force at `now` for each product, by product or by its
 * category. Read through the business's scoped client, so another business's offers never apply.
 */
export async function currentOffers(
  db: Reader,
  products: ReadonlyArray<{ id: string; familiaId: string }>,
  channel: SalesChannel,
  now: Date = new Date(),
): Promise<Map<string, OfferRow[]>> {
  const byProduct = new Map<string, OfferRow[]>();
  if (products.length === 0) return byProduct;
  const ids = products.map((p) => p.id);
  const families = [...new Set(products.map((p) => p.familiaId))];
  const offers = await db.oferta.findMany({
    where: {
      desde: { lte: now },
      hasta: { gt: now },
      terminadaEn: null,
      ...(channel === 'tienda' ? {} : { soloTienda: false }),
      OR: [
        { familiaId: { in: families } },
        { OfertaProducto: { some: { productoId: { in: ids } } } },
      ],
    },
    select: {
      id: true,
      nombre: true,
      tipo: true,
      descuentoPorcentaje: true,
      precioOferta: true,
      hasta: true,
      familiaId: true,
      OfertaProducto: { where: { productoId: { in: ids } }, select: { productoId: true } },
    },
  });
  for (const product of products) {
    const own = offers.filter(
      (o) =>
        o.familiaId === product.familiaId ||
        o.OfertaProducto.some((link) => link.productoId === product.id),
    );
    if (own.length > 0) byProduct.set(product.id, own);
  }
  return byProduct;
}
