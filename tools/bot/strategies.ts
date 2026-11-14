// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Bot strategies from PRD §13: (state, window, rng) -> action. They only see what a player
// sees: gauges, warnings, the current RAD reading. Never the future of the curve.

import { BALANCE } from '../../src/config/balance.ts';
import type { Action, BuildableId, SimpleActionType } from '../../src/sim/actions.ts';
import type { Rng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import type { GameState } from '../../src/sim/state.ts';
import { exploreTask, nextTask } from '../../src/sim/systems/advisor.ts';
import { STARTERS } from '../../src/sim/systems/build.ts';
import { isEventNow } from '../../src/sim/systems/time.ts';
import { sepWarnedToday, visibleWarnings } from '../../src/sim/systems/warnings.ts';
import type { WindowData } from '../../src/sim/window.ts';

export type Strategy = (state: GameState, win: WindowData, rng: Rng) => Action;

const crewId = 0;
const END: Action = { type: 'endSol', crewId };
const WAIT: Action = { type: 'shelterWait', crewId, hours: BALANCE.actions.shelterWait.stepHours };
const simple = (type: SimpleActionType): Action => ({ type, crewId });
/** The bot always places a station on its suggested grid slot. */
const build = (station: BuildableId): Action => ({ type: 'build', crewId, station, cell: BALANCE.grid.slots[station] });

function candidates(state: GameState): Action[] {
  return [
    simple('clean'),
    simple('moxie'),
    simple('greenhouse'),
    simple('shelterBuild'),
    WAIT,
    build('moxie'),
    build('greenhouse'),
    build('shelter'),
    build('antenna'),
    build('beacon'),
    simple('message'),
    simple('beacon'),
    simple('readCuriosity'),
    simple('scanRock'),
    ...state.broken.map((station): Action => ({ type: 'repair', crewId, station })),
  ];
}

const random: Strategy = (state, win, rng) => {
  const valid = [END, ...candidates(state).filter((a) => check(state, a, win) === null)];
  return valid[rng.int(0, valid.length - 1)] ?? END;
};

/**
 * Fixes whichever gauge is lowest right now; builds a station only when that gauge needs it.
 * No plan, no shelter. F6: with nothing to fix it taps what the store and the radio offer
 * (next station, message, marker), like a child pressing the shiny buttons: since D-022 the
 * rescue needs the antenna, so a bot that never builds it can never win.
 */
const greedy: Strategy = (state, win) => {
  const needs: [number, Action, Action | null][] = [
    [state.air / BALANCE.air.max, simple('moxie'), build('moxie')],
    [state.power / BALANCE.power.max, simple('clean'), null],
    [state.food / BALANCE.food.max, simple('greenhouse'), build('greenhouse')],
  ];
  needs.sort((a, b) => a[0] - b[0]);
  for (const [, action, station] of needs) {
    if (check(state, action, win) === null) return action;
    if (station && check(state, station, win) === null) return station;
  }
  const extras: Action[] = [build('shelter'), build('antenna'), build('beacon'), simple('message'), simple('beacon')];
  return extras.find((x) => check(state, x, win) === null && !(x.type === 'message' && state.rescueStage !== 1)) ?? END;
};

interface PlanOptions {
  shelter: 'smart' | 'never' | 'always';
  antenna: boolean;
  /** F6: when nothing is left, follow PUSULA's explore idea (upgrade / rocket piece). */
  explore?: boolean;
}

/** Simple priorities + shelter on warning. The option flags make the PRD §13 variants. */
function planner(opts: PlanOptions): Strategy {
  return (state, win) => {
    const a = BALANCE.advisor;
    const ok = (action: Action): boolean => check(state, action, win) === null;
    const sepAhead = visibleWarnings(state, win).some((w) => w.kind === 'sep');
    const list: Action[] = [];
    if (opts.shelter === 'always') {
      if (sepWarnedToday(state, win) || isEventNow(state, win)) list.push(WAIT);
      list.push(simple('shelterBuild'));
    }
    if (opts.shelter === 'smart' && isEventNow(state, win)) list.push(WAIT);
    for (const station of state.broken) list.push({ type: 'repair', crewId, station });
    if (state.air <= a.airLow) list.push(simple('moxie'));
    if (state.panelEff <= a.panelDirty || state.power <= a.powerLow) list.push(simple('clean'));
    if (state.food <= a.foodLow) list.push(simple('greenhouse'));
    // Build order is part of the plan: air, shelter (as soon as sol allows), food, radio.
    list.push(build('moxie'), build('shelter'), build('greenhouse'));
    if (opts.shelter === 'smart' && sepAhead) list.push(simple('shelterBuild'));
    if (opts.antenna) list.push(build('antenna'), build('beacon'), simple('message'), simple('beacon'));
    if (state.air <= a.airComfort) list.push(simple('moxie'));
    if (state.panelEff <= a.panelCleanAt) list.push(simple('clean'));
    if (state.food <= a.foodComfort) list.push(simple('greenhouse'));
    list.push(simple('readCuriosity'), simple('scanRock'));
    // Only the first message matters to this bot (it sends the location).
    const pick = list.find((x) => ok(x) && !(x.type === 'message' && state.rescueStage !== 1));
    return pick ?? (opts.explore ? exploreTask(state, win)?.action : null) ?? END;
  };
}

/**
 * Does PUSULA's list top to bottom and ends the day when it is empty (F5b: the list fits the
 * daylight, overdue tasks included; sheltering while PUSULA says so).
 */
const pusula: Strategy = (state, win) => nextTask(state, win)?.action ?? exploreTask(state, win)?.action ?? END;

/** Sol-1 setup first: every bot puts the habitat and the panels on their fixed slots. */
const withSetup = (strategy: Strategy): Strategy => (state, win, rng) => {
  const starter = STARTERS.find((id) => !state.buildings[id]);
  if (starter) return { type: 'place', crewId, station: starter, cell: BALANCE.grid.slots[starter] };
  return strategy(state, win, rng);
};

export const strategies: Record<string, Strategy> = Object.fromEntries(
  Object.entries({
    random,
    greedy,
    balanced: planner({ shelter: 'smart', antenna: true, explore: true }),
    pusula,
    'never-shelter': planner({ shelter: 'never', antenna: true }),
    'always-shelter': planner({ shelter: 'always', antenna: true }),
    'no-antenna': planner({ shelter: 'smart', antenna: false }),
  }).map(([name, strategy]) => [name, withSetup(strategy)]),
);
