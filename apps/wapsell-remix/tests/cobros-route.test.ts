import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, postTo, sessionCookie, stubApi } from './helpers/route';
import { action, loader, CALLBACK_NOTICES } from '../app/routes/_business.$lang.dashboard.cobros';

describe('Cobros (Mercado Pago account, OR-B4-032/033)', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('OWNER');
  });
  afterEach(() => vi.unstubAllGlobals());

  const load = async () =>
    (await loader({
      request: new Request('http://app.test/es/dashboard/cobros', { headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;

  it('shows the connection status', async () => {
    api.mockResolvedValueOnce(ok({ available: true, connected: true, mercadoPagoUserId: '123', liveMode: true, connectedAt: null }));
    const data = await (await load()).json();
    expect(data.status.connected).toBe(true);
    expect(api.mock.calls[0][0]).toBe('http://api.test/cobros/mercadopago');
  });

  it('tells a non-Owner it is Owner-only', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));
    await expect((await load()).json()).resolves.toMatchObject({ status: null, denied: true });
  });

  it('sends the Owner to the Mercado Pago authorization the API returns', async () => {
    api.mockResolvedValueOnce(ok({ url: 'https://auth.mercadopago.com/authorization?client_id=1&state=s' }));
    const response = await postTo(action, 'cobros', [['intent', 'connect']]);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://auth.mercadopago.com/authorization?client_id=1&state=s');
    expect(api.mock.calls[0]).toEqual(['http://api.test/cobros/mercadopago/conectar', expect.objectContaining({ method: 'POST' })]);
  });

  it('disconnects', async () => {
    api.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await postTo(action, 'cobros', [['intent', 'disconnect']]);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(api.mock.calls[0]).toEqual(['http://api.test/cobros/mercadopago', expect.objectContaining({ method: 'DELETE' })]);
  });

  it('has a message for every outcome the API redirects with', () => {
    expect(Object.keys(CALLBACK_NOTICES).sort((a, b) => a.localeCompare(b))).toEqual(['cancelado', 'conectado', 'error', 'otra-cuenta']);
  });
});
