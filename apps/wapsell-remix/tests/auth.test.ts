import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateJWT, loginWithNestJS } from '../app/services/auth.server';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate valid JWT', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as any)
    );

    const result = await validateJWT('valid-token');
    expect(result).toBe(true);
  });

  it('should reject invalid JWT', async () => {
    const result = await validateJWT('');
    expect(result).toBe(false);
  });

  it('should login with valid credentials', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'token',
            user: { id: '1', email: 'test@example.com' },
            empresas: [],
          }),
      } as any)
    );

    const result = await loginWithNestJS('test@example.com', 'password');
    expect(result.token).toBe('token');
  });

  it('should reject invalid credentials', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      } as any)
    );

    await expect(loginWithNestJS('test@example.com', 'wrong')).rejects.toThrow();
  });
});
