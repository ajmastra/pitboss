import { describe, expect, it } from 'vitest';
import { RANKS, SUITS } from './cards';
import { runningCount } from './count';
import { createRng } from './rng';
import { Shoe } from './shoe';

describe('Shoe', () => {
  it.each([1, 2, 4, 6, 8])('builds a correct %i-deck shoe', (decks) => {
    const shoe = new Shoe({ decks, rng: createRng(decks) });
    expect(shoe.cards).toHaveLength(52 * decks);
    expect(new Set(shoe.cards.map((c) => c.id)).size).toBe(52 * decks);
    for (const r of RANKS)
      for (const s of SUITS)
        expect(shoe.cards.filter((c) => c.rank === r && c.suit === s)).toHaveLength(decks);
    expect(runningCount(shoe.cards)).toBe(0);
  });

  it('is deterministic for a given seed', () => {
    const a = new Shoe({ decks: 6, rng: createRng('2026-10-06') });
    const b = new Shoe({ decks: 6, rng: createRng('2026-10-06') });
    const c = new Shoe({ decks: 6, rng: createRng('2026-10-07') });
    expect(a.cards.map((x) => x.id)).toEqual(b.cards.map((x) => x.id));
    expect(a.cards.map((x) => x.id)).not.toEqual(c.cards.map((x) => x.id));
  });

  it('tracks draws, running count and the cut card', () => {
    const shoe = new Shoe({ decks: 1, rng: createRng(3), penetration: 0.5 });
    const drawn = shoe.drawMany(10);
    expect(shoe.dealt).toBe(10);
    expect(shoe.remaining).toBe(42);
    expect(shoe.runningCount).toBe(runningCount(drawn));
    expect(shoe.pastCut).toBe(false);
    shoe.drawMany(16);
    expect(shoe.pastCut).toBe(true);
    shoe.drawMany(100);
    expect(shoe.isEmpty).toBe(true);
    expect(shoe.runningCount).toBe(0);
    expect(() => shoe.draw()).toThrow();
  });

  it('rejects invalid deck counts', () => {
    expect(() => new Shoe({ decks: 0, rng: createRng(1) })).toThrow(RangeError);
    expect(() => new Shoe({ decks: 9, rng: createRng(1) })).toThrow(RangeError);
  });
});
