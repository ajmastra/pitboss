import { describe, expect, it } from 'vitest';
import {
  UNLOCKS,
  levelFromXp,
  newlyUnlocked,
  totalXpForLevel,
  unlockedAt,
  xpToNext,
} from './progression';

describe('levels', () => {
  it('starts at level 1 with zero XP', () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, needed: 100 });
  });

  it('is consistent with totalXpForLevel', () => {
    for (const lvl of [2, 3, 5, 10, 20]) {
      expect(levelFromXp(totalXpForLevel(lvl)).level).toBe(lvl);
      expect(levelFromXp(totalXpForLevel(lvl) - 1).level).toBe(lvl - 1);
    }
  });

  it('gets steeper', () => {
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(2));
  });
});

describe('unlocks', () => {
  it('has unique ids and starter items at level 1', () => {
    expect(new Set(UNLOCKS.map((u) => u.id)).size).toBe(UNLOCKS.length);
    const kinds = unlockedAt(1).map((u) => u.kind);
    expect(kinds).toEqual(expect.arrayContaining(['back', 'felt', 'accent']));
  });

  it('reports newly unlocked items between levels', () => {
    expect(newlyUnlocked(1, 2).map((u) => u.id)).toEqual(['back:deco']);
    expect(newlyUnlocked(5, 5)).toEqual([]);
  });
});
