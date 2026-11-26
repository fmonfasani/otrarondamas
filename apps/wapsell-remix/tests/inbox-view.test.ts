import { describe, expect, it } from 'vitest';
import { inboxFilterOf, inboxView, isMuted, mutedLabel, type Conversation } from '~/utils/messaging';

// E6a — the inbox like WhatsApp Business: pinned on top, archived apart, filters and labels.
const chat = (id: string, extra: Partial<Conversation> = {}, customer = true): Conversation => ({
  id,
  type: 'DIRECT',
  createdAt: '2026-11-26T10:00:00Z',
  updatedAt: '2026-11-26T10:00:00Z',
  viewerAccess: { canSend: true, mode: 'PARTICIPANT' },
  participants: customer
    ? [{ id: `p-${id}`, userId: null, customerId: `c-${id}`, kind: 'CUSTOMER', name: `Cliente ${id}`, role: null, isAdmin: false, isViewer: false }]
    : [{ id: `p-${id}`, userId: `u-${id}`, customerId: null, kind: 'STAFF', name: `Equipo ${id}`, role: 'VENDEDOR', isAdmin: false, isViewer: false }],
  lastMessage: null,
  ...extra,
});

describe('the inbox', () => {
  const vip = { id: 'l-vip', nombre: 'VIP', color: 'violeta' as const };
  const list = [
    chat('a'),
    chat('b', { fijado: true }),
    chat('c', { archivado: true }),
    chat('d', { unreadCount: 2, etiquetas: [vip] }),
    chat('e', { asignadoA: { userId: 'me', nombre: 'Juan' } }),
    chat('f', {}, false),
  ];
  const ids = (rows: Conversation[]) => rows.map((c) => c.id);

  it('puts pinned chats on top and keeps archived ones apart', () => {
    expect(ids(inboxView(list, { filter: 'todas' }))).toEqual(['b', 'a', 'd', 'e', 'f']);
    expect(ids(inboxView(list, { filter: 'todas', archived: true }))).toEqual(['c']);
  });

  it('filters unread, mine, customers, team and by label', () => {
    expect(ids(inboxView(list, { filter: 'no-leidos' }))).toEqual(['d']);
    // The open chat stays while reading it.
    expect(ids(inboxView(list, { filter: 'no-leidos', open: 'a' }))).toEqual(['a', 'd']);
    expect(ids(inboxView(list, { filter: 'mios', me: 'me' }))).toEqual(['e']);
    expect(ids(inboxView(list, { filter: 'mios', me: null }))).toEqual([]);
    expect(ids(inboxView(list, { filter: 'equipo' }))).toEqual(['f']);
    expect(ids(inboxView(list, { filter: 'clientes', label: 'l-vip' }))).toEqual(['d']);
  });

  it('reads the filter from the address, «todas» by default', () => {
    expect(inboxFilterOf('mios')).toBe('mios');
    expect(inboxFilterOf('cualquiera')).toBe('todas');
    expect(inboxFilterOf(null)).toBe('todas');
  });
});

describe('a muted chat', () => {
  const now = Date.parse('2026-11-26T15:00:00Z'); // 12:00 in Buenos Aires

  it('is muted until its time', () => {
    expect(isMuted({ silenciadoHasta: '2026-11-26T23:00:00Z' }, now)).toBe(true);
    expect(isMuted({ silenciadoHasta: '2026-11-26T14:00:00Z' }, now)).toBe(false);
    expect(isMuted({ silenciadoHasta: null }, now)).toBe(false);
  });

  it('says until when', () => {
    expect(mutedLabel('2026-11-26T23:00:00Z', now)).toBe('Silenciado hasta las 20:00');
    expect(mutedLabel('2026-12-03T15:00:00Z', now)).toBe('Silenciado hasta el 3/12');
    expect(mutedLabel('2100-01-01T00:00:00Z', now)).toBe('Silenciado');
  });
});
