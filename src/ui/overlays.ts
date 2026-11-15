// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Small overlays: modal cards (night summary, event card, pause, result), the station action
// menu, floating numbers, station name labels and the language picker.

import { getLang, onLangChange, setLang, t } from '../i18n/i18n.ts';
import type { Lang } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';
import { glossify } from './glossary.ts';
import { infoButton } from './pop.ts';

/** A card button, or a custom node in the button list (e.g. the language picker). */
export type ModalButton = { label: string; onClick: () => void; primary?: boolean; danger?: boolean } | { node: () => HTMLElement };

export interface ModalSpec {
  title: string;
  /** Plain text lines, or [label, value] rows ([label, ''] = a section heading). */
  lines: (string | [string, string])[];
  buttons: ModalButton[];
  /** Show every sentence (no "More ▾" fold): logbooks, results, quiz cards. */
  full?: boolean;
  /** Real-world date badge under the title. */
  date?: string;
  /** One-sentence real fact, shown in a highlighted box. */
  fact?: string;
  /** Source tag (where the fact or number comes from). */
  source?: string;
  /** Extra content such as a chart, placed after the lines. */
  extra?: () => HTMLElement;
  /** Adds the language picker (pause / settings). */
  languagePicker?: boolean;
  kind?: string;
}

export function languagePicker(): HTMLElement {
  const row = el('div', 'lang-row');
  const label = el('span', 'lang-label');
  const langs: Lang[] = ['en', 'tr'];
  const buttons = langs.map((lang) => button('lang-btn', '', () => setLang(lang)));
  row.append(label, ...buttons);
  const paint = (): void => {
    label.textContent = t('menu.language');
    buttons.forEach((b, i) => {
      const lang = langs[i] ?? 'en';
      b.textContent = t(`lang.${lang}`);
      b.setAttribute('aria-pressed', String(getLang() === lang));
    });
  };
  const off = onLangChange(() => (row.isConnected || label.textContent === '' ? paint() : off()));
  return row;
}

/** F5b: cards lead with at most two short sentences; the rest folds under "More ▾". */
const LEAD_SENTENCES = 1;
/** Card kinds that always show everything (lists, charts, results, quiz). */
const FULL_KINDS = ['logbook', 'result', 'data', 'quiz', 'pick', 'menu-list'];

export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+(?=\S)/u).filter((x) => x.length > 0);
}

function para(text: string, className = ''): HTMLElement {
  const p = el('p', className);
  p.append(...glossify(text));
  return p;
}

/** Card body: rows stay where they are; plain text past the first two sentences folds. */
const isFull = (spec: ModalSpec): boolean => spec.full === true || FULL_KINDS.some((k) => (spec.kind ?? '').split(' ').includes(k));

function body(spec: ModalSpec): HTMLElement[] {
  const full = isFull(spec);
  const out: HTMLElement[] = [];
  const more: string[] = [];
  let budget = full ? Number.POSITIVE_INFINITY : LEAD_SENTENCES;
  for (const line of spec.lines) {
    if (typeof line !== 'string') {
      // A row with an empty value is a section heading (F6 night card).
      const row = el('p', line[1] === '' ? 'row head' : 'row');
      row.append(el('span', '', line[0]), el('b', '', line[1]));
      out.push(row);
      continue;
    }
    const parts = sentences(line);
    if (parts.length <= budget) {
      out.push(para(line));
      budget -= parts.length;
    } else {
      if (budget > 0) out.push(para(parts.slice(0, budget).join(' ')));
      more.push(parts.slice(Math.max(0, budget)).join(' '));
      budget = 0;
    }
  }
  // F7: the real-life fact joins the details behind the one ℹ️ button.
  if (spec.fact && !full) more.push(spec.fact);
  if (more.length > 0) out.push(moreBox(more));
  return out;
}

/** F7: the details of a card stay closed; the ℹ️ button opens them in a tap pop-up. */
export function moreBox(lines: string[]): HTMLElement {
  const row = el('div', 'more-row');
  row.append(infoButton(() => lines.flatMap((line, i) => [...(i ? [el('br')] : []), ...glossify(line)]), `ℹ️ ${t('more.show')}`));
  return row;
}

/** Opens a modal card. `build` is re-run when the language changes. Returns close(). */
export function openModal(parent: HTMLElement, build: () => ModalSpec): () => void {
  const backdrop = el('div', 'backdrop');
  const card = el('section', 'card');
  card.setAttribute('role', 'dialog');
  backdrop.append(card);
  parent.append(backdrop);
  const off = onLangChange(() => {
    const spec = build();
    card.className = `card ${spec.kind ?? ''}`;
    card.replaceChildren(el('h2', '', spec.title));
    if (spec.date) card.append(el('span', 'card-date', spec.date));
    card.append(...body(spec));
    if (spec.extra) card.append(spec.extra());
    // F7: the real-life fact is behind ℹ️ unless the card shows everything.
    if (spec.fact && isFull(spec)) card.append(para(spec.fact, 'card-fact'));
    if (spec.source) card.append(el('p', 'card-source', spec.source));
    if (spec.languagePicker) card.append(languagePicker());
    const actions = el('div', 'card-actions');
    for (const b of spec.buttons) {
      if ('node' in b) actions.append(b.node());
      else actions.append(button(`btn${b.primary ? ' primary' : ''}${b.danger ? ' danger' : ''}`, b.label, b.onClick));
    }
    card.append(actions);
  });
  return () => {
    off();
    backdrop.remove();
  };
}

export interface MenuItem {
  label: string;
  cost: string;
  /** Translated reason when the action is disabled, else null. */
  reason: string | null;
  /** Tutorial: this is the action PUSULA asks for. */
  hint?: boolean;
  onPick: () => void;
}

export interface ActionMenu {
  /** `note`: one optional line under the title (F6 rocket piece). */
  open(title: string, items: MenuItem[], closeLabel: string, note?: string): void;
  close(): void;
  isOpen(): boolean;
}

export function mountActionMenu(parent: HTMLElement): ActionMenu {
  const root = el('section', 'action-menu');
  root.hidden = true;
  parent.append(root);
  const close = (): void => {
    root.hidden = true;
  };
  return {
    open(title, items, closeLabel, note) {
      root.replaceChildren(el('h2', '', title));
      if (note) root.append(el('p', 'action-note', note));
      for (const item of items) {
        const b = button(item.hint ? 'action hint' : 'action', '', item.onPick);
        b.disabled = item.reason !== null;
        const top = el('span', 'action-top');
        top.append(el('span', 'action-label', item.label), el('span', 'action-cost', item.cost));
        b.append(top);
        if (item.reason) b.append(el('span', 'action-reason', item.reason));
        root.append(b);
      }
      root.append(button('btn', closeLabel, close));
      root.hidden = false;
    },
    close,
    isOpen: () => !root.hidden,
  };
}

/** A number that floats up from a screen point and fades (CSS animation). */
export function spawnFloater(parent: HTMLElement, x: number, y: number, text: string, delayMs: number, kind = ''): void {
  const node = el('span', kind ? `floater ${kind}` : 'floater', text);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.animationDelay = `${delayMs}ms`;
  node.addEventListener('animationend', () => node.remove());
  parent.append(node);
}
