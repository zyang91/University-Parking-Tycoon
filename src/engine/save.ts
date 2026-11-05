import { SAVE_VERSION } from './state';
import type { GameState } from './types';

export const SAVE_KEY = 'university-parking-tycoon:save';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SaveFile {
  version: number;
  savedAt: string;
  state: GameState;
}

export type LoadResult =
  | { ok: true; state: GameState; savedAt: string }
  | { ok: false; reason: 'none' | 'corrupt' | 'incompatible'; message: string };

export function serialize(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), state };
  return JSON.stringify(file);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Structural validation; rejects anything that could put the engine in an invalid state. */
export function validateState(x: unknown): x is GameState {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  const numeric = ['seed', 'rngState', 'year', 'turn', 'price', 'cash', 'popIndex', 'transitQuality', 'demandModifier', 'inducedDemand', 'bonusCapacity', 'demand', 'lastNetRevenue'];
  if (!numeric.every((k) => isNum(s[k]))) return false;
  if (!['briefing', 'event', 'report', 'ended'].includes(s.phase as string)) return false;
  const ind = s.ind as Record<string, unknown> | undefined;
  if (!ind || !['faculty', 'students', 'neighborhood', 'sustainability', 'autoDependence', 'inertia'].every((k) => isNum(ind[k]) && (ind[k] as number) >= 0 && (ind[k] as number) <= 100)) return false;
  if (!Array.isArray(s.parcels) || s.parcels.length !== 20) return false;
  if (!s.parcels.every((p: any) => p && isNum(p.id) && isNum(p.condition) && ['academic', 'lot', 'garage', 'green', 'vacant'].includes(p.type))) return false;
  for (const k of ['commitments', 'debts', 'usedEvents', 'history', 'stats', 'pendingActions', 'turnNotes', 'turnLog']) {
    if (!Array.isArray(s[k])) return false;
  }
  if (!s.counters || typeof s.counters !== 'object' || !s.flags || typeof s.flags !== 'object') return false;
  return true;
}

export function deserialize(raw: string | null): LoadResult {
  if (raw === null) return { ok: false, reason: 'none', message: 'No saved game found.' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt', message: 'The saved game could not be read (corrupted data).' };
  }
  const file = parsed as Partial<SaveFile>;
  if (!file || typeof file !== 'object' || !isNum(file.version)) {
    return { ok: false, reason: 'corrupt', message: 'The saved game is missing version information.' };
  }
  if (file.version !== SAVE_VERSION) {
    return { ok: false, reason: 'incompatible', message: `The saved game is from an incompatible version (${file.version}).` };
  }
  if (!validateState(file.state)) {
    return { ok: false, reason: 'corrupt', message: 'The saved game failed validation.' };
  }
  return { ok: true, state: file.state, savedAt: typeof file.savedAt === 'string' ? file.savedAt : '' };
}

export function saveGame(storage: StorageLike, state: GameState): boolean {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage: StorageLike): LoadResult {
  try {
    return deserialize(storage.getItem(SAVE_KEY));
  } catch {
    return { ok: false, reason: 'corrupt', message: 'Browser storage is unavailable.' };
  }
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}
