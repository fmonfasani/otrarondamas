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

  it('validates a token through the server-side NestJS endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));
    await expect(validateJWT('valid-token')).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith('http://api.test/auth/validate', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
    }));
  });

  it('rejects an empty token without making an API request', async () => {
    await expect(validateJWT('')).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an expired token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await expect(validateJWT('expired-token')).resolves.toBe(false);
  });

  it('returns token and identity data after successful login', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      access_token: 'jwt-token',
      user: { id: 'user-1', email: 'test@example.com' },
      empresas: [{ id: 'business-1' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(loginWithNestJS('test@example.com', 'secret')).resolves.toEqual({
      token: 'jwt-token',
      user: { id: 'user-1', email: 'test@example.com' },
      empresas: [{ id: 'business-1' }],
    });
    expect(fetch).toHaveBeenCalledWith('http://api.test/auth/login', expect.objectContaining({ method: 'POST' }));
  });

  it('rejects invalid credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await expect(loginWithNestJS('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
