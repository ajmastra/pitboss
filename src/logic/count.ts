import { hiLo, type Card } from './cards';

export type TcRounding = 'truncate' | 'floor' | 'round';

export function runningCount(cards: readonly Pick<Card, 'rank'>[]): number {
  let rc = 0;
  for (const c of cards) rc += hiLo(c);
  return rc;
}

/**
 * Decks remaining as a player would estimate it from the discard tray:
 * rounded to the nearest `step` (default ½ deck), never below `step`.
 */
export function estimateDecksRemaining(cardsRemaining: number, step = 0.5): number {
  const exact = Math.max(0, cardsRemaining) / 52;
  const rounded = Math.round(exact / step) * step;
  return Math.max(step, rounded);
}

export function exactTrueCount(rc: number, decksRemaining: number): number {
  const d = Math.max(0.25, decksRemaining);
  return rc / d;
}

/** True count rounded per convention. Default: truncate toward zero. */
export function trueCount(
  rc: number,
  decksRemaining: number,
  rounding: TcRounding = 'truncate',
): number {
  const exact = exactTrueCount(rc, decksRemaining);
  let tc: number;
  switch (rounding) {
    case 'floor':
      tc = Math.floor(exact);
      break;
    case 'round':
      tc = Math.round(exact);
      break;
    case 'truncate':
      tc = Math.trunc(exact);
      break;
  }
  return tc === 0 ? 0 : tc; // normalise -0
}

/** Net value of a group of cards seen together (chunking). */
export function chunkValue(cards: readonly Pick<Card, 'rank'>[]): number {
  return runningCount(cards);
}

/** True when a group contains at least one +1/−1 pair that cancels. */
export function hasCancellingPair(cards: readonly Pick<Card, 'rank'>[]): boolean {
  let plus = false;
  let minus = false;
  for (const c of cards) {
    const v = hiLo(c);
    if (v === 1) plus = true;
    if (v === -1) minus = true;
  }
  return plus && minus;
}
