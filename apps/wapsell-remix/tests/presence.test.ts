import { describe, expect, it } from 'vitest';
import { presenceSignal } from '../app/services/realtime.server';
import { presenceKey, presenceLabel, toPresenceSignal } from '../app/utils/live';

// E2b — «en línea» and «últ. vez», like WhatsApp; the store customer never sees a team member's.
describe('presence', () => {
  it('passes who and when to staff, and nothing but «it changed» to a store customer', () => {
    const payload = { userId: 'u-1', customerId: null, online: false, lastSeenAt: '2026-11-25T17:32:00.000Z' };
    expect(presenceSignal(payload, 'equipo')).toEqual(payload);
    expect(presenceSignal(payload, 'cliente')).toEqual({});
    expect(presenceSignal({ online: true }, 'equipo')).toBeNull();
    expect(presenceSignal({ userId: 'u-1', lastSeenAt: 'not a date' }, 'equipo')).toEqual({
      userId: 'u-1',
      customerId: null,
      online: false,
      lastSeenAt: null,
    });
  });

  it('says «en línea», or when they were last seen in Argentina time', () => {
    const now = new Date('2026-11-25T20:00:00.000Z'); // 17:00 in Buenos Aires
    expect(presenceLabel({ online: true }, now)).toBe('en línea');
    expect(presenceLabel({ lastSeenAt: '2026-11-25T17:32:00.000Z' }, now)).toBe('últ. vez hoy a las 14:32');
    expect(presenceLabel({ lastSeenAt: '2026-11-24T23:05:00.000Z' }, now)).toBe('últ. vez ayer a las 20:05');
    expect(presenceLabel({ lastSeenAt: '2026-11-12T21:00:00.000Z' }, now)).toBe('últ. vez el 12/11 a las 18:00');
    expect(presenceLabel({}, now)).toBe('');
  });

  it('keys presence by actor and reads only well-formed signals', () => {
    expect(presenceKey({ userId: 'u-1' })).toBe('user:u-1');
    expect(presenceKey({ customerId: 'c-1' })).toBe('customer:c-1');
    expect(toPresenceSignal({ customerId: 'c-1', online: true })).toEqual({
      userId: null,
      customerId: 'c-1',
      online: true,
      lastSeenAt: null,
    });
    expect(toPresenceSignal({})).toBeNull();
  });
});
