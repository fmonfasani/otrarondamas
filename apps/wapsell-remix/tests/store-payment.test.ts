import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok } from './helpers/route';
import { action as accountAction } from '../app/routes/_customer.tienda_.$slug_.cuenta';
import { signInCookie } from '../app/services/customer-session.server';
import { PAYMENT_RETURN, paymentOf } from '../app/utils/store';

describe('paying an order online (OR-B4-032)', () => {
  const order = (estado: string, total = '1000.00', pagado = '0.00') => ({ estado, total, pagado });

  it('offers to pay only confirmed orders in a store that takes online payments', () => {
    expect(paymentOf(order('CONFIRMADO'), true)).toEqual({ kind: 'pay', remaining: 1000 });
    expect(paymentOf(order('EN_CAMINO'), true)).toEqual({ kind: 'pay', remaining: 1000 });
    expect(paymentOf(order('RECIBIDO'), true).kind).toBe('wait');
    expect(paymentOf(order('CANCELADO'), true).kind).toBe('none');
    expect(paymentOf(order('CONFIRMADO'), false).kind).toBe('none');
  });

  it('charges only what is still unpaid, and shows a paid order as paid', () => {
    expect(paymentOf(order('CONFIRMADO', '1000.00', '400.00'), true)).toEqual({ kind: 'pay', remaining: 600 });
    expect(paymentOf(order('CONFIRMADO', '1000.00', '1000.00'), true).kind).toBe('paid');
    expect(paymentOf(order('RECIBIDO', '1000.00', '1000.00'), false).kind).toBe('paid');
  });

  it('has a message for each way back from Mercado Pago', () => {
    expect(Object.keys(PAYMENT_RETURN).sort((a, b) => a.localeCompare(b))).toEqual(['aprobado', 'pendiente', 'rechazado']);
  });
});

describe('Mis pedidos: pay action', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = async (pairs: Array<[string, string]>, signedIn = true) => {
    const cookie = signedIn
      ? (await signInCookie(new Request('http://app.test/'), 'demo', { accessToken: 'customer-jwt', cliente: { nombre: 'Ana', email: 'a@t' } })).split(';')[0]
      : '';
    return accountAction({
      request: new Request('http://app.test/tienda/demo/cuenta', { method: 'POST', body: formBody(pairs), headers: cookie ? { Cookie: cookie } : {} }),
      params: { slug: 'demo' },
      context: {},
    }) as Promise<Response>;
  };

  it('sends the customer to the Mercado Pago checkout the API creates', async () => {
    api.mockResolvedValueOnce(ok({ url: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1' }));
    const response = await post([['intent', 'pay'], ['orderId', 'pedido-1']]);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=1');
    expect(api.mock.calls[0][0]).toBe('http://api.test/demo/tienda/mis-pedidos/pedido-1/pagar');
    expect((api.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer customer-jwt');
  });

  it('explains why an order cannot be paid yet', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'El comercio todavía no confirmó el pedido.' }), { status: 409 }));
    const response = await post([['intent', 'pay'], ['orderId', 'pedido-1']]);
    await expect(response.json()).resolves.toEqual({ intent: 'pay', message: 'El comercio todavía no confirmó el pedido.' });
  });

  it('does not call the API without a customer session', async () => {
    const response = await post([['intent', 'pay'], ['orderId', 'pedido-1']], false);
    expect(response.status).toBe(302);
    expect(api).not.toHaveBeenCalled();
  });
});
