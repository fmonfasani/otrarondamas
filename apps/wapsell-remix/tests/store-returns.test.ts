import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formBody, ok } from './helpers/route';
import { action } from '../app/routes/_customer.tienda_.$slug_.cuenta_.devolucion.$ventaId';
import { signInCookie } from '../app/services/customer-session.server';

/** OR-B4-035 rule 1 — the store customer asks for a return from «Mis compras». */
describe('Mis compras: request a return', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  const purchase = {
    id: 'v-1',
    numero: 7,
    fecha: '2026-11-12T12:00:00Z',
    total: '30',
    diasParaDevolver: 9,
    devolvible: true,
    items: [{ ventaItemId: 'vi-1', producto: 'Yerba', cantidad: 3, disponible: 2, precio: '10.00' }],
    devoluciones: [],
  };
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
    return action({
      request: new Request('http://app.test/tienda/demo/cuenta/devolucion/v-1', {
        method: 'POST',
        body: formBody(pairs),
        headers: cookie ? { Cookie: cookie } : {},
      }),
      params: { slug: 'demo', ventaId: 'v-1' },
      context: {},
    }).catch((thrown: unknown) => thrown) as Promise<Response>;
  };

  it('sends the lines with their reasons and goes back to the account', async () => {
    api.mockResolvedValueOnce(ok([purchase])).mockResolvedValueOnce(ok({ id: 'd-1', numero: 4 }));
    const response = await post([['cantidad-vi-1', '1'], ['razon-vi-1', 'VENCIDO'], ['motivo-vi-1', ''], ['motivo_general', 'Gracias']]);
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta?devolucion=4');
    expect(api.mock.calls[1][0]).toBe('http://api.test/demo/tienda/mis-compras/v-1/devolucion');
    expect((api.mock.calls[1][1]?.headers as Record<string, string>).Authorization).toBe('Bearer customer-jwt');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({
      items: [{ ventaItemId: 'vi-1', cantidad: 1, motivoCodigo: 'VENCIDO' }],
      motivo_general: 'Gracias',
    });
  });

  it('never asks for more than what is left', async () => {
    api.mockResolvedValueOnce(ok([purchase]));
    const response = await post([['cantidad-vi-1', '3'], ['razon-vi-1', 'ROTO']]);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringContaining('como máximo 2') });
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-out visitor to sign in', async () => {
    const response = await post([['cantidad-vi-1', '1']], false);
    expect(response.headers.get('Location')).toBe('/tienda/demo/cuenta');
    expect(api).not.toHaveBeenCalled();
  });
});
