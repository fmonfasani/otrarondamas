import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from './helpers/route';
import { loader as storeLoader } from '../app/routes/_customer.tienda_.$slug';
import { loader as moreLoader } from '../app/routes/_customer.tienda_.$slug_.listado';
import { loader as suggestLoader } from '../app/routes/_customer.tienda_.$slug_.sugerencias';
import { action as productAction, loader as productLoader } from '../app/routes/_customer.tienda_.$slug_.producto.$id';
import { signInCookie } from '../app/services/customer-session.server';
import {
  EMPTY_LISTING,
  activeFilters,
  appendPage,
  linkWith,
  listingQuery,
  panelFilterCount,
  productHref,
  type StoreListing,
} from '../app/utils/store-browse';
import type { StoreProduct } from '../app/utils/store';

// OR-B4-047 — the practical store: filters in the link, «Ver más», suggestions and the product page.
const CAT = '3f2b6a1e-5c4d-4e8f-9a0b-1c2d3e4f5a6b';
const SUB = '8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d';
const url = (qs: string) => new URL(`http://app.test/tienda/demo${qs}`);
const product = (productoId: string): StoreProduct => ({ productoId, nombre: productoId, precio: '100.00', disponible: true, stockTotal: 3 });

const listing: StoreListing = {
  ...EMPTY_LISTING,
  productos: [product('a')],
  total: 30,
  paginas: 2,
  facetas: {
    categorias: [{ id: CAT, nombre: 'Bebidas', cantidad: 3, subcategorias: [{ id: SUB, nombre: 'Gaseosas', cantidad: 1 }] }],
    marcas: [{ nombre: 'Burbuja', cantidad: 2 }],
    precio: { min: 950, max: 2600 },
  },
};

describe('store link helpers', () => {
  it('keeps the filters of the link and drops what the API would refuse', () => {
    const query = listingQuery(url(`?q=+caf%C3%A9+&cat=${CAT}&sub=nope&marca=Burbuja&marca=Burbuja&marca=Sol&min=2.000&max=abc&stock=1&orden=vendidos&pagina=2`));
    expect([...query.entries()]).toEqual([
      ['q', 'café'],
      ['cat', CAT],
      ['marca', 'Burbuja'],
      ['marca', 'Sol'],
      ['min', '2000'],
      ['stock', '1'],
      ['orden', 'vendidos'],
      ['pagina', '2'],
    ]);
    // The old search address still works; the default order and page 1 stay out of the link.
    expect(listingQuery(url('?search=yerba&orden=destacados&pagina=1&orden=otro')).toString()).toBe('q=yerba');
    expect(listingQuery(url('?pagina=0&min=-5&stock=si')).toString()).toBe('');
  });

  it('changes one filter and goes back to the first page', () => {
    const query = new URLSearchParams(`q=cafe&marca=A&pagina=3`);
    expect(linkWith('/tienda/demo', query, { marca: ['A', 'B'] })).toBe('/tienda/demo?q=cafe&marca=A&marca=B');
    expect(linkWith('/tienda/demo', query, { q: null, marca: null })).toBe('/tienda/demo');
    expect(linkWith('/tienda/demo', query, { pagina: '4' })).toBe('/tienda/demo?q=cafe&marca=A&pagina=4');
  });

  it('shows each filter in use with the link that removes it', () => {
    const query = new URLSearchParams(`q=cola&cat=${CAT}&sub=${SUB}&marca=Burbuja&max=3000&stock=1`);
    const chips = activeFilters('/tienda/demo', query, listing.facetas);
    expect(chips.map((c) => c.label)).toEqual(['«cola»', 'Bebidas', 'Gaseosas', 'Burbuja', expect.stringContaining('Hasta'), 'Con stock']);
    expect(chips[1].href).toBe('/tienda/demo?q=cola&marca=Burbuja&max=3000&stock=1');
    expect(chips[3].href).toBe(`/tienda/demo?q=cola&cat=${CAT}&sub=${SUB}&max=3000&stock=1`);
    expect(panelFilterCount(query)).toBe(3);
  });

  it('joins a later page without repeating products, and links each product', () => {
    expect(appendPage([product('a'), product('b')], [product('b'), product('c')]).map((p) => p.productoId)).toEqual(['a', 'b', 'c']);
    expect(productHref('demo', 'p 1')).toBe('/tienda/demo/producto/p%201');
  });
});

describe('practical store routes', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;
  const login = { accessToken: 'customer-jwt', cliente: { nombre: 'Ana', email: 'ana@test' } };

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  const call = (handler: (args: never) => unknown, path: string, init: RequestInit = {}, params: Record<string, string> = { slug: 'demo' }) =>
    (handler as (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => Promise<Response>)({
      request: new Request(`http://app.test${path}`, init),
      params,
      context: {},
    });

  it('asks the API for the listing with the cleaned filters of the address', async () => {
    api.mockImplementation(async (input) => {
      if (input === 'http://api.test/demo/tienda') return ok({ nombre: 'Demo', slug: 'demo' });
      return ok(listing);
    });
    const response = await call(storeLoader, `/tienda/demo?q=cola&cat=${CAT}&orden=nope`);
    const data = await response.json();
    expect(api.mock.calls.map((c) => c[0])).toContain(`http://api.test/demo/tienda/catalogo?q=cola&cat=${CAT}`);
    expect(data).toMatchObject({ listing: { total: 30 }, query: `q=cola&cat=${CAT}`, error: null });
  });

  it('keeps the store open with a message when the listing fails', async () => {
    api.mockImplementation(async (input) =>
      input === 'http://api.test/demo/tienda' ? ok({ nombre: 'Demo', slug: 'demo' }) : new Response('{}', { status: 500 }),
    );
    const data = await (await call(storeLoader, '/tienda/demo')).json();
    expect(data.error).toContain('No pudimos cargar el catálogo');
    expect(data.listing.productos).toEqual([]);
  });

  it('«Ver más» brings the next page as JSON, and a message if it fails', async () => {
    api.mockResolvedValueOnce(ok({ ...listing, pagina: 2 }));
    const page = await (await call(moreLoader, '/tienda/demo/listado?q=cola&pagina=2')).json();
    expect(api.mock.calls[0][0]).toBe('http://api.test/demo/tienda/catalogo?q=cola&pagina=2');
    expect(page.pagina).toBe(2);
    api.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const failed = await (await call(moreLoader, '/tienda/demo/listado?pagina=3')).json();
    expect(failed.error).toContain('No pudimos cargar más productos');
  });

  it('suggests from two letters, and nothing when the API fails', async () => {
    expect(await (await call(suggestLoader, '/tienda/demo/sugerencias?q=c')).json()).toEqual({ productos: [], categorias: [], q: 'c' });
    expect(api).not.toHaveBeenCalled();
    api.mockResolvedValueOnce(ok({ productos: [{ productoId: 'p', nombre: 'Café', marca: null, precio: '10.00' }], categorias: [] }));
    const found = await (await call(suggestLoader, '/tienda/demo/sugerencias?q=caf%C3%A9')).json();
    expect(api.mock.calls[0][0]).toBe('http://api.test/demo/tienda/sugerencias?q=caf%C3%A9');
    expect(found).toMatchObject({ q: 'café', productos: [{ productoId: 'p' }] });
    api.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect(await (await call(suggestLoader, '/tienda/demo/sugerencias?q=te')).json()).toEqual({ productos: [], categorias: [], q: 'te' });
  });

  it('shows a published product and 404s anything else', async () => {
    const detail = { ...product('p1'), marca: null, descripcion: 'Rica', categoria: { id: CAT, nombre: 'Bebidas' }, subcategoria: null };
    api.mockImplementation(async (input) => (input === 'http://api.test/demo/tienda' ? ok({ nombre: 'Demo', slug: 'demo' }) : ok(detail)));
    const data = await (await call(productLoader, '/tienda/demo/producto/p1', {}, { slug: 'demo', id: 'p1' })).json();
    expect(api.mock.calls.map((c) => c[0])).toContain('http://api.test/demo/tienda/productos/p1');
    expect(data).toMatchObject({ product: { productoId: 'p1', descripcion: 'Rica' }, customer: null });

    api.mockImplementation(async (input) =>
      input === 'http://api.test/demo/tienda' ? ok({ nombre: 'Demo', slug: 'demo' }) : new Response('{}', { status: 404 }),
    );
    await expect(call(productLoader, '/tienda/demo/producto/x', {}, { slug: 'demo', id: 'x' })).rejects.toMatchObject({ status: 404 });
  });

  it('adds to the cart of the account only for a signed-in customer', async () => {
    const refused = await call(productAction, '/tienda/demo/producto/p1', { method: 'POST', body: new URLSearchParams({ cantidad: '1' }) }, { slug: 'demo', id: 'p1' });
    expect(refused.status).toBe(401);
    expect(api).not.toHaveBeenCalled();

    const cookie = (await signInCookie(new Request('http://app.test/'), 'demo', login)).split(';')[0];
    api.mockResolvedValueOnce(ok({ id: 'cart-1', CartItem: [] })).mockResolvedValueOnce(ok({}));
    const added = await call(
      productAction,
      '/tienda/demo/producto/p1',
      { method: 'POST', body: new URLSearchParams({ cantidad: '2' }), headers: { Cookie: cookie } },
      { slug: 'demo', id: 'p1' },
    );
    await expect(added.json()).resolves.toEqual({ ok: true, message: '' });
    expect(api.mock.calls[1][0]).toBe('http://api.test/cart/cart-1/items');
    expect(api.mock.calls[1][1]?.body).toBe(JSON.stringify({ productoId: 'p1', cantidad: 2 }));
  });
});
