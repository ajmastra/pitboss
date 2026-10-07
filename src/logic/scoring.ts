export const COMBO_TIERS = [
  { streak: 20, multiplier: 4 },
  { streak: 10, multiplier: 3 },
  { streak: 5, multiplier: 2 },
  { streak: 0, multiplier: 1 },
] as const;

export function comboMultiplier(streak: number): number {
  for (const tier of COMBO_TIERS) if (streak >= tier.streak) return tier.multiplier;
  return 1;
}

/** Streak needed for the next multiplier tier, or null at max. */
export function nextComboThreshold(streak: number): number | null {
  let next: number | null = null;
  for (const tier of COMBO_TIERS) if (tier.streak > streak) next = tier.streak;
  return next;
}

export interface ScoreState {
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  total: number;
}

export interface AnswerResult {
  state: ScoreState;
  points: number;
  multiplier: number;
  /** Length of the streak that just ended (0 if none ended). */
  brokenStreak: number;
  /** True when this answer pushed into a new multiplier tier. */
  tierUp: boolean;
}

export const initialScore = (): ScoreState => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  correct: 0,
  total: 0,
});

/** Points scale with speed: faster cards are worth more. */
export function speedBonus(cps: number): number {
  return 1 + Math.max(0, cps - 1) * 0.25;
}

export function applyAnswer(
  prev: ScoreState,
  correct: boolean,
  opts: { base?: number; cps?: number } = {},
): AnswerResult {
  const base = opts.base ?? 10;
  const cps = opts.cps ?? 1;
  if (!correct) {
    return {
      state: { ...prev, streak: 0, total: prev.total + 1 },
      points: 0,
      multiplier: 1,
      brokenStreak: prev.streak,
      tierUp: false,
    };
  }
  const streak = prev.streak + 1;
  const multiplier = comboMultiplier(streak);
  const points = Math.round(base * multiplier * speedBonus(cps));
  return {
    state: {
      score: prev.score + points,
      streak,
      bestStreak: Math.max(prev.bestStreak, streak),
      correct: prev.correct + 1,
      total: prev.total + 1,
    },
    points,
    multiplier,
    brokenStreak: 0,
    tierUp: multiplier > comboMultiplier(prev.streak),
  };
}

export function accuracy(s: Pick<ScoreState, 'correct' | 'total'>): number {
  return s.total === 0 ? 0 : s.correct / s.total;
}

/** XP earned for a finished run. */
export function xpForRun(s: ScoreState): number {
  if (s.total === 0) return 0;
  const acc = accuracy(s);
  const base = s.score / 10;
  const clean = acc >= 0.9 ? 15 : acc >= 0.75 ? 5 : 0;
  return Math.max(1, Math.round(base * (0.5 + acc / 2) + clean));
}
