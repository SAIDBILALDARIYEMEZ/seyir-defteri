// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Single-slot save in localStorage with a versioned schema (PRD §14). The game state is plain
// data, so the save is the state itself plus a version and a timestamp.

import type { GameState } from '../sim/state.ts';

/** 2 = build mode (B1): parts + buildings. Older saves are not loaded. */
export const SAVE_VERSION = 2;
const STORAGE_KEY = 'seyir-defteri.save';

interface SaveFile {
  saveVersion: number;
  savedAt: string;
  state: GameState;
}

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
  return isState(file.state) ? file.state : null;
}

/** Only a running mission is saved. Returns false when storage is blocked. */
export function saveGame(state: GameState): boolean {
  if (state.phase !== 'playing') return false;
  const file: SaveFile = { saveVersion: SAVE_VERSION, savedAt: new Date().toISOString(), state: { ...state, rejection: null } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw) as Partial<SaveFile>) : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was saved either.
  }
}
