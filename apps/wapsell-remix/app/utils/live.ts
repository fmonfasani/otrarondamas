import type { Conversation } from './messaging';

/**
 * E1 — what the Mensajes screens need to show messages at once and «escribiendo…». The
 * signals come from the page's own stream (routes/*eventos.tsx → realtime.server).
 */

/** Without the stream (blocked, reconnecting), the screen asks this often. */
export const POLL_MS = 5000;
/** How long «escribiendo…» stays after the last signal. */
export const TYPING_SHOWN_MS = 5000;
/** How often a writer repeats the signal while typing. */
export const TYPING_SEND_EVERY_MS = 3000;

export interface TypingSignal {
  conversationId: string;
  userId?: string | null;
  customerId?: string | null;
}

export type TypingMap = Record<string, TypingSignal & { until: number }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isConversationId = (value: string) => UUID.test(value);

/** The data of one event, or null when it is not an object. */
export function parseSignal(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function toTypingSignal(data: Record<string, unknown> | null): TypingSignal | null {
  const conversationId = data?.conversationId;
  if (typeof conversationId !== 'string' || !conversationId) return null;
  const text = (value: unknown) => (typeof value === 'string' ? value : null);
  return { conversationId, userId: text(data?.userId), customerId: text(data?.customerId) };
}

export function withTyping(map: TypingMap, signal: TypingSignal, now: number): TypingMap {
  return { ...map, [signal.conversationId]: { ...signal, until: now + TYPING_SHOWN_MS } };
}

/** A message arrived: whoever was writing in that conversation is done. */
export function withoutConversation(map: TypingMap, conversationId: string): TypingMap {
  if (!(conversationId in map)) return map;
  return Object.fromEntries(Object.entries(map).filter(([id]) => id !== conversationId));
}

export function withoutExpired(map: TypingMap, now: number): TypingMap {
  const kept = Object.entries(map).filter(([, signal]) => signal.until > now);
  return kept.length === Object.keys(map).length ? map : Object.fromEntries(kept);
}

/**
 * «escribiendo…» in a chat between two; «Ana está escribiendo…» in a group, where the
 * screen already knows each participant's name.
 */
export function typingLabel(conversation: Pick<Conversation, 'type' | 'participants'>, signal: TypingSignal): string {
  if (conversation.type !== 'GROUP') return 'escribiendo…';
  const who = conversation.participants.find(
    (p) => (signal.userId && p.userId === signal.userId) || (signal.customerId && p.customerId === signal.customerId),
  );
  return who ? `${who.name} está escribiendo…` : 'escribiendo…';
}
