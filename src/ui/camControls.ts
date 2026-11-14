// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// On-screen camera buttons (B4): turn the view left / right and reset it. Big (>= 64 px)
// so they work on a classroom smart board without a mouse wheel or a second finger.

import { t } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';

export interface CamControls {
  root: HTMLElement;
  refresh(): void;
}

export function mountCamControls(ui: HTMLElement, on: { step(direction: 1 | -1): void; reset(): void }): CamControls {
  const root = el('div', 'cam-controls');
  const left = button('cam-btn', '↺', () => on.step(-1));
  const reset = button('cam-btn', '⌂', () => on.reset());
  const right = button('cam-btn', '↻', () => on.step(1));
  root.append(left, reset, right);
  ui.append(root);
  const refresh = (): void => {
    for (const [b, key] of [[left, 'cam.left'], [reset, 'cam.reset'], [right, 'cam.right']] as const) {
      b.title = t(key);
      b.setAttribute('aria-label', t(key));
    }
  };
  refresh();
  return { root, refresh };
}
