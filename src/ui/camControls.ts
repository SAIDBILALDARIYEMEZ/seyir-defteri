// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// On-screen camera buttons (B4): turn the view left / right and reset it. Big (>= 64 px)
// so they work on a classroom smart board without a mouse wheel or a second finger.
// F5a: a compass on top shows where north is as the view turns; tapping it faces north.

import { t } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';

export interface CamControls {
  root: HTMLElement;
  refresh(): void;
  /** Call every frame: turns the compass needle with the view. */
  frame(): void;
}

interface CamHandlers {
  step(direction: 1 | -1): void;
  reset(): void;
  /** Camera turn in radians (0 = looking north). */
  azimuth(): number;
}

export function mountCamControls(ui: HTMLElement, on: CamHandlers): CamControls {
  const root = el('div', 'cam-controls');
  const compass = button('compass', '', () => on.reset());
  const dial = el('span', 'compass-dial');
  dial.append(el('span', 'compass-n', 'N'), el('span', 'compass-needle'));
  compass.append(dial);
  root.append(compass);
  const left = button('cam-btn', '↺', () => on.step(-1));
  const reset = button('cam-btn', '⌂', () => on.reset());
  const right = button('cam-btn', '↻', () => on.step(1));
  root.append(left, reset, right);
  ui.append(root);
  let shown = Number.NaN;
  const frame = (): void => {
    const az = on.azimuth();
    if (Math.abs(az - shown) < 1e-3) return;
    shown = az;
    dial.style.transform = `rotate(${az}rad)`;
  };
  const refresh = (): void => {
    for (const [b, key] of [[left, 'cam.left'], [reset, 'cam.reset'], [right, 'cam.right'], [compass, 'cam.north']] as const) {
      b.title = t(key);
      b.setAttribute('aria-label', t(key));
    }
  };
  refresh();
  return { root, refresh, frame };
}
