// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// HUD: three gauge groups on top (Power | Life: air + food | Storm dose as a share of the
// budget), science star, hours left, real-date badge and the pause gear.

import { BALANCE } from '../config/balance.ts';
import { getLang, t } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { button, el, fmt } from './dom.ts';

export interface Hud {
  root: HTMLElement;
  update(state: GameState): void;
}

interface Gauge {
  row: HTMLElement;
  set(label: string, share: number, value: string, low: boolean): void;
}

function gauge(icon: string): Gauge {
  const row = el('div', 'gauge');
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

export function mountHud(parent: HTMLElement, win: WindowData, onPause: () => void): Hud {
  const root = el('header', 'hud');
  const left = el('div', 'hud-side');
  const sol = el('span', 'chip');
  const hours = el('span', 'chip');
  left.append(sol, hours);

  const groups = el('div', 'hud-groups');
  const power = gauge('⚡');
  const air = gauge('💨');
  const food = gauge('🥫');
  const dose = gauge('☢️');
  const powerGroup = el('div', 'hud-group');
  powerGroup.append(power.row);
  const lifeGroup = el('div', 'hud-group');
  const lifeTitle = el('span', 'group-title');
  lifeGroup.append(lifeTitle, air.row, food.row);
  const doseGroup = el('div', 'hud-group dose');
  doseGroup.append(dose.row);
  groups.append(powerGroup, lifeGroup, doseGroup);

  const right = el('div', 'hud-side right');
  const star = el('span', 'chip star');
  const gear = button('chip gear', '⚙', onPause);
  right.append(star, gear);

  const date = el('div', 'date-badge');
  root.append(left, groups, right, date);
  parent.append(root);

  return {
    root,
    update(state) {
      const a = BALANCE.advisor;
      sol.textContent = t('hud.sol', { n: state.sol, total: BALANCE.totalSols });
      hours.textContent = `⏱ ${t('hud.hoursLeft', { n: fmt(state.hoursLeft) })}`;
      power.set(t('hud.power'), state.power / BALANCE.power.max, fmt(state.power), state.power <= a.powerLow);
      lifeTitle.textContent = `❤️ ${t('hud.life')}`;
      air.set(t('hud.air'), state.air / BALANCE.air.max, fmt(state.air), state.air <= a.airLow);
      food.set(t('hud.food'), state.food / BALANCE.food.max, fmt(state.food), state.food <= a.foodLow);
      const share = state.dose / BALANCE.dose.budget;
      dose.set(t('hud.dose'), share, `${Math.round(share * 100)}%`, share >= 0.5);
      doseGroup.title = t('hud.doseNote');
      star.textContent = `⭐ ${fmt(state.science)}`;
      star.title = t('hud.science');
      gear.setAttribute('aria-label', t('hud.pause'));
      const day = new Date(`${dateOfSol(win, state.sol)}T00:00:00Z`);
      const text = new Intl.DateTimeFormat(getLang() === 'tr' ? 'tr-TR' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(day);
      date.textContent = `🌍 ${t('hud.date', { date: text })}`;
    },
  };
}
