import { describe, expect, it } from 'vitest';
import { makeCard, type Card, type Rank } from './cards';
import { runningCount } from './count';
import { createRng } from './rng';
import { Shoe } from './shoe';
import {
  countThrough,
  dealerShouldHit,
  handTotal,
  isBlackjack,
  planQuiz,
  playRound,
  shouldHit,
} from './table';

const h = (...ranks: Rank[]) => ranks.map((r) => makeCard(r, 'S'));
const stack = (...ranks: Rank[]) => {
  const cards = h(...ranks);
  let i = 0;
  return () => {
    const c = cards[i++];
    if (!c) throw new Error('stack exhausted');
    return c;
  };
};

describe('handTotal', () => {
  it('handles soft and hard aces', () => {
    expect(handTotal(h('A', '6'))).toEqual({ total: 17, soft: true });
    expect(handTotal(h('A', '6', '9'))).toEqual({ total: 16, soft: false });
    expect(handTotal(h('A', 'A', '9'))).toEqual({ total: 21, soft: true });
    expect(isBlackjack(h('A', 'K'))).toBe(true);
    expect(isBlackjack(h('7', '7', '7'))).toBe(false);
  });
});

describe('strategy', () => {
  it('plays simplified basic strategy', () => {
    expect(shouldHit(h('10', '2'), '2')).toBe(true);
    expect(shouldHit(h('10', '2'), '5')).toBe(false);
    expect(shouldHit(h('10', '6'), '10')).toBe(true);
    expect(shouldHit(h('10', '6'), '6')).toBe(false);
    expect(shouldHit(h('A', '7'), '9')).toBe(true);
    expect(shouldHit(h('A', '7'), '8')).toBe(false);
    expect(dealerShouldHit(h('10', '6'))).toBe(true);
    expect(dealerShouldHit(h('A', '6'))).toBe(false); // S17
  });
});

describe('playRound', () => {
  it('deals in casino order with the hole card face down', () => {
    // seat0: 10,7 (17 stands) dealer: 9 + hole 8 (17 stands)
    const r = playRound(stack('10', '9', '7', '8'), 1);
    const deals = r.events.filter((e) => e.kind === 'deal');
    expect(deals.map((e) => (e.kind === 'deal' ? [e.to, e.faceUp] : null))).toEqual([
      [0, true],
      ['dealer', true],
      [0, true],
      ['dealer', false],
    ]);
    expect(r.events.some((e) => e.kind === 'reveal')).toBe(true);
    expect(r.events.at(-1)).toEqual({ kind: 'result', seat: 0, outcome: 'push' });
  });

  it('ends early on dealer blackjack', () => {
    const r = playRound(stack('5', 'A', '6', 'K'), 1);
    expect(r.events.at(-1)).toEqual({ kind: 'result', seat: 0, outcome: 'lose' });
    expect(r.seats[0]).toHaveLength(2);
  });

  it('visible count equals running count once the round is complete', () => {
    const rng = createRng('table');
    const shoe = new Shoe({ decks: 6, rng });
    while (!shoe.pastCut) {
      const before = shoe.runningCount;
      const r = playRound(() => shoe.draw(), 4);
      const all: Card[] = [...r.dealer, ...r.seats.flat()];
      expect(countThrough(r.events, r.events.length, before)).toBe(before + runningCount(all));
      expect(shoe.runningCount).toBe(before + runningCount(all));
    }
  });

  it('hides the hole card until revealed', () => {
    const r = playRound(stack('2', '3', '4', 'K', '10', '5'), 1); // seat 2,4,10=16 stands; dealer 3+K+5=18
    const holeIdx = r.events.findIndex((e) => e.kind === 'deal' && !e.faceUp);
    expect(countThrough(r.events, holeIdx + 1)).toBe(3); // 2,3,4 visible; K hidden
  });
});

describe('planQuiz', () => {
  it('always quizzes after a long gap', () => {
    const rng = createRng(5);
    const r = playRound(() => makeCard('7', 'S'), 2);
    for (let i = 0; i < 20; i++) {
      const at = planQuiz(rng, r.events, 3);
      expect(at).not.toBeNull();
      expect(at).toBeLessThanOrEqual(r.events.length);
    }
  });
});
