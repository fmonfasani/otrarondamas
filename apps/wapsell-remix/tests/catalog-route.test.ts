import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action } from '../app/routes/_business.panel.mercaderia';
import { loader as oldAddress } from '../app/routes/_business.panel.productos';
import {
  catalogAbilities,
  categoryOptions,
  chainFor,
  matchesFilters,
  parseAmount,
  productPayload,
  publishMessage,
  storeFilterOf,
  type Hierarchy,
  type Product,
} from '../app/utils/catalog';

// Business panel "Mercadería" (OR-B4-028, OR-B4-046), wired to /catalogo/productos and /catalogo/jerarquia.
const hierarchy: Hierarchy = {
  familias: [{ id: 'f-beb', nombre: 'Bebidas', prefijo: 'BEB' }],
  subfamilias: [
    { id: 's-gen', familiaId: 'f-beb', nombre: 'General', prefijo: 'GEN' },
    { id: 's-gas', familiaId: 'f-beb', nombre: 'Gaseosas', prefijo: 'GAS' },
  ],
  tipos: [
    { id: 't-gen', subfamiliaId: 's-gen', nombre: 'General', prefijo: 'GEN' },
    { id: 't-gas', subfamiliaId: 's-gas', nombre: 'General', prefijo: 'GEN' },
  ],
  subtipos: [
    { id: 'st-gen', tipoId: 't-gen', nombre: 'General', prefijo: 'GEN' },
    { id: 'st-gas', tipoId: 't-gas', nombre: 'General', prefijo: 'GEN' },
  ],
};
const product: Product = {
  id: 'p-1',
  nombre: 'Coca 500',
  codigoInterno: 'BEB-0001',
  codigoBarras: null,
  marca: null,
  familiaId: 'f-beb',
  subfamiliaId: 's-gas',
  tipoId: 't-gas',
  subtipoId: 'st-gas',
  unidadBase: 'UNIDAD',
  costo: '500',
  precioMinorista: '900',
  precioMayorista: null,
  descuentoPorcentaje: null,
  activo: true,
  publicado: true,
  destacado: false,
  descripcion: null,
};

describe('catalog helpers', () => {
  it('reads Argentine and plain amounts', () => {
    expect(parseAmount('1.234,50')).toBe(1234.5);
    expect(parseAmount('900')).toBe(900);
    expect(parseAmount('$ 1500')).toBe(1500);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNaN();
  });

  it('mirrors the matrix: Gestor manages but cannot price, Vendedor only views', () => {
    expect(catalogAbilities('OWNER')).toEqual({ manageCategories: true, createProducts: true, editProducts: true, changePrices: true });
    expect(catalogAbilities('GESTOR_DE_STOCK')).toMatchObject({ manageCategories: true, createProducts: false, changePrices: false });
    expect(catalogAbilities('VENDEDOR')).toMatchObject({ manageCategories: false, editProducts: false });
  });

  it('resolves the full chain from a subcategory through its General type and subtype', () => {
    expect(chainFor(hierarchy, 's-gas')).toEqual({ familiaId: 'f-beb', subfamiliaId: 's-gas', tipoId: 't-gas', subtipoId: 'st-gas' });
    expect(chainFor(hierarchy, 'missing')).toBeNull();
    expect(categoryOptions(hierarchy)[0].subcategories.map((s) => s.label)).toEqual(['Bebidas (general)', 'Bebidas › Gaseosas']);
  });

  it('builds a create body with the chain, an uppercase code and prices', () => {
    const built = productPayload(
      { nombre: ' Sprite ', subfamiliaId: 's-gas', codigoInterno: 'spr-1', costo: '400', precioMinorista: '750,5', unidadBase: 'UNIDAD' },
      hierarchy,
      { mode: 'create', changePrices: true },
    );
    expect(built).toEqual({
      ok: true,
      body: {
        nombre: 'Sprite',
        unidadBase: 'UNIDAD',
        codigoInterno: 'SPR-1',
        familiaId: 'f-beb',
        subfamiliaId: 's-gas',
        tipoId: 't-gas',
        subtipoId: 'st-gas',
        costo: 400,
        precioMinorista: 750.5,
      },
    });
  });

  it('leaves the code out when empty so the API generates it', () => {
    const built = productPayload({ nombre: 'Agua', subfamiliaId: 's-gen', costo: '1', precioMinorista: '2' }, hierarchy, { mode: 'create', changePrices: true });
    expect(built.ok && 'codigoInterno' in built.body).toBe(false);
  });

  it('on edit sends only changed prices and never prices for a role that cannot price', () => {
    const unchanged = productPayload({ nombre: 'Coca 500', subfamiliaId: 's-gas', costo: '500', precioMinorista: '950' }, hierarchy, {
      mode: 'update',
      changePrices: true,
      current: product,
    });
    expect(unchanged).toEqual({ ok: true, body: { nombre: 'Coca 500', unidadBase: 'UNIDAD', precioMinorista: 950 } });

    const gestor = productPayload({ nombre: 'Coca 500 ml', subfamiliaId: 's-gen', precioMinorista: '1' }, hierarchy, {
      mode: 'update',
      changePrices: false,
      current: product,
    });
    expect(gestor.ok && gestor.body).toEqual({
      nombre: 'Coca 500 ml',
      unidadBase: 'UNIDAD',
      familiaId: 'f-beb',
      subfamiliaId: 's-gen',
      tipoId: 't-gen',
      subtipoId: 'st-gen',
    });
  });

  it('publishes a new product only when ticked (OR-B4-046)', () => {
    const fields = { nombre: 'Agua', subfamiliaId: 's-gen', costo: '1', precioMinorista: '2' };
    const ticked = productPayload({ ...fields, publicado: 'true', destacado: 'true', descripcion: ' Sin gas ' }, hierarchy, { mode: 'create', changePrices: true });
    expect(ticked.ok && ticked.body).toMatchObject({ publicado: true, destacado: true, descripcion: 'Sin gas' });
    const unticked = productPayload({ ...fields, publicado: 'false', destacado: 'false', descripcion: '' }, hierarchy, { mode: 'create', changePrices: true });
    expect(unticked.ok && unticked.body).not.toHaveProperty('publicado');
    expect(unticked.ok && unticked.body).not.toHaveProperty('destacado');
    expect(unticked.ok && unticked.body).not.toHaveProperty('descripcion');
  });

  it('on edit sends the store fields only when they change, and an unticked box unpublishes', () => {
    const edit = (fields: Record<string, string>) =>
      productPayload({ nombre: 'Coca 500', subfamiliaId: 's-gas', ...fields }, hierarchy, { mode: 'update', changePrices: false, current: product });
    expect(edit({ publicado: 'true', destacado: 'false', descripcion: '' })).toEqual({ ok: true, body: { nombre: 'Coca 500', unidadBase: 'UNIDAD' } });
    expect(edit({ publicado: 'false', destacado: 'false' })).toMatchObject({ ok: true, body: { publicado: false } });
    expect(edit({ publicado: 'true', destacado: 'true' })).toMatchObject({ ok: true, body: { destacado: true } });
    expect(edit({ descripcion: 'Lata de 500 ml' })).toMatchObject({ ok: true, body: { descripcion: 'Lata de 500 ml' } });
    // A form without the store fields leaves the product as it is in the store.
    expect(edit({})).toEqual({ ok: true, body: { nombre: 'Coca 500', unidadBase: 'UNIDAD' } });
  });

  it('refuses to feature a product that is not published, and a description too long', () => {
    expect(
      productPayload({ nombre: 'X', subfamiliaId: 's-gen', publicado: 'false', destacado: 'true' }, hierarchy, { mode: 'update', changePrices: false, current: product }),
    ).toEqual({ ok: false, message: 'Solo un producto publicado en la tienda puede ser destacado.' });
    expect(
      productPayload({ nombre: 'X', subfamiliaId: 's-gen', descripcion: 'x'.repeat(2001) }, hierarchy, { mode: 'update', changePrices: false, current: product }),
    ).toMatchObject({ ok: false });
  });

  it('filters the list by its place in the store', () => {
    const hidden = { ...product, publicado: false };
    expect(storeFilterOf('publicados')).toBe('publicados');
    expect(storeFilterOf('otra-cosa')).toBeNull();
    expect(matchesFilters(product, { category: null, status: 'activos', store: 'publicados' })).toBe(true);
    expect(matchesFilters(hidden, { category: null, status: 'activos', store: 'publicados' })).toBe(false);
    expect(matchesFilters(hidden, { category: null, status: 'activos', store: 'sin-publicar' })).toBe(true);
  });

  it('says how many products moved in or out of the store', () => {
    expect(publishMessage(1, true)).toBe('Listo: 1 producto en la tienda.');
    expect(publishMessage(12, false)).toBe('Listo: 12 productos fuera de la tienda.');
    expect(publishMessage(0, true)).toContain('inactivos');
  });

  it('rejects missing or invalid prices and categories', () => {
    expect(productPayload({ nombre: 'X', subfamiliaId: '' }, hierarchy, { mode: 'create', changePrices: true })).toMatchObject({ ok: false });
    expect(productPayload({ nombre: 'X', subfamiliaId: 's-gen', costo: '0', precioMinorista: '2' }, hierarchy, { mode: 'create', changePrices: true })).toMatchObject({ ok: false });
    expect(productPayload({ nombre: 'X', subfamiliaId: 's-gen', costo: '1', precioMinorista: '2', descuentoPorcentaje: '120' }, hierarchy, { mode: 'create', changePrices: true })).toMatchObject({ ok: false });
  });
});

describe('catalog route', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  let role = 'OWNER';
  async function post(fields: Record<string, string> | URLSearchParams) {
    const session = await getSession();
    session.set('jwt', 'jwt-token');
    const cookie = (await commitSession(session)).split(';')[0];
    return action({
      request: new Request('http://app.test/panel/mercaderia', {
        method: 'POST',
        body: fields instanceof URLSearchParams ? fields : new URLSearchParams(fields),
        headers: { Cookie: cookie },
      }),
      params: { lang: 'es' },
      context: {},
    }) as Promise<Response>;
  }

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    role = 'OWNER';
    api.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/auth/me')) return ok({ id: 'u-1', rol: role });
        if (url.endsWith('/catalogo/jerarquia') && !init?.method) return ok(hierarchy);
        if (url.endsWith('/catalogo/productos/p-1') && !init?.method) return ok(product);
        return api(url, init);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates a category', async () => {
    api.mockResolvedValueOnce(ok({ id: 'f-new' }));
    const response = await post({ intent: 'createCategory', nombre: ' Almacén ' });
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Categoría "Almacén" creada.' });
    const [url, init] = api.mock.calls[0];
    expect(url).toBe('http://api.test/catalogo/jerarquia/categorias');
    expect(init?.body).toBe(JSON.stringify({ nombre: 'Almacén' }));
  });

  it('creates a subcategory inside the selected category', async () => {
    api.mockResolvedValueOnce(ok({ id: 's-new' }));
    await post({ intent: 'createSubcategory', familiaId: 'f-beb', nombre: 'Aguas' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/catalogo/jerarquia/categorias/f-beb/subcategorias');
  });

  it('creates a product and opens it', async () => {
    api.mockResolvedValueOnce(ok({ ...product, id: 'p-9' }));
    const response = await post({ intent: 'createProduct', nombre: 'Sprite', subfamiliaId: 's-gas', costo: '400', precioMinorista: '750' });
    expect(response.headers.get('Location')).toBe('/panel/mercaderia?p=p-9&guardado=1');
    expect(api.mock.calls[0][1]?.method).toBe('POST');
  });

  it('never sends prices for a Gestor de stock, whatever the form says', async () => {
    role = 'GESTOR_DE_STOCK';
    api.mockResolvedValueOnce(ok(product));
    await post({ intent: 'updateProduct', productId: 'p-1', nombre: 'Coca 500', subfamiliaId: 's-gas', precioMinorista: '1', role: 'OWNER' });
    const body = JSON.parse(String(api.mock.calls[0][1]?.body));
    expect(body).not.toHaveProperty('precioMinorista');
  });

  it('shows the API reason for a duplicate code', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Ya existe un producto con ese código interno' }), { status: 409 }));
    const response = await post({ intent: 'createProduct', nombre: 'Sprite', subfamiliaId: 's-gas', codigoInterno: 'BEB-0001', costo: '1', precioMinorista: '2' });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Ya existe un producto con ese código interno' });
  });

  it('publishes the picked products in one request (OR-B4-046)', async () => {
    api.mockResolvedValueOnce(ok({ actualizados: 2 }));
    const form = new URLSearchParams([['intent', 'publish'], ['id', 'p-1'], ['id', 'p-2'], ['publicado', 'true']]);
    const response = await post(form);
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Listo: 2 productos en la tienda.' });
    expect(api.mock.calls[0]).toEqual([
      'http://api.test/catalogo/productos/publicacion',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ ids: ['p-1', 'p-2'], publicado: true }) }),
    ]);
  });

  it('takes a whole category out of the store', async () => {
    api.mockResolvedValueOnce(ok({ actualizados: 5 }));
    await post({ intent: 'publish', familiaId: 'f-beb', publicado: 'false' });
    expect(api.mock.calls[0][1]?.body).toBe(JSON.stringify({ familiaId: 'f-beb', publicado: false }));
  });

  it('asks to pick something before publishing', async () => {
    const response = await post({ intent: 'publish', publicado: 'true' });
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });

  it('deactivates a product', async () => {
    api.mockResolvedValueOnce(ok({ ...product, activo: false }));
    await post({ intent: 'toggleActive', productId: 'p-1', activo: 'false' });
    expect(api.mock.calls[0]).toEqual(['http://api.test/catalogo/productos/p-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ activo: false }) })]);
  });
});

describe('old address of the section', () => {
  it('sends /panel/productos to Mercadería, keeping the filters', async () => {
    const response = (await oldAddress({ request: new Request('http://app.test/panel/productos?cat=f-beb&p=p-1'), params: {}, context: {} })) as Response;
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('/panel/mercaderia?cat=f-beb&p=p-1');
  });
});
