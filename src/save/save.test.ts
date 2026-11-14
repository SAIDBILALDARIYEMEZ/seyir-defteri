// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { beforeEach, describe, expect, it } from 'vitest';
import { builtinWindow } from '../data/builtinWindow.ts';
import { reduce } from '../sim/reducer.ts';
import { createRng } from '../sim/rng.ts';
import { createInitialState } from '../sim/state.ts';
import type { GameState } from '../sim/state.ts';
import { BALANCE } from '../config/balance.ts';
import { MAX_SAVES, clearSave, deleteSave, listSaves, loadGame, saveGame, saveIdOf } from './save.ts';

/** A plain in-memory localStorage for the Node test run. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

const win = builtinWindow();
const rng = createRng(1);
const slots = BALANCE.grid.slots;
const setUp = (seed: number): GameState => {
  const s = createInitialState(seed, win);
  const a = reduce(s, { type: 'place', crewId: 0, station: 'habitat', cell: slots.habitat }, rng, win);
  return reduce(a, { type: 'place', crewId: 0, station: 'panels', cell: slots.panels }, rng, win);
};

describe('saved games (F5b)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage(), configurable: true });
  });

  it('work done in the middle of a day survives a reload', () => {
    const morning = setUp(7);
    const midday = reduce(morning, { type: 'readCuriosity', crewId: 0 }, rng, win);
    expect(saveGame(midday)).toBe(true);
    const loaded = loadGame();
    expect(loaded?.today.actions).toEqual(['readCuriosity']);
    expect(loaded?.hoursLeft).toBe(midday.hoursLeft);
    expect(loaded?.science).toBe(midday.science);
  });

  it('keeps one save per mission, newest first, and loads or deletes by id', () => {
    const a = setUp(1);
    const b = setUp(2);
    saveGame(a);
    saveGame(b);
    saveGame({ ...a, sol: 3 });
    const list = listSaves();
    expect(list.map((x) => x.id)).toEqual([saveIdOf(a), saveIdOf(b)]);
    expect(list[0]?.sol).toBe(3);
    expect(loadGame(saveIdOf(b))?.seed).toBe(2);
    deleteSave(saveIdOf(b));
    expect(listSaves().length).toBe(1);
    clearSave(a);
    expect(loadGame()).toBeNull();
  });

  it('never keeps more than MAX_SAVES games', () => {
    for (let seed = 1; seed <= MAX_SAVES + 3; seed++) saveGame(setUp(seed));
    expect(listSaves().length).toBe(MAX_SAVES);
  });

  it('moves an old single-slot save into the list', () => {
    const old = setUp(9);
    localStorage.setItem('seyir-defteri.save', JSON.stringify({ saveVersion: 3, savedAt: '2026-01-01T00:00:00Z', state: old }));
    expect(loadGame()?.seed).toBe(9);
    expect(localStorage.getItem('seyir-defteri.save')).toBeNull();
  });
});
