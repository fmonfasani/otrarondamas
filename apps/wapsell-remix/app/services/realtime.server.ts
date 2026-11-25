import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api.server';

/**
 * E1 — messages at once, without the token ever reaching the browser.
 *
 * The session token lives here, on the Remix server (httpOnly cookie). For every open
 * Mensajes screen this server opens the API's Socket.IO connection with that token and
 * passes on, as Server-Sent Events over the page's own origin and cookie, only two
 * signals: «cambio» (a conversation changed: reload it) and «escribiendo». The screen then
 * reloads through its loader, so what each actor may see is still decided by the HTTP API.
 * If anything fails, the screen falls back to asking every few seconds.
 */

/** Keeps nginx (proxy_read_timeout 60 s) and any proxy from closing a quiet stream. */
export const HEARTBEAT_MS = 25_000;

/** Who watches: staff see who is writing; a store customer only that the store writes. */
export type Viewer = 'equipo' | 'cliente';

/** The part of a Socket.IO client this bridge uses (a fake one in tests). */
export interface RealtimeSocket {
  on(event: string, listener: (payload?: unknown) => void): unknown;
  disconnect(): unknown;
  readonly active: boolean;
}

export type Connect = (token: string) => RealtimeSocket;

export const connectToApi: Connect = (token) =>
  io(`${new URL(getApiBaseUrl()).origin}/messaging`, {
    auth: { token },
    transports: ['websocket'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });

/** One Server-Sent Event. */
export function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const idOrNull = (value: unknown) => (typeof value === 'string' && value.length <= 64 ? value : null);

function field(payload: unknown, key: string): string | null {
  return payload && typeof payload === 'object' ? idOrNull((payload as Record<string, unknown>)[key]) : null;
}

/** «escribiendo» as each viewer may see it (ids only; the screen knows the names). */
export function typingSignal(payload: unknown, viewer: Viewer) {
  const conversationId = field(payload, 'conversationId');
  if (!conversationId) return null;
  return viewer === 'equipo'
    ? { conversationId, userId: field(payload, 'userId'), customerId: field(payload, 'customerId') }
    : { conversationId };
}

/**
 * E2b — «en línea» / «últ. vez» as each viewer may see it: staff learn who and when; a store
 * customer only that the store's presence changed (their page reloads to ask).
 */
export function presenceSignal(payload: unknown, viewer: Viewer) {
  if (viewer === 'cliente') return {};
  const userId = field(payload, 'userId');
  const customerId = field(payload, 'customerId');
  if (!userId && !customerId) return null;
  const online = payload && typeof payload === 'object' && (payload as Record<string, unknown>).online === true;
  const seen = field(payload, 'lastSeenAt');
  return { userId, customerId, online, lastSeenAt: seen && !Number.isNaN(Date.parse(seen)) ? seen : null };
}

/** The stream for one open screen. Closes the API connection when the screen goes away. */
export function realtimeStream(request: Request, token: string, viewer: Viewer, connect: Connect = connectToApi): Response {
  const encoder = new TextEncoder();
  let stop = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const socket = connect(token);
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };
      const heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS);
      function close() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        request.signal.removeEventListener('abort', close);
        socket.disconnect();
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      }
      stop = close;
      request.signal.addEventListener('abort', close);
      if (request.signal.aborted) return close();

      // The browser waits 5 s before opening the stream again after it closes.
      send('retry: 5000\n\n');
      socket.on('connect', () => send(sseMessage('estado', { conectado: true })));
      socket.on('disconnect', () => send(sseMessage('estado', { conectado: false })));
      socket.on('connect_error', () => {
        send(sseMessage('estado', { conectado: false }));
        // Refused (expired session, revoked access): no automatic retry. Close, so the
        // browser reopens through the loader, which re-checks the session.
        if (!socket.active) close();
      });
      socket.on('inbox.changed', (payload) => {
        const conversationId = field(payload, 'conversationId');
        if (conversationId) send(sseMessage('cambio', { conversationId }));
      });
      socket.on('conversation.typing', (payload) => {
        const signal = typingSignal(payload, viewer);
        if (signal) send(sseMessage('escribiendo', signal));
      });
      socket.on('presence.changed', (payload) => {
        const signal = presenceSignal(payload, viewer);
        if (signal) send(sseMessage('presencia', signal));
      });
    },
    cancel() {
      stop();
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform: remix-serve's compression would otherwise hold the events back.
      'Cache-Control': 'no-cache, no-transform',
      // nginx: pass each event on at once instead of buffering the response.
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Tells the API that this actor is writing. Best-effort: a failure changes nothing. */
export async function sendTyping(token: string, path: string): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // «escribiendo…» is a courtesy; never an error for the person writing.
  }
}
