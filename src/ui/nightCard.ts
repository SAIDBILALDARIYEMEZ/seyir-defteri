// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6 night card parts (as in the trial build): the day's itemized gains and costs, the
// "Now we have" boxes (value + change since this morning) and PUSULA's note
// ("What happened -> Why -> Next time", at most two a night, from sim/systems/lessons.ts).

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { GameState, SolLog } from '../sim/state.ts';
import { el, fmt } from './dom.ts';

type Row = [string, string];
const signed = (n: number, icon: string): string => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}${icon}`;
const share = (points: number): number => (points / BALANCE.dose.budget) * 100;
const MIN = 0.05;

/** The day's rows (panels, work, oxygen, harvest, science, parts). */
export function dayRows(before: GameState, state: GameState, log: SolLog | undefined): Row[] {
  const tally = log?.tally;
  const start = morningOf(before, state);
  const rows: Row[] = [];
  if (tally && tally.solar > MIN) rows.push([`☀️ ${t('night.row.solar')}`, signed(tally.solar, '⚡')]);
  if (tally && tally.work > MIN) rows.push([`🔧 ${t('night.row.work')}`, signed(-tally.work, '⚡')]);
  if (tally && tally.air > MIN) rows.push([`💨 ${t('night.row.airMade')}`, signed(tally.air, '💨')]);
  if (tally && tally.food > MIN) rows.push([`🌱 ${t('night.row.foodMade')}`, signed(tally.food, '🥫')]);
  const science = (log?.science ?? state.science) - start.science;
  if (science > MIN) rows.push([`⭐ ${t('night.row.science')}`, signed(science, '⭐')]);
  const parts = state.parts - start.parts;
  if (parts > 0) rows.push([`🔩 ${t('night.row.parts')}`, signed(parts, '🔩')]);
  return rows;
}

/** This morning's state (the start of the sol that just ended), or `before` when not kept. */
function morningOf(before: GameState, state: GameState): Pick<GameState, 'power' | 'air' | 'food' | 'dose' | 'science' | 'parts'> {
  return state.mornings.find((m) => m.sol === before.sol) ?? before;
}

/** "Now we have": value at the next morning and the change since this morning. */
function totals(before: GameState, state: GameState): HTMLElement {
  const start = morningOf(before, state);
  const box = el('div', 'night-now');
  const cells: [string, string, number, number, string][] = [
    ['⚡', t('hud.power'), state.power, state.power - start.power, ''],
    ['💨', t('hud.air'), state.air, state.air - start.air, ''],
    ['🥫', t('hud.food'), state.food, state.food - start.food, ''],
    ['☢️', t('hud.dose'), share(state.dose), share(state.dose - start.dose), '%'],
    ['⭐', t('hud.science'), state.science, state.science - start.science, ''],
    ['🔩', t('hud.parts'), state.parts, state.parts - start.parts, ''],
  ];
  for (const [icon, label, value, delta, unit] of cells) {
    // Dose going up is bad; everything else going up is good.
    const good = icon === '☢️' ? delta < -MIN : delta > MIN;
    const bad = icon === '☢️' ? delta > MIN : delta < -MIN;
    const cell = el('div', `now-cell${good ? ' up' : bad ? ' down' : ''}`);
    cell.title = label;
    cell.append(
      el('span', 'now-icon', icon),
      el('b', 'now-val', `${fmt(value)}${unit}`),
      el('span', 'now-delta', Math.abs(delta) <= MIN ? '±0' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}${unit}`),
    );
    box.append(cell);
  }
  return box;
}

/** PUSULA's note: each lesson as three short lines (what -> why -> next time). */
function notes(log: SolLog | undefined): HTMLElement | null {
  const lessons = log?.lessons ?? [];
  if (lessons.length === 0) return null;
  const box = el('div', 'night-note');
  box.append(el('h3', '', t('night.note.title')));
  for (const lesson of lessons) {
    const item = el('div', 'note-item');
    const n = fmt(lesson.n);
    for (const part of ['what', 'why', 'next'] as const) {
      const line = el('p', `note-${part}`);
      line.append(el('b', '', `${t(`night.note.${part}`)}: `), t(`lesson.${lesson.code}.${part}`, { n, heat: BALANCE.power.nightHeating }));
      item.append(line);
    }
    box.append(item);
  }
  return box;
}

/** Everything below the rows: the "Now we have" boxes, then PUSULA's note. */
export function nightExtra(before: GameState, state: GameState, log: SolLog | undefined): HTMLElement {
  const wrap = el('div', 'night-extra');
  wrap.append(el('h3', 'night-now-title', t('night.now')), totals(before, state));
  const note = notes(log);
  if (note) wrap.append(note);
  return wrap;
}
