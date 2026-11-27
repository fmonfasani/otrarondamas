import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody } from './helpers/route';
import { action as signupAction, loader as signupLoader } from '../app/routes/registro';
import { loader as verifyLoader } from '../app/routes/registro_.verificar';
import { loader as googleLoader } from '../app/routes/registro_.google';
import { loader as homeLoader } from '../app/routes/cuenta';
import { loader as enterStore } from '../app/routes/_customer.tienda_.$slug_.cuenta_.comprador';
import { action as loginAction } from '../app/routes/$lang.auth.login';
import { buyerSignInCookie } from '../app/services/buyer-session.server';

type Handler = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => unknown;
const call = async (handler: unknown, url: string, init: RequestInit = {}, params: Record<string, string> = {}) =>
  (await (handler as Handler)({ request: new Request(`http://app.test${url}`, init), params, context: {} })) as Response;
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const buyerLogin = { accessToken: 'buyer-jwt', comprador: { nombre: 'Ana Pérez', email: 'ana@test' } };
const buyerCookie = async () => (await buyerSignInCookie(new Request('http://app.test/'), buyerLogin)).split(';')[0];

describe('universal buyer (ADR-IDN-001/008)', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    process.env.API_PUBLIC_URL = 'https://api.public';
    process.env.GOOGLE_LOGIN_ENABLED = '1';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_LOGIN_ENABLED;
  });

  it('signs up with email: validates, then the API sends the verification link', async () => {
    const short = await call(signupAction, '/registro', { method: 'POST', body: formBody([['nombre', 'Ana'], ['email', 'ana@test.com'], ['password', 'corta']]) });
    expect(short.status).toBe(400);
    expect(api).not.toHaveBeenCalled();

    api.mockResolvedValue(reply({ email: 'ana@test.com', mailEnviado: true }, 201));
    const ok = await call(signupAction, '/registro', {
      method: 'POST',
      body: formBody([['nombre', 'Ana'], ['email', 'Ana@Test.com'], ['password', 'suficiente-larga']]),
    });
    expect(await ok.json()).toEqual({ sent: { email: 'ana@test.com', mailEnviado: true } });
    expect(api.mock.calls[0][0]).toBe('http://api.test/auth/comprador/registro');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ nombre: 'Ana', email: 'ana@test.com', password: 'suficiente-larga' });
  });

  it('a signed-in buyer skips the sign-up', async () => {
    const response = await call(signupLoader, '/registro', { headers: { Cookie: await buyerCookie() } });
    expect(response.headers.get('Location')).toBe('/cuenta');
  });

  it('the email link verifies and signs in; a stale one goes back to sign-up', async () => {
    api.mockResolvedValueOnce(reply(buyerLogin));
    const ok = await call(verifyLoader, '/registro/verificar?token=abc');
    expect(ok.headers.get('Location')).toBe('/cuenta?bienvenida=1');
    expect(ok.headers.get('Set-Cookie')).toContain('__wapsell_buyer=');

    api.mockResolvedValueOnce(reply({ message: 'venció' }, 401));
    const stale = await call(verifyLoader, '/registro/verificar?token=old');
    expect(stale.headers.get('Location')).toBe('/registro?error=enlace');
    expect(stale.headers.get('Set-Cookie')).toBeNull();
  });

  it('Google: binds the browser, and refuses a link with someone else’s token', async () => {
    const start = await call(googleLoader, '/registro/google');
    const to = new URL(start.headers.get('Location') ?? '');
    expect(`${to.origin}${to.pathname}`).toBe('https://api.public/auth/comprador/google');
    const web = to.searchParams.get('web') ?? '';
    const cookie = (start.headers.get('Set-Cookie') ?? '').split(';')[0];

    const foreign = await call(googleLoader, `/registro/google?token=attacker&web=${web}`);
    expect(foreign.headers.get('Location')).toBe('/registro?error=google');
    expect(api).not.toHaveBeenCalled();

    api.mockResolvedValue(reply({ nombre: 'Ana', email: 'ana@test' }));
    const back = await call(googleLoader, `/registro/google?token=buyer-jwt&web=${web}`, { headers: { Cookie: cookie } });
    expect(back.headers.get('Location')).toBe('/cuenta');
    expect(back.headers.get('Set-Cookie')).toContain('__wapsell_buyer=');
  });

  it('home lists the businesses; without a session it asks to sign in', async () => {
    const anonymous = await call(homeLoader, '/cuenta');
    expect(anonymous.headers.get('Location')).toBe('/es/auth/login?redirectTo=%2Fcuenta');

    api.mockImplementation(async (url) =>
      url.endsWith('/me') ? reply({ nombre: 'Ana Pérez', email: 'ana@test' }) : reply([{ nombre: 'Otra Ronda Más', slug: 'otra-ronda-mas', ciudad: null, provincia: null, rubro: null }]),
    );
    const home = await call(homeLoader, '/cuenta', { headers: { Cookie: await buyerCookie() } });
    expect(await home.json()).toMatchObject({ buyer: { nombre: 'Ana Pérez' }, businesses: [{ slug: 'otra-ronda-mas' }] });
  });

  it('enters a store with the buyer account and gets that store session', async () => {
    api.mockResolvedValue(reply({ accessToken: 'store-jwt', cliente: { nombre: 'Ana', email: 'ana@test' } }));
    const response = await call(enterStore, '/tienda/demo/cuenta/comprador?volver=carrito', { headers: { Cookie: await buyerCookie() } }, { slug: 'demo' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/auth/comprador/negocio/demo');
    expect(api.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer buyer-jwt' });
    expect(response.headers.get('Location')).toBe('/tienda/demo?carrito=1');
    expect(response.headers.get('Set-Cookie')).toContain('__wapsell_customer=');
  });

  it('the Wapsell entry signs in a buyer when the credentials are not staff ones', async () => {
    api.mockImplementation(async (url) =>
      url.endsWith('/auth/comprador/login') ? reply(buyerLogin) : reply({ message: 'Credenciales inválidas' }, 401),
    );
    const response = await call(loginAction, '/es/auth/login?redirectTo=%2Fpanel', {
      method: 'POST',
      body: formBody([['email', 'ana@test'], ['password', 'x']]),
    }, { lang: 'es' });
    // A buyer never lands in the panel: /panel is not a buyer destination.
    // Marketplace (Owner, 2026-11-26): a customer lands in «Explorar».
    expect(response.headers.get('Location')).toBe('/explorar');
    expect(response.headers.get('Set-Cookie')).toContain('__wapsell_buyer=');
  });
});
