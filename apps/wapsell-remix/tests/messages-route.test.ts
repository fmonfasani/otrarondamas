import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { action, loader } from '../app/routes/_business.$lang.dashboard.mensajes';
import {
  canCreateOrder,
  conversationTitle,
  groupByDay,
  isOwnSide,
  matchesSearch,
  previewText,
  sortByActivity,
  type Conversation,
} from '../app/utils/messaging';

// Business panel "Mensajes", wired to /messaging/conversations[/:id[/messages[/:id/read]]].
async function cookie() {
  const session = await getSession();
  session.set('jwt', 'jwt-token');
  return (await commitSession(session)).split(';')[0];
}
async function post(fields: Array<[string, string]>) {
  return action({
    request: new Request('http://app.test/es/dashboard/mensajes', {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { Cookie: await cookie() },
    }),
    params: { lang: 'es' },
    context: {},
  }) as Promise<Response>;
}
async function load(search = '') {
  return loader({
    request: new Request(`http://app.test/es/dashboard/mensajes${search}`, { headers: { Cookie: await cookie() } }),
    params: { lang: 'es' },
    context: {},
  }) as Promise<Response>;
}
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const lucia = { id: 'p-l', userId: 'u-l', customerId: null, kind: 'STAFF' as const, name: 'Lucía Pérez', role: 'OWNER', isAdmin: true, isViewer: true };
const diego = { id: 'p-d', userId: 'u-d', customerId: null, kind: 'STAFF' as const, name: 'Diego Paz', role: 'VENDEDOR', isAdmin: false, isViewer: false };
const sofia = { id: 'p-s', userId: 'u-s', customerId: null, kind: 'STAFF' as const, name: 'Sofía Gómez', role: 'ADMIN', isAdmin: false, isViewer: false };
const maria = { id: 'p-m', userId: null, customerId: 'c-m', kind: 'CUSTOMER' as const, name: 'María Sánchez', role: null, isAdmin: false, isViewer: false };

function conversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'conv-1',
    type: 'DIRECT',
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
    viewerAccess: { canSend: true, mode: 'PARTICIPANT' },
    participants: [lucia, maria],
    lastMessage: null,
    ...overrides,
  };
}
const msg = (id: string, author: { userId?: string; customerId?: string }, createdAt = '2026-11-11T13:00:00Z') => ({
  id,
  content: `texto ${id}`,
  createdAt,
  authorUserId: author.userId ?? null,
  authorCustomerId: author.customerId ?? null,
});

describe('messaging presentation', () => {
  it('titles a customer conversation by the customer and a group by first names', () => {
    expect(conversationTitle(conversation({}))).toBe('María Sánchez');
    expect(conversationTitle(conversation({ type: 'GROUP', participants: [lucia, diego, sofia] }))).toBe('Diego, Sofía');
    // An Owner observing a direct conversation between two other people sees both names.
    const observed = conversation({ participants: [diego, { ...sofia, kind: 'STAFF' }] });
    expect(conversationTitle(observed)).toBe('Diego, Sofía');
  });

  it('puts the viewer and, with a customer, the whole team on the right', () => {
    const withCustomer = conversation({ participants: [lucia, diego, maria], type: 'GROUP' });
    expect(isOwnSide(withCustomer, msg('a', { userId: 'u-l' }))).toBe(true);
    expect(isOwnSide(withCustomer, msg('b', { userId: 'u-d' }))).toBe(true);
    expect(isOwnSide(withCustomer, msg('c', { customerId: 'c-m' }))).toBe(false);
    const team = conversation({ participants: [lucia, diego], type: 'DIRECT' });
    expect(isOwnSide(team, msg('d', { userId: 'u-d' }))).toBe(false);
  });

  it('previews the last message with its author', () => {
    const group = conversation({ type: 'GROUP', participants: [lucia, diego, sofia], lastMessage: msg('x', { userId: 'u-d' }) });
    expect(previewText(group)).toBe('Diego: texto x');
    expect(previewText({ ...group, lastMessage: msg('y', { userId: 'u-l' }) })).toBe('Vos: texto y');
    expect(previewText({ ...group, lastMessage: null })).toBe('Sin mensajes todavía');
  });

  it('orders the inbox by latest activity and searches names and text', () => {
    const old = conversation({ id: 'old', lastMessage: msg('o', { userId: 'u-l' }, '2026-11-01T10:00:00Z') });
    const fresh = conversation({ id: 'fresh', createdAt: '2026-11-11T15:00:00Z', participants: [lucia, diego] });
    expect(sortByActivity([old, fresh]).map((c) => c.id)).toEqual(['fresh', 'old']);
    expect(matchesSearch(old, 'maría')).toBe(true);
    expect(matchesSearch(old, 'diego')).toBe(false);
  });

  it('separates the thread by Buenos Aires calendar day', () => {
    const now = new Date('2026-11-11T15:00:00Z');
    const groups = groupByDay(
      [
        msg('1', { userId: 'u-l' }, '2026-11-10T14:00:00Z'),
        msg('2', { userId: 'u-l' }, '2026-11-11T02:30:00Z'), // 23:30 del 10 en Argentina
        msg('3', { userId: 'u-l' }, '2026-11-11T12:00:00Z'),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((m) => m.id)])).toEqual([
      ['AYER', ['1', '2']],
      ['HOY', ['3']],
    ]);
  });
});

describe('crear pedido', () => {
  it('only an Owner or Admin who administers the chat, and only with a customer', () => {
    expect(canCreateOrder(conversation({}))).toBe(true);
    expect(canCreateOrder(conversation({ participants: [{ ...lucia, isAdmin: false }, maria] }))).toBe(false);
    expect(canCreateOrder(conversation({ participants: [{ ...diego, isViewer: true, isAdmin: true }, maria] }))).toBe(false);
    expect(canCreateOrder(conversation({ participants: [{ ...sofia, isViewer: true, isAdmin: true }, maria] }))).toBe(true);
    expect(canCreateOrder(conversation({ participants: [lucia, diego] }))).toBe(false);
  });
});

describe('messages route', () => {
  // requireAuth validates the session against /auth/me first; every other call goes to `api`.
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/auth/me') ? ok({ id: 'u-legacy' }) : api(String(input), init),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends a text message with a fresh clientMessageId', async () => {
    api.mockResolvedValueOnce(ok({ id: 'm-1' }));
    const response = await post([['intent', 'send'], ['conversationId', 'conv-1'], ['content', '  hola María  ']]);
    await expect(response.json()).resolves.toEqual({ ok: true });
    const [url, init] = api.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/messaging/conversations/conv-1/messages');
    const body = JSON.parse(String(init.body));
    expect(body.content).toBe('hola María');
    expect(body.clientMessageId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('does not call the API for an empty message', async () => {
    const response = await post([['intent', 'send'], ['conversationId', 'conv-1'], ['content', '   ']]);
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });

  it('creates a DIRECT conversation with one person and a GROUP with several, then opens it', async () => {
    api.mockResolvedValueOnce(ok({ id: 'new-1' })).mockResolvedValueOnce(ok({ id: 'new-2' }));

    const direct = await post([['intent', 'create'], ['userId', 'u-d'], ['customerId', '']]);
    expect(direct.headers.get('Location')).toBe('/es/dashboard/mensajes?c=new-1');
    expect(JSON.parse(String((api.mock.calls[0][1] as RequestInit).body))).toEqual({
      type: 'DIRECT',
      participantUserIds: ['u-d'],
      participantCustomerIds: [],
    });

    await post([['intent', 'create'], ['userId', 'u-d'], ['userId', 'u-s'], ['customerId', 'c-m']]);
    expect(JSON.parse(String((api.mock.calls[1][1] as RequestInit).body))).toEqual({
      type: 'GROUP',
      participantUserIds: ['u-d', 'u-s'],
      participantCustomerIds: ['c-m'],
    });
  });

  it('shows the API reason when a conversation cannot be created', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Uno o más Users no pertenecen al Business' }), { status: 403 }),
    );
    const response = await post([['intent', 'create'], ['userId', 'u-x']]);
    await expect(response.json()).resolves.toEqual({ ok: false, message: 'Uno o más Users no pertenecen al Business' });
  });

  it('creates the order from the customer cart and returns its id', async () => {
    api.mockResolvedValueOnce(ok({ id: 'pedido-9' }));
    const response = await post([['intent', 'order'], ['conversationId', 'conv-1']]);
    await expect(response.json()).resolves.toEqual({ ok: true, message: 'Pedido creado.', orderId: 'pedido-9' });
    const [url, init] = api.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/messaging/conversations/conv-1/orders');
    expect(init.method).toBe('POST');
  });

  it('shows why an order could not be created', async () => {
    api.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'El cliente no tiene un carrito con ítems para crear un pedido' }), { status: 409 }),
    );
    const response = await post([['intent', 'order'], ['conversationId', 'conv-1']]);
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('carrito') });
  });

  it('opens a conversation and marks the latest incoming message read', async () => {
    const conv = conversation({});
    api.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/messaging/conversations')) return ok([conv]);
      if (url.endsWith('/messaging/conversations/conv-1')) return ok(conv);
      if (url.endsWith('/messages'))
        return ok([
          { ...msg('in-1', { customerId: 'c-m' }), deletedAt: null },
          { ...msg('out-1', { userId: 'u-l' }), deletedAt: null },
        ]);
      if (url.endsWith('/clientes/c-m')) return ok({ id: 'c-m', nombre: 'María Sánchez', email: 'maria@ejemplo.com', telefono: null });
      if (url.endsWith('/conv-1/cart')) return ok({ customerId: 'c-m', items: [{ productoId: 'p', nombre: 'Yerba', cantidad: 2, precio: '1500' }], total: '3000.00' });
      if (url.endsWith('/read') && init?.method === 'POST') return ok({ read: true });
      return new Response('{}', { status: 404 });
    });

    const data = await (await load('?c=conv-1')).json();

    expect(data.selected.id).toBe('conv-1');
    expect(data.customer.email).toBe('maria@ejemplo.com');
    expect(data.cart.total).toBe('3000.00');
    const urls = api.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain('http://api.test/messaging/conversations/conv-1/messages/in-1/read');
  });

  it('does not mark anything read when the viewer only observes (Owner read-only)', async () => {
    const conv = conversation({ viewerAccess: { canSend: false, mode: 'OWNER_READ_ONLY' }, participants: [{ ...lucia, isViewer: false }, maria] });
    api.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/messaging/conversations')) return ok([conv]);
      if (url.endsWith('/messaging/conversations/conv-1')) return ok(conv);
      if (url.endsWith('/messages')) return ok([{ ...msg('in-1', { customerId: 'c-m' }), deletedAt: null }]);
      return ok({});
    });

    await load('?c=conv-1');

    const urls = api.mock.calls.map((call) => String(call[0]));
    expect(urls.some((u) => u.endsWith('/read'))).toBe(false);
  });
});
