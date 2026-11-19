import { BadRequestException } from '@nestjs/common';

/** Where a product stands in the store (OR-B4-046): active, published in the Catálogo, featured. */
export type CatalogFlags = { activo: boolean; publicado: boolean; destacado: boolean };

/**
 * The flags a product ends with after a change. Only an active product is published and only a
 * published one is featured: deactivating takes it out of the store, unpublishing drops the
 * featured mark. Asking for the impossible (publishing an inactive product, featuring one that is
 * not published) is refused instead of silently ignored.
 */
export function nextCatalogFlags(
  current: CatalogFlags,
  change: Partial<CatalogFlags>,
): CatalogFlags {
  const activo = change.activo ?? current.activo;
  if (!activo && change.publicado === true) {
    throw new BadRequestException('Un producto inactivo no se publica en la tienda.');
  }
  const publicado = activo && (change.publicado ?? current.publicado);
  if (!publicado && change.destacado === true) {
    throw new BadRequestException('Solo un producto publicado en la tienda puede ser destacado.');
  }
  const destacado = publicado && (change.destacado ?? current.destacado);
  return { activo, publicado, destacado };
}

/** A new product: active unless told otherwise, and outside the store until someone publishes it. */
export const NEW_PRODUCT_FLAGS: CatalogFlags = { activo: true, publicado: false, destacado: false };
