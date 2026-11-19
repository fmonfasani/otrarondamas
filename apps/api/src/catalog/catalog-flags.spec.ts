import { BadRequestException } from '@nestjs/common';
import { NEW_PRODUCT_FLAGS, nextCatalogFlags } from './catalog-flags';

describe('nextCatalogFlags (OR-B4-046)', () => {
  const published = { activo: true, publicado: true, destacado: true };

  it('a new product starts active and outside the store', () => {
    expect(nextCatalogFlags(NEW_PRODUCT_FLAGS, {})).toEqual({
      activo: true,
      publicado: false,
      destacado: false,
    });
  });

  it('publishes and features an active product', () => {
    expect(nextCatalogFlags(NEW_PRODUCT_FLAGS, { publicado: true, destacado: true })).toEqual(
      published,
    );
  });

  it('deactivating takes the product out of the store and drops the featured mark', () => {
    expect(nextCatalogFlags(published, { activo: false })).toEqual({
      activo: false,
      publicado: false,
      destacado: false,
    });
  });

  it('unpublishing drops the featured mark', () => {
    expect(nextCatalogFlags(published, { publicado: false })).toEqual({
      activo: true,
      publicado: false,
      destacado: false,
    });
  });

  it('reactivating does not publish again by itself', () => {
    const inactive = { activo: false, publicado: false, destacado: false };
    expect(nextCatalogFlags(inactive, { activo: true }).publicado).toBe(false);
  });

  it('keeps what the change does not mention', () => {
    expect(nextCatalogFlags(published, {})).toEqual(published);
  });

  it('refuses to publish an inactive product', () => {
    expect(() => nextCatalogFlags(NEW_PRODUCT_FLAGS, { activo: false, publicado: true })).toThrow(
      BadRequestException,
    );
  });

  it('refuses to feature a product that is not published', () => {
    expect(() => nextCatalogFlags(NEW_PRODUCT_FLAGS, { destacado: true })).toThrow(
      'Solo un producto publicado en la tienda puede ser destacado.',
    );
  });
});
