export const SUITS = ['S', 'H', 'D', 'C'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type HiLo = -1 | 0 | 1;

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Unique within a shoe (includes deck index). */
  readonly id: string;
}

const HI_LO: Record<Rank, HiLo> = {
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
};

export function hiLo(card: Pick<Card, 'rank'>): HiLo {
  return HI_LO[card.rank];
}

export function makeCard(rank: Rank, suit: Suit, deck = 0): Card {
  return { rank, suit, id: `${rank}${suit}#${deck}` };
}

/** A fresh, ordered 52-card deck. */
export function createDeck(deck = 0): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push(makeCard(rank, suit, deck));
  return cards;
}

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const RANK_NAME: Record<Rank, string> = {
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  '10': 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
  A: 'Ace',
};

export function cardLabel(card: Pick<Card, 'rank' | 'suit'>): string {
  return `${RANK_NAME[card.rank]} of ${SUIT_NAME[card.suit]}`;
}

export function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`; // true minus sign for typography
  return '0';
}

/** Blackjack point value (Ace counted as 11; hand logic softens it). */
export function blackjackValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}
