import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitSession, getSession } from '../app/services/auth.server';
import { realtimeStream, type RealtimeSocket } from '../app/services/realtime.server';
import { action as panelTyping } from '../app/routes/_business.panel.mensajes_.escribiendo';
import {
  isConversationId,
  parseSignal,
  toTypingSignal,
  TYPING_SHOWN_MS,
  typingLabel,
  withoutConversation,
  withoutExpired,
  withTyping,
} from '../app/utils/live';

// E1 — messages at once: the Remix server bridges the API's Socket.IO to the page as
// Server-Sent Events, and the token never reaches the browser.

class FakeSocket implements RealtimeSocket {
  active = true;
  disconnected = false;
  private listeners = new Map<string, Array<(payload?: unknown) => void>>();
  on(event: string, listener: (payload?: unknown) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  emit(event: string, payload?: unknown) {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }
  disconnect() {
    this.disconnected = true;
    return this;
  }
}

function open(viewer: 'equipo' | 'cliente') {
  const socket = new FakeSocket();
  const tokens: string[] = [];
  const abort = new AbortController();
  const response = realtimeStream(new Request('http://app.test/x', { signal: abort.signal }), 'jwt-token', viewer, (token) => {
    tokens.push(token);
    return socket;
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let text = '';
  const drain = async () => {
    // Every enqueue so far is already buffered: read until the stream has nothing ready.
    for (;;) {
      const next = await Promise.race([reader.read(), new Promise<null>((r) => setTimeout(() => r(null), 20))]);
      if (!next || next.done) return text;
      text += decoder.decode(next.value);
    }
  };
  return { socket, tokens, abort, response, drain, reader };
}

describe('realtime bridge (realtime.server)', () => {
  it('opens the API connection with the server-side token and streams as event-stream, uncompressed and unbuffered', async () => {
    const { tokens, response, abort } = open('equipo');
    expect(tokens).toEqual(['jwt-token']);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
    abort.abort();
  });

  it('passes on «cambio» and the connection state, ids only', async () => {
    const { socket, drain, abort } = open('equipo');
    socket.emit('connect');
    socket.emit('inbox.changed', { conversationId: 'c-1', content: 'never passed on' });
    const text = await drain();
    expect(text).toContain('retry: 5000');
    expect(text).toContain('event: estado\ndata: {"conectado":true}');
    expect(text).toContain('event: cambio\ndata: {"conversationId":"c-1"}');
    expect(text).not.toContain('never passed on');
    abort.abort();
  });

  it('tells staff who writes and the store customer only that the store writes', async () => {
    const staff = open('equipo');
    staff.socket.emit('conversation.typing', { conversationId: 'c-1', userId: 'u-1', customerId: null });
    expect(await staff.drain()).toContain('event: escribiendo\ndata: {"conversationId":"c-1","userId":"u-1","customerId":null}');
    staff.abort.abort();

    const customer = open('cliente');
    customer.socket.emit('conversation.typing', { conversationId: 'c-1', userId: 'u-1', customerId: null });
    const text = await customer.drain();
    expect(text).toContain('event: escribiendo\ndata: {"conversationId":"c-1"}\n\n');
    expect(text).not.toContain('u-1');
    customer.abort.abort();
  });

  it('ignores malformed events', async () => {
    const { socket, drain, abort } = open('equipo');
    socket.emit('inbox.changed', null);
    socket.emit('inbox.changed', { conversationId: 42 });
    socket.emit('conversation.typing', 'x');
    const text = await drain();
    expect(text).not.toContain('event: cambio');
    expect(text).not.toContain('event: escribiendo');
    abort.abort();
  });

  it('closes the API connection when the page goes away', async () => {
    const { socket, abort } = open('equipo');
    abort.abort();
    expect(socket.disconnected).toBe(true);
  });

  it('ends the stream when the API refuses the session, so the page re-checks it', async () => {
    const { socket, drain } = open('equipo');
    socket.active = false;
    socket.emit('connect_error', new Error('Realtime authentication failed'));
    const text = await drain();
    expect(text).toContain('event: estado\ndata: {"conectado":false}');
    expect(socket.disconnected).toBe(true);
  });

  it('keeps the stream while the connection is only retrying', async () => {
    const { socket, drain, abort } = open('equipo');
    socket.emit('connect_error', new Error('timeout'));
    await drain();
    expect(socket.disconnected).toBe(false);
    abort.abort();
  });
});

describe('«escribiendo» from the panel', () => {
  const api = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>();
  beforeEach(() => {
    process.env.API_BASE_URL = 'http://api.test';
    api.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/auth/me') ? new Response('{"id":"u"}') : api(String(input), init),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function post(conversationId: string) {
    const session = await getSession();
    session.set('jwt', 'jwt-token');
    const cookie = (await commitSession(session)).split(';')[0];
    return panelTyping({
      request: new Request('http://app.test/panel/mensajes/escribiendo', {
        method: 'POST',
        body: new URLSearchParams([['conversationId', conversationId]]),
        headers: { Cookie: cookie },
      }),
      params: {},
      context: {},
    }) as Promise<Response>;
  }

  it('tells the API with the session token, and answers without content', async () => {
    api.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const id = '3f1c2a4e-1b2c-4d5e-8f90-1a2b3c4d5e6f';
    const response = await post(id);
    expect(response.status).toBe(204);
    const [url, init] = api.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://api.test/messaging/conversations/${id}/typing`);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer jwt-token');
  });

  it('refuses anything that is not a conversation id, without calling the API', async () => {
    const response = await post('../../auth/me');
    expect(response.status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });

  it('never fails the person writing when the API is down', async () => {
    api.mockRejectedValueOnce(new Error('down'));
    const response = await post('3f1c2a4e-1b2c-4d5e-8f90-1a2b3c4d5e6f');
    expect(response.status).toBe(204);
  });
});

describe('live helpers', () => {
  const conversation = {
    type: 'GROUP' as const,
    participants: [
      { id: 'p1', userId: 'u-1', customerId: null, kind: 'STAFF' as const, name: 'Ana Paz', role: 'OWNER', isAdmin: true, isViewer: false },
      { id: 'p2', userId: null, customerId: 'c-1', kind: 'CUSTOMER' as const, name: 'María', role: null, isAdmin: false, isViewer: false },
    ],
  };

  it('says who writes in a group and just «escribiendo…» between two', () => {
    expect(typingLabel(conversation, { conversationId: 'x', userId: 'u-1' })).toBe('Ana Paz está escribiendo…');
    expect(typingLabel(conversation, { conversationId: 'x', customerId: 'c-1' })).toBe('María está escribiendo…');
    expect(typingLabel(conversation, { conversationId: 'x', userId: 'gone' })).toBe('escribiendo…');
    expect(typingLabel({ ...conversation, type: 'DIRECT' }, { conversationId: 'x', userId: 'u-1' })).toBe('escribiendo…');
  });

  it('shows «escribiendo…» for a few seconds, and clears it when the message arrives', () => {
    const shown = withTyping({}, { conversationId: 'c-1', userId: 'u-1' }, 1000);
    expect(withoutExpired(shown, 1000 + TYPING_SHOWN_MS - 1)).toBe(shown);
    expect(withoutExpired(shown, 1000 + TYPING_SHOWN_MS)).toEqual({});
    expect(withoutConversation(shown, 'c-1')).toEqual({});
    expect(withoutConversation(shown, 'other')).toBe(shown);
  });

  it('reads only well-formed signals and conversation ids', () => {
    expect(parseSignal('{"conversationId":"c"}')).toEqual({ conversationId: 'c' });
    expect(parseSignal('nope')).toBeNull();
    expect(parseSignal('3')).toBeNull();
    expect(toTypingSignal({ conversationId: 'c', userId: 5 })).toEqual({ conversationId: 'c', userId: null, customerId: null });
    expect(toTypingSignal({})).toBeNull();
    expect(isConversationId('3f1c2a4e-1b2c-4d5e-8f90-1a2b3c4d5e6f')).toBe(true);
    expect(isConversationId('../auth')).toBe(false);
  });
});
