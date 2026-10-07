import { describe, expect, it } from 'vitest';
import {
  accuracy,
  applyAnswer,
  comboMultiplier,
  initialScore,
  nextComboThreshold,
  speedBonus,
  xpForRun,
} from './scoring';

describe('combo', () => {
  it('steps up at 5, 10 and 20', () => {
    expect([0, 4, 5, 9, 10, 19, 20, 50].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(nextComboThreshold(0)).toBe(5);
    expect(nextComboThreshold(7)).toBe(10);
    expect(nextComboThreshold(25)).toBeNull();
  });
});

describe('applyAnswer', () => {
  it('builds streaks and reports tier-ups', () => {
    let s = initialScore();
    let tierUps = 0;
    for (let i = 0; i < 10; i++) {
      const r = applyAnswer(s, true);
      if (r.tierUp) tierUps++;
      s = r.state;
    }
    expect(s.streak).toBe(10);
    expect(s.bestStreak).toBe(10);
    expect(tierUps).toBe(2);
  });

  it('reports the broken streak on a miss', () => {
    let s = initialScore();
    for (let i = 0; i < 6; i++) s = applyAnswer(s, true).state;
    const miss = applyAnswer(s, false);
    expect(miss.brokenStreak).toBe(6);
    expect(miss.points).toBe(0);
    expect(miss.state.streak).toBe(0);
    expect(miss.state.bestStreak).toBe(6);
    expect(accuracy(miss.state)).toBeCloseTo(6 / 7);
  });

  it('awards more for faster speeds', () => {
    expect(speedBonus(1)).toBe(1);
    expect(speedBonus(3)).toBe(1.5);
    const slow = applyAnswer(initialScore(), true, { cps: 1 }).points;
    const fast = applyAnswer(initialScore(), true, { cps: 3 }).points;
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('xpForRun', () => {
  it('is zero for empty runs and positive otherwise', () => {
    expect(xpForRun(initialScore())).toBe(0);
    const s = applyAnswer(initialScore(), false).state;
    expect(xpForRun(s)).toBeGreaterThanOrEqual(1);
  });
});
