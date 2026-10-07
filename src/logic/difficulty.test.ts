import { describe, expect, it } from 'vitest';
import { MAX_CPS, MIN_CPS, initialDifficulty, msPerCard, updateDifficulty } from './difficulty';

describe('updateDifficulty', () => {
  it('speeds up with a run of correct answers', () => {
    let d = initialDifficulty(1);
    for (let i = 0; i < 10; i++) d = updateDifficulty(d, true);
    expect(d.cps).toBeGreaterThan(1);
  });

  it('eases off immediately on a miss', () => {
    const d = updateDifficulty({ cps: 3, ewma: 0.95 }, false);
    expect(d.cps).toBeLessThan(3);
  });

  it('stays within bounds', () => {
    let d = initialDifficulty(1);
    for (let i = 0; i < 500; i++) d = updateDifficulty(d, true);
    expect(d.cps).toBe(MAX_CPS);
    for (let i = 0; i < 500; i++) d = updateDifficulty(d, false);
    expect(d.cps).toBe(MIN_CPS);
  });

  it('converts speed to display time', () => {
    expect(msPerCard(2)).toBe(500);
    expect(msPerCard(100)).toBe(Math.round(1000 / MAX_CPS));
  });
});
