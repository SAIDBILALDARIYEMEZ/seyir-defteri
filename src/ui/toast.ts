// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// A short note at the top of the screen ("Saved ✓"), gone after a moment (F5b).

import { el } from './dom.ts';

const TOAST_MS = 1800;

export function showToast(parent: HTMLElement, text: string): void {
  const node = el('div', 'toast', text);
  node.setAttribute('role', 'status');
  parent.append(node);
  window.setTimeout(() => node.remove(), TOAST_MS);
}
