import { describe, expect, it } from 'vitest';
import { filterStores, fold, searchHref, searchParamsOf, storeLine, type ExplorerStore } from '~/utils/explorer';

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

  it('builds the search link with one thing changed, back to page 1', () => {
    const current = new URLSearchParams('q=yerba&marca=Playadito&pagina=3');
    expect(searchHref(current, { oferta: '1' })).toBe('/buscar?q=yerba&marca=Playadito&oferta=1');
    expect(searchHref(current, { marca: ['Playadito', 'Taragüi'] })).toBe('/buscar?q=yerba&marca=Playadito&marca=Tarag%C3%BCi');
    expect(searchHref(current, { marca: [] })).toBe('/buscar?q=yerba');
    expect(searchHref(current, { pagina: '4' })).toBe('/buscar?q=yerba&marca=Playadito&pagina=4');
    expect(searchHref(new URLSearchParams('q=x'), { q: null })).toBe('/buscar');
  });

  it('passes on only the search filters, trimmed', () => {
    const url = new URL('https://app.wapsell.com/buscar?q=%20yerba%20&marca=A&marca=B&token=secreto&orden=vendidos&q2=x');
    expect(searchParamsOf(url).toString()).toBe('q=yerba&marca=A&marca=B&orden=vendidos');
  });

  it('describes a store in one line', () => {
    expect(storeLine({ rubro: 'Almacén', ciudad: 'Rosario', provincia: null })).toBe('Almacén · Rosario');
    expect(storeLine({ rubro: null, ciudad: null, provincia: null })).toBe('Tienda en Wapsell');
  });
});
