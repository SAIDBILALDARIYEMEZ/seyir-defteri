// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The band shown while Ada waits in the shelter (F5b), with the "Go outside" button.

import { t } from '../i18n/i18n.ts';
import { button, el, fmt } from './dom.ts';

export interface ShelterBand {
  root: HTMLElement;
  /** `hours` null hides the band. */
  update(hours: number | null): void;
}

export function mountShelterBand(parent: HTMLElement, onExit: () => void): ShelterBand {
  const root = el('div', 'shelter-band');
  root.setAttribute('role', 'status');
  const text = el('span', 'shelter-text');
  const out = button('btn', '', onExit);
  root.append(text, out);
  root.hidden = true;
  parent.append(root);
  return {
    root,
    update(hours) {
      root.hidden = hours === null;
      if (hours === null) return;
      text.textContent = `🛡️ ${t('shelter.band', { n: fmt(hours) })}`;
      out.textContent = `🚪 ${t('shelter.out')}`;
    },
  };
}
