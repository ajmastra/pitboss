import type { TcRounding } from '../logic/count';
import type { Difficulty } from '../logic/difficulty';
import type { ModeId, SessionRecord } from '../logic/stats';

export const STORAGE_KEY = 'pitboss:v1';
/** Key used before the rename to Pitboss; read once so progress carries over. */
export const LEGACY_STORAGE_KEY = 'countit:v1';
export const SCHEMA_VERSION = 1;
const MAX_SESSIONS = 500;

export type MotionPref = 'system' | 'reduced' | 'full';

export interface Settings {
  sound: boolean;
  motion: MotionPref;
  tcRounding: TcRounding;
  /** Announce cards via the live region and slow the default pace. */
  srMode: boolean;
  distractions: boolean;
  cardBack: string;
  felt: string;
  accent: string;
  tableSeats: number;
}

export interface DailyResult {
  score: number;
  correct: number;
  total: number;
  cleanDeckMs?: number;
}

export interface SaveData {
  version: number;
  settings: Settings;
  xp: number;
  skill: Partial<Record<ModeId, Difficulty>>;
  sessions: SessionRecord[];
  daily: Record<string, DailyResult>;
  seenIntro: boolean;
}

export const defaultSettings = (): Settings => ({
  sound: false,
  motion: 'system',
  tcRounding: 'truncate',
  srMode: false,
  distractions: false,
  cardBack: 'back:classic',
  felt: 'felt:emerald',
  accent: 'accent:gold',
  tableSeats: 3,
});

export const defaultSave = (): SaveData => ({
  version: SCHEMA_VERSION,
  settings: defaultSettings(),
  xp: 0,
  skill: {},
  sessions: [],
  daily: {},
  seenIntro: false,
});

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
/** migrations[n] upgrades a version-n save to version n+1. */
const migrations: Record<number, Migration> = {};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Parse, migrate and fill defaults. Never throws. */
export function parseSave(raw: string | null): SaveData {
  if (!raw) return defaultSave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!isObject(data)) return defaultSave();
  let version = typeof data.version === 'number' ? data.version : 0;
  while (version < SCHEMA_VERSION) {
    const m = migrations[version];
    if (m) data = m(data as Record<string, unknown>);
    version++;
  }
  const d = data as Partial<SaveData>;
  const base = defaultSave();
  return {
    version: SCHEMA_VERSION,
    settings: { ...base.settings, ...(isObject(d.settings) ? d.settings : {}) },
    xp: typeof d.xp === 'number' && d.xp >= 0 ? d.xp : 0,
    skill: isObject(d.skill) ? d.skill : {},
    sessions: Array.isArray(d.sessions) ? d.sessions.slice(-MAX_SESSIONS) : [],
    daily: isObject(d.daily) ? (d.daily as Record<string, DailyResult>) : {},
    seenIntro: d.seenIntro === true,
  };
}

/**
 * localStorage-backed store with an in-memory fallback (private mode,
 * blocked storage, quota errors). Subscribers are notified on every update.
 */
export class Store {
  private data: SaveData;
  private listeners = new Set<(d: SaveData) => void>();

  constructor(
    private readonly backend: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocalStorage(),
  ) {
    let raw: string | null;
    try {
      raw = this.backend?.getItem(STORAGE_KEY) ?? this.backend?.getItem(LEGACY_STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    this.data = parseSave(raw);
  }

  get(): Readonly<SaveData> {
    return this.data;
  }

  update(fn: (draft: SaveData) => void): void {
    const next = structuredClone(this.data);
    fn(next);
    if (next.sessions.length > MAX_SESSIONS) next.sessions = next.sessions.slice(-MAX_SESSIONS);
    this.data = next;
    this.persist();
    for (const l of this.listeners) l(this.data);
  }

  subscribe(fn: (d: SaveData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(): void {
    this.update((d) => Object.assign(d, defaultSave()));
  }

  private persist(): void {
    try {
      this.backend?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Quota or access error: keep playing from memory.
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
