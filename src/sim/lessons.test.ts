// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, PlacedId } from './actions.ts';
import { reduce } from './reducer.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState } from './state.ts';
import { eventHoursOver, pickLessons } from './systems/lessons.ts';

const win = builtinWindow();
const rng = createRng(1);
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
const END: Action = { type: 'endSol', crewId: 0 };
const ready = (...ids: PlacedId[]): GameState['buildings'] =>
  Object.fromEntries(['habitat', 'panels', ...ids].map((id) => [id, { cell: BALANCE.grid.slots[id as PlacedId], solsLeft: 0 }]));
const base = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState(1, win),
  schedule: { dust: [], malfunctions: [] },
  buildings: ready('moxie', 'greenhouse'),
  sol: 5,
  ...over,
});
const codes = (s: GameState): string[] => (s.today.lessons ?? []).map((l) => l.code);
const lastNotes = (s: GameState) => s.log.at(-1)?.lessons ?? [];

describe('F6 lessons (PUSULA notes)', () => {
  it('oxygen that does not fit the tank is noted with the amount lost', () => {
    const s = step(base({ air: 90 }), { type: 'moxie', crewId: 0 });
    expect(s.today.lessons).toEqual([{ code: 'airFull', n: 10 }]);
    expect(codes(step(base({ air: 50 }), { type: 'moxie', crewId: 0 }))).toEqual([]);
  });

  it('a harvest into an almost full store is noted', () => {
    const s = step(base({ food: 19 }), { type: 'greenhouse', crewId: 0 });
    expect(s.today.lessons).toEqual([{ code: 'harvestFull', n: 2 }]);
  });

  it('ending the day with doable work and daylight left is noted on the log line', () => {
    const s = step(base({ air: 30 }), END); // low air: an urgent task is open
    expect(lastNotes(s).map((l) => l.code)).toContain('endEarly');
    expect(lastNotes(s).find((l) => l.code === 'endEarly')?.n).toBe(BALANCE.daylightHours);
  });

  it('storm hours outside a ready shelter are noted; without a shelter they are not', () => {
    const sol = win.radEventSols.find((x) => eventHoursOver(win, x, BALANCE.dayStartHour, BALANCE.daylightHours) > 0);
    expect(sol).toBeDefined();
    const withShelter = step(base({ sol, buildings: ready('moxie', 'greenhouse', 'shelter') }), END);
    expect(lastNotes(withShelter).map((l) => l.code)).toContain('stormOutside');
    const without = step(base({ sol }), END);
    expect(lastNotes(without).map((l) => l.code)).not.toContain('stormOutside');
  });

  it('at most two notes a night, the most useful first', () => {
    const picked = pickLessons([
      { code: 'harvestFull', n: 1 },
      { code: 'endEarly', n: 5 },
      { code: 'stormOutside', n: 2 },
    ]);
    expect(picked.map((l) => l.code)).toEqual(['stormOutside', 'endEarly']);
  });

  it('notes never change the gauges', () => {
    const a = step(base({ air: 90 }), { type: 'moxie', crewId: 0 });
    expect(a.air).toBe(BALANCE.air.max);
  });
});
