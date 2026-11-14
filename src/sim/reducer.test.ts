// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, SimpleActionType } from './actions.ts';
import { reduce } from './reducer.ts';
import { check } from './rules.ts';
import { createRng } from './rng.ts';
import { createInitialState, snapshotOf } from './state.ts';
import type { GameState } from './state.ts';
import { advise } from './systems/advisor.ts';
import { whatIfSolDose } from './systems/time.ts';
import { visibleWarnings } from './systems/warnings.ts';

const win = builtinWindow();
const rng = createRng(1);
const act = (type: SimpleActionType): Action => ({ type, crewId: 0 });
const END = act('endSol');
const step = (s: GameState, a: Action): GameState => reduce(s, a, rng, win);
/** A state with no random events, so tests only see the rules under test. */
/** Every station already built, so these tests see the F1 rules (build mode: build.test.ts). */
const builtBase = (): GameState['buildings'] => {
  const slots = BALANCE.grid.slots;
  return {
    habitat: { cell: slots.habitat, solsLeft: 0 },
    panels: { cell: slots.panels, solsLeft: 0 },
    moxie: { cell: slots.moxie, solsLeft: 0 },
    greenhouse: { cell: slots.greenhouse, solsLeft: 0 },
    shelter: { cell: slots.shelter, solsLeft: 0 },
    antenna: { cell: slots.antenna, solsLeft: 0 },
    beacon: { cell: slots.beacon, solsLeft: 0 },
  };
};
const calm = (over: Partial<GameState> = {}): GameState => ({
  ...createInitialState(1, win),
  schedule: { dust: [], malfunctions: [] },
  panelEff: BALANCE.panel.start,
  buildings: builtBase(),
  ...over,
});
const atSol = (sol: number, over: Partial<GameState> = {}): GameState => calm({ sol, ...over });

describe('time and night', () => {
  it('a quiet sol adds no storm dose and pays the night bill', () => {
    const s = step(calm(), END);
    expect(s.sol).toBe(2);
    expect(s.dose).toBe(0); // only dose above the quiet rate counts
    expect(s.power).toBeCloseTo(50 + 30 - 15, 5);
    expect(s.air).toBe(60);
    expect(s.food).toBe(8); // ship rations before sol 3
    expect(s.panelEff).toBeCloseTo(0.9, 5);
    expect(s.log).toHaveLength(1);
    expect(s.log[0]?.sol).toBe(1);
  });

  it('auto-ends the sol when daylight runs out and charges walking time', () => {
    let s = step(calm({ panelEff: 0.5 }), act('clean'));
    expect(s.hoursLeft).toBe(10 - 0.5 - 2);
    s = step(s, act('moxie'));
    expect(s.hoursLeft).toBe(10 - 2.5 - 0.5 - 1);
    expect(s.air).toBe(90);
    s = { ...s, hoursLeft: 1, air: 50 };
    s = step(s, act('moxie'));
    expect(s.sol).toBe(2);
    expect(s.hoursLeft).toBe(BALANCE.daylightHours);
  });

  it('a cold night costs extra air', () => {
    const s = step(calm({ power: 0, panelEff: 0 }), END);
    expect(s.air).toBe(70 - 10 - 15);
    expect(s.log[0]?.flags).toContain('cold');
  });

  it('does not mutate the input and is deterministic for a seed', () => {
    const before = createInitialState(7, win);
    const copy = structuredClone(before);
    step(before, act('moxie'));
    expect(before).toEqual(copy);
    expect(createInitialState(7, win)).toEqual(copy);
    expect(createInitialState(8, win).schedule).not.toEqual(copy.schedule);
  });
});

describe('disabled reasons', () => {
  it('a fresh base has dusty panels, so sol 1 can teach cleaning (D-011)', () => {
    const fresh = { ...createInitialState(1, win), buildings: builtBase() };
    expect(check(fresh, act('clean'), win)).toBeNull();
    expect(step(fresh, act('clean')).panelEff).toBe(BALANCE.panel.start);
  });

  it('returns a reason code and leaves the game untouched', () => {
    const s = step(calm(), act('clean'));
    expect(s.rejection).toBe('panelsClean');
    expect(s.hoursLeft).toBe(10);
    const cases: [GameState, Action, string][] = [
      [calm({ air: 95 }), act('moxie'), 'airFull'],
      [calm({ power: 5 }), act('moxie'), 'noPower'],
      [calm(), act('greenhouse'), 'locked'],
      [atSol(5), { type: 'shelterWait', crewId: 0, hours: 1 }, 'noStormNow'],
      [atSol(5, { shelterLevel: 3 }), act('shelterBuild'), 'shelterMax'],
      [atSol(5), act('message'), 'needAntenna'],
      [atSol(5, { rescueStage: 3 }), act('beacon'), 'tooEarly'],
      [atSol(5, { hoursLeft: 2 }), act('shelterBuild'), 'noTime'],
      [atSol(5, { broken: ['moxie'] }), act('moxie'), 'broken'],
      [atSol(5), { type: 'repair', crewId: 0, station: 'moxie' }, 'notBroken'],
      [calm({ phase: 'won' }), act('moxie'), 'gameOver'],
    ];
    for (const [state, action, code] of cases) expect(check(state, action, win)).toBe(code);
  });
});

describe('radiation from the real curve', () => {
  it('sheltering the first hours of 2024-05-20 cuts the dose', () => {
    const open = whatIfSolDose(win, 18, 3, 0);
    const four = whatIfSolDose(win, 18, 3, 4);
    const all = whatIfSolDose(win, 18, 3, 10);
    expect(open).toBeGreaterThan(four);
    expect(four).toBeGreaterThan(all);
    // The first 4 hours carry more of the saving than the last 6: "first hours, not all day".
    expect(open - four).toBeGreaterThan(four - all);
  });

  it('waiting in the shelter uses the shelter shield and blocks other work', () => {
    const base = atSol(18, { shelterLevel: 3 });
    const sheltered = step(base, { type: 'shelterWait', crewId: 0, hours: 4 });
    const worked = step(step(base, act('shelterBuild')), act('moxie'));
    expect(sheltered.hoursLeft).toBe(5.5);
    expect(sheltered.dose).toBeLessThan(worked.dose);
    expect(sheltered.today.shelterHours).toBe(4);
  });

  it('warns one sol ahead, three with the antenna', () => {
    expect(visibleWarnings(atSol(16), win)).toHaveLength(0);
    expect(visibleWarnings(atSol(17), win)[0]?.sol).toBe(18);
    expect(visibleWarnings(atSol(15, { rescueStage: 1 }), win)[0]?.sol).toBe(18);
  });

  it('too much dose ends the mission as an early evacuation', () => {
    const s = step(atSol(18, { dose: BALANCE.dose.budget - 0.1 }), act('moxie'));
    expect(s.phase).toBe('lost');
    expect(s.lossReason).toBe('dose');
    expect(s.result).toBe('evacuation');
  });
});

describe('rescue chain and results', () => {
  it('antenna ready -> location -> coordinates next morning -> beacon', () => {
    let s = step(atSol(16, { rescueStage: 1 }), act('message'));
    expect(s.rescueStage).toBe(2);
    expect(check(s, act('beacon'), win)).toBe('needCoords');
    s = step(s, END);
    expect(s.lastReply).toBe('coords');
    s = step(s, act('beacon'));
    expect(s.rescueStage).toBe(4);
  });

  it('grades the end of sol 30', () => {
    const end = (over: Partial<GameState>): GameState => step(atSol(30, over), END);
    expect(end({ rescueStage: 4, science: BALANCE.science.legendMin }).result).toBe('legend');
    expect(end({ rescueStage: 4, science: BALANCE.science.legendMin - 1 }).result).toBe('success');
    expect(end({ rescueStage: 3, science: BALANCE.science.legendMin }).result).toBe('hardRescue');
    expect(end({ rescueStage: 2 }).result).toBe('hardRescue');
    // F6: no location ever sent -> the rescue cannot find the base.
    expect(end({ rescueStage: 1 }).lossReason).toBe('noSignal');
    expect(end({ rescueStage: 0 }).phase).toBe('lost');
    expect(end({ rescueStage: 4, science: 99, dose: BALANCE.dose.legendMax }).result).toBe('success');
    expect(end({ air: 5 }).lossReason).toBe('air');
    expect(end({ food: 0, foodEmptySols: 1 }).lossReason).toBe('food');
  });
});

describe('replay yesterday and logbook', () => {
  it('returns to the previous morning with the same events and one use less', () => {
    const base = calm();
    const start: GameState = { ...base, mornings: [snapshotOf(base)] };
    const day2 = step(step(start, act('moxie')), END);
    const back = step(day2, act('replayYesterday'));
    expect(back.sol).toBe(1);
    expect(back.air).toBe(start.air);
    expect(back.schedule).toEqual(start.schedule);
    expect(back.replaysLeft).toBe(BALANCE.replay.uses - 1);
    expect(check(back, act('replayYesterday'), win)).toBe('nothingToReplay');
    expect(check({ ...day2, replaysLeft: 0 }, act('replayYesterday'), win)).toBe('noReplaysLeft');
  });

  it('after a loss goes back to the morning before the lost sol', () => {
    let s = calm();
    s = { ...s, mornings: [snapshotOf(s)] };
    for (let i = 0; i < 3; i++) s = step(s, END); // now the morning of sol 4
    expect(s.mornings.map((m) => m.sol)).toEqual([3, 4]);
    const lost = step({ ...s, air: 5 }, END); // loses on sol 4
    expect(lost.phase).toBe('lost');
    expect(lost.sol).toBe(4);
    const back = step(lost, act('replayYesterday'));
    expect(back.phase).toBe('playing');
    expect(back.sol).toBe(3);
    expect(back.mornings.map((m) => m.sol)).toEqual([3]);
  });

  it('a loss on sol 1 restarts sol 1', () => {
    const lost = step(calm({ air: 5 }), END);
    expect(lost.phase).toBe('lost');
    expect(step(lost, act('replayYesterday')).sol).toBe(1);
  });

  it('writes exactly one log line per sol', () => {
    let s = calm();
    for (let i = 0; i < 5; i++) s = step(step(s, act('moxie')), END);
    expect(s.log.map((l) => l.sol)).toEqual([1, 2, 3, 4, 5]);
    expect(s.log[0]?.actions).toEqual(['moxie']);
  });
});

describe('advisor', () => {
  it('gives 1-3 valid tasks and puts shelter first during an event', () => {
    const tasks = advise(atSol(18), win);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBeLessThanOrEqual(BALANCE.advisor.maxTasks);
    expect(tasks[0]?.action.type).toBe('shelterWait');
    for (const t of tasks) expect(check(atSol(18), t.action, win)).toBeNull();
  });
});

describe('rng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(createRng(43).next()).not.toBe(createRng(42).next());
  });
});
