/**
 * E2 — what a WhatsApp-like chat does when a message arrives and you are not looking: a
 * count in the tab title and the menu, a short sound and, with permission, a notification.
 */

export interface UnreadSummary {
  total: number;
  conversations: number;
  latest: { id: string; conversationId: string; authorName: string; preview: string; createdAt: string } | null;
}

export const NO_UNREAD: UnreadSummary = { total: 0, conversations: 0, latest: null };

/** The number on a badge: up to 99, then «99+». Empty when there is nothing. */
export const badgeText = (count: number) => (count <= 0 ? '' : count > 99 ? '99+' : String(count));

const COUNT_PREFIX = /^\(\d+\+?\) /;

/** «(3) Mensajes · Wapsell»: the page title with the unread count in front, or without it. */
export function titleWithCount(title: string, count: number): string {
  const bare = title.replace(COUNT_PREFIX, '');
  return count > 0 ? `(${badgeText(count)}) ${bare}` : bare;
}

/** Whether `latest` came after what was already announced (never alert twice, never backwards). */
export function isNewer(latestAt: string | undefined, announcedAt: string | null): boolean {
  if (!latestAt) return false;
  return announcedAt === null || new Date(latestAt).getTime() > new Date(announcedAt).getTime();
}

/** A short two-note chime, made on the spot (no sound file). Silent if the browser refuses. */
export function playChime(): void {
  try {
    const Context =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const ctx = new Context();
    const start = ctx.currentTime;
    const tone = ctx.createOscillator();
    const volume = ctx.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(880, start);
    tone.frequency.setValueAtTime(1320, start + 0.09);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    tone.connect(volume).connect(ctx.destination);
    tone.onended = () => void ctx.close();
    tone.start(start);
    tone.stop(start + 0.32);
  } catch {
    // Sound is a courtesy.
  }
}
