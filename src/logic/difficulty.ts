/**
 * Adaptive speed. We track an exponentially-weighted moving average of
 * accuracy and nudge cards-per-second up when the player is cruising and
 * down when they're struggling.
 */
export const MIN_CPS = 0.5;
export const MAX_CPS = 8;

export interface Difficulty {
  cps: number;
  ewma: number;
}

export const initialDifficulty = (cps = 1): Difficulty => ({ cps: clampCps(cps), ewma: 0.8 });

export function clampCps(cps: number): number {
  return Math.round(Math.min(MAX_CPS, Math.max(MIN_CPS, cps)) * 20) / 20;
}

export function updateDifficulty(prev: Difficulty, correct: boolean, alpha = 0.25): Difficulty {
  const ewma = prev.ewma * (1 - alpha) + (correct ? 1 : 0) * alpha;
  let factor = 1;
  if (ewma > 0.9) factor = 1.08;
  else if (ewma < 0.7) factor = 0.88;
  // A miss always eases off a little, even while the average is still high.
  if (!correct) factor = Math.min(factor, 0.95);
  return { cps: clampCps(prev.cps * factor), ewma };
}

/** Milliseconds each card is shown at a given speed. */
export function msPerCard(cps: number): number {
  return Math.round(1000 / clampCps(cps));
}
