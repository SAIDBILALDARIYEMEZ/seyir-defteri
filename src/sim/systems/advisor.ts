// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// PUSULA's rule-based daily tasks and the list of urgent needs. Rules, never random.

import { BALANCE } from '../../config/balance.ts';
import type { Action } from '../actions.ts';
import { check } from '../rules.ts';
import type { GameState } from '../state.ts';
import type { WindowData } from '../window.ts';
import { isDustSol } from './schedule.ts';
import { isEventNow } from './time.ts';
import { sepWarnedToday, visibleWarnings } from './warnings.ts';

export interface Task {
  action: Action;
  /** Reason code; text lives in i18n under `task.<why>`. */
  why: string;
}

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

export function advise(state: GameState, win: WindowData, max: number = BALANCE.advisor.maxTasks): Task[] {
  const a = BALANCE.advisor;
  const crewId = 0;
  const list: Task[] = [];
  const add = (why: string, action: Action): void => {
    list.push({ action, why });
  };
  const sepAhead = visibleWarnings(state, win).some((w) => w.kind === 'sep');

  if (isEventNow(state, win) && state.today.shelterHours < a.shelterHoursOnEvent) {
    add('radiationNow', { type: 'shelterWait', crewId, hours: BALANCE.actions.shelterWait.stepHours });
  }
  for (const station of state.broken) add('broken', { type: 'repair', crewId, station });
  if (state.air <= a.airLow) add('airLow', { type: 'moxie', crewId });
  if (state.panelEff <= a.panelDirty || state.power <= a.powerLow) add('panels', { type: 'clean', crewId });
  if (state.food <= a.foodLow) add('foodLow', { type: 'greenhouse', crewId });
  if (sepAhead) add('stormAhead', { type: 'shelterBuild', crewId });
  add('antenna', { type: 'antennaRepair', crewId });
  if (state.rescueStage === 1) add('sendLocation', { type: 'message', crewId });
  add('beacon', { type: 'beacon', crewId });
  if (state.air <= a.airComfort) add('airTopUp', { type: 'moxie', crewId });
  if (state.panelEff <= a.panelCleanAt) add('panelsTidy', { type: 'clean', crewId });
  if (state.food <= a.foodComfort || state.greenhouseIdleSols >= 1) {
    add('greenhouse', { type: 'greenhouse', crewId });
  }
  add('shelterPrep', { type: 'shelterBuild', crewId });
  add('curiosity', { type: 'readCuriosity', crewId });
  add('rock', { type: 'scanRock', crewId });

  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const task of list) {
    const key = JSON.stringify(task.action);
    if (seen.has(key) || check(state, task.action, win) !== null) continue;
    seen.add(key);
    tasks.push(task);
    if (tasks.length >= max) break;
  }
  return tasks;
}
