import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginWithNestJS, validateJWT } from '../app/services/auth.server';

const originalApiBaseUrl = process.env.API_BASE_URL;

describe('Auth Service', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApiBaseUrl;
  });

  it('validates a token through the existing authenticated profile endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'user-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    await expect(validateJWT('valid-token')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://api.test/auth/me', {
      headers: { Authorization: 'Bearer valid-token' },
    });
  });

  it('rejects an empty token without making an API request', async () => {
    await expect(validateJWT('')).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await expect(validateJWT('expired-token')).resolves.toBe(false);
  });

  it('rejects a token whose user no longer exists', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));
    await expect(validateJWT('deleted-user-token')).resolves.toBe(false);
  });

  it('preserves the forbidden response for customer-only identities', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));
    await expect(validateJWT('customer-token')).rejects.toMatchObject({ status: 403 });
  });

  it('fails closed when the authentication service is unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('connection refused'));
    await expect(validateJWT('valid-token')).rejects.toMatchObject({ status: 503 });
  });

  // Contract of the API: AuthService.issueSession → { accessToken, usuario, empresas, empresaId }.
  it('returns token and identity data after successful login', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      accessToken: 'jwt-token',
      empresaId: 'business-1',
      usuario: { id: 'user-1', email: 'test@example.com' },
      empresas: [{ id: 'business-1' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(loginWithNestJS('test@example.com', 'secret')).resolves.toEqual({
      token: 'jwt-token',
      user: { id: 'user-1', email: 'test@example.com' },
      empresas: [{ id: 'business-1' }],
      empresaId: 'business-1',
    });
    expect(fetch).toHaveBeenCalledWith('http://api.test/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('rejects a response without an access token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ access_token: 'legacy' }), { status: 200 }));
    await expect(loginWithNestJS('test@example.com', 'secret')).rejects.toThrow('Invalid credentials');
  });

  it('rejects invalid credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await expect(loginWithNestJS('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
