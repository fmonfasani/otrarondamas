import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok } from './helpers/route';
import { action as storeAction, loader as storeLoader } from '../app/routes/_customer.tienda_.$slug';
import { action as accountAction, afterSignIn } from '../app/routes/_customer.tienda_.$slug_.cuenta';
import { action as chatAction } from '../app/routes/_customer.tienda_.$slug_.chat';
import { signInCookie } from '../app/services/customer-session.server';
import { linesFromServer, mergeCarts, parseItems, storeMark, type CartLine } from '../app/utils/store';

const line = (productoId: string, cantidad: number): CartLine => ({ productoId, nombre: productoId, precio: '10', cantidad });

describe('store helpers', () => {
  it('keeps what was picked before signing in and the rest of the saved cart', () => {
    expect(mergeCarts([line('a', 3)], [line('a', 1), line('b', 2)])).toEqual([line('a', 3), line('b', 2)]);
  });

  it('reads the saved cart from the API', () => {
    expect(
      linesFromServer({ id: 'c', CartItem: [{ productoId: 'p', cantidad: '2', Producto: { nombre: 'Yerba', precioMinorista: '1500' } }] }),
    ).toEqual([{ productoId: 'p', nombre: 'Yerba', precio: '1500', cantidad: 2 }]);
  });

  it('accepts only well-formed items, never prices', () => {
    expect(parseItems('[{"productoId":"p","cantidad":2,"precio":"1"}]')).toEqual([{ productoId: 'p', cantidad: 2 }]);
    expect(parseItems('[{"productoId":"p","cantidad":0}]')).toBeNull();
    expect(parseItems('[{"productoId":"p","cantidad":1.5}]')).toBeNull();
    expect(parseItems('no json')).toBeNull();
  });

  it('makes the store mark from its name and only returns to the cart when asked', () => {
    expect(storeMark('Otra Ronda Más')).toBe('OR');
    expect(storeMark('kiosco')).toBe('KI');
    expect(afterSignIn('demo', 'carrito')).toBe('/tienda/demo?carrito=1');
    expect(afterSignIn('demo', 'chat')).toBe('/tienda/demo/chat');
    expect(afterSignIn('demo', 'https://evil.test')).toBe('/tienda/demo/cuenta');
  });
});

describe('store routes', () => {
  let api: ReturnType<typeof vi.fn<(input: string, init?: RequestInit) => Promise<Response>>>;
  const login = { accessToken: 'customer-jwt', cliente: { nombre: 'Ana', email: 'ana@test' } };

  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => api(String(input), init)));
  });
  afterEach(() => vi.unstubAllGlobals());

  const customerCookie = async (slug = 'demo') =>
    (await signInCookie(new Request('http://app.test/'), slug, login)).split(';')[0];

  type Handler = (args: { request: Request; params: Record<string, string>; context: Record<string, never> }) => unknown;
  const post = async (handler: Handler, path: string, pairs: Array<[string, string]>, cookie?: string) =>
    handler({
      request: new Request(`http://app.test${path}`, {
        method: 'POST',
        body: formBody(pairs),
        headers: cookie ? { Cookie: cookie } : {},
      }),
      params: { slug: 'demo' },
      context: {},
    }) as Promise<Response>;

  it('asks a visitor to sign in before ordering, without calling the API', async () => {
    const response = await post(storeAction, '/tienda/demo', [['intent', 'order'], ['items', '[{"productoId":"p","cantidad":1}]']]);
    expect(response.status).toBe(401);
    expect(api).not.toHaveBeenCalled();
  });

  it('places the order as the signed-in customer and empties the saved cart', async () => {
    api
      .mockResolvedValueOnce(ok({ id: 'pedido-1' }))
      .mockResolvedValueOnce(ok({ id: 'cart-1', CartItem: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await post(storeAction, '/tienda/demo', [['intent', 'order'], ['items', '[{"productoId":"p","cantidad":2}]']], await customerCookie());
    await expect(response.json()).resolves.toMatchObject({ ok: true, intent: 'order' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/demo/tienda/mis-pedidos');
    expect(api.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ items: [{ productoId: 'p', cantidad: 2 }] }) });
    expect((api.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe('Bearer customer-jwt');
    expect(api.mock.calls[2][0]).toBe('http://api.test/cart/cart-1');
  });

  it('does not use a session opened in another store', async () => {
    const response = await post(storeAction, '/tienda/demo', [['intent', 'order'], ['items', '[{"productoId":"p","cantidad":1}]']], await customerCookie('otra'));
    expect(response.status).toBe(401);
  });

  it('saves the cart to the account', async () => {
    api
      .mockResolvedValueOnce(ok({ id: 'cart-1', CartItem: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(ok({ id: 'item-1' }));
    await post(storeAction, '/tienda/demo', [['intent', 'sync'], ['items', '[{"productoId":"p","cantidad":3}]']], await customerCookie());
    expect(api.mock.calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual([
      'POST http://api.test/cart',
      'DELETE http://api.test/cart/cart-1',
      'POST http://api.test/cart/cart-1/items',
    ]);
  });

  it('signs in through the store of the slug and returns to the cart', async () => {
    api.mockResolvedValueOnce(ok(login));
    const response = await post(accountAction, '/tienda/demo/cuenta', [
      ['intent', 'login'], ['email', 'ana@test'], ['password', 'clave-123'], ['volver', 'carrito'],
    ]);
    expect(api.mock.calls[0][0]).toBe('http://api.test/auth/cliente/negocio/demo/login');
    expect(response.headers.get('Location')).toBe('/tienda/demo?carrito=1');
    expect(response.headers.get('Set-Cookie')).toContain('__wapsell_customer=');
  });

  it('explains a wrong password without signing in', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Credenciales inválidas' }), { status: 401 }));
    const response = await post(accountAction, '/tienda/demo/cuenta', [['intent', 'login'], ['email', 'ana@test'], ['password', 'mala-clave']]);
    await expect(response.json()).resolves.toEqual({ intent: 'login', message: 'El email o la contraseña no son correctos.' });
  });

  it('sends sign-in first when a visitor opens the chat', async () => {
    const result = post(chatAction, '/tienda/demo/chat', [['content', 'hola'], ['clientMessageId', 'k-1']]);
    await expect(result).rejects.toMatchObject({ status: 302 });
    expect(api).not.toHaveBeenCalled();
  });

  it('sends a chat message with its retry key as the signed-in customer', async () => {
    api.mockResolvedValueOnce(ok({ conversationId: 'conv-1', message: { id: 'm-1' } }));
    const response = await post(chatAction, '/tienda/demo/chat', [['content', '  ¿Hacen envíos?  '], ['clientMessageId', 'k-1']], await customerCookie());
    await expect(response.json()).resolves.toEqual({ ok: true, message: '' });
    expect(api.mock.calls[0][0]).toBe('http://api.test/demo/tienda/chat/mensajes');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ clientMessageId: 'k-1', content: '¿Hacen envíos?' });
  });

  it('does not send an empty chat message', async () => {
    const response = await post(chatAction, '/tienda/demo/chat', [['content', '   '], ['clientMessageId', 'k-1']], await customerCookie());
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });

  it('answers 404 for a store that does not exist', async () => {
    api.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    const result = storeLoader({ request: new Request('http://app.test/tienda/nada'), params: { slug: 'nada' }, context: {} });
    await expect(result).rejects.toMatchObject({ status: 404 });
  });
});
