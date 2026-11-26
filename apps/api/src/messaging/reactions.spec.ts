import { groupReactions, isReactionEmoji } from './messaging.service';

describe('E4 — reactions', () => {
  it('accepts one emoji (with skin tone, flags and joined families), never text', () => {
    for (const ok of ['👍', '❤️', '😂', '👍🏽', '👨‍👩‍👧', '🇦🇷', '🙏']) {
      expect(isReactionEmoji(ok)).toBe(true);
    }
    for (const bad of ['hola', '1', '👍a', '', ' 👍', '<b>']) {
      expect(isReactionEmoji(bad)).toBe(false);
    }
  });

  it('groups by emoji, most used first, and marks the one of the viewer', () => {
    const groups = groupReactions(
      [
        { emoji: '❤️', userId: 'u1', customerId: null },
        { emoji: '👍', userId: 'u2', customerId: null },
        { emoji: '❤️', userId: null, customerId: 'c1' },
      ],
      { userId: null, customerId: 'c1' },
    );
    expect(groups.map((g) => [g.emoji, g.cantidad, g.mia])).toEqual([
      ['❤️', 2, true],
      ['👍', 1, false],
    ]);
  });
});
