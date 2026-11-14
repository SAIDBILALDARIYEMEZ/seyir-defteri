// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Overdue tasks (F5a) in the UI: PUSULA's warning before the day ends and the night-card line.

import { t } from '../i18n/i18n.ts';
import type { Action } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
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

/** Undone tasks the night would charge or carry, or null when the list is done. */
export function endDayWarning(state: GameState, labelOf: (action: Action) => string, onEnd: () => void, onBack: () => void): ModalSpec | null {
  const missed = missedTasks(state).filter((task) => !task.spare);
  if (missed.length === 0) return null;
  const tonight = costText(overdueCost(missed.filter((task) => task.overdue)));
  const carried = missed.filter((task) => task.action.type !== 'shelterWait').length;
  const lines: (string | [string, string])[] = [t('overdue.warn', { n: missed.length })];
  for (const task of missed) lines.push(`${task.overdue ? '⏰ ' : '• '}${labelOf(task.action)}`);
  lines.push(tonight ? [t('overdue.tonight'), tonight] : t('overdue.free'));
  if (carried > 0) lines.push(t('overdue.carry'));
  return {
    kind: 'event',
    title: `🧭 ${t('watch.title')}`,
    lines,
    buttons: [
      { label: t('overdue.endAnyway'), onClick: onEnd },
      { label: t('overdue.back'), onClick: onBack, primary: true },
    ],
  };
}

/**
 * Night-card line for the undone tasks (`missed`: the log's codes): the cost of the overdue
 * ones charged tonight, else a note that they move to tomorrow. Null when nothing was missed.
 */
export function nightOverdueLine(before: GameState, missed: string[]): string | [string, string] | null {
  if (missed.length === 0) return null;
  const charged = before.today.plan.filter((task) => task.overdue && missed.includes(task.why));
  const cost = costText(overdueCost(charged));
  return charged.length > 0 && cost ? [t('overdue.night', { n: charged.length }), cost] : `⏰ ${t('overdue.moved', { n: missed.length })}`;
}
