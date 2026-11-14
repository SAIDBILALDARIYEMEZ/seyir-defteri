// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, Cell, PlacedId, StarterId } from './actions.ts';
import { reduce } from './reducer.ts';
import { check } from './rules.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState } from './state.ts';
import { setupDone } from './systems/build.ts';

const win = builtinWindow();
const rng = createRng(1);
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
const slots = BALANCE.grid.slots;
const place = (station: StarterId, cell: Cell = slots[station]): Action => ({ type: 'place', crewId: 0, station, cell });
const move = (station: PlacedId, cell: Cell): Action => ({ type: 'relocate', crewId: 0, station, cell });
const setUp = (): GameState => step(step(createInitialState(1, win), place('habitat')), place('panels'));

describe('sol-1 setup (B3)', () => {
  it('starts with nothing placed and every other action closed', () => {
    const s = createInitialState(1, win);
    expect(setupDone(s)).toBe(false);
    expect(check(s, { type: 'clean', crewId: 0 }, win)).toBe('needSetup');
    expect(check(s, { type: 'endSol', crewId: 0 }, win)).toBe('needSetup');
    expect(check(s, { type: 'build', crewId: 0, station: 'moxie', cell: slots.moxie }, win)).toBe('needSetup');
  });

  it('placing is free and instant, on any valid cell, once', () => {
    const s0 = createInitialState(1, win);
    const s1 = step(s0, place('habitat', { x: 3, y: 12 }));
    expect(s1.rejection).toBeNull();
    expect(s1.buildings.habitat).toEqual({ cell: { x: 3, y: 12 }, solsLeft: 0 });
    expect([s1.hoursLeft, s1.power, s1.parts]).toEqual([s0.hoursLeft, s0.power, s0.parts]);
    expect(check(s1, place('habitat'), win)).toBe('alreadyPlaced');
    expect(check(s1, place('panels', { x: 4, y: 12 }), win)).toBe('tooClose');
    expect(check(s1, place('panels', BALANCE.grid.lander), win)).toBe('cellTaken');
    const s2 = step(s1, place('panels'));
    expect(setupDone(s2)).toBe(true);
    expect(check(s2, { type: 'clean', crewId: 0 }, win)).toBeNull();
  });

  it('the sol-1 morning keeps the placed starters for a replay', () => {
    const s = setUp();
    expect(s.mornings[0]?.buildings.habitat?.cell).toEqual(slots.habitat);
  });
});

describe('relocate (B3)', () => {
  it('moves a ready station for one hour of work, no parts', () => {
    const s0 = setUp();
    const s1 = step(s0, move('panels', { x: 6, y: 13 }));
    expect(s1.rejection).toBeNull();
    expect(s1.buildings.panels?.cell).toEqual({ x: 6, y: 13 });
    expect(s1.parts).toBe(s0.parts);
    expect(s1.hoursLeft).toBeCloseTo(s0.hoursLeft - BALANCE.build.relocateHours - BALANCE.walk.near);
  });

  it('refuses stations under construction or not placed, and bad cells', () => {
    const s0 = setUp();
    expect(check(s0, move('moxie', { x: 12, y: 13 }), win)).toBe('notBuilt');
    const building = step(s0, { type: 'build', crewId: 0, station: 'moxie', cell: slots.moxie });
    expect(check(building, move('moxie', { x: 12, y: 13 }), win)).toBe('underConstruction');
    expect(check(s0, move('panels', slots.habitat), win)).toBe('cellTaken');
    expect(check(s0, move('panels', { x: 4, y: 4 }), win)).toBe('nearCrater');
    // Its own old cell does not block the move one cell over.
    expect(check(s0, move('habitat', { x: 7, y: 9 }), win)).toBe('tooClose');
    expect(check(s0, move('habitat', { x: 9, y: 8 }), win)).toBeNull();
  });
});
