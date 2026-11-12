import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action } from '../app/routes/_business.$lang.dashboard.productos';
import { catalogAbilities, categoryOptions, chainFor, parseAmount, productPayload, type Hierarchy, type Product } from '../app/utils/catalog';

// Business panel "Catálogo" (OR-B4-028), wired to /catalogo/productos and /catalogo/jerarquia.
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
  async function post(fields: Record<string, string>) {
    const session = await getSession();
    session.set('jwt', 'jwt-token');
    const cookie = (await commitSession(session)).split(';')[0];
    return action({
      request: new Request('http://app.test/es/dashboard/productos', { method: 'POST', body: new URLSearchParams(fields), headers: { Cookie: cookie } }),
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
    expect(response.headers.get('Location')).toBe('/es/dashboard/productos?p=p-9&guardado=1');
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

  it('deactivates a product', async () => {
    api.mockResolvedValueOnce(ok({ ...product, activo: false }));
    await post({ intent: 'toggleActive', productId: 'p-1', activo: 'false' });
    expect(api.mock.calls[0]).toEqual(['http://api.test/catalogo/productos/p-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ activo: false }) })]);
  });
});
