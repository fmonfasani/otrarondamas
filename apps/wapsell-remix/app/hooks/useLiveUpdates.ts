import { useCallback, useEffect, useRef, useState } from 'react';
import { useRevalidator } from '@remix-run/react';
import {
  parseSignal,
  POLL_MS,
  toTypingSignal,
  TYPING_SEND_EVERY_MS,
  withoutConversation,
  withoutExpired,
  withTyping,
  type TypingMap,
} from '~/utils/live';

/**
 * E1 — keeps a Mensajes screen up to date at once. It listens to the page's stream
 * (`eventsUrl`): «cambio» reloads the page data, «escribiendo» fills `typing`. Without the
 * stream it falls back to asking every POLL_MS. Reloads wait while `paused` (sending) or
 * the tab is hidden, and several signals in a row cost at most one extra reload.
 */
export function useLiveUpdates(eventsUrl: string, { paused }: { paused: boolean }) {
  const revalidator = useRevalidator();
  const [live, setLive] = useState(false);
  const [typing, setTyping] = useState<TypingMap>({});
  const pending = useRef(false);
  const busy = paused || revalidator.state !== 'idle';
  const current = useRef({ busy, revalidate: revalidator.revalidate });
  current.current = { busy, revalidate: revalidator.revalidate };

  const flush = useCallback(() => {
    if (!pending.current || current.current.busy || document.visibilityState !== 'visible') return;
    pending.current = false;
    current.current.revalidate();
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
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource(eventsUrl);
    let connectedBefore = false;
    source.addEventListener('estado', (event) => {
      const connected = parseSignal((event as MessageEvent).data)?.conectado === true;
      setLive(connected);
      // Back after a cut: reload once for whatever happened meanwhile.
      if (connected && connectedBefore) reload();
      if (connected) connectedBefore = true;
    });
    source.addEventListener('cambio', (event) => {
      const conversationId = parseSignal((event as MessageEvent).data)?.conversationId;
      if (typeof conversationId === 'string') setTyping((map) => withoutConversation(map, conversationId));
      reload();
    });
    source.addEventListener('escribiendo', (event) => {
      const signal = toTypingSignal(parseSignal((event as MessageEvent).data));
      if (signal) setTyping((map) => withTyping(map, signal, Date.now()));
    });
    source.onerror = () => setLive(false);
    return () => source.close();
  }, [eventsUrl, reload]);

  // Without the stream, ask every few seconds.
  useEffect(() => {
    if (live) return;
    const timer = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(timer);
  }, [live, reload]);

  // «escribiendo…» fades out on its own.
  const someoneTyping = Object.keys(typing).length > 0;
  useEffect(() => {
    if (!someoneTyping) return;
    const timer = window.setInterval(() => setTyping((map) => withoutExpired(map, Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [someoneTyping]);

  return { live, typing };
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
