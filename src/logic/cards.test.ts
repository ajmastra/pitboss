import { describe, expect, it } from 'vitest';
import { RANKS, cardLabel, createDeck, formatSigned, hiLo, makeCard } from './cards';
import { runningCount } from './count';

describe('hiLo', () => {
  it('maps ranks to Hi-Lo values', () => {
    const values = Object.fromEntries(RANKS.map((r) => [r, hiLo({ rank: r })]));
    expect(values).toEqual({
      '2': 1,
      '3': 1,
      '4': 1,
      '5': 1,
      '6': 1,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': -1,
      J: -1,
      Q: -1,
      K: -1,
      A: -1,
    });
  });
});

describe('createDeck', () => {
  it('has 52 unique cards that count to zero', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(runningCount(deck)).toBe(0);
  });
});

describe('labels', () => {
  it('names cards for screen readers', () => {
    expect(cardLabel(makeCard('Q', 'H'))).toBe('Queen of hearts');
  });
  it('formats signed counts with a true minus', () => {
    expect(formatSigned(3)).toBe('+3');
    expect(formatSigned(0)).toBe('0');
    expect(formatSigned(-2)).toBe('−2');
  });
});
