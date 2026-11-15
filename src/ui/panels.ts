// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Station name labels (the PUSULA watch moved to watch.ts in F7).

import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import { isStationLocked, stationUnlockSol } from '../sim/rules.ts';
import { buildStatus, isBuildable } from '../sim/systems/build.ts';
import type { GameState } from '../sim/state.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button, el } from './dom.ts';

export interface Labels {
  root: HTMLElement;
  refresh(state: GameState): void;
  /** Call every frame: follows the camera. */
  place(screenOf: (id: StationId) => ScreenPoint): void;
}

export function mountLabels(parent: HTMLElement, onPick: (id: StationId) => void): Labels {
  const root = el('nav', 'labels');
  const ids = Object.keys(stations) as StationId[];
  const nodes = ids.map((id) => {
    const b = button('label', '', () => onPick(id));
    root.append(b);
    return b;
  });
  parent.append(root);
  return {
    root,
    refresh(state) {
      nodes.forEach((node, i) => {
        const id = ids[i] ?? 'habitat';
        const broken = state.broken.includes(id);
        const locked = isStationLocked(state, id);
        // Build mode: an unplaced station has no label; one being built shows the sols left.
        const status = isBuildable(id) ? buildStatus(state, id) : 'ready';
        node.hidden = status === 'locked' || status === 'available';
        const building = status === 'building';
        const solsLeft = isBuildable(id) ? (state.buildings[id]?.solsLeft ?? 0) : 0;
        const name = `${locked && !building ? '🔒' : stations[id].icon} ${t(`station.${id}`)}`;
        const extra = building ? ` ${t('build.label', { n: solsLeft })}` : broken && !locked ? ` 🔧 ${t('station.needsRepair')}` : '';
        node.textContent = `${name}${extra}`;
        node.classList.toggle('broken', broken && !locked);
        node.classList.toggle('locked', locked);
        node.classList.toggle('building', building);
        node.disabled = locked;
        node.title = locked && !building ? t('station.opensOn', { n: stationUnlockSol(id) }) : '';
      });
    },
    place(screenOf) {
      // F5b: no label sits on another label or under the HUD, the camera buttons, the watch
      // or a panel. The nearest station is placed first; a label that clashes moves up, down
      // or sideways, and hides when no spot is free.
      const blocks = [...document.querySelectorAll<HTMLElement>(LABEL_BLOCKERS)]
        .filter((b) => !b.hidden && b.offsetParent !== null)
        .map((b) => b.getBoundingClientRect());
      const items = nodes
        .map((node, i) => ({ node, p: screenOf(ids[i] ?? 'habitat') }))
        .filter(({ node, p }) => {
          if (!p.visible || node.hidden) node.style.visibility = 'hidden';
          return p.visible && !node.hidden;
        })
        .sort((a, b) => (a.p.depth ?? 0) - (b.p.depth ?? 0));
      const taken: Box[] = [];
      for (const { node, p } of items) {
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        const spot = freeSpot(p.x, p.y, w, h, taken, blocks);
        if (!spot) {
          node.style.visibility = 'hidden';
          continue;
        }
        taken.push(spot);
        node.style.transform = `translate(${Math.round(spot.left)}px, ${Math.round(spot.top)}px)`;
        node.style.visibility = 'visible';
      }
    },
  };
}

/** UI that labels must not hide under. */
const LABEL_BLOCKERS = '.dash-strip, .hud-side.left, .minimap, .rank-badge, .date-badge, .cam-controls, .watch, .depot, .info-card, .action-menu, .shelter-band, .place-banner, .guide-bubble';
const LABEL_GAP = 4;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const hits = (a: Box, b: Box): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** First free box for a label centred above (x, y): as is, up, down, then clear of the UI. */
function freeSpot(x: number, y: number, w: number, h: number, taken: Box[], blocks: Box[]): Box | null {
  const box = (cx: number, bottom: number): Box => ({ left: cx - w / 2, top: bottom - h, right: cx + w / 2, bottom });
  const step = h + LABEL_GAP;
  const tries = [box(x, y), box(x, y - step), box(x, y + step), box(x, y - 2 * step)];
  // Clear of a panel by a short slide only: a label never wanders far from its station.
  for (const b of blocks) {
    if (!hits(tries[0] as Box, b)) continue;
    for (const cx of [b.right + w / 2 + LABEL_GAP, b.left - w / 2 - LABEL_GAP]) {
      if (Math.abs(cx - x) <= w) tries.push(box(cx, y));
    }
  }
  const inView = (b: Box): boolean => b.left >= 0 && b.top >= 0 && b.right <= window.innerWidth && b.bottom <= window.innerHeight;
  return tries.find((b) => inView(b) && !taken.some((o) => hits(b, o)) && !blocks.some((o) => hits(b, o))) ?? null;
}
