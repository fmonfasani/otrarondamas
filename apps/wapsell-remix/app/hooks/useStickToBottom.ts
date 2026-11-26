import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Closer than this to the bottom counts as «at the bottom» (a line of slack). */
const NEAR_BOTTOM_PX = 80;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface ChatItem {
  id: string;
  /** Sent by whoever is looking: their own message always takes them to the bottom. */
  mine: boolean;
}

/**
 * Paquete 2 A6 — what arrived after `previousNewest` (older pages loaded above do not count).
 * Unknown `previousNewest` (first render, or it slid away) means nothing new to count.
 */
export function arrivedAfter<T extends ChatItem>(previousNewest: string | null, items: T[]): T[] {
  if (!previousNewest) return [];
  const at = items.findIndex((item) => item.id === previousNewest);
  return at < 0 ? [] : items.slice(at + 1);
}

/**
 * Paquete 2 A6 — the chat follows the newest message like WhatsApp: it stays at the bottom while
 * you are there (or when you send), and while you read further up it keeps still and counts what
 * came in for the «↓ N nuevos» button.
 */
export function useStickToBottom(
  scroller: RefObject<HTMLElement>,
  items: ChatItem[],
  { extraBelow = false }: { extraBelow?: boolean } = {},
) {
  const atBottom = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const [away, setAway] = useState(false);
  const newest = items[items.length - 1]?.id ?? null;
  const previousNewest = useRef<string | null>(null);

  const toBottom = useCallback(
    (smooth = false) => {
      const el = scroller.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      atBottom.current = true;
      setUnseen(0);
      setAway(false);
    },
    [scroller],
  );

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      atBottom.current = near;
      setAway(!near);
      if (near) setUnseen(0);
    };
    // Whoever is at the bottom stays there when the box or its content changes size (the header
    // settles after loading, a photo arrives, the keyboard opens on the phone).
    const stay = () => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    };
    const resized = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(stay);
    resized?.observe(el);
    if (el.firstElementChild) resized?.observe(el.firstElementChild);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('load', stay, true);
    return () => {
      resized?.disconnect();
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('load', stay, true);
    };
  }, [scroller]);

  // Before paint, so the first screen opens already at the newest message.
  useIsoLayoutEffect(() => {
    const before = previousNewest.current;
    previousNewest.current = newest;
    if (!newest || newest === before) return;
    if (!before) {
      toBottom();
      return;
    }
    const fresh = arrivedAfter(before, items);
    if (fresh.length === 0) return;
    if (atBottom.current || fresh.some((item) => item.mine)) toBottom();
    else setUnseen((count) => count + fresh.filter((item) => !item.mine).length);
  }, [newest]);

  // «escribiendo…» or a pending bubble below: show it only to whoever is already at the bottom.
  useIsoLayoutEffect(() => {
    if (extraBelow && atBottom.current) toBottom();
  }, [extraBelow]);

  return { unseen, away, toBottom };
}
