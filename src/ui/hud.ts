// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// HUD: three gauge groups on top (Power | Life: air + food | Storm dose as a share of the
// budget), science star, hours left, real-date badge and the pause gear. Tapping a gauge opens
// its info card. Gauges appear with the gradual unlock.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { button, el, fmt, formatDate } from './dom.ts';

export type GaugeId = 'power' | 'air' | 'food' | 'dose' | 'science';

export interface Hud {
  root: HTMLElement;
  update(state: GameState, win: WindowData): void;
}

interface Gauge {
  row: HTMLElement;
  set(label: string, share: number, value: string, low: boolean): void;
}

function gauge(icon: string, onInfo: () => void): Gauge {
  const row = button('gauge', '', onInfo);
  const name = el('span', 'gauge-name');
  const bar = el('span', 'gauge-bar');
  const fill = el('span', 'gauge-fill');
  const num = el('b', 'gauge-num');
  bar.append(fill);
  row.append(el('span', 'gauge-icon', icon), name, bar, num);
  return {
    row,
    set(label, share, value, low) {
      name.textContent = label;
      fill.style.width = `${Math.max(0, Math.min(1, share)) * 100}%`;
      num.textContent = value;
      row.classList.toggle('low', low);
    },
  };
}

export function mountHud(parent: HTMLElement, onPause: () => void, onInfo: (id: GaugeId) => void): Hud {
  const root = el('header', 'hud');
  const left = el('div', 'hud-side');
  const sol = el('span', 'chip');
  const hours = el('span', 'chip');
  const parts = el('span', 'chip parts');
  left.append(sol, hours, parts);

  const groups = el('div', 'hud-groups');
  const power = gauge('⚡', () => onInfo('power'));
  const air = gauge('💨', () => onInfo('air'));
  const food = gauge('🥫', () => onInfo('food'));
  const dose = gauge('☢️', () => onInfo('dose'));
  const powerGroup = el('div', 'hud-group');
  powerGroup.append(power.row);
  const lifeGroup = el('div', 'hud-group');
  const lifeTitle = el('span', 'group-title');
  lifeGroup.append(lifeTitle, air.row, food.row);
  const doseGroup = el('div', 'hud-group dose');
  doseGroup.append(dose.row);
  groups.append(powerGroup, lifeGroup, doseGroup);

  const right = el('div', 'hud-side right');
  const star = button('chip star', '', () => onInfo('science'));
  // F5a: anchors for the floating numbers under each gauge.
  for (const [node, key] of [[power.row, 'power'], [air.row, 'air'], [food.row, 'food'], [dose.row, 'dose'], [hours, 'hours'], [parts, 'parts'], [star, 'science']] as const) {
    node.dataset.res = key;
  }
  const gear = button('chip gear', '⚙', onPause);
  right.append(star, gear);

  const date = el('div', 'date-badge');
  root.append(left, groups, right, date);
  parent.append(root);

  return {
    root,
    update(state, win) {
      const a = BALANCE.advisor;
      // Gradual unlock (PRD §11.5): food from sol 3, storm dose from sol 4; science from the
      // sol Curiosity opens (sol 1 in build mode, D-013).
      food.row.hidden = state.sol < BALANCE.food.unlockSol;
      doseGroup.hidden = state.sol < BALANCE.unlockSol.shelterBuild;
      star.hidden = state.sol < BALANCE.unlockSol.readCuriosity;
      parts.textContent = `🔩 ${state.parts}`;
      parts.title = t('hud.parts');
      const tapHint = t('hud.tapInfo');
      for (const g of [power, air, food, dose]) g.row.title = tapHint;
      sol.textContent = t('hud.sol', { n: state.sol, total: BALANCE.totalSols });
      hours.textContent = `⏱ ${t('hud.hoursLeft', { n: fmt(state.hoursLeft) })}`;
      power.set(t('hud.power'), state.power / BALANCE.power.max, fmt(state.power), state.power <= a.powerLow);
      lifeTitle.textContent = `❤️ ${t('hud.life')}`;
      air.set(t('hud.air'), state.air / BALANCE.air.max, fmt(state.air), state.air <= a.airLow);
      food.set(t('hud.food'), state.food / BALANCE.food.max, fmt(state.food), state.food <= a.foodLow);
      const share = state.dose / BALANCE.dose.budget;
      dose.set(t('hud.dose'), share, `${Math.round(share * 100)}%`, share >= 0.5);
      star.textContent = `⭐ ${fmt(state.science)}`;
      star.title = `${t('hud.science')}. ${tapHint}`;
      gear.setAttribute('aria-label', t('hud.pause'));
      const text = formatDate(dateOfSol(win, state.sol));
      date.textContent = `🌍 ${t('hud.date', { date: text })}`;
    },
  };
}
