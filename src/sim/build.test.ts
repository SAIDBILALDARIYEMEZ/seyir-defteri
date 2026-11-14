// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, BuildableId, Cell, PlacedId } from './actions.ts';
import { reduce } from './reducer.ts';
import { check, costOf } from './rules.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState } from './state.ts';
import { BUILDABLES, buildStatus } from './systems/build.ts';

const win = builtinWindow();
const rng = createRng(1);
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
const END: Action = { type: 'endSol', crewId: 0 };
const build = (station: BuildableId, cell: Cell = BALANCE.grid.slots[station]): Action => ({
  type: 'build',
  crewId: 0,
  station,
  cell,
});
const ready = (...ids: PlacedId[]): GameState['buildings'] =>
  Object.fromEntries(['habitat', 'panels', ...ids].map((id) => [id, { cell: BALANCE.grid.slots[id as PlacedId], solsLeft: 0 }]));
/** A sol-1 state with the starters already placed (setup: setup.test.ts). */
const fresh = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState(1, win),
  schedule: { dust: [], malfunctions: [] },
  buildings: ready(),
  ...over,
});

describe('build mode', () => {
  it('starts with only the habitat and panels ready, and parts for every build', () => {
    const s = fresh();
    expect(BUILDABLES.map((id) => buildStatus(s, id))).toEqual([
      'available',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    const total = BUILDABLES.reduce((sum, id) => sum + BALANCE.build.stations[id].parts, 0);
    expect(s.parts).toBeGreaterThanOrEqual(total);
    expect(check(s, { type: 'moxie', crewId: 0 }, win)).toBe('notBuilt');
    expect(check(s, { type: 'clean', crewId: 0 }, win)).toBeNull();
  });

  it('placing costs time, power and parts, then builds overnight', () => {
    const rule = BALANCE.build.stations.moxie;
    const s0 = fresh();
    const s = step(s0, build('moxie'));
    expect(s.rejection).toBeNull();
    expect(s.parts).toBe(s0.parts - rule.parts);
    expect(s.hoursLeft).toBeLessThan(s0.hoursLeft);
    expect(buildStatus(s, 'moxie')).toBe('building');
    expect(check(s, { type: 'moxie', crewId: 0 }, win)).toBe('underConstruction');
    let n = s;
    for (let i = 0; i < rule.sols; i++) n = step(n, END);
    expect(buildStatus(n, 'moxie')).toBe('ready');
    expect(n.log.at(-1)?.flags).toContain('built.moxie');
    expect(check(n, { type: 'moxie', crewId: 0 }, win)).toBeNull();
  });

  it('follows the unlock chain with reason codes', () => {
    expect(check(fresh(), build('greenhouse'), win)).toBe('needMoxie');
    expect(check(fresh({ buildings: ready('moxie') }), build('greenhouse'), win)).toBeNull();
    expect(check(fresh({ sol: 3 }), build('shelter'), win)).toBe('tooEarly');
    expect(check(fresh({ sol: 4 }), build('shelter'), win)).toBeNull();
    expect(check(fresh({ sol: 9 }), build('antenna'), win)).toBe('needShelter');
    expect(check(fresh({ sol: 9, buildings: ready('shelter') }), build('antenna'), win)).toBeNull();
    expect(check(fresh({ sol: 20, buildings: ready('shelter') }), build('beacon'), win)).toBe('needAntenna');
    expect(check(fresh({ sol: 14, buildings: ready('antenna') }), build('beacon'), win)).toBe('tooEarly');
    expect(check(fresh({ sol: 15, buildings: ready('antenna') }), build('beacon'), win)).toBeNull();
    expect(check(fresh({ buildings: ready('moxie') }), build('moxie'), win)).toBe('alreadyBuilt');
    expect(check(fresh({ parts: 0 }), build('moxie'), win)).toBe('noParts');
  });

  it('rejects bad spots with reason codes', () => {
    const g = BALANCE.grid;
    const crater = g.craters[0] ?? { x: 0, y: 0 };
    const cases: [Cell, string][] = [
      [{ x: -1, y: 0 }, 'cellOutside'],
      [{ x: g.cols, y: 0 }, 'cellOutside'],
      [{ x: 0.5, y: 3 }, 'cellOutside'],
      [g.slots.habitat, 'cellTaken'],
      [{ x: g.slots.habitat.x + 1, y: g.slots.habitat.y }, 'tooClose'],
      [{ x: crater.x, y: crater.y }, 'nearCrater'],
    ];
    for (const [cell, code] of cases) expect(check(fresh(), build('moxie', cell), win)).toBe(code);
    const placed = step(fresh(), build('moxie'));
    expect(placed.buildings.moxie?.cell).toEqual(g.slots.moxie);
    const s = { ...placed, buildings: { ...placed.buildings, ...ready('moxie') } };
    expect(check(s, build('greenhouse', g.slots.moxie), win)).toBe('cellTaken');
  });

  it('the bot slots are all valid together', () => {
    let s = fresh({ sol: 15 });
    for (const id of BUILDABLES) {
      expect(check(s, build(id), win)).toBeNull();
      s = { ...step(s, build(id)), hoursLeft: BALANCE.daylightHours, power: BALANCE.power.max };
      s = { ...s, buildings: { ...s.buildings, ...ready(id) } };
    }
  });

  it('the finished antenna opens the rescue chain; shelter must exist to wait in it', () => {
    let s = step(fresh({ sol: 9, buildings: ready('shelter') }), build('antenna'));
    for (let i = 0; i < BALANCE.build.stations.antenna.sols; i++) s = step(s, END);
    expect(s.rescueStage).toBe(1);
    expect(check(fresh({ sol: 18 }), { type: 'shelterWait', crewId: 0, hours: 1 }, win)).toBe('notBuilt');
  });

  it('stations that are not built do not break down', () => {
    const s = step(fresh({ schedule: { dust: [], malfunctions: [{ sol: 2, station: 'moxie' }] } }), END);
    expect(s.broken).toEqual([]);
  });

  it('bonus adds parts and science and costs no time', () => {
    const s = step(fresh(), { type: 'bonus', crewId: 0, parts: 2, science: 1 });
    expect(s.parts).toBe(BALANCE.parts.start + 2);
    expect(s.science).toBe(1);
    expect(s.hoursLeft).toBe(BALANCE.daylightHours);
  });

  it('ending the day is always a habitat action', () => {
    const s = step(fresh(), build('moxie'));
    expect(costOf(s, END).station).toBe('habitat');
  });
});
