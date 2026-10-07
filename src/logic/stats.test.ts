import { describe, expect, it } from 'vitest';
import { dailySeries, dayStreak, summarize, type SessionRecord } from './stats';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`).getTime();
const rec = (p: Partial<SessionRecord>): SessionRecord => ({
  mode: 'running',
  at: day('2026-10-01'),
  correct: 8,
  total: 10,
  score: 100,
  bestStreak: 5,
  cps: 2,
  durationMs: 60_000,
  ...p,
});

describe('summarize', () => {
  it('aggregates accuracy, streaks and clean decks', () => {
    const s = summarize([
      rec({}),
      rec({ mode: 'deck', correct: 1, total: 1, bestStreak: 1, cleanDeckMs: 30_000 }),
      rec({ mode: 'deck', correct: 1, total: 1, bestStreak: 12, cleanDeckMs: 24_000 }),
    ]);
    expect(s.sessions).toBe(3);
    expect(s.accuracy).toBeCloseTo(10 / 12);
    expect(s.bestStreak).toBe(12);
    expect(s.fastestCleanDeckMs).toBe(24_000);
    expect(s.byMode.deck?.sessions).toBe(2);
    expect(s.byMode.running?.accuracy).toBeCloseTo(0.8);
  });

  it('handles no sessions', () => {
    expect(summarize([])).toMatchObject({ sessions: 0, accuracy: 0, fastestCleanDeckMs: null });
  });
});

describe('dailySeries', () => {
  it('buckets by UTC day and fills gaps', () => {
    const series = dailySeries(
      [rec({ at: day('2026-10-01') }), rec({ at: day('2026-10-03'), correct: 10, cps: 3 })],
      4,
      new Date('2026-10-03T20:00:00Z'),
    );
    expect(series.map((p) => p.date)).toEqual([
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
    expect(series[0]?.accuracy).toBeNull();
    expect(series[1]?.accuracy).toBeCloseTo(0.8);
    expect(series[3]).toMatchObject({ sessions: 1, accuracy: 1, topCps: 3 });
  });
});

describe('dayStreak', () => {
  const now = new Date('2026-10-06T10:00:00Z');
  it('counts consecutive days ending today', () => {
    expect(dayStreak(['2026-10-04', '2026-10-05', '2026-10-06'], now)).toBe(3);
  });
  it('keeps a streak alive if today is not played yet', () => {
    expect(dayStreak(['2026-10-04', '2026-10-05'], now)).toBe(2);
  });
  it('resets after a gap', () => {
    expect(dayStreak(['2026-10-03'], now)).toBe(0);
  });
});
