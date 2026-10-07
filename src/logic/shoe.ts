import { createDeck, hiLo, type Card } from './cards';
import type { Rng } from './rng';

export interface ShoeOptions {
  decks: number;
  rng: Rng;
  /** Fraction of the shoe dealt before the cut card (0–1). */
  penetration?: number;
}

/** A multi-deck shoe. Pure logic; no DOM. Drawing mutates its position. */
export class Shoe {
  readonly decks: number;
  readonly cards: readonly Card[];
  readonly cutIndex: number;
  private pos = 0;
  private rc = 0;

  constructor({ decks, rng, penetration = 0.75 }: ShoeOptions) {
    if (!Number.isInteger(decks) || decks < 1 || decks > 8) {
      throw new RangeError(`decks must be an integer 1–8, got ${decks}`);
    }
    const cards: Card[] = [];
    for (let d = 0; d < decks; d++) cards.push(...createDeck(d));
    rng.shuffle(cards);
    this.decks = decks;
    this.cards = cards;
    const pen = Math.min(1, Math.max(0.1, penetration));
    this.cutIndex = Math.floor(cards.length * pen);
  }

  get dealt(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.cards.length - this.pos;
  }

  /** Running count of every card drawn so far. */
  get runningCount(): number {
    return this.rc;
  }

  get pastCut(): boolean {
    return this.pos >= this.cutIndex;
  }

  get isEmpty(): boolean {
    return this.pos >= this.cards.length;
  }

  draw(): Card {
    const card = this.cards[this.pos];
    if (!card) throw new Error('Shoe is empty');
    this.pos++;
    this.rc += hiLo(card);
    return card;
  }

  drawMany(n: number): Card[] {
    const out: Card[] = [];
    for (let i = 0; i < n && !this.isEmpty; i++) out.push(this.draw());
    return out;
  }

  /** Exact decks remaining (cards / 52). */
  get decksRemaining(): number {
    return this.remaining / 52;
  }
}
