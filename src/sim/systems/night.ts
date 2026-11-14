// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Night accounting, win/lose checks, the logbook line, and the next morning.

import { BALANCE } from '../../config/balance.ts';
import { RESCUE_DONE, freshToday, snapshotOf } from '../state.ts';
import type { GameState, LossReason, ReplyKind, Result, SolLog } from '../state.ts';
import type { WindowData } from '../window.ts';
import { chargedTasks, planDay, urgentNeeds } from './advisor.ts';
import { isReady, progressBuilds, setupDone } from './build.ts';
import { carryOver, missedTasks, payOverdue, waitingTasks } from './overdue.ts';
import { isDustSol } from './schedule.ts';
import { doseOver, passDaylight } from './time.ts';
import { visibleWarnings } from './warnings.ts';

type Dusk = SolLog['dusk'];
type Planned = GameState['overdue'];
const duskOf = (s: GameState): Dusk => ({ power: s.power, air: s.air, food: s.food, dose: s.dose });

function logLine(state: GameState, flags: string[], dusk: Dusk = duskOf(state), missed: Planned = [], charged: Planned = []): SolLog {
  return {
    missed: missed.map((task) => task.why),
    charged: charged.map((task) => task.why),
    sol: state.sol,
    actions: state.today.actions,
    urgent: state.today.urgent,
    flags: [...state.today.flags, ...flags],
    power: state.power,
    air: state.air,
    food: state.food,
    dose: state.dose,
    doseGained: state.dose - state.today.doseStart,
    science: state.science,
    dusk,
  };
}

export function lose(state: GameState, reason: LossReason, flags: string[] = [], dusk?: Dusk, missed: Planned = []): GameState {
  return {
    ...state,
    phase: 'lost',
    lossReason: reason,
    result: 'evacuation',
    log: [...state.log, logLine(state, flags, dusk, missed)],
  };
}

function resultOf(state: GameState): Result {
  if (state.rescueStage < RESCUE_DONE) return 'hardRescue';
  const legend = state.dose < BALANCE.dose.legendMax && state.science >= BALANCE.science.legendMin;
  return legend ? 'legend' : 'success';
}

/** PUSULA's morning list, kept to find the undone tasks at night (F5a; F5b: fits the daylight). */
export function morningPlan(state: GameState, win: WindowData): GameState['today']['plan'] {
  return state.sol >= BALANCE.overdue.fromSol && setupDone(state) ? planDay(state, win).tasks : [];
}

/** `carry`: undone tasks of today's list plus overdue tasks that did not fit today. */
function nextMorning(state: GameState, win: WindowData, carry: Planned): GameState {
  const sol = state.sol + 1;
  // A station that is not built (or still building) cannot break down.
  const newlyBroken = state.schedule.malfunctions
    .filter((m) => m.sol === sol && !state.broken.includes(m.station) && isReady(state, m.station))
    .map((m) => m.station);
  let next: GameState = {
    ...state,
    sol,
    hoursLeft: BALANCE.daylightHours,
    crew: state.crew.map((c) => ({ ...c, location: 'habitat' })),
    broken: [...new Set([...state.broken, ...newlyBroken])],
    today: freshToday(state.dose),
    lastReply: null,
    rejection: null,
  };
  if (state.messagePending) {
    let reply: ReplyKind = visibleWarnings(next, win).length > 0 ? 'forecast' : 'advice';
    if (state.rescueStage === 2) {
      reply = 'coords';
      next = { ...next, rescueStage: 3 };
    }
    next = { ...next, messagePending: false, lastReply: reply };
  }
  next = { ...next, overdue: carryOver(next, carry, win) };
  next = { ...next, today: { ...next.today, urgent: urgentNeeds(next, win), plan: morningPlan(next, win) } };
  return { ...next, mornings: [...state.mornings, snapshotOf(next)].slice(-2) };
}

/** Ends the sol: leftover daylight in the habitat, the night, then win / lose / next morning. */
export function endSol(input: GameState, win: WindowData): GameState {
  const { power, air, food, panel, dose, daylightHours, hoursPerSol, dayStartHour } = BALANCE;
  // Judged before the leftover daylight passes: did the undone overdue tasks still fit?
  const charged = chargedTasks(input);
  let s = passDaylight(input, win, input.hoursLeft, dose.habitatShield);
  s = { ...s, hoursLeft: 0, rejection: null };
  const dusk = duskOf(s);
  const flags: string[] = [];
  const missed = missedTasks(s);
  if (missed.length > 0) flags.push('overdue');
  const dusty = isDustSol(s.schedule, s.sol);
  if (dusty) flags.push('dust');
  if (win.radEventSols.includes(s.sol)) flags.push('radEvent');
  if (s.broken.length > 0) flags.push('broken');

  const nightDose = doseOver(
    win,
    s.sol,
    dayStartHour + daylightHours,
    hoursPerSol - daylightHours,
    dose.habitatShield,
  );
  let nextPower = s.power - power.nightHeating;
  let nextAir = s.air - air.perSol;
  if (nextPower < 0) {
    nextPower = 0;
    nextAir -= air.coldPenalty;
    flags.push('cold');
  }
  let nextFood = s.food;
  let emptySols = s.foodEmptySols;
  if (s.sol >= food.unlockSol) {
    nextFood = Math.max(0, s.food - food.perSol);
    emptySols = nextFood <= 0 ? emptySols + 1 : 0;
    if (nextFood <= 0) flags.push('foodEmpty');
  }
  s = {
    ...s,
    dose: s.dose + nightDose,
    power: nextPower,
    air: Math.max(0, nextAir),
    food: nextFood,
    foodEmptySols: emptySols,
    panelEff: Math.max(0, s.panelEff - (dusty ? panel.dustDecayPerSol : panel.decayPerSol)),
    greenhouseIdleSols: s.sol >= food.unlockSol ? s.greenhouseIdleSols + 1 : 0,
  };

  // Only tasks that were already overdue pay (a new task gets one sol of grace), and only
  // when they still fitted the daylight (F5b): one that ran out of time moves on for free.
  s = payOverdue(s, charged);

  const built = progressBuilds(s);
  s = built.state;
  for (const id of built.finished) flags.push(`built.${id}`);

  if (s.air <= 0) return lose(s, 'air', flags, dusk, missed);
  if (s.dose >= dose.budget) return lose(s, 'dose', flags, dusk, missed);
  if (s.foodEmptySols >= food.emptySolsToLose) return lose(s, 'food', flags, dusk, missed);
  s = { ...s, log: [...s.log, logLine(s, flags, dusk, missed, charged)] };
  if (s.sol >= BALANCE.totalSols) return { ...s, phase: 'won', result: resultOf(s) };
  return nextMorning(s, win, [...missed, ...waitingTasks(s)]);
}
