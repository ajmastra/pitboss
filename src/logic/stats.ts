import { utcDateKey } from './rng';

export type ModeId = 'values' | 'running' | 'pairs' | 'deck' | 'true' | 'table' | 'daily';

export interface SessionRecord {
  mode: ModeId;
  /** Epoch ms when the run ended. */
  at: number;
  correct: number;
  total: number;
  score: number;
  bestStreak: number;
  /** Speed reached at the end of the run. */
  cps: number;
  durationMs: number;
  /** Full-deck mode: time to count the deck when the answer was correct. */
  cleanDeckMs?: number;
}

export interface ModeSummary {
  sessions: number;
  correct: number;
  total: number;
  accuracy: number;
  bestScore: number;
  topCps: number;
}

export interface Summary {
  sessions: number;
  correct: number;
  total: number;
  accuracy: number;
  bestStreak: number;
  fastestCleanDeckMs: number | null;
  totalMs: number;
  byMode: Partial<Record<ModeId, ModeSummary>>;
}

export function summarize(sessions: readonly SessionRecord[]): Summary {
  const out: Summary = {
    sessions: sessions.length,
    correct: 0,
    total: 0,
    accuracy: 0,
    bestStreak: 0,
    fastestCleanDeckMs: null,
    totalMs: 0,
    byMode: {},
  };
  for (const s of sessions) {
    out.correct += s.correct;
    out.total += s.total;
    out.totalMs += s.durationMs;
    out.bestStreak = Math.max(out.bestStreak, s.bestStreak);
    if (s.cleanDeckMs !== undefined) {
      out.fastestCleanDeckMs =
        out.fastestCleanDeckMs === null
          ? s.cleanDeckMs
          : Math.min(out.fastestCleanDeckMs, s.cleanDeckMs);
    }
    const m = (out.byMode[s.mode] ??= {
      sessions: 0,
      correct: 0,
      total: 0,
      accuracy: 0,
      bestScore: 0,
      topCps: 0,
    });
    m.sessions++;
    m.correct += s.correct;
    m.total += s.total;
    m.bestScore = Math.max(m.bestScore, s.score);
    m.topCps = Math.max(m.topCps, s.cps);
  }
  out.accuracy = out.total ? out.correct / out.total : 0;
  for (const m of Object.values(out.byMode)) m.accuracy = m.total ? m.correct / m.total : 0;
  return out;
}

export interface DayPoint {
  date: string;
  sessions: number;
  accuracy: number | null;
  topCps: number | null;
}

/** One point per UTC day for the last `days` days, oldest first. */
export function dailySeries(
  sessions: readonly SessionRecord[],
  days: number,
  now: Date = new Date(),
): DayPoint[] {
  const buckets = new Map<string, { c: number; t: number; n: number; cps: number }>();
  for (const s of sessions) {
    const key = utcDateKey(new Date(s.at));
    const b = buckets.get(key) ?? { c: 0, t: 0, n: 0, cps: 0 };
    b.c += s.correct;
    b.t += s.total;
    b.n++;
    b.cps = Math.max(b.cps, s.cps);
    buckets.set(key, b);
  }
  const out: DayPoint[] = [];
  const dayMs = 86_400_000;
  for (let i = days - 1; i >= 0; i--) {
    const key = utcDateKey(new Date(now.getTime() - i * dayMs));
    const b = buckets.get(key);
    out.push({
      date: key,
      sessions: b?.n ?? 0,
      accuracy: b && b.t ? b.c / b.t : null,
      topCps: b ? b.cps : null,
    });
  }
  return out;
}

/** Consecutive days (ending today or yesterday) present in `dates`. */
export function dayStreak(dates: Iterable<string>, now: Date = new Date()): number {
  const set = new Set(dates);
  const dayMs = 86_400_000;
  let cursor = now.getTime();
  if (!set.has(utcDateKey(new Date(cursor)))) cursor -= dayMs; // today not played yet: streak can still be alive
  let streak = 0;
  while (set.has(utcDateKey(new Date(cursor)))) {
    streak++;
    cursor -= dayMs;
  }
  return streak;
}
