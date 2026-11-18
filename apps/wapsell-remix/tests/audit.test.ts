import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie, stubApi } from './helpers/route';
import { loader as listLoader } from '../app/routes/_business.panel.auditoria';
import { loader as detailLoader } from '../app/routes/_business.panel.auditoria_.$id';
import { loader as exportLoader } from '../app/routes/_business.panel.auditoria_.exportar';
import { auditQuery, fieldName, hasFilters, valueText } from '../app/utils/audit';

/** OR-B4-041 — the Business audit screen. */
describe('audit helpers', () => {
  it('passes on only the known filters', () => {
    const search = new URLSearchParams('desde=2026-11-01&tema=caja&x=1&usuarioId=&page=3');
    expect(auditQuery(search).toString()).toBe('desde=2026-11-01&tema=caja');
    expect(auditQuery(search, { page: '2' }).toString()).toBe('desde=2026-11-01&tema=caja&page=2');
    expect(hasFilters(search)).toBe(true);
    expect(hasFilters(new URLSearchParams('page=2'))).toBe(false);
  });

  it('shows values the way people read them', () => {
    expect(fieldName('precioMinorista')).toBe('Precio minorista');
    expect(fieldName('otraCosa')).toBe('otraCosa');
    expect(valueText('precioMinorista', 1234)).toMatch(/1\.234,00/);
    expect(valueText('activo', false)).toBe('No');
    expect(valueText('marca', null)).toBe('—');
    expect(valueText('nombre', 'Coca')).toBe('Coca');
  });
});

describe('audit routes', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  const args = async (path: string, params: Record<string, string> = {}) => ({
    request: new Request(`http://app.test${path}`, { headers: { Cookie: await sessionCookie() } }),
    params: { lang: 'es', ...params },
    context: {},
  });

  it('asks the API with the filters and the page', async () => {
    api.mockResolvedValueOnce(
      ok({ total: 0, page: 2, pageSize: 50, todo: true, temas: [], personas: [], items: [] }),
    );
    await listLoader(await args('/panel/auditoria?tema=precios&page=2'));
    expect(api.mock.calls[0][0]).toBe('http://api.test/auditoria?tema=precios&page=2');
  });

  it('shows a bad filter as a message, not an error page', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'desde va como AAAA-MM-DD' }), { status: 400 }),
    );
    const res = await listLoader(await args('/panel/auditoria?desde=mal'));
    expect(await res.json()).toEqual({ list: null, error: 'desde va como AAAA-MM-DD' });
  });

  it('answers 404 for an entry that is not the viewer’s', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'No' }), { status: 404 }));
    await expect(
      detailLoader(await args('/panel/auditoria/x', { id: 'x' })),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it('passes the CSV through as a download', async () => {
    api.mockResolvedValueOnce(
      new Response(`${String.fromCharCode(0xfeff)}"Fecha y hora"\r\n`, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="auditoria.csv"',
        },
      }),
    );
    const res = await exportLoader(await args('/panel/auditoria/exportar?tema=caja'));
    expect(api.mock.calls[0][0]).toBe('http://api.test/auditoria/exportar?tema=caja');
    expect(res.headers.get('content-disposition')).toContain('auditoria.csv');
  });
});
