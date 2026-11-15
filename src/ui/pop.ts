// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F7 tap pop-up: one small bubble next to what was tapped (glossary words, ℹ️ buttons, HUD
// gauges, store locks, rank badge). Any tap outside closes it. Only one is open at a time.

import { el } from './dom.ts';
import { glossify } from './glossary.ts';

let popup: HTMLElement | null = null;
let owner: HTMLElement | null = null;

export function hidePop(): void {
  popup?.remove();
  popup = null;
  owner = null;
}

document.addEventListener('pointerdown', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target?.closest('.gloss-pop, .term, .pop-anchor')) hidePop();
}, true);

/** "Title: text" as a bold title plus one plain sentence (with glossary words). */
export function popContent(title: string, text: string): Node[] {
  return [el('b', '', `${title}: `), ...glossify(text)];
}

/** Opens (or, tapped again, closes) the bubble for `anchor`. */
export function showPop(anchor: HTMLElement, content: Node[] | string): void {
  if (owner === anchor) return hidePop();
  hidePop();
  const box = el('div', 'gloss-pop');
  box.setAttribute('role', 'tooltip');
  if (typeof content === 'string') box.append(...glossify(content));
  else box.append(...content);
  document.body.append(box);
  const r = anchor.getBoundingClientRect();
  const w = box.offsetWidth;
  box.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
  const below = r.bottom + 8 + box.offsetHeight < window.innerHeight;
  box.style.top = `${below ? r.bottom + 8 : Math.max(8, r.top - box.offsetHeight - 8)}px`;
  popup = box;
  owner = anchor;
}

/** Marks a node as a pop-up anchor (taps on it do not count as "outside"). */
export function popAnchor<T extends HTMLElement>(node: T, content: () => Node[] | string): T {
  node.classList.add('pop-anchor');
  node.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPop(node, content());
  });
  return node;
}

/** A round ℹ️ button that opens `content` in the bubble. */
export function infoButton(content: () => Node[] | string, label = 'ℹ️'): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'info-btn';
  b.textContent = label;
  b.setAttribute('aria-label', 'info');
  return popAnchor(b, content);
}
