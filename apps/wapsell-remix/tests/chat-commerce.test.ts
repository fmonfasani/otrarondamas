import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok, sessionCookie, stubApi } from './helpers/route';
import { action as messagesAction } from '../app/routes/_business.$lang.dashboard.mensajes';
import { action as chatAction } from '../app/routes/_customer.tienda_.$slug_.chat';
import { signInCookie } from '../app/services/customer-session.server';
import { canEditCustomerCart, productCards } from '../app/utils/messaging';

/** OR-B4-037 — products and the customer's cart in the conversation. */
describe('chat commerce helpers', () => {
  it('finds the product cards of a message', () => {
    const card = { tipo: 'producto' as const, id: 'a-1', productoId: 'p-1', nombre: 'Yerba', precio: '10' };
    const photo = { tipo: 'imagen' as const, id: 'a-2', nombre: 'foto.jpg', mimeType: 'image/jpeg', tamano: 10 };
    expect(productCards({ adjuntos: [card, photo] })).toEqual([card]);
    expect(productCards({})).toEqual([]);
  });

  it('lets the selling roles load the cart', () => {
    expect(['OWNER', 'ADMIN', 'VENDEDOR', 'ASISTENTE_LOCAL'].every(canEditCustomerCart)).toBe(true);
    expect(canEditCustomerCart('GESTOR_DE_STOCK')).toBe(false);
  });
});

describe('Mensajes actions', () => {
  let api: ReturnType<typeof stubApi>;
  beforeEach(() => {
    api = stubApi('VENDEDOR');
  });
  afterEach(() => vi.unstubAllGlobals());

  const post = async (pairs: Array<[string, string]>) =>
    (await messagesAction({
      request: new Request('http://app.test/es/dashboard/mensajes', { method: 'POST', body: formBody(pairs), headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;

  it('shares a product with a new retry key', async () => {
    api.mockResolvedValueOnce(ok({}));
    await post([['intent', 'share-product'], ['conversationId', 'c-1'], ['productoId', 'p-1']]);
    expect(api.mock.calls[0][0]).toBe('http://api.test/messaging/conversations/c-1/products');
    const body = JSON.parse(String(api.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ productoId: 'p-1', clientMessageId: expect.any(String) });
  });

  it('sets the quantity in the customer’s cart, never below 0', async () => {
    api.mockImplementation(async () => ok({}));
    await post([['intent', 'cart-set'], ['conversationId', 'c-1'], ['productoId', 'p-1'], ['cantidad', '3']]);
    const removed = await post([['intent', 'cart-set'], ['conversationId', 'c-1'], ['productoId', 'p-1'], ['cantidad', '-1']]);
    expect(api.mock.calls.map((c) => [c[0], c[1]?.method, JSON.parse(String(c[1]?.body))])).toEqual([
      ['http://api.test/messaging/conversations/c-1/cart/items', 'PUT', { productoId: 'p-1', cantidad: 3 }],
      ['http://api.test/messaging/conversations/c-1/cart/items', 'PUT', { productoId: 'p-1', cantidad: 0 }],
    ]);
    await expect(removed.json()).resolves.toMatchObject({ ok: true, message: 'Producto sacado del carrito.' });
  });
});

describe('store chat: add a shared product to the cart', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('adds one unit to the customer’s saved cart', async () => {
    api.mockResolvedValueOnce(ok({ id: 'cart-1', CartItem: [] })).mockResolvedValueOnce(ok({}));
    const cookie = (await signInCookie(new Request('http://app.test/'), 'demo', { accessToken: 'customer-jwt', cliente: { nombre: 'Ana', email: 'a@t' } })).split(';')[0];
    const response = (await chatAction({
      request: new Request('http://app.test/tienda/demo/chat', {
        method: 'POST',
        body: formBody([['intent', 'cart-add'], ['productoId', 'p-1']]),
        headers: { Cookie: cookie },
      }),
      params: { slug: 'demo' },
      context: {},
    })) as Response;
    await expect(response.json()).resolves.toEqual({ ok: true, message: '', added: 'p-1' });
    expect(api.mock.calls[1][0]).toBe('http://api.test/cart/cart-1/items');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ productoId: 'p-1', cantidad: 1 });
  });
});
