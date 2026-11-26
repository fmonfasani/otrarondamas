import { describe, expect, it } from 'vitest';
import { keepSlidOut, newClientMessageId } from '~/hooks/useRetry';
import { storePushSettings } from '~/utils/push';

// Paquete 1 — retry keys (F3), pages that slide (F2), the customer's alerts door (F1).
describe('paquete 1 helpers', () => {
  const m = (id: string, at: string) => ({ id, createdAt: `2026-11-26T10:${at}:00.000Z` });

  it('keeps the message that slid out of the newest page with the older ones', () => {
    const older = [m('a', '00'), m('b', '01')];
    const before = [m('c', '02'), m('d', '03'), m('e', '04')];
    const now = [m('d', '03'), m('e', '04'), m('f', '05')];
    expect(keepSlidOut(older, before, now).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('drops a message deleted inside the page instead of keeping it', () => {
    const before = [m('c', '02'), m('d', '03'), m('e', '04')];
    const now = [m('c', '02'), m('e', '04')];
    expect(keepSlidOut([m('a', '00')], before, now).map((x) => x.id)).toEqual(['a']);
  });

  it('works with messages saved in the same instant (it goes by position, not time)', () => {
    const before = [m('c', '02'), m('d', '02'), m('e', '02')];
    const now = [m('d', '02'), m('e', '02'), m('f', '02')];
    expect(keepSlidOut([m('a', '02')], before, now).map((x) => x.id)).toEqual(['a', 'c']);
  });

  it('gives each message its own retry key, and the customer its door per store', () => {
    expect(newClientMessageId()).not.toBe(newClientMessageId());
    expect(storePushSettings('sap online')).toBe('/tienda/sap%20online/chat/avisos');
  });
});
