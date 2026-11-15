// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Station info card (F5a): what a station does, why it matters in real life, the hazard it
// teaches and its actions. A side panel, not a modal: it never blocks the action menu.

import info from '../content/stationInfo.json';
import stationContent from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { isPlaceable } from '../sim/systems/build.ts';
import { button, el } from './dom.ts';
import { glossify } from './glossary.ts';

export type InfoId = StationId | 'lander';

export interface InfoCard {
  root: HTMLElement;
  /** `withMenu`: the action menu is open too, so the card leaves out its own action list. */
  show(id: InfoId, state: GameState, withMenu?: boolean): void;
  hide(): void;
  /** The station shown, or null. */
  current(): InfoId | null;
}

const NO_LIST = new Set(['repair', 'build', 'bonus', 'place', 'relocate', 'rotate']);

function statusOf(id: InfoId, state: GameState): string | null {
  if (id === 'lander' || !isPlaceable(id)) return null;
  const b = state.buildings[id];
  if (!b) return t('sinfo.notPlaced');
  return b.solsLeft > 0 ? t('sinfo.building', { n: b.solsLeft }) : null;
}

export function mountInfoCard(parent: HTMLElement): InfoCard {
  const root = el('aside', 'info-card');
  root.hidden = true;
  root.setAttribute('aria-live', 'polite');
  parent.append(root);
  let shown: InfoId | null = null;
  const hide = (): void => {
    root.hidden = true;
    shown = null;
  };
  const section = (title: TextKey, body: string, cls = ''): HTMLElement => {
    const box = el('section', `info-sec ${cls}`);
    const p = el('p');
    p.append(...glossify(body));
    box.append(el('h3', '', t(title)), p);
    return box;
  };
  /** F7: the card never opens by itself; a small ℹ️ pill opens it. */
  const mini = (id: InfoId, state: GameState, withMenu: boolean): void => {
    const meta = info[id];
    const pill = button('info-pill', `ℹ️ ${meta.icon} ${t(`station.${id}` as TextKey)}`, () => full(id, state, withMenu));
    const status = statusOf(id, state);
    root.replaceChildren(pill, ...(status ? [el('p', 'info-status', status)] : []));
    root.classList.add('mini');
    root.hidden = false;
  };
  const full = (id: InfoId, state: GameState, withMenu: boolean): void => {
      root.classList.remove('mini');
      const meta = info[id];
      const key = (part: string): TextKey => `sinfo.${id}.${part}` as TextKey;
      const head = el('header', 'info-head');
      head.append(el('h2', '', `${meta.icon} ${t(`station.${id}` as TextKey)}`), button('info-close', '✕', hide));
      head.lastElementChild?.setAttribute('aria-label', t('sinfo.close'));
      const body: HTMLElement[] = [head];
      const status = statusOf(id, state);
      if (status) body.push(el('p', 'info-status', status));
      body.push(section('sinfo.title.what', t(key('what'))));
      body.push(section('sinfo.title.real', t(key('real')), 'real'));
      const hazard = section('sinfo.title.hazard', t(key('hazard')), 'hazard');
      hazard.querySelector('h3')?.append(el('span', 'info-chip', t(`hazard.${meta.hazard}.name` as TextKey)));
      body.push(hazard);
      const types = id === 'lander' ? [] : (stationContent[id].actions as string[]).filter((a) => !NO_LIST.has(a));
      const list = el('div', 'info-actions');
      if (types.length === 0) list.append(el('span', 'info-none', t('sinfo.noActions')));
      for (const type of types) list.append(el('span', 'info-chip action', t(`action.${type}` as TextKey)));
      const actions = el('section', 'info-sec');
      actions.append(el('h3', '', t('sinfo.title.actions')), list);
      if (!withMenu) body.push(actions);
      root.replaceChildren(...body);
      root.hidden = false;
  };
  return {
    root,
    show(id, state, withMenu = false) {
      shown = id;
      mini(id, state, withMenu);
    },
    hide,
    current: () => shown,
  };
}
