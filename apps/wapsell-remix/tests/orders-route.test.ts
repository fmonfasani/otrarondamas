import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action as orderAction, loader as orderLoader } from '../app/routes/_business.$lang.dashboard.pedidos_.$id';
import { loader as ordersLoader } from '../app/routes/_business.$lang.dashboard.pedidos';
import { formatMoney, orderState } from '../app/utils/format';

// Business panel "Pedidos", wired to GET /pedidos, GET /pedidos/:id,
// PATCH /pedidos/:id/estado (ORDER_CONFIRM) and POST /pedidos/:id/cancel (ORDER_CANCEL).
async function authedRequest(url: string, init: RequestInit = {}) {
  const session = await getSession();
  session.set('jwt', 'jwt-token');
  const cookie = (await commitSession(session)).split(';')[0];
  return new Request(url, { ...init, headers: { ...(init.headers ?? {}), Cookie: cookie } });
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe('orders routes', () => {
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    // First call of every loader/action validates the session (GET /auth/me).
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ id: 'u-1' })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists orders filtered by an allowed state only', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok([{ id: 'o-1', estado: 'RECIBIDO' }]));
    const response = (await ordersLoader({
      request: await authedRequest('http://app.test/es/dashboard/pedidos?estado=RECIBIDO'),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toEqual({ orders: [{ id: 'o-1', estado: 'RECIBIDO' }], error: null });
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe('http://api.test/pedidos?estado=RECIBIDO');

    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: 'u-1' })).mockResolvedValueOnce(ok([]));
    await ordersLoader({
      request: await authedRequest('http://app.test/es/dashboard/pedidos?estado=DROP%20TABLE'),
      params: { lang: 'es' },
      context: {},
    });
    expect(vi.mocked(fetch).mock.calls[3][0]).toBe('http://api.test/pedidos');
  });

  it('confirms an order with PATCH /estado and the bearer token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: 'o-1', estado: 'CONFIRMADO' }));
    const response = (await orderAction({
      request: await authedRequest('http://app.test/es/dashboard/pedidos/o-1', {
        method: 'POST',
        body: new URLSearchParams({ intent: 'confirm' }),
      }),
      params: { lang: 'es', id: 'o-1' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://api.test/pedidos/o-1/estado');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ estado: 'CONFIRMADO' }));
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token');
  });

  it('shows the API reason when the role cannot cancel (ORDER_CANCEL)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Requiere ORDER_CANCEL' }), { status: 403 }),
    );
    const response = (await orderAction({
      request: await authedRequest('http://app.test/es/dashboard/pedidos/o-1', {
        method: 'POST',
        body: new URLSearchParams({ intent: 'cancel', motivo: 'sin stock' }),
      }),
      params: { lang: 'es', id: 'o-1' },
      context: {},
    })) as Response;
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Requiere ORDER_CANCEL' });
    expect(JSON.parse(String((vi.mocked(fetch).mock.calls[1][1] as RequestInit).body))).toEqual({ motivo: 'sin stock' });
  });

  it('turns a missing order into a 404', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    await expect(
      orderLoader({
        request: await authedRequest('http://app.test/es/dashboard/pedidos/nope'),
        params: { lang: 'es', id: 'nope' },
        context: {},
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('sends anonymous visitors to the login page and back', async () => {
    await expect(
      ordersLoader({ request: new Request('http://app.test/es/dashboard/pedidos'), params: { lang: 'es' }, context: {} }),
    ).rejects.toMatchObject({ status: 302 });
    try {
      await ordersLoader({ request: new Request('http://app.test/es/dashboard/pedidos?estado=RECIBIDO'), params: { lang: 'es' }, context: {} });
    } catch (response) {
      expect((response as Response).headers.get('Location')).toBe(
        `/es/auth/login?redirectTo=${encodeURIComponent('/es/dashboard/pedidos?estado=RECIBIDO')}`,
      );
    }
  });
});

describe('formatting', () => {
  it('formats API decimal strings as pesos and maps order states', () => {
    expect(formatMoney('6000')).toMatch(/6\.000/);
    expect(orderState('RECIBIDO')).toEqual({ label: 'Por confirmar', tone: 'warning' });
    expect(orderState('DESCONOCIDO')).toEqual({ label: 'DESCONOCIDO', tone: 'muted' });
  });
});
