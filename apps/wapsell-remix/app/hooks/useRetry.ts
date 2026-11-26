import { useEffect, useRef } from 'react';

/** Paquete 1 F3 — a key per message: the same key on a retry, so it is never saved twice. */
export function newClientMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(performance.now() * 1000)}`;
}

/**
 * Paquete 1 F3 — while something failed to go out, run `retry` once the browser is back online
 * (like WhatsApp sending the clock-marked message when the signal returns).
 */
export function useWhenBackOnline(failed: boolean, retry: () => void): void {
  const latest = useRef(retry);
  latest.current = retry;
  useEffect(() => {
    if (!failed || typeof window === 'undefined') return;
    const onOnline = () => latest.current();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [failed]);
}

/**
 * Paquete 1 F2 — with older pages loaded, the newest page slides when a message arrives: what
 * left it from the top (before the page's new first message) joins the older ones, never a gap.
 * A message deleted inside the page is not «above» the new first one, so it is not kept.
 */
export function keepSlidOut<T extends { id: string }>(older: T[], before: T[], now: T[]): T[] {
  const first = now[0];
  if (!first) return older;
  const top = before.findIndex((m) => m.id === first.id);
  if (top <= 0) return older;
  const inNow = new Set(now.map((m) => m.id));
  const known = new Set(older.map((m) => m.id));
  const slid = before.slice(0, top).filter((m) => !inNow.has(m.id) && !known.has(m.id));
  return slid.length === 0 ? older : [...older, ...slid];
}
