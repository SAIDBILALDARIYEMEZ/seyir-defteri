// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Bot strategies from PRD §13: (state, window, rng) -> action. They only see what a player
// sees: gauges, warnings, the current RAD reading. Never the future of the curve.

import { BALANCE } from '../../src/config/balance.ts';
import type { Action } from '../../src/sim/actions.ts';
import type { Rng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import type { GameState } from '../../src/sim/state.ts';
import { advise } from '../../src/sim/systems/advisor.ts';
import { isEventNow } from '../../src/sim/systems/time.ts';
import { sepWarnedToday, visibleWarnings } from '../../src/sim/systems/warnings.ts';
import type { WindowData } from '../../src/sim/window.ts';

export type Strategy = (state: GameState, win: WindowData, rng: Rng) => Action;

const crewId = 0;
const END: Action = { type: 'endSol', crewId };
const WAIT: Action = { type: 'shelterWait', crewId, hours: BALANCE.actions.shelterWait.stepHours };
const simple = (type: Exclude<Action['type'], 'shelterWait' | 'repair'>): Action => ({ type, crewId });

function candidates(state: GameState): Action[] {
  return [
    simple('clean'),
    simple('moxie'),
    simple('greenhouse'),
    simple('shelterBuild'),
    WAIT,
    simple('antennaRepair'),
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

/** Fixes whichever gauge is lowest right now. No plan, no shelter, no antenna. */
const greedy: Strategy = (state, win) => {
  const needs: [number, Action][] = [
    [state.air / BALANCE.air.max, simple('moxie')],
    [state.power / BALANCE.power.max, simple('clean')],
    [state.food / BALANCE.food.max, simple('greenhouse')],
  ];
  needs.sort((a, b) => a[0] - b[0]);
  for (const [, action] of needs) if (check(state, action, win) === null) return action;
  return END;
};

interface PlanOptions {
  shelter: 'smart' | 'never' | 'always';
  antenna: boolean;
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
    if (opts.shelter === 'smart' && sepAhead) list.push(simple('shelterBuild'));
    if (opts.antenna) list.push(simple('antennaRepair'), simple('message'), simple('beacon'));
    if (state.air <= a.airComfort) list.push(simple('moxie'));
    if (state.panelEff <= a.panelCleanAt) list.push(simple('clean'));
    if (state.food <= a.foodComfort) list.push(simple('greenhouse'));
    list.push(simple('readCuriosity'), simple('scanRock'));
    // Only the first message matters to this bot (it sends the location).
    const pick = list.find((x) => ok(x) && !(x.type === 'message' && state.rescueStage !== 1));
    return pick ?? END;
  };
}

/** Does only PUSULA's daily tasks (at most 3 per sol), plus sheltering while PUSULA says so. */
const pusula: Strategy = (state, win) => {
  const task = advise(state, win, 1)[0];
  if (!task) return END;
  if (task.why === 'radiationNow') return task.action;
  const done = state.today.actions.filter((x) => x !== 'shelterWait').length;
  return done >= BALANCE.advisor.maxTasks ? END : task.action;
};

export const strategies: Record<string, Strategy> = {
  random,
  greedy,
  balanced: planner({ shelter: 'smart', antenna: true }),
  pusula,
  'never-shelter': planner({ shelter: 'never', antenna: true }),
  'always-shelter': planner({ shelter: 'always', antenna: true }),
  'no-antenna': planner({ shelter: 'smart', antenna: false }),
};
