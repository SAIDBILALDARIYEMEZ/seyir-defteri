// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Small overlays: modal cards (night summary, event card, pause, result), the station action
// menu, floating numbers, station name labels and the language picker.

import { getLang, onLangChange, setLang, t } from '../i18n/i18n.ts';
import type { Lang } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';

export interface ModalSpec {
  title: string;
  /** Plain text lines, or [label, value] rows. */
  lines: (string | [string, string])[];
  buttons: { label: string; onClick: () => void; primary?: boolean }[];
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
    for (const line of spec.lines) {
      if (typeof line === 'string') card.append(el('p', '', line));
      else {
        const row = el('p', 'row');
        row.append(el('span', '', line[0]), el('b', '', line[1]));
        card.append(row);
      }
    }
    if (spec.extra) card.append(spec.extra());
    if (spec.fact) card.append(el('p', 'card-fact', spec.fact));
    if (spec.source) card.append(el('p', 'card-source', spec.source));
    if (spec.languagePicker) card.append(languagePicker());
    const actions = el('div', 'card-actions');
    for (const b of spec.buttons) actions.append(button(b.primary ? 'btn primary' : 'btn', b.label, b.onClick));
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
  open(title: string, items: MenuItem[], closeLabel: string): void;
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
    open(title, items, closeLabel) {
      root.replaceChildren(el('h2', '', title));
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
export function spawnFloater(parent: HTMLElement, x: number, y: number, text: string, delayMs: number): void {
  const node = el('span', 'floater', text);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.animationDelay = `${delayMs}ms`;
  node.addEventListener('animationend', () => node.remove());
  parent.append(node);
}
