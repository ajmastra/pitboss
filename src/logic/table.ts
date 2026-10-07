import { blackjackValue, hiLo, type Card, type Rank } from './cards';
import type { Rng } from './rng';

export type Target = number | 'dealer';

export type TableEvent =
  | { kind: 'deal'; to: Target; card: Card; faceUp: boolean; index: number }
  | { kind: 'reveal'; to: 'dealer'; card: Card; index: number }
  | { kind: 'result'; seat: number; outcome: Outcome };

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export interface HandTotal {
  total: number;
  soft: boolean;
}

export function handTotal(cards: readonly Pick<Card, 'rank'>[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += blackjackValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(cards: readonly Pick<Card, 'rank'>[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}

function upValue(rank: Rank): number {
  return rank === 'A' ? 11 : blackjackValue(rank);
}

/** Simplified basic strategy (no splits/doubles) for the background players. */
export function shouldHit(hand: readonly Pick<Card, 'rank'>[], dealerUp: Rank): boolean {
  const { total, soft } = handTotal(hand);
  const up = upValue(dealerUp);
  if (soft) {
    if (total <= 17) return true;
    if (total === 18) return up >= 9;
    return false;
  }
  if (total <= 11) return true;
  if (total === 12) return up <= 3 || up >= 7;
  if (total <= 16) return up >= 7;
  return false;
}

/** Dealer stands on all 17s (S17). */
export function dealerShouldHit(hand: readonly Pick<Card, 'rank'>[]): boolean {
  return handTotal(hand).total < 17;
}

export interface RoundScript {
  events: TableEvent[];
  seats: Card[][];
  dealer: Card[];
}

/**
 * Plays one full round against `draw()` and returns the ordered events the
 * UI should animate. Pure apart from consuming cards.
 */
export function playRound(draw: () => Card, seatCount: number): RoundScript {
  const events: TableEvent[] = [];
  const seats: Card[][] = Array.from({ length: seatCount }, () => []);
  const dealer: Card[] = [];

  const dealTo = (to: Target, faceUp: boolean): Card => {
    const card = draw();
    const hand = to === 'dealer' ? dealer : (seats[to] as Card[]);
    hand.push(card);
    events.push({ kind: 'deal', to, card, faceUp, index: hand.length - 1 });
    return card;
  };

  for (let s = 0; s < seatCount; s++) dealTo(s, true);
  const up = dealTo('dealer', true);
  for (let s = 0; s < seatCount; s++) dealTo(s, true);
  const hole = dealTo('dealer', false);

  const revealHole = () => events.push({ kind: 'reveal', to: 'dealer', card: hole, index: 1 });

  // Dealer peeks on A/10-value.
  if (isBlackjack(dealer)) {
    revealHole();
    seats.forEach((hand, seat) =>
      events.push({ kind: 'result', seat, outcome: isBlackjack(hand) ? 'push' : 'lose' }),
    );
    return { events, seats, dealer };
  }

  for (let s = 0; s < seatCount; s++) {
    const hand = seats[s] as Card[];
    if (isBlackjack(hand)) continue;
    while (handTotal(hand).total < 21 && shouldHit(hand, up.rank)) dealTo(s, true);
  }

  revealHole();
  const live = seats.some((h) => !isBlackjack(h) && handTotal(h).total <= 21);
  if (live) while (dealerShouldHit(dealer)) dealTo('dealer', true);

  const d = handTotal(dealer).total;
  seats.forEach((hand, seat) => {
    const p = handTotal(hand).total;
    let outcome: Outcome;
    if (isBlackjack(hand)) outcome = 'blackjack';
    else if (p > 21) outcome = 'bust';
    else if (d > 21 || p > d) outcome = 'win';
    else if (p === d) outcome = 'push';
    else outcome = 'lose';
    events.push({ kind: 'result', seat, outcome });
  });

  return { events, seats, dealer };
}

/** Running-count change contributed by one event (face-down cards are unseen). */
export function eventCountDelta(e: TableEvent): number {
  if (e.kind === 'deal') return e.faceUp ? hiLo(e.card) : 0;
  if (e.kind === 'reveal') return hiLo(e.card);
  return 0;
}

/** Visible running count after applying events[0..upto) to `start`. */
export function countThrough(events: readonly TableEvent[], upto: number, start = 0): number {
  let rc = start;
  for (let i = 0; i < upto && i < events.length; i++)
    rc += eventCountDelta(events[i] as TableEvent);
  return rc;
}

/**
 * Decide where (if anywhere) to pause for a quiz this round.
 * Returns an event index to pause *before*, `events.length` for end-of-round,
 * or null for no quiz.
 */
export function planQuiz(
  rng: Rng,
  events: readonly TableEvent[],
  roundsSinceQuiz: number,
): number | null {
  const pQuiz = roundsSinceQuiz >= 3 ? 1 : roundsSinceQuiz === 0 ? 0.25 : 0.55;
  if (!rng.chance(pQuiz)) return null;
  const dealEvents = events.filter((e) => e.kind !== 'result').length;
  if (dealEvents > 6 && rng.chance(0.35)) return rng.int(5, dealEvents - 1);
  return events.length;
}
