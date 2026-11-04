import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAuth } from '../app/services/auth.server';
import { getApiBaseUrl } from '../app/services/api.server';
import { fetchAuthenticatedData } from '../app/services/tenant.server';

vi.mock('../app/services/auth.server', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('../app/services/api.server', () => ({
  getApiBaseUrl: vi.fn(),
}));

describe('Authenticated API adapter', () => {
  const request = new Request('https://wapsell.test/dashboard');
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(requireAuth).mockResolvedValue('signed-jwt');
    vi.mocked(getApiBaseUrl).mockReturnValue('https://api.wapsell.test');
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the authenticated JWT and preserves caller headers', async () => {
    await fetchAuthenticatedData('/pedidos', request, {
      headers: { Accept: 'application/json' },
    });

    expect(requireAuth).toHaveBeenCalledWith(request);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);

    expect(url).toBe('https://api.wapsell.test/pedidos');
    expect(headers.get('authorization')).toBe('Bearer signed-jwt');
    expect(headers.get('accept')).toBe('application/json');
  });

  it('does not forward cookie-derived tenant identifiers', async () => {
    await fetchAuthenticatedData('/pedidos', request, {
      headers: {
        'X-Empresa-Id': 'attacker-business',
        'X-User-Id': 'attacker-user',
      },
    });

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);

    expect(headers.has('x-empresa-id')).toBe(false);
    expect(headers.has('x-user-id')).toBe(false);
  });

  it('normalizes endpoints without a leading slash', async () => {
    await fetchAuthenticatedData('pedidos', request);

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.wapsell.test/pedidos');
  });

  it('sets JSON content type when a request body is supplied', async () => {
    await fetchAuthenticatedData('/pedidos', request, {
      method: 'POST',
      body: JSON.stringify({ estado: 'CONFIRMADO' }),
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
  });

  it('does not override an explicit content type', async () => {
    await fetchAuthenticatedData('/pedidos', request, {
      method: 'POST',
      headers: { 'Content-Type': 'application/problem+json' },
      body: '{}',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get('content-type')).toBe('application/problem+json');
  });
});
