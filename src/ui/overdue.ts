// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Overdue tasks (F5a) in the UI: PUSULA's warning before the day ends and the night-card line.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import { incomePerHour } from '../sim/systems/time.ts';
import type { Action } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { chargedTasks } from '../sim/systems/advisor.ts';
import { missedTasks, overdueCost } from '../sim/systems/overdue.ts';
import type { OverdueCost } from '../sim/systems/overdue.ts';
import type { ModalSpec } from './overlays.ts';

/** "−1⭐ −3💨" for a night cost; empty when it costs nothing. */
export function costText(c: OverdueCost): string {
  const parts: string[] = [];
  if (c.panelEff > 0) parts.push(`+${Math.round(c.panelEff * 100)}% ${t('overdue.dust')}`);
  if (c.air > 0) parts.push(`−${c.air}💨`);
  if (c.food > 0) parts.push(`−${c.food}🥫`);
  if (c.science > 0) parts.push(`−${c.science}⭐`);
  return parts.join('  ');
}

/** One sentence on what the night costs (F5b), from the balance numbers. */
export function nightNote(state: GameState): string {
  const { power, air, food } = BALANCE;
  const have = Math.floor(state.power + incomePerHour(state) * state.hoursLeft);
  if (have < power.nightHeating) return t('night.coldAhead', { power: power.nightHeating, have, cold: air.coldPenalty });
  if (state.sol >= food.unlockSol) return t('night.forecastFood', { power: power.nightHeating, air: air.perSol, food: food.perSol });
  return t('night.forecast', { power: power.nightHeating, air: air.perSol });
}

/**
 * The end-of-day check (F5b: always asked, so a day never ends by mistake). Lists the undone
 * tasks the night would charge or carry, and says what the night brings.
 */
export function endDaySpec(state: GameState, labelOf: (action: Action) => string, onEnd: () => void, onBack: () => void): ModalSpec {
  const missed = missedTasks(state).filter((task) => !task.spare);
  const lines: (string | [string, string])[] = [];
  if (missed.length === 0) lines.push(t('endDay.allDone'));
  else {
    lines.push(t('overdue.warn', { n: missed.length }));
    for (const task of missed) lines.push([`${task.overdue ? '⏰' : '•'} ${labelOf(task.action)}`, '']);
    const tonight = costText(overdueCost(chargedTasks(state)));
    lines.push(tonight ? [t('overdue.tonight'), tonight] : [t('overdue.free'), '']);
  }
  lines.push(nightNote(state));
  if (missed.some((task) => task.action.type !== 'shelterWait')) lines.push(t('overdue.carry'));
  return {
    kind: missed.length > 0 ? 'event' : 'night-ask',
    title: `🌙 ${t('endDay.title', { n: state.sol })}`,
    lines,
    buttons: [
      { label: `🌙 ${t('watch.endDay')}`, onClick: onEnd, primary: missed.length === 0 },
      { label: t('overdue.back'), onClick: onBack, primary: missed.length > 0 },
    ],
  };
}

/**
 * Night-card line for the undone tasks (`missed`: the log's codes): the cost of the overdue
 * ones charged tonight, else a note that they move to tomorrow. Null when nothing was missed.
 */
export function nightOverdueLine(before: GameState, missed: string[], chargedCodes: string[] = []): string | [string, string] | null {
  if (missed.length === 0) return null;
  const charged = before.today.plan.filter((task) => task.overdue && chargedCodes.includes(task.why));
  const cost = costText(overdueCost(charged));
  return charged.length > 0 && cost ? [t('overdue.night', { n: charged.length }), cost] : `⏰ ${t('overdue.moved', { n: missed.length })}`;
}
