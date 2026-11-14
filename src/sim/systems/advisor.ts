// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// PUSULA's rule-based daily tasks and the list of urgent needs. Rules, never random.

import { BALANCE } from '../../config/balance.ts';
import missions from '../../content/missions.json' with { type: 'json' };
import type { Action, BuildableId, SimpleActionType } from '../actions.ts';
import { check, costOf } from '../rules.ts';
import type { GameState, PlannedTask } from '../state.ts';
import type { WindowData } from '../window.ts';
import { setupDone, STARTERS, suggestCell } from './build.ts';
import { taskDone, taskKey } from './overdue.ts';
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
    (s.greenhouseIdleSols >= 1 && s.food <= BALANCE.food.max - BALANCE.actions.greenhouse.food),
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

/**
 * The daily mission generator: walks the rules of missions.json in priority order and keeps
 * the first `max` that apply and can be done right now, then adds the overdue tasks carried
 * from earlier sols (F5a) that are still undone. The game's wrist watch, the PUSULA robot and
 * the bot's `pusula` strategy all read this same list.
 */
export function advise(state: GameState, win: WindowData, max: number = BALANCE.advisor.maxTasks): Task[] {
  if (!setupDone(state)) {
    // Sol-1 setup: only placing the habitat and the panels is possible.
    return STARTERS.filter((id) => !state.buildings[id])
      .map((station): Task => ({ action: { type: 'place', crewId: 0, station, cell: suggestCell(state, station) }, why: 'setup' }))
      .slice(0, max);
  }
  const tasks = ruleTasks(state, win, max);
  const late = new Set(state.overdue.map((task) => taskKey(task.action)));
  const listed = new Set(tasks.map((task) => taskKey(task.action)));
  const marked = tasks.map((task) => (late.has(taskKey(task.action)) ? { ...task, overdue: true } : task));
  const carried = state.overdue.filter(
    (task) => !listed.has(taskKey(task.action)) && !taskDone(state, task) && check(state, task.action, win) === null,
  );
  return [...marked, ...carried];
}

function ruleTasks(state: GameState, win: WindowData, max: number): Task[] {
  const seen = new Set<string>();
  const tasks: Task[] = [];
  const duskPower = state.power + incomePerHour(state) * state.hoursLeft;
  for (const rule of RULES) {
    if (!CONDITIONS[rule.when]?.(state, win)) continue;
    for (const action of actionsOf(rule, state, 0)) {
      const key = JSON.stringify(action);
      if (seen.has(key) || check(state, action, win) !== null) continue;
      if (rule.spare && duskPower - costOf(state, action).power < BALANCE.power.nightHeating) continue;
      seen.add(key);
      tasks.push(rule.spare ? { action, why: rule.id, spare: true } : { action, why: rule.id });
      if (tasks.length >= max) return tasks;
    }
  }
  return tasks;
}
