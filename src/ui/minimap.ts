// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F7 mini map (bottom left): the valley from above (north up), the built stations as icons, the
// rocket and Ada. Tapping a station walks Ada there; tapping the ground walks her to that spot.
// No fog. Reads the scene's positions, never the sim.

import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import { button, el } from './dom.ts';

export interface MapView {
  spots: { id: StationId; x: number; z: number }[];
  ada: [number, number];
  lander: [number, number];
}

export interface MiniMap {
  root: HTMLElement;
  /** Call every frame; it redraws a few times per second. */
  frame(read: () => MapView): void;
}

const SIZE = 150;
const REDRAW_MS = 200;
/** World units: the smallest view, and the margin around the base. */
const MIN_SPAN = 24;
const PAD = 10;

export function mountMiniMap(parent: HTMLElement, half: number, on: { station(id: StationId): void; ground(x: number, z: number): void }): MiniMap {
  const root = el('nav', 'minimap');
  root.setAttribute('aria-label', 'map');
  const field = el('div', 'mm-field');
  const icons = el('div', 'mm-icons');
  const rocket = el('span', 'mm-rocket', '🚀');
  const ada = el('span', 'mm-ada');
  field.append(icons, rocket, ada);
  root.append(field);
  parent.append(root);
  // The view fits the base (stations and rocket) with a margin, so a small base is not a dot;
  // Ada stays on the map's edge when she walks further away.
  let cx = 0;
  let cz = 0;
  let span = 2 * half;
  const fit = (view: MapView): void => {
    const xs = [...view.spots.map((p) => p.x), view.lander[0]];
    const zs = [...view.spots.map((p) => p.z), view.lander[1]];
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    cx = (x0 + x1) / 2;
    cz = (z0 + z1) / 2;
    span = Math.min(2 * half, Math.max(MIN_SPAN, x1 - x0 + PAD, z1 - z0 + PAD));
  };
  const toMap = (x: number, z: number): [number, number] => [((x - cx) / span + 0.5) * SIZE, ((z - cz) / span + 0.5) * SIZE];
  const put = (node: HTMLElement, x: number, z: number): void => {
    const [px, py] = toMap(x, z);
    const clamp = (v: number): number => Math.round(Math.max(8, Math.min(SIZE - 8, v)));
    node.style.transform = `translate(${clamp(px)}px, ${clamp(py)}px)`;
  };
  field.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.mm-station')) return;
    const r = field.getBoundingClientRect();
    const x = cx + ((e.clientX - r.left) / r.width - 0.5) * span;
    const z = cz + ((e.clientY - r.top) / r.height - 0.5) * span;
    on.ground(x, z);
  });
  const nodes = new Map<StationId, HTMLButtonElement>();
  let last = 0;
  return {
    root,
    frame(read) {
      const now = performance.now();
      if (root.hidden || now - last < REDRAW_MS) return;
      last = now;
      const view = read();
      fit(view);
      const shown = new Set<StationId>();
      for (const spot of view.spots) {
        shown.add(spot.id);
        let node = nodes.get(spot.id);
        if (!node) {
          const id = spot.id;
          node = button('mm-station', stations[id].icon, () => on.station(id));
          node.title = t(`station.${id}` as TextKey);
          node.setAttribute('aria-label', node.title);
          nodes.set(id, node);
          icons.append(node);
        }
        node.hidden = false;
        put(node, spot.x, spot.z);
      }
      for (const [id, node] of nodes) if (!shown.has(id)) node.hidden = true;
      put(rocket, ...view.lander);
      put(ada, ...view.ada);
    },
  };
}
