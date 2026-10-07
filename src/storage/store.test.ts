import { describe, expect, it } from 'vitest';
import { LEGACY_STORAGE_KEY, STORAGE_KEY, Store, defaultSave, parseSave } from './store';

class MemStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

describe('parseSave', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(parseSave(null)).toEqual(defaultSave());
    expect(parseSave('{not json')).toEqual(defaultSave());
    expect(parseSave('[1,2]')).toEqual(defaultSave());
  });

  it('fills in new settings keys from defaults', () => {
    const s = parseSave(JSON.stringify({ version: 1, xp: 50, settings: { sound: true } }));
    expect(s.xp).toBe(50);
    expect(s.settings.sound).toBe(true);
    expect(s.settings.tcRounding).toBe('truncate');
  });

  it('rejects invalid xp', () => {
    expect(parseSave(JSON.stringify({ xp: -5 })).xp).toBe(0);
  });
});

describe('Store', () => {
  it('persists updates and notifies subscribers', () => {
    const mem = new MemStorage();
    const store = new Store(mem);
    let calls = 0;
    store.subscribe(() => calls++);
    store.update((d) => {
      d.xp += 25;
    });
    expect(calls).toBe(1);
    expect(new Store(mem).get().xp).toBe(25);
    expect(mem.getItem(STORAGE_KEY)).toContain('"xp":25');
  });

  it('carries over progress saved under the pre-rename key', () => {
    const mem = new MemStorage();
    mem.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ version: 1, xp: 300 }));
    const store = new Store(mem);
    expect(store.get().xp).toBe(300);
    store.update((d) => {
      d.xp += 1;
    });
    expect(mem.getItem(STORAGE_KEY)).toContain('"xp":301');
  });

  it('survives a throwing backend', () => {
    const store = new Store({
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    store.update((d) => {
      d.xp = 10;
    });
    expect(store.get().xp).toBe(10);
  });

  it('works with no backend at all', () => {
    const store = new Store(null);
    store.update((d) => {
      d.seenIntro = true;
    });
    expect(store.get().seenIntro).toBe(true);
  });
});
