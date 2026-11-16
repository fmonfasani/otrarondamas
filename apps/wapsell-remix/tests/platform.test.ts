import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, sessionCookie, stubApi } from './helpers/route';
import { loader as layoutLoader } from '../app/routes/_platform';
import { loader as businessesLoader } from '../app/routes/_platform.$lang.platform-admin.negocios';
import { loader as businessLoader } from '../app/routes/_platform.$lang.platform-admin.negocios_.$id';
import { activityLabel } from '../app/utils/platform';

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
    api.mockResolvedValue(new Response(JSON.stringify({ message: 'No tienes permisos' }), { status: 403 }));
    expect(await status(layoutLoader(await args('/es/platform-admin')))).toBe(403);
    expect(await status(businessesLoader(await args('/es/platform-admin/negocios')))).toBe(403);
  });

  it('asks the API for the search and the page', async () => {
    api.mockResolvedValueOnce(ok({ total: 0, page: 2, pageSize: 50, items: [] }));
    await businessesLoader(await args('/es/platform-admin/negocios?q=almac%C3%A9n&page=2'));
    expect(api.mock.calls[0][0]).toBe('http://api.test/platform-admin/businesses?page=2&search=almac%C3%A9n');
  });

  it('answers 404 for a Business that does not exist', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Negocio no encontrado' }), { status: 404 }));
    expect(await status(businessLoader(await args('/es/platform-admin/negocios/x', { id: 'x' })))).toBe(404);
  });
});
