import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRevalidator } from '@remix-run/react';
import {
  parseSignal,
  POLL_MS,
  presenceKey,
  toPresenceSignal,
  type PresenceMap,
  toTypingSignal,
  TYPING_SEND_EVERY_MS,
  withoutConversation,
  withoutExpired,
  withTyping,
  type TypingMap,
} from '~/utils/live';

/**
 * E1/E2 — the page's live stream (routes/*eventos.tsx → realtime.server). One per tab: the
 * business panel opens it in its layout and shares it (LiveContext) with the menu badge and
 * the Mensajes screen; the store chat opens its own.
 */
export type LiveEvent = 'estado' | 'cambio' | 'escribiendo' | 'presencia' | 'pedido';
type Listener = (data: Record<string, unknown> | null) => void;

export interface LiveSource {
  /** True while the stream is connected to the API. */
  live: boolean;
  subscribe(event: LiveEvent, listener: Listener): () => void;
}

export const LiveContext = createContext<LiveSource | null>(null);

/** The panel's shared stream, when the page is inside the business layout. */
export const useSharedLive = () => useContext(LiveContext);

/** Opens the stream at `url` (none when null) for as long as the component lives. */
export function useLiveSource(url: string | null): LiveSource {
  const [live, setLive] = useState(false);
  const listeners = useRef(new Map<LiveEvent, Set<Listener>>());

  useEffect(() => {
    if (!url || typeof EventSource === 'undefined') return;
    const source = new EventSource(url);
    const events: LiveEvent[] = ['estado', 'cambio', 'escribiendo', 'presencia', 'pedido'];
    for (const name of events) {
      source.addEventListener(name, (event) => {
        const data = parseSignal((event as MessageEvent).data);
        if (name === 'estado') setLive(data?.conectado === true);
        listeners.current.get(name)?.forEach((listener) => listener(data));
      });
    }
    source.onerror = () => setLive(false);
    return () => {
      source.close();
      setLive(false);
    };
  }, [url]);

  const subscribe = useCallback((event: LiveEvent, listener: Listener) => {
    const set = listeners.current.get(event) ?? new Set<Listener>();
    set.add(listener);
    listeners.current.set(event, set);
    return () => {
      set.delete(listener);
    };
  }, []);

  return useMemo(() => ({ live, subscribe }), [live, subscribe]);
}

/**
 * Keeps a chat screen up to date at once: «cambio» reloads the page data, «escribiendo»
 * fills `typing`. Without the stream it falls back to asking every POLL_MS. Reloads wait
 * while `paused` (sending) and, unless `whenHidden`, while the tab is hidden; several
 * signals in a row cost at most one extra reload.
 */
export function useLiveUpdates(source: LiveSource, { paused, whenHidden = false }: { paused: boolean; whenHidden?: boolean }) {
  const revalidator = useRevalidator();
  const [typing, setTyping] = useState<TypingMap>({});
  // E2b: who came online or left since the page data was loaded.
  const [presence, setPresence] = useState<PresenceMap>({});
  const pending = useRef(false);
  const busy = paused || revalidator.state !== 'idle';
  const current = useRef({ busy, whenHidden, revalidate: revalidator.revalidate });
  current.current = { busy, whenHidden, revalidate: revalidator.revalidate };

  const flush = useCallback(() => {
    const { busy: isBusy, whenHidden: hiddenToo, revalidate } = current.current;
    if (!pending.current || isBusy) return;
    if (!hiddenToo && document.visibilityState !== 'visible') return;
    pending.current = false;
    revalidate();
  }, []);
  const reload = useCallback(() => {
    pending.current = true;
    flush();
  }, [flush]);

  // A reload asked while busy or hidden runs as soon as the screen is free and visible.
  useEffect(() => flush(), [busy, flush]);
  useEffect(() => {
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [flush]);

  useEffect(() => {
    let connectedBefore = false;
    const offState = source.subscribe('estado', (data) => {
      const connected = data?.conectado === true;
      // Back after a cut: reload once for whatever happened meanwhile.
      if (connected && connectedBefore) reload();
      if (connected) connectedBefore = true;
    });
    const offChange = source.subscribe('cambio', (data) => {
      const conversationId = data?.conversationId;
      if (typeof conversationId === 'string') setTyping((map) => withoutConversation(map, conversationId));
      reload();
    });
    const offTyping = source.subscribe('escribiendo', (data) => {
      const signal = toTypingSignal(data);
      if (signal) setTyping((map) => withTyping(map, signal, Date.now()));
    });
    const offPresence = source.subscribe('presencia', (data) => {
      const signal = toPresenceSignal(data);
      // A store customer only learns that the store's presence changed: ask again.
      if (!signal) return reload();
      setPresence((map) => ({
        ...map,
        [presenceKey(signal)]: { online: signal.online, lastSeenAt: signal.lastSeenAt },
      }));
    });
    return () => {
      offState();
      offChange();
      offTyping();
      offPresence();
    };
  }, [source, reload]);

  // Without the stream, ask every few seconds.
  useEffect(() => {
    if (source.live) return;
    const timer = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(timer);
  }, [source.live, reload]);

  // «escribiendo…» fades out on its own.
  const someoneTyping = Object.keys(typing).length > 0;
  useEffect(() => {
    if (!someoneTyping) return;
    const timer = window.setInterval(() => setTyping((map) => withoutExpired(map, Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [someoneTyping]);

  return { live: source.live, typing, presence };
}

/**
 * E1 — returns a function to call on every keystroke: it tells the others «escribiendo…»
 * at most every TYPING_SEND_EVERY_MS. A plain fetch, so the page does not reload.
 */
export function useTypingNotifier(actionUrl: string, conversationId: string | null) {
  const last = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - last.current < TYPING_SEND_EVERY_MS) return;
    last.current = now;
    const body = new FormData();
    if (conversationId) body.set('conversationId', conversationId);
    fetch(actionUrl, { method: 'POST', body, credentials: 'same-origin' }).catch(() => {
      // A courtesy signal: losing one changes nothing.
    });
  }, [actionUrl, conversationId]);
}

/** True while the tab is in front. */
export function useTabVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}
