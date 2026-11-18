import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loader } from '../app/routes/_business';
import { sessionCookie } from './helpers/route';

type Loader = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => Promise<Response>;
const run = async () => {
  try {
    return await (loader as unknown as Loader)({
      request: new Request('http://app.test/panel', { headers: { Cookie: await sessionCookie() } }),
      params: {},
      context: {},
    });
  } catch (thrown) {
    return thrown as Response;
  }
};

describe('business panel layout', () => {
  let me: Record<string, unknown>;
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(me), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens the panel for a business account', async () => {
    me = { nombre: 'Lucía', empresaNombre: 'Almacén', rol: 'OWNER', empresaInterna: false };
    const response = await run();
    expect(response.status).toBe(200);
  });

  it('sends the internal Wapsell account to the platform panel (ADR-IDN-014)', async () => {
    me = { nombre: 'Administración', empresaNombre: 'Wapsell (plataforma)', rol: 'OWNER', empresaInterna: true };
    const response = await run();
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/es/platform-admin');
  });
});
