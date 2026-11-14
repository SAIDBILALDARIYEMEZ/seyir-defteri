// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Overdue tasks (F5a): tasks of the morning list left undone at the end of the sol are carried
// to the next sol as "Overdue" and cost a little at night. Pure rules, no randomness.

import { BALANCE } from '../../config/balance.ts';
import type { Action } from '../actions.ts';
import { check } from '../rules.ts';
import type { GameState, PlannedTask } from '../state.ts';
import type { WindowData } from '../window.ts';
import { suggestCell } from './build.ts';

/** Same task = same action type on the same station. */
export function taskKey(action: Action): string {
  return 'station' in action ? `${action.type}:${action.station}` : action.type;
}

/** Was this task done today (or made pointless by doing it another way)? */
export function taskDone(state: GameState, task: PlannedTask): boolean {
  const a = task.action;
  if (a.type === 'build' || a.type === 'place') return state.buildings[a.station] !== undefined;
  if (a.type === 'repair') return !state.broken.includes(a.station);
  return state.today.actions.includes(a.type);
}

/** Tasks of this morning's list still undone (optional extras do not count). */
export function missedTasks(state: GameState): PlannedTask[] {
  return state.today.plan.filter((task) => !task.spare && !taskDone(state, task));
}

/**
 * Overdue tasks that were not on this morning's list (they did not fit the daylight) and are
 * still undone: carried again at night without a cost (F5b).
 */
export function waitingTasks(state: GameState): PlannedTask[] {
  const planned = new Set(state.today.plan.map((task) => taskKey(task.action)));
  return state.overdue.filter((task) => !planned.has(taskKey(task.action)) && !taskDone(state, task));
}

export interface OverdueCost {
  panelEff: number;
  air: number;
  food: number;
  science: number;
}

/** Night cost of the undone tasks (BALANCE.overdue.penalty). */
export function overdueCost(missed: PlannedTask[]): OverdueCost {
  const table = BALANCE.overdue.penalty as Record<string, Partial<OverdueCost> | undefined>;
  const cost: OverdueCost = { panelEff: 0, air: 0, food: 0, science: 0 };
  for (const task of missed) {
    const p = table[task.action.type] ?? table.default ?? {};
    cost.panelEff += p.panelEff ?? 0;
    cost.air += p.air ?? 0;
    cost.food += p.food ?? 0;
    cost.science += p.science ?? 0;
  }
  return cost;
}

/** Applies the night cost of the undone tasks. Gauges never go below zero. */
export function payOverdue(state: GameState, missed: PlannedTask[]): GameState {
  if (missed.length === 0) return state;
  const c = overdueCost(missed);
  return {
    ...state,
    panelEff: Math.max(0, state.panelEff - c.panelEff),
    air: Math.max(0, state.air - c.air),
    food: Math.max(0, state.food - c.food),
    science: Math.max(0, state.science - c.science),
  };
}

/**
 * Next morning's overdue list: the undone tasks that still make sense today (can be done
 * now), in list order, at most BALANCE.overdue.max. Optional extras are never carried, and
 * neither is waiting out a storm (that storm is over). A build task gets a fresh cell.
 */
export function carryOver(next: GameState, missed: PlannedTask[], win: WindowData): PlannedTask[] {
  const seen = new Set<string>();
  const out: PlannedTask[] = [];
  for (const task of missed) {
    if (task.spare || task.action.type === 'shelterWait') continue;
    const action: Action =
      task.action.type === 'build' ? { ...task.action, cell: suggestCell(next, task.action.station) } : task.action;
    const key = taskKey(action);
    if (seen.has(key) || check(next, action, win) !== null) continue;
    seen.add(key);
    out.push({ action, why: task.why, overdue: true });
    if (out.length >= BALANCE.overdue.max) break;
  }
  return out;
}
