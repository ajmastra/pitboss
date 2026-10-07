import { describe, expect, it } from 'vitest';
import { makeCard } from './cards';
import {
  chunkValue,
  estimateDecksRemaining,
  exactTrueCount,
  hasCancellingPair,
  runningCount,
  trueCount,
} from './count';

const c = (rank: Parameters<typeof makeCard>[0]) => makeCard(rank, 'S');

describe('runningCount', () => {
  it('sums Hi-Lo values', () => {
    expect(runningCount([c('2'), c('5'), c('K'), c('8'), c('3')])).toBe(2);
    expect(runningCount([])).toBe(0);
  });
});

describe('estimateDecksRemaining', () => {
  it('rounds to the nearest half deck', () => {
    expect(estimateDecksRemaining(312)).toBe(6);
    expect(estimateDecksRemaining(130)).toBe(2.5);
    expect(estimateDecksRemaining(150)).toBe(3); // 2.88
    expect(estimateDecksRemaining(100)).toBe(2); // 1.92
  });
  it('never returns less than one step', () => {
    expect(estimateDecksRemaining(5)).toBe(0.5);
    expect(estimateDecksRemaining(0)).toBe(0.5);
  });
  it('supports whole-deck steps', () => {
    expect(estimateDecksRemaining(130, 1)).toBe(3); // 2.5 rounds half-up
  });
});

describe('trueCount', () => {
  it('divides running count by decks remaining', () => {
    expect(exactTrueCount(6, 2)).toBe(3);
    expect(trueCount(6, 2)).toBe(3);
    expect(trueCount(-8, 4)).toBe(-2);
  });

  it('truncates toward zero by default (including negatives)', () => {
    expect(trueCount(7, 2)).toBe(3); // 3.5
    expect(trueCount(-7, 2)).toBe(-3); // −3.5
    expect(trueCount(1, 2)).toBe(0);
    expect(Object.is(trueCount(-1, 2), 0)).toBe(true); // no −0
  });

  it('supports floor and round conventions', () => {
    expect(trueCount(-7, 2, 'floor')).toBe(-4);
    expect(trueCount(7, 2, 'floor')).toBe(3);
    expect(trueCount(7, 2, 'round')).toBe(4);
    expect(trueCount(5, 2, 'round')).toBe(3); // 2.5 → 3
  });

  it('handles fractional decks', () => {
    expect(trueCount(3, 0.5)).toBe(6);
    expect(trueCount(5, 2.5)).toBe(2);
  });

  it('guards against tiny or zero decks remaining', () => {
    expect(Number.isFinite(trueCount(5, 0))).toBe(true);
  });
});

describe('chunking', () => {
  it('nets a group of cards', () => {
    expect(chunkValue([c('4'), c('Q')])).toBe(0);
    expect(chunkValue([c('4'), c('6'), c('9')])).toBe(2);
  });
  it('detects cancelling pairs', () => {
    expect(hasCancellingPair([c('4'), c('A')])).toBe(true);
    expect(hasCancellingPair([c('4'), c('8')])).toBe(false);
  });
});
