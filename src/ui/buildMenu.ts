// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The store ("depot") on the right: one card per buildable station with its parts cost,
// build time and status. On sol 1 the habitat and the panels wait here first (free, B3). Locked cards are grey and show the sim's reason. Drag a card onto
// the ground, or tap it and then tap a spot.

import { BALANCE } from '../config/balance.ts';
import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { PlacedId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { PLACEABLES, buildStatus, isStarter, lockReason, setupDone } from '../sim/systems/build.ts';
import { el } from './dom.ts';

export interface BuildMenu {
  root: HTMLElement;
  /** `selected`: card in placement mode. `hint`: card PUSULA points at. */
  update(state: GameState, selected: PlacedId | null, hint: PlacedId | null): void;
}

export interface BuildMenuHandlers {
  /** Pointer pressed on an available card: placement decides between drag and tap. */
  onPress(id: PlacedId, e: PointerEvent): void;
  /** Keyboard activation of an available card. */
  onSelect(id: PlacedId): void;
}

export function mountBuildMenu(parent: HTMLElement, on: BuildMenuHandlers): BuildMenu {
  const root = el('aside', 'depot');
  const title = el('h2', 'depot-title');
  const list = el('div', 'depot-list');
  root.append(title, list);
  parent.append(root);
  const cards = PLACEABLES.map((id) => {
    const card = el('button', 'depot-card');
    card.type = 'button';
    const name = el('span', 'depot-name');
    const cost = el('span', 'depot-cost');
    const status = el('span', 'depot-status');
    const meta = el('span', 'depot-meta');
    meta.append(cost, status);
    card.append(name, meta);
    card.addEventListener('pointerdown', (e) => {
      if (card.classList.contains('usable')) on.onPress(id, e);
    });
    card.addEventListener('click', (e) => {
      // Mouse and touch go through onPress; this is the keyboard path (Enter / Space).
      if (e.detail === 0 && card.classList.contains('usable')) on.onSelect(id);
    });
    list.append(card);
    return { id, card, name, cost, status };
  });

  return {
    root,
    update(state, selected, hint) {
      title.textContent = `📦 ${t('build.title')} · 🔩 ${state.parts}`;
      const ready = setupDone(state);
      for (const { id, card, name, cost, status } of cards) {
        if (isStarter(id)) {
          const waiting = !state.buildings[id];
          card.hidden = !waiting;
          name.textContent = `${stations[id].icon} ${t(`station.${id}`)}`;
          cost.textContent = `🎁 ${t('build.free')}`;
          status.textContent = `${t('build.waiting')} · ${t('build.drag')}`;
          card.className = `depot-card available starter${waiting ? ' usable' : ''}`;
          card.classList.toggle('selected', selected === id);
          card.classList.toggle('hint', hint === id && waiting);
          card.disabled = !waiting;
          continue;
        }
        const rule = BALANCE.build.stations[id];
        const st = buildStatus(state, id);
        const b = state.buildings[id];
        name.textContent = `${st === 'locked' || !ready ? '🔒' : stations[id].icon} ${t(`station.${id}`)}`;
        cost.textContent = `🔩${rule.parts} · ${t('build.sols', { n: rule.sols })}`;
        const reason = ready ? lockReason(state, id) : 'needSetup';
        const noParts = st === 'available' && state.parts < rule.parts;
        status.textContent =
          !ready || (st === 'locked' && reason) ? t(`reason.${reason ?? 'needSetup'}`)
          : st === 'building' ? t('build.building', { n: b?.solsLeft ?? 0 })
          : st === 'ready' ? `✅ ${t('build.ready')}`
          : noParts ? t('reason.noParts')
          : t('build.drag');
        const usable = ready && st === 'available' && !noParts;
        card.className = `depot-card ${st}${usable ? ' usable' : ''}`;
        card.classList.toggle('selected', selected === id);
        card.classList.toggle('hint', hint === id && usable);
        card.disabled = !usable;
        card.setAttribute('aria-pressed', String(selected === id));
      }
    },
  };
}
