import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubApi } from './helpers/route';
import { loader as callback } from '../app/routes/auth.google.callback';
import { loader as start } from '../app/routes/auth.google';
import { getSession } from '../app/services/auth.server';

/** «Ingresar con Google» (back-end kept from the old app; web side rebuilt), with OR-B4-044. */
describe('sign in with Google', () => {
  beforeEach(() => {
    stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());
  const at = (query: string) => ({
    request: new Request(`http://app.test/auth/google/callback?${query}`),
    params: {},
    context: {},
  });

  it('hands the browser to the API', () => {
    expect(start().headers.get('Location')).toBe('https://api.wapsell.com/auth/google');
  });

  it('sends an account that needs MFA to the second step, with the ticket on the server', async () => {
    const res = (await callback(at('mfa=activar&ticket=t-9'))) as Response;
    expect(res.headers.get('Location')).toBe('/es/auth/activar-mfa');
    const session = await getSession(res.headers.get('Set-Cookie'));
    expect(session.get('mfaTicket')).toBe('t-9');
    expect(session.get('jwt')).toBeUndefined();
  });

  it('opens the session for an account without MFA', async () => {
    const res = (await callback(at('token=jwt-1'))) as Response;
    expect(res.headers.get('Location')).toBe('/es/dashboard');
    expect((await getSession(res.headers.get('Set-Cookie'))).get('jwt')).toBe('jwt-1');
  });

  it('goes back to sign in when something is missing', async () => {
    const res = (await callback(at(''))) as Response;
    expect(res.headers.get('Location')).toBe('/es/auth/login?error=google');
  });
});
