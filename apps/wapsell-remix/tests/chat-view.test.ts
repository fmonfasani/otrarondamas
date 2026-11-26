import { describe, expect, it } from 'vitest';
import { arrivedAfter } from '~/hooks/useStickToBottom';
import { initialsOf } from '~/components/chat/ChatParts';

// Paquete 2 A6 — «↓ N nuevos» counts only what came in below, never older pages loaded above.
describe('the chat follows the newest message', () => {
  const m = (id: string, mine = false) => ({ id, mine });

  it('counts what arrived after the newest one the screen had', () => {
    expect(arrivedAfter('b', [m('a'), m('b'), m('c'), m('d', true)]).map((x) => x.id)).toEqual(['c', 'd']);
  });

  it('counts nothing when older messages appear above', () => {
    expect(arrivedAfter('c', [m('x'), m('y'), m('a'), m('b'), m('c')])).toEqual([]);
  });

  it('counts nothing on the first screen or when the newest one slid away', () => {
    expect(arrivedAfter(null, [m('a')])).toEqual([]);
    expect(arrivedAfter('gone', [m('a'), m('b')])).toEqual([]);
  });
});

describe('avatars', () => {
  it('takes the first and last initials', () => {
    expect(initialsOf('Martina Gómez')).toBe('MG');
    expect(initialsOf('María de los Ángeles Pérez')).toBe('MP');
    expect(initialsOf('lucía')).toBe('L');
    expect(initialsOf('  ')).toBe('?');
  });
});
