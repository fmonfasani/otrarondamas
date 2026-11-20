import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action } from '../app/routes/_business.panel.mercaderia_.precios';
import { brandsOf, bulkItemsFrom, bulkMessage, bulkRuleFrom } from '../app/utils/catalog';

// Bulk price update (OR-B4-046 §4.3, stage C2), wired to /catalogo/precios.
describe('bulk price helpers', () => {
  const rule = (entries: Record<string, string>) => bulkRuleFrom(new URLSearchParams(entries));

  it('waits for a value before there is a rule', () => {
    expect(rule({ modo: 'porcentaje' })).toBeNull();
  });

  it('reads a percent, a margin, the rounding and the filters', () => {
    expect(rule({ modo: 'porcentaje', valor: '10', redondeo: '10', cat: 'f-1' })).toEqual({
      ok: true,
      rule: { modo: 'porcentaje', valor: 10, redondeo: 10, familiaId: 'f-1' },
    });
    expect(rule({ modo: 'margen', valor: '42,5 %', marca: 'Tambo Lindo', proveedor: 's-1' })).toEqual({
      ok: true,
      rule: { modo: 'margen', valor: 42.5, redondeo: 1, marca: 'Tambo Lindo', proveedorId: 's-1' },
    });
    expect(rule({ valor: '-5' })).toEqual({ ok: true, rule: { modo: 'porcentaje', valor: -5, redondeo: 1 } });
  });

  it('refuses what cannot be a rule', () => {
    expect(rule({ valor: 'mucho' })).toEqual({ ok: false, message: 'Escribí un número para el porcentaje.' });
    expect(rule({ valor: '0' })).toEqual({ ok: false, message: 'Un 0 % no cambia ningún precio.' });
    expect(rule({ valor: '-95' })).toEqual({ ok: false, message: 'El porcentaje va de −90 a 1000.' });
    expect(rule({ modo: 'margen', valor: '-1' })).toEqual({ ok: false, message: 'La ganancia va de 0 a 1000 %.' });
  });

  it('reads the confirmed products, the message and the brands', () => {
    const form = new FormData();
    form.append('productoId', 'p-1');
    form.append('precioActual', '1500');
    form.append('productoId', 'p-2');
    form.append('precioActual', '900.5');
    expect(bulkItemsFrom(form)).toEqual([
      { productoId: 'p-1', precioActual: 1500 },
      { productoId: 'p-2', precioActual: 900.5 },
    ]);
    expect(bulkMessage(2, '+10 %')).toBe('Listo: 2 precios actualizados (+10 %).');
    expect(bulkMessage(1, 'costo + 40 %')).toBe('Listo: 1 precio actualizado (costo + 40 %).');
    expect(bulkMessage(0, '+10 %')).toBe('No cambió ningún precio.');
    expect(brandsOf([{ marca: 'Zeta' }, { marca: null }, { marca: 'arcor' }, { marca: 'Arcor' }])).toEqual(['arcor', 'Zeta']);
  });
});

describe('bulk price action', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
  async function post(fields: Array<[string, string]>) {
    const session = await getSession();
    session.set('jwt', 'jwt-token');
    const cookie = (await commitSession(session)).split(';')[0];
    return action({
      request: new Request('http://app.test/panel/mercaderia/precios', {
        method: 'POST',
        body: new URLSearchParams(fields),
        headers: { Cookie: cookie },
      }),
      params: {},
      context: {},
    }) as Promise<Response>;
  }

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        // The session check of requireAuth.
        if (url.endsWith('/auth/me')) return ok({ id: 'u-1', rol: 'OWNER' });
        return api(url, init);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('applies the rule to the products seen, then shows the rule without its value', async () => {
    api.mockResolvedValueOnce(ok({ actualizados: 2, regla: '+10 %' }));
    const response = await post([
      ['cat', 'f-1'],
      ['modo', 'porcentaje'],
      ['valor', '10'],
      ['redondeo', '1'],
      ['productoId', 'p-1'],
      ['precioActual', '1500'],
      ['productoId', 'p-2'],
      ['precioActual', '900'],
    ]);
    expect(api.mock.calls[0]).toEqual([
      'http://api.test/catalogo/precios/actualizacion',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          modo: 'porcentaje',
          valor: 10,
          redondeo: 1,
          familiaId: 'f-1',
          items: [
            { productoId: 'p-1', precioActual: 1500 },
            { productoId: 'p-2', precioActual: 900 },
          ],
        }),
      }),
    ]);
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get('Location') ?? '', 'http://app.test');
    expect(location.pathname).toBe('/panel/mercaderia/precios');
    expect(Object.fromEntries(location.searchParams)).toEqual({
      cat: 'f-1',
      modo: 'porcentaje',
      redondeo: '1',
      listo: '2',
      regla: '+10 %',
    });
  });

  it('says why when the prices moved in between', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Algunos precios cambiaron mientras revisabas. Volvé a ver los cambios antes de aplicarlos.' }), {
        status: 409,
      }),
    );
    const response = await post([
      ['modo', 'porcentaje'],
      ['valor', '10'],
      ['productoId', 'p-1'],
      ['precioActual', '1500'],
    ]);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: 'Algunos precios cambiaron mientras revisabas. Volvé a ver los cambios antes de aplicarlos.',
    });
  });

  it('asks for the rule and the products before calling the API', async () => {
    expect((await post([['productoId', 'p-1'], ['precioActual', '1']])).status).toBe(400);
    expect((await post([['valor', '10']])).status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});
