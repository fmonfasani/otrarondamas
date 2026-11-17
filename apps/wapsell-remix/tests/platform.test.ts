import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, sessionCookie, stubApi } from './helpers/route';
import { loader as layoutLoader } from '../app/routes/_platform';
import { loader as businessesLoader } from '../app/routes/_platform.$lang.platform-admin.negocios';
import { loader as businessLoader } from '../app/routes/_platform.$lang.platform-admin.negocios_.$id';
import { activityLabel, newBusinessFrom, slugFrom } from '../app/utils/platform';
import {
  action as newBusinessAction,
  loader as newBusinessLoader,
} from '../app/routes/_platform.$lang.platform-admin.negocios_.nuevo';

/** OR-B4-038 — Wapsell platform administration, first stage (read-only). */
describe('platform helpers', () => {
  it('says when a Business was last active', () => {
    const now = new Date('2026-11-16T12:00:00Z');
    expect(activityLabel(null, now)).toBe('Sin actividad');
    expect(activityLabel('2026-11-16T08:00:00Z', now)).toBe('Hoy');
    expect(activityLabel('2026-11-15T08:00:00Z', now)).toBe('Ayer');
    expect(activityLabel('2026-11-06T08:00:00Z', now)).toBe('Hace 10 días');
    expect(activityLabel('2026-09-01T08:00:00Z', now)).toBe('Hace 2 meses');
  });
});

describe('platform routes', () => {
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
  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 200;
    } catch (thrown) {
      return (thrown as Response).status;
    }
  };

  it('turns the API’s refusal into «reserved», even for a Business Owner', async () => {
    api.mockResolvedValue(
      new Response(JSON.stringify({ message: 'No tienes permisos' }), { status: 403 }),
    );
    expect(await status(layoutLoader(await args('/es/platform-admin')))).toBe(403);
    expect(await status(businessesLoader(await args('/es/platform-admin/negocios')))).toBe(403);
  });

  it('asks the API for the search and the page', async () => {
    api.mockResolvedValueOnce(ok({ total: 0, page: 2, pageSize: 50, items: [] }));
    await businessesLoader(await args('/es/platform-admin/negocios?q=almac%C3%A9n&page=2'));
    expect(api.mock.calls[0][0]).toBe(
      'http://api.test/platform-admin/businesses?page=2&search=almac%C3%A9n',
    );
  });

  it('answers 404 for a Business that does not exist', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Negocio no encontrado' }), { status: 404 }),
    );
    expect(
      await status(businessLoader(await args('/es/platform-admin/negocios/x', { id: 'x' }))),
    ).toBe(404);
  });
});

describe('creating a Business from the platform (OR-B4-039)', () => {
  it('suggests the store address from the name and checks the form', () => {
    expect(slugFrom('Otra Ronda Más')).toBe('otra-ronda-mas');
    expect(slugFrom('  Kiosco  "El Sol" N° 2 ')).toBe('kiosco-el-sol-n-2');
    const form = (pairs: Array<[string, string]>) => {
      const f = new FormData();
      for (const [k, v] of pairs) f.append(k, v);
      return f;
    };
    const ok = [
      ['nombre', 'Otra Ronda Más'],
      ['slug', 'otra-ronda-mas'],
      ['ownerNombre', 'Fede'],
      ['ownerEmail', ' Fede@Ejemplo.com '],
    ] as Array<[string, string]>;
    expect(newBusinessFrom(form(ok))).toEqual({
      ok: true,
      data: {
        nombre: 'Otra Ronda Más',
        slug: 'otra-ronda-mas',
        ownerNombre: 'Fede',
        ownerEmail: 'fede@ejemplo.com',
      },
    });
    expect(
      newBusinessFrom(form([...ok.slice(0, 1), ['slug', 'Con Espacio'], ...ok.slice(2)])),
    ).toMatchObject({ ok: false });
    expect(newBusinessFrom(form([...ok.slice(0, 3), ['ownerEmail', 'sin-arroba']]))).toMatchObject({
      ok: false,
    });
  });

  it('sends the new Business to the API and shows its answer', async () => {
    const api = stubApi('OWNER');
    api.mockResolvedValueOnce(
      ok({
        id: 'e-1',
        nombre: 'X',
        slug: 'x-y',
        owner: { nombre: 'A', email: 'a@b.c' },
        enlace: 'https://app/x',
        mailEnviado: true,
        venceEl: '2026-11-23',
      }),
    );
    const response = (await newBusinessAction({
      request: new Request('http://app.test/es/platform-admin/negocios/nuevo', {
        method: 'POST',
        body: formBody([
          ['nombre', 'Xy Negocio'],
          ['slug', 'x-y'],
          ['ownerNombre', 'A A'],
          ['ownerEmail', 'a@b.co'],
        ]),
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(api.mock.calls[0][0]).toBe('http://api.test/platform-admin/businesses');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      nombre: 'Xy Negocio',
      slug: 'x-y',
      ownerNombre: 'A A',
      ownerEmail: 'a@b.co',
    });
    await expect(response.json()).resolves.toMatchObject({ ok: true, created: { id: 'e-1' } });
    vi.unstubAllGlobals();
  });

  it('knows when creating Businesses is closed, and shows why (OR-B4-042)', async () => {
    const api = stubApi('OWNER');
    const motivo = 'Crear negocios está en pausa hasta activar la verificación en dos pasos (MFA).';
    api.mockResolvedValueOnce(ok({ permitido: false, motivo }));
    const loaded = (await newBusinessLoader({
      request: new Request('http://app.test/es/platform-admin/negocios/nuevo', {
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(api.mock.calls[0][0]).toBe('http://api.test/platform-admin/businesses/creation-status');
    await expect(loaded.json()).resolves.toEqual({ status: { permitido: false, motivo } });

    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: motivo }), { status: 423 }));
    const refused = (await newBusinessAction({
      request: new Request('http://app.test/es/platform-admin/negocios/nuevo', {
        method: 'POST',
        body: formBody([
          ['nombre', 'Xy Negocio'],
          ['slug', 'x-y'],
          ['ownerNombre', 'A A'],
          ['ownerEmail', 'a@b.co'],
        ]),
        headers: { Cookie: await sessionCookie() },
      }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(refused.status).toBe(423);
    await expect(refused.json()).resolves.toEqual({ ok: false, message: motivo });
    vi.unstubAllGlobals();
  });
});
