// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Small DOM helpers shared by the UI modules.

import { getLang } from '../i18n/i18n.ts';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

/** "20 May 2024" / "20 Mayıs 2024" from an ISO date (UTC). */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(getLang() === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

/** One decimal at most: 8, 8.5. */
export const fmt = (n: number): string => (Math.round(n * 10) / 10).toString();
