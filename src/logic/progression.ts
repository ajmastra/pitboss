/** XP to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Total XP required to reach `level` (level 1 = 0). */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP needed to finish the current level. */
  needed: number;
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  while (remaining >= xpToNext(level) && level < 99) {
    remaining -= xpToNext(level);
    level++;
  }
  const needed = xpToNext(level);
  return { level, into: remaining, needed, progress: remaining / needed };
}

export type UnlockKind = 'back' | 'felt' | 'accent' | 'feature';

export interface Unlock {
  id: string;
  kind: UnlockKind;
  name: string;
  level: number;
}

export const UNLOCKS: readonly Unlock[] = [
  { id: 'back:classic', kind: 'back', name: 'Classic Lattice', level: 1 },
  { id: 'felt:emerald', kind: 'felt', name: 'Emerald Felt', level: 1 },
  { id: 'accent:gold', kind: 'accent', name: 'Gold', level: 1 },
  { id: 'back:deco', kind: 'back', name: 'Art Deco', level: 2 },
  { id: 'felt:navy', kind: 'felt', name: 'Midnight Felt', level: 3 },
  { id: 'accent:platinum', kind: 'accent', name: 'Platinum', level: 4 },
  { id: 'feature:distractions', kind: 'feature', name: 'Distractions Mode', level: 5 },
  { id: 'back:wave', kind: 'back', name: 'Guilloché Wave', level: 6 },
  { id: 'felt:burgundy', kind: 'felt', name: 'Burgundy Felt', level: 7 },
  { id: 'accent:rose', kind: 'accent', name: 'Rose Gold', level: 8 },
  { id: 'back:sunburst', kind: 'back', name: 'Sunburst', level: 10 },
  { id: 'felt:teal', kind: 'felt', name: 'Lagoon Felt', level: 12 },
  { id: 'accent:jade', kind: 'accent', name: 'Jade', level: 14 },
  { id: 'felt:charcoal', kind: 'felt', name: 'Charcoal Felt', level: 16 },
  { id: 'back:monogram', kind: 'back', name: 'Monogram', level: 20 },
];

export function unlockedAt(level: number): Unlock[] {
  return UNLOCKS.filter((u) => u.level <= level);
}

export function newlyUnlocked(fromLevel: number, toLevel: number): Unlock[] {
  return UNLOCKS.filter((u) => u.level > fromLevel && u.level <= toLevel);
}

export function isUnlocked(id: string, level: number): boolean {
  const u = UNLOCKS.find((x) => x.id === id);
  return u !== undefined && u.level <= level;
}
