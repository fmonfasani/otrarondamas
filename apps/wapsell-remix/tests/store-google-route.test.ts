import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loader } from '../app/routes/_customer.tienda_.$slug_.cuenta_.google';

type Loader = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => Promise<Response>;
const run = (path: string, cookie?: string) =>
  (loader as unknown as Loader)({
    request: new Request(`http://app.test${path}`, { headers: cookie ? { Cookie: cookie } : {} }),
    params: { slug: 'demo' },
    context: {},
  });

describe('store «Continuar con Google» (ADR-IDN-007)', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    process.env.GOOGLE_LOGIN_ENABLED = '1';
    process.env.API_PUBLIC_URL = 'https://api.test';
    process.env.API_BASE_URL = 'http://api.internal';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_LOGIN_ENABLED;
  });

  const start = async (path = '/tienda/demo/cuenta/google?volver=carrito') => {
    const response = await run(path);
    const location = new URL(response.headers.get('Location') ?? '');
    const cookie = (response.headers.get('Set-Cookie') ?? '').split(';')[0];
    return { response, location, cookie, web: location.searchParams.get('web') ?? '' };
  };

  it('sends the browser to the API for this store and binds the flow to it', async () => {
    const { response, location, cookie, web } = await start();
    expect(response.status).toBe(302);
    expect(`${location.origin}${location.pathname}`).toBe('https://api.test/auth/cliente/negocio/demo/google');
    expect(location.searchParams.get('volver')).toBe('carrito');
    expect(web).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(cookie).toMatch(/^__wapsell_store_google=/);
  });

  it('only passes known return targets', async () => {
    const { location } = await start('/tienda/demo/cuenta/google?volver=https://evil.test');
    expect(location.searchParams.has('volver')).toBe(false);
  });

  it('stays on the account page when Google is not enabled', async () => {
    delete process.env.GOOGLE_LOGIN_ENABLED;
    const response = await run('/tienda/demo/cuenta/google');
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta');
  });

  it('signs in the browser that started the flow and returns where it came from', async () => {
    const { cookie, web } = await start();
    api.mockResolvedValue(new Response(JSON.stringify({ nombre: 'Ana', email: 'ana@test' }), { status: 200 }));
    const response = await run(`/tienda/demo/cuenta/google?token=customer-jwt&web=${web}&volver=carrito`, cookie);
    expect(response.headers.get('Location')).toBe('/tienda/demo?carrito=1');
    expect(api).toHaveBeenCalledWith('http://api.internal/auth/cliente/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer customer-jwt' }),
    }));
    expect(response.headers.get('Set-Cookie')).toContain('__wapsell_customer=');
  });

  it('refuses a link with a token from someone else (no matching browser binding)', async () => {
    const { web } = await start();
    const response = await run(`/tienda/demo/cuenta/google?token=attacker-jwt&web=${web}`);
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta?error=google');
    expect(response.headers.get('Set-Cookie') ?? '').not.toContain('__wapsell_customer=');
    expect(api).not.toHaveBeenCalled();
  });

  it('refuses when the binding does not match', async () => {
    const { cookie } = await start();
    const response = await run('/tienda/demo/cuenta/google?token=customer-jwt&web=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', cookie);
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta?error=google');
    expect(api).not.toHaveBeenCalled();
  });

  it('refuses a token the API does not accept', async () => {
    const { cookie, web } = await start();
    api.mockResolvedValue(new Response('{}', { status: 401 }));
    const response = await run(`/tienda/demo/cuenta/google?token=bad&web=${web}`, cookie);
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta?error=google');
  });
});
