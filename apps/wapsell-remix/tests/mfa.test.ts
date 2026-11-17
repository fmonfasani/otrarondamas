import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, stubApi } from './helpers/route';
import { action as loginAction } from '../app/routes/$lang.auth.login';
import {
  action as verifyAction,
  loader as verifyLoader,
} from '../app/routes/$lang.auth.verificacion';
import { loader as enrolLoader } from '../app/routes/$lang.auth.activar-mfa';
import { commitSession, getSession } from '../app/services/auth.server';
import { sixDigits } from '../app/services/mfa.server';

/** OR-B4-044 — the sign-in with a second factor, on the web side. */
describe('second factor at sign-in', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = (path: string, pairs: Array<[string, string]>, cookie = '') =>
    new Request(`http://app.test${path}`, {
      method: 'POST',
      body: formBody(pairs),
      headers: cookie ? { Cookie: cookie } : {},
    });
  const cookieWith = async (values: Record<string, unknown>) => {
    const session = await getSession();
    for (const [k, v] of Object.entries(values)) session.set(k, v);
    return (await commitSession(session)).split(';')[0];
  };

  it('sends an Owner from the password to enrolling, keeping the ticket on the server', async () => {
    api.mockResolvedValueOnce(ok({ mfa: 'activar', ticket: 't-1' }));
    const res = (await loginAction({
      request: post('/es/auth/login?redirectTo=%2Fes%2Fdashboard%2Fcaja', [
        ['email', 'a@b.co'],
        ['password', 'x'],
        ['remember', '1'],
      ]),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/es/auth/activar-mfa');
    const session = await getSession(res.headers.get('Set-Cookie'));
    expect(session.get('mfaTicket')).toBe('t-1');
    expect(session.get('mfaRedirect')).toBe('/es/dashboard/caja');
    expect(session.get('jwt')).toBeUndefined();
  });

  it('sends someone with MFA to the code step', async () => {
    api.mockResolvedValueOnce(ok({ mfa: 'verificar', ticket: 't-2' }));
    const res = (await loginAction({
      request: post('/es/auth/login', [
        ['email', 'a@b.co'],
        ['password', 'x'],
      ]),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(res.headers.get('Location')).toBe('/es/auth/verificacion');
  });

  it('opens the session after the code, and remembers the device when asked', async () => {
    api.mockResolvedValueOnce(
      ok({
        accessToken: 'jwt-mfa',
        usuario: { id: 'u' },
        empresas: [{ id: 'e' }],
        empresaId: 'e',
        dispositivo: 'dev-1',
      }),
    );
    const cookie = await cookieWith({
      mfaTicket: 't-2',
      mfaStep: 'verificar',
      mfaRedirect: '/es/dashboard/pedidos',
    });
    const res = (await verifyAction({
      request: post(
        '/es/auth/verificacion',
        [
          ['codigo', '123 456'],
          ['recordar', '1'],
        ],
        cookie,
      ),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({
      ticket: 't-2',
      codigo: '123456',
      recordar: true,
    });
    expect(res.headers.get('Location')).toBe('/es/dashboard/pedidos');
    const cookies = res.headers.get('Set-Cookie') ?? '';
    expect(cookies).toContain('__wapsell_device=');
    const session = await getSession(cookies.split(', __wapsell_device')[0]);
    expect(session.get('jwt')).toBe('jwt-mfa');
    expect(session.get('mfaTicket')).toBeUndefined();
  });

  it('shows a wrong code as a message, and an expired ticket goes back to sign in', async () => {
    const cookie = await cookieWith({ mfaTicket: 't-3', mfaStep: 'verificar' });
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'El código no es correcto.' }), { status: 401 }),
    );
    const wrong = (await verifyAction({
      request: post('/es/auth/verificacion', [['codigo', '000000']], cookie),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(await wrong.json()).toEqual({ error: 'El código no es correcto.' });
    api.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ message: 'La verificación venció. Volvé a ingresar tu contraseña.' }),
        { status: 401 },
      ),
    );
    const expired = (await verifyAction({
      request: post('/es/auth/verificacion', [['codigo', '000000']], cookie),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(expired.headers.get('Location')).toBe('/es/auth/login');
  });

  it('only shows the second-factor pages with a ticket', async () => {
    const req = new Request('http://app.test/es/auth/verificacion');
    const a = (await verifyLoader({
      request: req,
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(a.headers.get('Location')).toBe('/es/auth/login');
    const b = (await enrolLoader({
      request: req,
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect(b.headers.get('Location')).toBe('/es/auth/login');
  });

  it('draws the QR once per sign-in and keeps it on reload', async () => {
    api.mockResolvedValueOnce(
      ok({ clave: 'ABCDEFGHIJKLMNOP', enlace: 'otpauth://totp/Wapsell:a?secret=ABC' }),
    );
    const cookie = await cookieWith({ mfaTicket: 't-4', mfaStep: 'activar' });
    const first = (await enrolLoader({
      request: new Request('http://app.test/es/auth/activar-mfa', { headers: { Cookie: cookie } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    const body = await first.json();
    expect(body.qr).toMatch(/^data:image/png;base64,/);
    expect(body.clave).toBe('ABCD EFGH IJKL MNOP');
    const again = (await enrolLoader({
      request: new Request('http://app.test/es/auth/activar-mfa', {
        headers: { Cookie: (first.headers.get('Set-Cookie') ?? '').split(';')[0] },
      }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    expect((await again.json()).clave).toBe('ABCD EFGH IJKL MNOP');
    expect(api).toHaveBeenCalledTimes(1); // no second secret
  });

  it('accepts six digits with spaces', () => {
    expect(sixDigits('123 456')).toBe(true);
    expect(sixDigits('12345')).toBe(false);
    expect(sixDigits('abcdef')).toBe(false);
  });
});
