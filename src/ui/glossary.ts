// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Glossary (F5b): space words in a text get a dotted underline; a tap shows a one-sentence
// explanation (i18n `gloss.<id>`). The word list is data: src/content/glossary.json.

import terms from '../content/glossary.json';
import { getLang, t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import { el } from './dom.ts';

interface Term {
  id: string;
  /** Case-sensitive (RAD, MOXIE, Curiosity). */
  cs: boolean;
  en: string[];
  tr: string[];
}
const TERMS: Term[] = terms;

let cache: { lang: string; re: RegExp; exact: (RegExp | null)[] } | null = null;

const wordsOf = (term: Term): string => (getLang() === 'tr' ? term.tr : term.en).join('|');

/**
 * One case-insensitive expression for the current language (group n+1 is term n), plus an
 * exact-case check for the case-sensitive terms ("RAD", not "rad").
 */
function pattern(): { re: RegExp; exact: (RegExp | null)[] } {
  const lang = getLang();
  if (cache?.lang === lang) return cache;
  const groups = TERMS.map((term) => `(${wordsOf(term)})`);
  const re = new RegExp(`(?<![\\p{L}\\d])(?:${groups.join('|')})(?![\\p{L}\\d])`, 'giu');
  const exact = TERMS.map((term) => (term.cs ? new RegExp(`^(?:${wordsOf(term)})$`, 'u') : null));
  cache = { lang, re, exact };
  return cache;
}

let popup: HTMLElement | null = null;

function hidePopup(): void {
  popup?.remove();
  popup = null;
}

function showPopup(anchor: HTMLElement, id: string): void {
  hidePopup();
  const box = el('div', 'gloss-pop');
  box.setAttribute('role', 'tooltip');
  box.append(el('b', '', anchor.textContent ?? ''), document.createTextNode(` ${t(`gloss.${id}` as TextKey)}`));
  document.body.append(box);
  const r = anchor.getBoundingClientRect();
  const w = box.offsetWidth;
  box.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
  const below = r.bottom + 8 + box.offsetHeight < window.innerHeight;
  box.style.top = `${below ? r.bottom + 8 : r.top - box.offsetHeight - 8}px`;
  popup = box;
}

document.addEventListener('pointerdown', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target?.closest('.gloss-pop, .term')) hidePopup();
}, true);

/** A tappable glossary word (a span, so it also works inside buttons and labels). */
function termNode(word: string, id: string): HTMLElement {
  const node = el('span', 'term', word);
  node.tabIndex = 0;
  node.setAttribute('role', 'button');
  const open = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    if (popup && popup.dataset.for === id) return hidePopup();
    showPopup(node, id);
    if (popup) popup.dataset.for = id;
  };
  node.addEventListener('click', open);
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') open(e);
  });
  return node;
}

/** Text with its glossary words marked (the first time each word appears). */
export function glossify(text: string): Node[] {
  const { re, exact } = pattern();
  re.lastIndex = 0;
  const out: Node[] = [];
  const used = new Set<string>();
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const index = m.slice(1).findIndex((g) => g !== undefined);
    const term = TERMS[index];
    if (!term || used.has(term.id) || exact[index]?.test(m[0]) === false) continue;
    used.add(term.id);
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    out.push(termNode(m[0], term.id));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

/** Fills `node` with glossified text. */
export function setGlossText(node: HTMLElement, text: string): void {
  node.replaceChildren(...glossify(text));
}
