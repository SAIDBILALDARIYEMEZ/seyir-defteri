// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Debug panel, shown only with `?debug`. F1 adds: set gauges, trigger events, skip time.

import { onLangChange, t } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';

export interface DebugPanel {
  update(dt: number, state: GameState): void;
}

export function mountDebugPanel(root: HTMLElement, onNextSol: () => void): DebugPanel {
  const panel = document.createElement('aside');
  panel.className = 'debug-panel';
  const title = document.createElement('strong');
  const lines = document.createElement('div');
  const next = document.createElement('button');
  next.type = 'button';
  next.addEventListener('click', onNextSol);
  panel.append(title, lines, next);
  root.append(panel);

  onLangChange(() => {
    title.textContent = t('debug.title');
    next.textContent = t('debug.nextSol');
  });

  let frames = 0;
  let elapsed = 0;
  let fps = 0;

  return {
    update(dt, state) {
      frames += 1;
      elapsed += dt;
      if (elapsed >= 0.5) {
        fps = Math.round(frames / elapsed);
        frames = 0;
        elapsed = 0;
      }
      lines.textContent =
        `${t('debug.fps')}: ${fps} · ${t('debug.sol')}: ${state.sol} · ` +
        `${t('debug.hoursLeft')}: ${state.hoursLeft}`;
    },
  };
}
