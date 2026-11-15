// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// HUD (F7 dashboard): one even strip on top: sol, daylight clock (a pie), power, oxygen, food,
// storm dose, parts and science, each an icon + number + small bar. A value at a critical level
// blinks red (no blink with "reduce motion") and plays a short warning once. A tap opens a
// one-sentence pop-up (its ℹ️ opens the full info card); each gauge introduces itself once.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import { reduceMotion } from '../lib/motion.ts';
import type { GameState } from '../sim/state.ts';
import { foodMax } from '../sim/systems/explore.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { button, el, fmt, formatDate } from './dom.ts';
import { popContent, showPop } from './pop.ts';

export type GaugeId = 'power' | 'air' | 'food' | 'dose' | 'science';
type CellId = 'sol' | 'hours' | GaugeId | 'parts';

export interface Hud {
  root: HTMLElement;
  /** Left column under the strip; the rank badge goes in here. */
  left: HTMLElement;
  /** `sheltered`: Ada waits in the shelter, the dose gauge shows a shield (F5b). */
  update(state: GameState, win: WindowData, sheltered?: boolean): void;
}

interface Cell {
  id: CellId;
  node: HTMLButtonElement;
  set(value: string, share: number | null, low: boolean, critical: boolean): void;
}

const ICONS: Record<CellId, string> = { sol: '🗓️', hours: '', power: '⚡', air: '💨', food: '🥫', dose: '☢️', parts: '🔩', science: '⭐' };
const INTRO_KEY = 'seyir-defteri.hudSeen';
const CLOCK_RED = 2;

function seenIntro(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(INTRO_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function mountHud(parent: HTMLElement, onPause: () => void, onInfo: (id: GaugeId) => void, onWarn: () => void = () => {}): Hud {
  const root = el('header', 'hud dash');
  const strip = el('div', 'dash-strip');
  const left = el('div', 'hud-side left');
  const date = el('div', 'date-badge');

  const popFor = (id: CellId): Node[] => {
    const out = popContent(t(`dash.${id}` as TextKey), t(`dash.pop.${id}` as TextKey));
    if (id === 'power' || id === 'air' || id === 'food' || id === 'dose' || id === 'science') {
      out.push(document.createTextNode(' '), button('info-btn', 'ℹ️', () => onInfo(id)));
    }
    return out;
  };

  const cell = (id: CellId): Cell => {
    const node = button(`dash-cell ${id}`, '', () => showPop(node, popFor(id)));
    node.classList.add('pop-anchor');
    node.dataset.res = id;
    const icon = el('span', 'dash-icon', ICONS[id]);
    const num = el('b', 'dash-num');
    const bar = el('span', 'dash-bar');
    const fill = el('span', 'dash-fill');
    bar.append(fill);
    node.append(icon, num, bar);
    return {
      id,
      node,
      set(value, share, low, critical) {
        num.textContent = value;
        bar.hidden = share === null;
        if (share !== null) fill.style.width = `${Math.max(0, Math.min(1, share)) * 100}%`;
        node.classList.toggle('low', low);
        node.classList.toggle('critical', critical);
        node.classList.toggle('blink', critical && !reduceMotion());
      },
    };
  };

  const cells = (['sol', 'hours', 'power', 'air', 'food', 'dose', 'parts', 'science'] as CellId[]).map(cell);
  const byId = (id: CellId): Cell => cells.find((c) => c.id === id) as Cell;
  const pie = el('span', 'dash-pie');
  byId('hours').node.querySelector('.dash-icon')?.append(pie);
  const shield = el('span', 'dash-shield', '🛡️');
  byId('dose').node.append(shield);
  const gear = button('dash-gear', '⚙', onPause);
  strip.append(...cells.map((c) => c.node), gear);
  root.append(strip, left, date);
  parent.append(root);

  const wasCritical = new Set<CellId>();
  const seen = seenIntro();

  /** Introduces the first visible gauge not yet introduced on this device (one at a time). */
  function intro(): void {
    if (document.querySelector('.backdrop, .gloss-pop')) return;
    const next = cells.find((c) => !c.node.hidden && !seen.has(c.id));
    if (!next) return;
    seen.add(next.id);
    try {
      localStorage.setItem(INTRO_KEY, JSON.stringify([...seen]));
    } catch {
      // Storage blocked: the intro may show again next time.
    }
    showPop(next.node, popContent(t(`dash.${next.id}` as TextKey), t(`dash.pop.${next.id}` as TextKey)));
  }

  return {
    root,
    left,
    update(state, win, sheltered = false) {
      const a = BALANCE.advisor;
      // Gradual unlock (PRD §11.5): food from sol 3, storm dose from sol 4; science from the
      // sol Curiosity opens.
      byId('food').node.hidden = state.sol < BALANCE.food.unlockSol;
      byId('dose').node.hidden = state.sol < BALANCE.unlockSol.shelterBuild;
      byId('science').node.hidden = state.sol < BALANCE.unlockSol.readCuriosity;
      byId('sol').set(`${state.sol}/${BALANCE.totalSols}`, state.sol / BALANCE.totalSols, false, false);
      const day = Math.max(0, Math.min(1, state.hoursLeft / BALANCE.daylightHours));
      const late = state.hoursLeft <= CLOCK_RED;
      pie.style.setProperty('--day', `${day * 360}deg`);
      byId('hours').set(t('dash.hoursShort', { n: fmt(state.hoursLeft) }), null, late, false);
      const crit = {
        power: state.power <= a.powerLow,
        air: state.air <= a.airLow,
        food: state.food <= a.foodLow,
        dose: state.dose / BALANCE.dose.budget >= 0.75,
      };
      byId('power').set(fmt(state.power), state.power / BALANCE.power.max, crit.power, crit.power);
      byId('air').set(fmt(state.air), state.air / BALANCE.air.max, crit.air, crit.air);
      byId('food').set(`${fmt(state.food)}/${foodMax(state)}`, state.food / foodMax(state), crit.food, crit.food);
      const share = state.dose / BALANCE.dose.budget;
      byId('dose').set(`${Math.round(share * 100)}%`, share, share >= 0.5, crit.dose);
      byId('dose').node.classList.toggle('shielded', sheltered);
      shield.hidden = !sheltered;
      byId('parts').set(String(state.parts), null, false, false);
      byId('science').set(fmt(state.science), null, false, false);
      // A short warning sound when a value first drops to its critical level.
      let warn = false;
      for (const [id, on] of Object.entries(crit) as [CellId, boolean][]) {
        const visible = !byId(id).node.hidden;
        if (on && visible && !wasCritical.has(id)) warn = true;
        if (on && visible) wasCritical.add(id);
        else wasCritical.delete(id);
      }
      if (warn) onWarn();
      for (const c of cells) c.node.setAttribute('aria-label', `${t(`dash.${c.id}` as TextKey)}: ${c.node.querySelector('.dash-num')?.textContent ?? ''}`);
      gear.setAttribute('aria-label', t('hud.pause'));
      date.textContent = `🌍 ${t('hud.date', { date: formatDate(dateOfSol(win, state.sol)) })}`;
      window.setTimeout(intro, 600);
    },
  };
}
