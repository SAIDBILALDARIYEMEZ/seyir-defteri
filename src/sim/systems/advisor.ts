// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// PUSULA's rule-based daily tasks and the list of urgent needs. Rules, never random.

import { BALANCE } from '../../config/balance.ts';
import missions from '../../content/missions.json' with { type: 'json' };
import type { Action, BuildableId, SimpleActionType } from '../actions.ts';
import { check, costOf, locationOf, walkHours } from '../rules.ts';
import type { GameState, PlannedTask } from '../state.ts';
import type { WindowData } from '../window.ts';
import { setupDone, STARTERS, suggestCell } from './build.ts';
import { debrisLeft, foodMax, spareParts, UPGRADES } from './explore.ts';
import { missedTasks, taskDone, taskKey } from './overdue.ts';
import { isDustSol } from './schedule.ts';
import { incomePerHour, isEventNow } from './time.ts';
import { sepWarnedToday, visibleWarnings } from './warnings.ts';

interface MissionRule {
  /** Reason code; text lives in i18n under `task.<id>`. */
  id: string;
  action: string;
  /** Name of a condition in CONDITIONS below. */
  when: string;
  /** Not urgent: only offered when tonight's heating stays paid after its power cost. */
  spare?: boolean;
  /** For `build` rules: which station to place (at its suggested grid slot). */
  station?: string;
  /** Needs that cannot wait: they lead the list and also show up during the day (F5b). */
  urgent?: boolean;
}
const RULES: MissionRule[] = missions;

export type Task = PlannedTask;

/** Needs that cannot wait. Two or more on one morning make a "hard choice" day. */
export function urgentNeeds(state: GameState, win: WindowData): string[] {
  const a = BALANCE.advisor;
  const needs: string[] = [];
  if (state.air <= a.airLow) needs.push('air');
  if (state.power <= a.powerLow) needs.push('power');
  if (state.sol >= BALANCE.food.unlockSol && state.food <= a.foodLow) needs.push('food');
  if (state.panelEff <= a.panelDirty) needs.push('panels');
  if (state.broken.length > 0) needs.push('broken');
  if (sepWarnedToday(state, win) || isEventNow(state, win)) needs.push('radiation');
  if (isDustSol(state.schedule, state.sol)) needs.push('dust');
  return needs;
}

type Condition = (state: GameState, win: WindowData) => boolean;

/** Named conditions used by `src/content/missions.json`. Thresholds stay in balance.ts. */
const CONDITIONS: Record<string, Condition> = {
  always: () => true,
  eventNow: (s, win) => isEventNow(s, win) && s.today.shelterHours < BALANCE.advisor.shelterHoursOnEvent,
  broken: (s) => s.broken.length > 0,
  airLow: (s) => s.air <= BALANCE.advisor.airLow,
  powerLow: (s) => s.panelEff <= BALANCE.advisor.panelDirty || s.power <= BALANCE.advisor.powerLow,
  foodLow: (s) => s.food <= BALANCE.advisor.foodLow,
  stormAhead: (s, win) => visibleWarnings(s, win).some((w) => w.kind === 'sep'),
  locationNotSent: (s) => s.rescueStage === 1,
  airComfort: (s) => s.air <= BALANCE.advisor.airComfort,
  panelsDusty: (s) => s.panelEff <= BALANCE.advisor.panelCleanAt,
  foodComfort: (s) =>
    s.food <= BALANCE.advisor.foodComfort ||
    (s.greenhouseIdleSols >= 1 && s.food <= foodMax(s) - BALANCE.actions.greenhouse.food),
};

function actionsOf(rule: MissionRule, state: GameState, crewId: number): Action[] {
  if (rule.action === 'build') {
    const station = rule.station as BuildableId;
    return [{ type: 'build', crewId, station, cell: suggestCell(state, station) }];
  }
  if (rule.action === 'repair') return state.broken.map((station) => ({ type: 'repair', crewId, station }));
  if (rule.action === 'shelterWait') {
    return [{ type: 'shelterWait', crewId, hours: BALANCE.actions.shelterWait.stepHours }];
  }
  return [{ type: rule.action as SimpleActionType, crewId }];
}

/** The task list split into what fits today's daylight and what moves to tomorrow (F5b). */
export interface DayPlan {
  tasks: Task[];
  /** Tasks that do not fit the daylight left (walking included): no cost, "moves to tomorrow". */
  deferred: Task[];
}

const EPS = 1e-9;

/**
 * Keeps the tasks that fit the daylight left when done in list order, walking from Ada's
 * spot to each station in turn; the rest are deferred. Time only: power is checked per task.
 */
export function fitDaylight(state: GameState, tasks: Task[], crewId = 0): DayPlan {
  let at = locationOf(state, crewId);
  let left = state.hoursLeft;
  const plan: DayPlan = { tasks: [], deferred: [] };
  for (const task of tasks) {
    const cost = costOf(state, task.action);
    const need = walkHours(at, cost.station) + cost.hours;
    if (need > left + EPS) {
      plan.deferred.push(task);
      continue;
    }
    plan.tasks.push(task);
    left -= need;
    at = cost.station;
  }
  return plan;
}

/**
 * Overdue tasks of this morning's list that tonight charges (F5b): left undone although they
 * still fit the daylight left. One that no longer fits moves to tomorrow without a cost.
 */
export function chargedTasks(state: GameState): Task[] {
  return missedTasks(state).filter((task) => task.overdue && fitDaylight(state, [task]).tasks.length > 0);
}

function setupTasks(state: GameState, max: number): Task[] {
  // Sol-1 setup: only placing the habitat and the panels is possible.
  return STARTERS.filter((id) => !state.buildings[id])
    .map((station): Task => ({ action: { type: 'place', crewId: 0, station, cell: suggestCell(state, station) }, why: 'setup' }))
    .slice(0, max);
}

/** Same task twice (by action + station): the first one wins. */
function unique(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = taskKey(task.action);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Overdue tasks carried from earlier sols that are still undone and possible now. */
function carriedTasks(state: GameState, win: WindowData): Task[] {
  return state.overdue.filter((task) => !taskDone(state, task) && check(state, task.action, win) === null);
}

const markLate = (state: GameState, tasks: Task[]): Task[] => {
  const late = new Set(state.overdue.map((task) => taskKey(task.action)));
  return tasks.map((task) => (late.has(taskKey(task.action)) ? { ...task, overdue: true } : task));
};

/**
 * The morning list (F5b): the first `max` rules of missions.json that apply and can be done
 * now, plus the overdue tasks carried from earlier sols. Urgent rules lead, then the overdue
 * tasks, then the rest; whatever does not fit the daylight (walking included) is deferred
 * to tomorrow without a cost.
 */
export function planDay(state: GameState, win: WindowData, max: number = BALANCE.advisor.maxTasks): DayPlan {
  if (!setupDone(state)) return { tasks: setupTasks(state, max), deferred: [] };
  // The morning is the low point of the battery: plan with the power the panels bring by
  // dusk, and do the tasks that can be paid now first.
  const dusk = { ...state, power: Math.min(BALANCE.power.max, state.power + incomePerHour(state) * state.hoursLeft) };
  const paidLast = (tasks: Task[]): Task[] => [
    ...tasks.filter((x) => state.power >= costOf(state, x.action).power),
    ...tasks.filter((x) => state.power < costOf(state, x.action).power),
  ];
  const rules = markLate(state, paidLast(ruleTasks(state, win, max, false, dusk)));
  const ordered = unique([...rules.filter((x) => x.urgent), ...carriedTasks(state, win), ...rules.filter((x) => !x.urgent)]);
  return fitDaylight(state, ordered);
}

/**
 * PUSULA's live list for the rest of the day: urgent needs that came up (radiation now, a
 * breakdown, low air ...), then this morning's tasks still undone, cut to the daylight left.
 * The game's wrist watch, the PUSULA robot and the bot's `pusula` strategy all read it.
 * An empty list means nothing meaningful is left: PUSULA suggests ending the day.
 */
export function liveDay(state: GameState, win: WindowData): DayPlan {
  if (!setupDone(state)) return { tasks: setupTasks(state, BALANCE.advisor.maxTasks), deferred: [] };
  const urgent = ruleTasks(state, win, Number.POSITIVE_INFINITY, true);
  const open = state.today.plan.filter((task) => !taskDone(state, task));
  const reason = (task: Task): string | null => check(state, task.action, win);
  // A task still waiting for the panels' power stays on the list, after the ones doable now.
  const ready = open.filter((task) => reason(task) === null);
  const waiting = open.filter((task) => reason(task) === 'noPower');
  // Out of daylight: fitDaylight moves these to `deferred` ("moves to tomorrow").
  const late = open.filter((task) => reason(task) === 'noTime');
  return fitDaylight(state, markLate(state, unique([...urgent, ...ready, ...waiting, ...late])));
}

/** PUSULA's live list (see liveDay). Some tasks may still wait for power: see `nextTask`. */
export function advise(state: GameState, win: WindowData): Task[] {
  return liveDay(state, win).tasks;
}

/** The first task of the live list that can be done right now, or null (time to end the day). */
export function nextTask(state: GameState, win: WindowData): Task | null {
  return advise(state, win).find((task) => check(state, task.action, win) === null) ?? null;
}

/** `judge`: the state `check` runs on (the morning plan judges with the dusk battery). */
function ruleTasks(state: GameState, win: WindowData, max: number, urgentOnly = false, judge: GameState = state): Task[] {
  const seen = new Set<string>();
  const tasks: Task[] = [];
  const duskPower = state.power + incomePerHour(state) * state.hoursLeft;
  for (const rule of RULES) {
    if (urgentOnly && !rule.urgent) continue;
    if (!CONDITIONS[rule.when]?.(state, win)) continue;
    for (const action of actionsOf(rule, state, 0)) {
      const key = JSON.stringify(action);
      if (seen.has(key) || check(judge, action, win) !== null) continue;
      if (rule.spare && duskPower - costOf(state, action).power < BALANCE.power.nightHeating) continue;
      seen.add(key);
      const task: Task = { action, why: rule.id };
      if (rule.spare) task.spare = true;
      if (rule.urgent) task.urgent = true;
      tasks.push(task);
      if (tasks.length >= max) return tasks;
    }
  }
  return tasks;
}

/**
 * F6: PUSULA's extra idea when the day's list is empty: an affordable upgrade first, else the
 * nearest rocket piece still lying around. Never part of the plan (never overdue, no cost).
 */
export function exploreTask(state: GameState, win: WindowData): Task | null {
  if (!setupDone(state) || state.phase !== 'playing' || liveDay(state, win).tasks.length > 0) return null;
  for (const upgrade of UPGRADES) {
    const action: Action = { type: 'upgrade', crewId: 0, upgrade };
    const affordable = spareParts(state) >= BALANCE.upgrades[upgrade].parts;
    if (affordable && check(state, action, win) === null) return { action, why: `upgrade.${upgrade}` };
  }
  for (const debris of debrisLeft(state)) {
    const action: Action = { type: 'bonus', crewId: 0, debris };
    if (check(state, action, win) === null) return { action, why: 'explore' };
  }
  return null;
}
