import { describe, expect, it } from 'vitest';
import { badgeText, isNewer, titleWithCount } from '../app/utils/alerts';

// E2 — what the panel and the store chat show when a message arrives and you are not looking.
describe('unread alerts', () => {
  it('puts the count in front of the tab title, once, and takes it away', () => {
    expect(titleWithCount('Mensajes · Wapsell', 3)).toBe('(3) Mensajes · Wapsell');
    expect(titleWithCount('(3) Mensajes · Wapsell', 5)).toBe('(5) Mensajes · Wapsell');
    expect(titleWithCount('(99+) Mensajes · Wapsell', 0)).toBe('Mensajes · Wapsell');
    expect(titleWithCount('Mensajes · Wapsell', 0)).toBe('Mensajes · Wapsell');
  });

  it('shows up to 99 on a badge, then 99+', () => {
    expect(badgeText(0)).toBe('');
    expect(badgeText(7)).toBe('7');
    expect(badgeText(99)).toBe('99');
    expect(badgeText(100)).toBe('99+');
  });

  it('announces only a message newer than the last one announced', () => {
    expect(isNewer('2026-11-25T10:00:00Z', null)).toBe(true);
    expect(isNewer('2026-11-25T10:00:01Z', '2026-11-25T10:00:00Z')).toBe(true);
    expect(isNewer('2026-11-25T10:00:00Z', '2026-11-25T10:00:00Z')).toBe(false);
    // After reading the newest, an older unread one becomes «latest»: never announce it again.
    expect(isNewer('2026-11-25T09:00:00Z', '2026-11-25T10:00:00Z')).toBe(false);
    expect(isNewer(undefined, null)).toBe(false);
  });
});
