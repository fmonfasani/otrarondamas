import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, postTo, sessionCookie, stubApi } from './helpers/route';
import { action, customerAbilities, customerBody, loader } from '../app/routes/_business.$lang.dashboard.clientes';

const formOf = (pairs: Array<[string, string]>) => {
  const form = new FormData();
  for (const [k, v] of pairs) form.append(k, v);
  return form;
};

describe('customer helpers', () => {
  it('mirrors the matrix: Gestor de stock does not manage customers', () => {
    expect(customerAbilities('VENDEDOR').manage).toBe(true);
    expect(customerAbilities('GESTOR_DE_STOCK').manage).toBe(false);
  });

  it('builds create and update bodies without sending an empty email', () => {
    expect(customerBody(formOf([['nombre', ' Ana '], ['email', ''], ['telefono', '11 5555'], ['direccion', '']]), false)).toEqual({
      ok: true,
      body: { nombre: 'Ana', telefono: '11 5555' },
    });
    expect(customerBody(formOf([['nombre', 'Ana'], ['email', ''], ['telefono', ''], ['direccion', '']]), true)).toEqual({
      ok: true,
      body: { nombre: 'Ana', telefono: '', direccion: '' },
    });
    expect(customerBody(formOf([['nombre', '']]), false)).toMatchObject({ ok: false });
    expect(customerBody(formOf([['nombre', 'Ana'], ['email', 'no-es-email']]), false)).toMatchObject({ ok: false });
  });
});

describe('customers route', () => {
  let api: ReturnType<typeof stubApi>;
  const post = (pairs: Array<[string, string]>) => postTo(action, 'clientes', pairs);
  beforeEach(() => {
    api = stubApi('VENDEDOR');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates a customer and opens its card', async () => {
    api.mockResolvedValueOnce(ok({ id: 'c-9' }));
    const response = await post([['intent', 'create'], ['nombre', 'Ana López'], ['email', 'ana@ejemplo.com']]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/clientes?c=c-9&guardado=1');
    expect(JSON.parse(String(api.mock.calls[0][1]?.body))).toEqual({ nombre: 'Ana López', email: 'ana@ejemplo.com' });
  });

  it('shows the API reason for a duplicate email', async () => {
    api.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Ya existe un cliente con el email ana@ejemplo.com' }), { status: 400 }));
    const response = await post([['intent', 'create'], ['nombre', 'Ana'], ['email', 'ana@ejemplo.com']]);
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Ya existe un cliente con el email ana@ejemplo.com' });
  });

  it('reuses the direct conversation with the customer when there is one', async () => {
    api.mockResolvedValueOnce(
      ok([
        {
          id: 'conv-1',
          viewerAccess: { canSend: true, mode: 'PARTICIPANT' },
          participants: [
            { userId: 'u-1', customerId: null },
            { userId: null, customerId: 'c-1' },
          ],
        },
      ]),
    );
    const response = await post([['intent', 'message'], ['customerId', 'c-1']]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/mensajes?c=conv-1');
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('starts a direct conversation with the customer otherwise', async () => {
    api.mockResolvedValueOnce(ok([])).mockResolvedValueOnce(ok({ id: 'conv-new' }));
    const response = await post([['intent', 'message'], ['customerId', 'c-1']]);
    expect(response.headers.get('Location')).toBe('/es/dashboard/mensajes?c=conv-new');
    expect(JSON.parse(String(api.mock.calls[1][1]?.body))).toEqual({ type: 'DIRECT', participantUserIds: [], participantCustomerIds: ['c-1'] });
  });

  it('shows only this customer orders in the card', async () => {
    api.mockImplementation(async (url) => {
      if (url.endsWith('/clientes')) return ok([{ id: 'c-1', nombre: 'Ana' }]);
      if (url.endsWith('/clientes/c-1')) return ok({ id: 'c-1', nombre: 'Ana' });
      if (url.endsWith('/pedidos'))
        return ok([
          { id: 'o-1', clienteId: 'c-1', estado: 'RECIBIDO', total: '100', createdAt: '2026-11-11T10:00:00Z' },
          { id: 'o-2', clienteId: 'c-2', estado: 'RECIBIDO', total: '200', createdAt: '2026-11-11T10:00:00Z' },
        ]);
      return ok({});
    });
    const response = (await loader({
      request: new Request('http://app.test/es/dashboard/clientes?c=c-1', { headers: { Cookie: await sessionCookie() } }),
      params: { lang: 'es' },
      context: {},
    })) as Response;
    const data = await response.json();
    expect(data.orders.map((o: { id: string }) => o.id)).toEqual(['o-1']);
  });
});
