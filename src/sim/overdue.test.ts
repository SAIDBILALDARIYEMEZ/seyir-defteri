// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, SimpleActionType } from './actions.ts';
import { reduce } from './reducer.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState, PlannedTask } from './state.ts';
import { advise } from './systems/advisor.ts';
import { morningPlan } from './systems/night.ts';
import { overdueCost, taskKey } from './systems/overdue.ts';

const win = builtinWindow();
const rng = createRng(1);
const act = (type: SimpleActionType): Action => ({ type, crewId: 0 });
const END = act('endSol');
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
const task = (type: SimpleActionType, why: string = type): PlannedTask => ({ action: act(type), why });
const late = (type: SimpleActionType, why: string = type): PlannedTask => ({ ...task(type, why), overdue: true });

const slots = BALANCE.grid.slots;
/** Sol 6, everything built, no random events, and a given morning list. */
const morning = (plan: PlannedTask[], over: Partial<GameState> = {}): GameState => {
  const base: GameState = {
    ...createInitialState(1, win),
    sol: 6,
    schedule: { dust: [], malfunctions: [] },
    panelEff: 0.6,
    air: 50,
    food: 10,
    science: 5,
    buildings: {
      habitat: { cell: slots.habitat, solsLeft: 0 },
      panels: { cell: slots.panels, solsLeft: 0 },
      moxie: { cell: slots.moxie, solsLeft: 0 },
      greenhouse: { cell: slots.greenhouse, solsLeft: 0 },
    },
    ...over,
  };
  return { ...base, today: { ...base.today, plan } };
};

describe('overdue tasks (F5a)', () => {
  it('no morning list during the tutorial sols', () => {
    const s = morning([]);
    expect(morningPlan({ ...s, sol: BALANCE.overdue.fromSol - 1 }, win)).toEqual([]);
    expect(morningPlan(s, win).length).toBeGreaterThan(0);
  });

  it('an undone task is carried to the next sol as overdue', () => {
    const s = step(morning([task('readCuriosity', 'curiosity')]), END);
    expect(s.sol).toBe(7);
    expect(s.overdue.map((x) => taskKey(x.action))).toEqual(['readCuriosity']);
    expect(s.overdue[0]?.overdue).toBe(true);
    const listed = advise(s, win).find((x) => taskKey(x.action) === 'readCuriosity');
    expect(listed?.overdue).toBe(true);
    expect(s.log.at(-1)?.missed).toEqual(['curiosity']);
    expect(s.log.at(-1)?.flags).toContain('overdue');
  });

  it('a done task is not carried and costs nothing', () => {
    const a = morning([late('readCuriosity')]);
    const done = step(step(a, act('readCuriosity')), END);
    expect(done.overdue).toEqual([]);
    const skipped = step(a, END);
    expect(done.science - skipped.science).toBe(BALANCE.actions.readCuriosity.science + 1);
  });

  it('a new task gets one sol of grace: missing it costs nothing yet', () => {
    const a = step(morning([]), END);
    const b = step(morning([task('readCuriosity'), task('moxie', 'airLow')]), END);
    expect(b.science).toBe(a.science);
    expect(b.air).toBe(a.air);
  });

  it('an optional extra is never carried', () => {
    const extra: PlannedTask = { ...task('greenhouse'), spare: true };
    expect(step(morning([extra]), END).overdue).toEqual([]);
  });

  it('each overdue task left undone again costs its own resource at night', () => {
    const plan = [late('clean', 'panels'), late('moxie', 'airLow'), late('greenhouse', 'foodLow'), late('scanRock', 'rock')];
    const a = step(morning([]), END);
    const b = step(morning(plan), END);
    const p = BALANCE.overdue.penalty;
    expect(a.panelEff - b.panelEff).toBeCloseTo(p.clean.panelEff, 5);
    expect(a.air - b.air).toBe(p.moxie.air);
    expect(a.food - b.food).toBe(p.greenhouse.food);
    expect(a.science - b.science).toBe(p.scanRock.science);
  });

  it('waiting out a storm costs nothing extra and is never carried', () => {
    const wait: PlannedTask = { action: { type: 'shelterWait', crewId: 0, hours: 1 }, why: 'radiationNow' };
    expect(overdueCost([wait])).toEqual({ panelEff: 0, air: 0, food: 0, science: 0 });
    const s = step(morning([wait], { buildings: { ...morning([]).buildings, shelter: { cell: slots.shelter, solsLeft: 0 } } }), END);
    expect(s.overdue).toEqual([]);
  });

  it('the overdue list never grows past the limit', () => {
    let s = morning([task('readCuriosity'), task('scanRock'), task('clean'), task('moxie'), task('greenhouse')], { air: 100 });
    for (let i = 0; i < 3; i++) s = step(s, END);
    expect(s.phase).toBe('playing');
    expect(s.overdue.length).toBeLessThanOrEqual(BALANCE.overdue.max);
    expect(new Set(s.overdue.map((x) => taskKey(x.action))).size).toBe(s.overdue.length);
  });

  it('science never goes below zero', () => {
    const s = step(morning([late('readCuriosity'), late('scanRock')], { science: 0 }), END);
    expect(s.science).toBe(0);
  });
});
