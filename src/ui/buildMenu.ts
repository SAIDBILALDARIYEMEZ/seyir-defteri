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
import { popContent, showPop } from './pop.ts';

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
    // F7: an icon tile: big icon, icon metrics under it, a corner badge. No text; the name is
    // the tooltip / screen-reader label, and a locked tile explains itself in a tap pop-up.
    const card = el('button', 'depot-card tile');
    card.type = 'button';
    const icon = el('span', 'depot-icon', stations[id].icon);
    const cost = el('span', 'depot-cost');
    const badge = el('span', 'depot-badge');
    card.append(icon, cost, badge);
    let why: string | null = null;
    card.addEventListener('pointerdown', (e) => {
      if (card.classList.contains('usable')) on.onPress(id, e);
    });
    card.addEventListener('click', (e) => {
      if (!card.classList.contains('usable')) {
        if (why) showPop(card, popContent(`${stations[id].icon} ${t(`station.${id}`)}`, why));
        return;
      }
      // Mouse and touch go through onPress; this is the keyboard path (Enter / Space).
      if (e.detail === 0) on.onSelect(id);
    });
    card.classList.add('pop-anchor');
    list.append(card);
    return { id, card, cost, badge, setWhy: (text: string | null) => (why = text) };
  });

  return {
    root,
    update(state, selected, hint) {
      title.textContent = `📦 🔩 ${state.parts}`;
      title.title = t('build.title');
      const ready = setupDone(state);
      for (const { id, card, cost, badge, setWhy } of cards) {
        const name = t(`station.${id}`);
        if (isStarter(id)) {
          const waiting = !state.buildings[id];
          card.hidden = !waiting;
          cost.textContent = '🎁';
          badge.textContent = '';
          card.className = `depot-card tile available starter pop-anchor${waiting ? ' usable' : ''}`;
          card.classList.toggle('selected', selected === id);
          card.classList.toggle('hint', hint === id && waiting);
          card.title = `${name} · ${t('build.free')}`;
          card.setAttribute('aria-label', card.title);
          setWhy(null);
          continue;
        }
        const rule = BALANCE.build.stations[id];
        const st = buildStatus(state, id);
        const b = state.buildings[id];
        cost.replaceChildren(
          el('span', state.parts < rule.parts && st === 'available' ? 'short' : '', `🔩${rule.parts}`),
          el('span', '', `⏱${t('build.solsShort', { n: rule.sols })}`),
          el('span', '', `⚡−${rule.power}`),
        );
        const reason = ready ? lockReason(state, id) : 'needSetup';
        const noParts = st === 'available' && state.parts < rule.parts;
        const locked = !ready || (st === 'locked' && reason !== null);
        badge.textContent = locked ? '🔒' : st === 'building' ? `⏳${b?.solsLeft ?? 0}` : st === 'ready' ? '✅' : noParts ? '🔩' : '';
        const whyText = locked ? t(`reason.${reason ?? 'needSetup'}`)
          : st === 'building' ? t('build.building', { n: b?.solsLeft ?? 0 })
          : st === 'ready' ? t('build.ready')
          : noParts ? t('reason.noParts')
          : null;
        setWhy(whyText);
        const usable = ready && st === 'available' && !noParts;
        card.className = `depot-card tile pop-anchor ${st}${locked ? ' locked' : ''}${usable ? ' usable' : ''}`;
        card.classList.toggle('selected', selected === id);
        card.classList.toggle('hint', hint === id && usable);
        card.setAttribute('aria-disabled', String(!usable));
        card.setAttribute('aria-pressed', String(selected === id));
        card.title = name;
        card.setAttribute('aria-label', whyText ? `${name}: ${whyText}` : name);
      }
    },
  };
}
