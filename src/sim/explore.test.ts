// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, PlacedId } from './actions.ts';
import { reduce } from './reducer.ts';
import { check, costOf } from './rules.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState } from './state.ts';
import { exploreTask } from './systems/advisor.ts';
import { placementReason } from './systems/build.ts';
import { foodMax } from './systems/explore.ts';
import { incomePerHour } from './systems/time.ts';

const win = builtinWindow();
const rng = createRng(1);
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
const ready = (...ids: PlacedId[]): GameState['buildings'] =>
  Object.fromEntries(['habitat', 'panels', ...ids].map((id) => [id, { cell: BALANCE.grid.slots[id as PlacedId], solsLeft: 0 }]));
const fresh = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState(1, win),
  schedule: { dust: [], malfunctions: [] },
  buildings: ready(),
  ...over,
});
const collect = (debris: number): Action => ({ type: 'bonus', crewId: 0, debris });

describe('F6 exploring', () => {
  it('collecting a rocket piece costs work hours and gives its parts, once', () => {
    const piece = BALANCE.debris.pieces[0]!;
    const s = step(fresh(), collect(0));
    expect(s.rejection).toBeNull();
    expect(s.parts).toBe(BALANCE.parts.start + piece.parts);
    expect(s.science).toBe(0);
    expect(s.hoursLeft).toBeCloseTo(BALANCE.daylightHours - BALANCE.debris.hours - BALANCE.walk.near);
    expect(check(s, collect(0), win)).toBe('collected');
    expect(check(s, collect(99), win)).toBe('collected');
    expect(check(s, collect(2), win)).toBe('alreadyToday');
  });

  it('needs the sol-1 setup like every other action', () => {
    expect(check(fresh({ buildings: {} }), collect(0), win)).toBe('needSetup');
  });

  it('a piece blocks its own cell until collected', () => {
    const cell = BALANCE.debris.pieces[1]!;
    expect(placementReason(fresh(), cell)).toBe('cellTaken');
    expect(placementReason(step(fresh(), collect(1)), cell)).not.toBe('cellTaken');
  });

  it('upgrades cost parts, need their station and work once', () => {
    const store: Action = { type: 'upgrade', crewId: 0, upgrade: 'foodStore' };
    expect(check(fresh(), store, win)).toBe('notBuilt');
    const base = fresh({ buildings: ready('moxie', 'greenhouse'), parts: 3 });
    expect(check(base, store, win)).toBe('noParts');
    const rich = { ...base, parts: 20 };
    const s = step(rich, store);
    expect(s.parts).toBe(20 - BALANCE.upgrades.foodStore.parts);
    expect(foodMax(s)).toBe(BALANCE.food.max + BALANCE.upgrades.foodStore.food);
    expect(check(s, store, win)).toBe('alreadyBuilt');
    expect(costOf(rich, store).station).toBe('greenhouse');
  });

  it('the extra panel raises the power income', () => {
    const panel: Action = { type: 'upgrade', crewId: 0, upgrade: 'extraPanel' };
    const s0 = fresh({ parts: 20 });
    const s = step(s0, panel);
    expect(incomePerHour(s)).toBeCloseTo(incomePerHour(s0) * (1 + BALANCE.upgrades.extraPanel.incomeFactor));
  });

  it('PUSULA suggests exploring only when the day list is empty', () => {
    const base = fresh({ sol: 2, air: 90 });
    const busy = { ...base, today: { ...base.today, plan: [{ action: { type: 'readCuriosity', crewId: 0 } as Action, why: 'curiosity' }] } };
    expect(exploreTask(busy, win)).toBeNull();
    expect(exploreTask(base, win)?.action).toEqual(collect(0));
    const rich = { ...base, parts: 18 + BALANCE.upgrades.extraPanel.parts };
    expect(exploreTask(rich, win)?.action).toEqual({ type: 'upgrade', crewId: 0, upgrade: 'extraPanel' });
  });
});
