import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMEMBER_ME_MAX_AGE, action } from '../app/routes/$lang.auth.login';

// Figma "Ingresar a Wapsell" (145:13208) wired to POST /auth/login.
describe('Login route action', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  const submit = (fields: Record<string, string>) =>
    action({
      request: new Request('http://app.test/es/auth/login', {
        method: 'POST',
        body: new URLSearchParams(fields),
      }),
      params: { lang: 'es' },
      context: {},
    });

  const apiLogin = () =>
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'jwt-token',
          empresaId: 'business-1',
          usuario: { id: 'user-1' },
          empresas: [{ id: 'business-1' }],
        }),
        { status: 200 },
      ),
    );

  it('signs in and keeps the session for 30 days with "Recordarme"', async () => {
    apiLogin();
    const response = (await submit({ email: 'lucia@ejemplo.com', password: 'x', remember: '1' })) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/es/dashboard');
    expect(response.headers.get('Set-Cookie')).toContain(`Max-Age=${REMEMBER_ME_MAX_AGE}`);
  });

  it('uses a browser-session cookie without "Recordarme"', async () => {
    apiLogin();
    const response = (await submit({ email: 'lucia@ejemplo.com', password: 'x' })) as Response;
    expect(response.status).toBe(302);
    const cookie = response.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain('__session=');
    expect(cookie).not.toContain('Max-Age');
    expect(cookie).not.toContain('Expires');
  });

  it('shows a credentials error and keeps the email', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    const response = (await submit({ email: 'lucia@ejemplo.com', password: 'bad' })) as Response;
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'El correo o la contraseña no son correctos.',
      email: 'lucia@ejemplo.com',
    });
  });

  it('reports the API being unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const response = (await submit({ email: 'lucia@ejemplo.com', password: 'x' })) as Response;
    expect(response.status).toBe(503);
  });

  it('asks for both fields', async () => {
    const response = (await submit({ email: '', password: '' })) as Response;
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
