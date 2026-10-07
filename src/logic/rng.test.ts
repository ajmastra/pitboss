import { describe, expect, it } from 'vitest';
import { createRng, cyrb53, dailySeed, mulberry32, utcDateKey } from './rng';

describe('cyrb53', () => {
  it('is deterministic and seed-sensitive', () => {
    expect(cyrb53('hello')).toBe(cyrb53('hello'));
    expect(cyrb53('hello')).not.toBe(cyrb53('hellp'));
    expect(cyrb53('hello', 1)).not.toBe(cyrb53('hello', 2));
  });
});

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('stays within [0, 1) and is roughly uniform', () => {
    const r = mulberry32(7);
    const bins = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      bins[Math.floor(x * 10)]++;
    }
    for (const b of bins) expect(Math.abs(b - 2000)).toBeLessThan(250);
  });
});

describe('createRng', () => {
  it('accepts string seeds deterministically', () => {
    const a = createRng('daily');
    const b = createRng('daily');
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });

  it('int() is inclusive and bounded', () => {
    const r = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const n = r.int(-2, 2);
      expect(n).toBeGreaterThanOrEqual(-2);
      expect(n).toBeLessThanOrEqual(2);
      seen.add(n);
    }
    expect(seen.size).toBe(5);
  });

  it('shuffle is a deterministic permutation', () => {
    const a = createRng(99).shuffle([...Array(52).keys()]);
    const b = createRng(99).shuffle([...Array(52).keys()]);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual([...Array(52).keys()]);
    expect(a).not.toEqual([...Array(52).keys()]);
  });

  it('pick throws on empty input', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});

describe('daily seed', () => {
  it('uses the UTC calendar date', () => {
    // 23:30 on Jan 1 in UTC−5 is already Jan 2 in UTC.
    const d = new Date('2026-01-02T04:30:00Z');
    expect(utcDateKey(d)).toBe('2026-01-02');
    expect(dailySeed(d)).toBe(dailySeed(new Date('2026-01-02T23:59:59Z')));
    expect(dailySeed(d)).not.toBe(dailySeed(new Date('2026-01-03T00:00:00Z')));
  });
});
