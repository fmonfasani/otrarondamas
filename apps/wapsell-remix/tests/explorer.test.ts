import { describe, expect, it } from 'vitest';
import { filterProducts, filterStores, fold, storeLine, type ExplorerProduct, type ExplorerStore } from '~/utils/explorer';

// Marketplace, step 2 — the explorer's filters.
const store = (nombre: string, rubro: string | null, ciudad: string | null): ExplorerStore => ({
  nombre, slug: fold(nombre).replace(/\s+/g, '-'), rubro, ciudad, provincia: null, descripcion: null, abiertoAhora: null, portada: null, ofertas: 0,
});
const stores = [store('Almacén Lucía', 'Almacén', 'Rosario'), store('Kiosco 24', 'Kiosco', 'Rosario'), store('Ferretería Don José', 'Ferretería', 'Córdoba')];

describe('Explorar', () => {
  it('filters by rubro', () => {
    expect(filterStores(stores, { rubro: 'Kiosco' }).map((s) => s.nombre)).toEqual(['Kiosco 24']);
  });

  it('finds every word, without accents or capitals', () => {
    expect(filterStores(stores, { q: 'almacen' }).map((s) => s.nombre)).toEqual(['Almacén Lucía']);
    expect(filterStores(stores, { q: 'ROSARIO kiosco' }).map((s) => s.nombre)).toEqual(['Kiosco 24']);
    expect(filterStores(stores, { q: 'cordoba' }).map((s) => s.nombre)).toEqual(['Ferretería Don José']);
    expect(filterStores(stores, { q: 'farmacia' })).toEqual([]);
  });

  it('finds products by name, brand or store', () => {
    const p = (nombre: string, marca: string | null, tienda: string): ExplorerProduct => ({
      productoId: nombre, nombre, marca, precio: '1', precioSinDescuento: null, descuentoPorcentaje: null, foto: null, tienda: { nombre: tienda, slug: 's' },
    });
    const list = [p('Yerba 1 kg', 'Playadito', 'Almacén Lucía'), p('Coca Cola 2,25 l', 'Coca-Cola', 'Kiosco 24')];
    expect(filterProducts(list, 'playadito').map((x) => x.nombre)).toEqual(['Yerba 1 kg']);
    expect(filterProducts(list, 'kiosco').map((x) => x.nombre)).toEqual(['Coca Cola 2,25 l']);
  });

  it('describes a store in one line', () => {
    expect(storeLine({ rubro: 'Almacén', ciudad: 'Rosario', provincia: null })).toBe('Almacén · Rosario');
    expect(storeLine({ rubro: null, ciudad: null, provincia: null })).toBe('Tienda en Wapsell');
  });
});
