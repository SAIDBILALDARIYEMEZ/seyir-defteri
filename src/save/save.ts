// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Saved games in localStorage with a versioned schema (PRD §14). The game state is plain
// data, so a save is the state itself plus a version and a timestamp. F5b: one save per
// mission (seed + real month), a short list the main menu shows; Continue loads the newest.

import type { GameState } from '../sim/state.ts';

/** 3 = B3 village layout (placed starters). Older saves are not loaded. */
export const SAVE_VERSION = 3;
/** Before F5b: a single slot. Read once and moved into the list. */
const OLD_KEY = 'seyir-defteri.save';
const LIST_KEY = 'seyir-defteri.saves';
/** The list never grows past this: the oldest save goes first. */
export const MAX_SAVES = 6;

interface SaveFile {
  saveVersion: number;
  savedAt: string;
  state: GameState;
}

/** One row of the saved-games list. */
export interface SaveInfo {
  id: string;
  sol: number;
  seed: number;
  windowId: string;
  savedAt: string;
}

/** One save per mission: the same seed in the same real month overwrites itself. */
export const saveIdOf = (state: Pick<GameState, 'seed' | 'windowId'>): string => `${state.seed}-${state.windowId}`;

function isState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<GameState>;
  return (
    typeof s.seed === 'number' &&
    typeof s.windowId === 'string' &&
    typeof s.sol === 'number' &&
    typeof s.parts === 'number' &&
    typeof s.buildings === 'object' &&
    s.phase === 'playing' &&
    Array.isArray(s.log) &&
    Array.isArray(s.mornings) &&
    Array.isArray(s.crew) &&
    typeof s.today === 'object'
  );
}

/** Older versions are upgraded here, step by step. Unknown versions are ignored. */
function migrate(file: Partial<SaveFile>): GameState | null {
  if (file.saveVersion !== SAVE_VERSION) return null;
  return isState(file.state) ? withOverdue(file.state) : null;
}

/** F5a added the overdue list and the morning plan: saves without them read as empty. */
function withOverdue<T extends Omit<GameState, 'mornings'>>(state: T): T {
  const s = { ...state, overdue: state.overdue ?? [], today: { ...state.today, plan: state.today.plan ?? [] } };
  return 'mornings' in s && Array.isArray(s.mornings) ? { ...s, mornings: s.mornings.map(withOverdue) } : s;
}

function readList(): SaveFile[] {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const list = raw ? (JSON.parse(raw) as Partial<SaveFile>[]) : [];
    const files = Array.isArray(list) ? list.filter((f): f is SaveFile => migrate(f) !== null) : [];
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      localStorage.removeItem(OLD_KEY);
      const file = JSON.parse(old) as Partial<SaveFile>;
      if (migrate(file) && !files.some((f) => saveIdOf(f.state) === saveIdOf(file.state as GameState))) files.push(file as SaveFile);
      writeList(files);
    }
    return files;
  } catch {
    return [];
  }
}

function writeList(files: SaveFile[]): boolean {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(files));
    return true;
  } catch {
    return false;
  }
}

const newestFirst = (a: SaveFile, b: SaveFile): number => b.savedAt.localeCompare(a.savedAt);

/** Only a running mission is saved. Returns false when storage is blocked. */
export function saveGame(state: GameState): boolean {
  if (state.phase !== 'playing') return false;
  const file: SaveFile = { saveVersion: SAVE_VERSION, savedAt: new Date().toISOString(), state: { ...state, rejection: null } };
  const id = saveIdOf(state);
  const rest = readList().filter((f) => saveIdOf(f.state) !== id).sort(newestFirst);
  return writeList([file, ...rest].slice(0, MAX_SAVES));
}

/** The save of `id`, or the newest one when no id is given. */
export function loadGame(id?: string): GameState | null {
  const files = readList().sort(newestFirst);
  const file = id ? files.find((f) => saveIdOf(f.state) === id) : files[0];
  return file ? migrate(file) : null;
}

/** Saved games, newest first. */
export function listSaves(): SaveInfo[] {
  return readList()
    .sort(newestFirst)
    .map((f) => ({ id: saveIdOf(f.state), sol: f.state.sol, seed: f.state.seed, windowId: f.state.windowId, savedAt: f.savedAt }));
}

export function deleteSave(id: string): void {
  writeList(readList().filter((f) => saveIdOf(f.state) !== id));
}

/** A finished mission drops its save. */
export function clearSave(state: Pick<GameState, 'seed' | 'windowId'>): void {
  deleteSave(saveIdOf(state));
}

/**
 * F7 "Exit without saving": today's work is dropped. The save goes back to this morning (the
 * night already saved it). On sol 1 there was no save before today, so the mission's save is
 * removed: the autosaves made during the first day do not survive.
 */
export function exitWithoutSaving(state: GameState): void {
  const morning = state.mornings.find((m) => m.sol === state.sol);
  if (morning && state.sol > 1) saveGame({ ...structuredClone(morning), mornings: state.mornings });
  else clearSave(state);
}
