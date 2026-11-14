// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Main-menu cards (F5b): saved games (sol + date, load / delete), Info & Sources (every data
// set and asset, from src/content/credits.json) and Settings (language, sound, reset).

import credits from '../content/credits.json';
import { getLang, t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { SaveInfo } from '../save/save.ts';
import { button, el } from './dom.ts';
import { languagePicker } from './overlays.ts';
import type { ModalSpec } from './overlays.ts';

/** "14 Nov, 15:20" in the player's language. */
function when(iso: string): string {
  return new Date(iso).toLocaleString(getLang() === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface SavesCard {
  saves: SaveInfo[];
  codeOf(save: SaveInfo): string;
  onLoad(id: string): void;
  onDelete(id: string): void;
  close(): void;
}

export function savesSpec(card: SavesCard): ModalSpec {
  const extra = (): HTMLElement => {
    const list = el('div', 'save-list');
    if (card.saves.length === 0) list.append(el('p', 'save-empty', t('saves.empty')));
    for (const save of card.saves) {
      const row = el('div', 'save-row');
      const text = el('div', 'save-text');
      text.append(el('b', '', t('hud.sol', { n: save.sol, total: 30 })), el('small', '', `${when(save.savedAt)} · ${t('code.label')} ${card.codeOf(save)}`));
      row.append(text, button('btn primary', `▶️ ${t('saves.load')}`, () => card.onLoad(save.id)), button('btn', `🗑️ ${t('saves.delete')}`, () => card.onDelete(save.id)));
      list.append(row);
    }
    return list;
  };
  return { kind: 'menu-list', title: `📂 ${t('menu.saves')}`, lines: [], extra, buttons: [{ label: t('menu.back'), onClick: card.close, primary: true }] };
}

interface Credit {
  name: string;
  url: string;
  license: string;
  use: string;
}

function creditList(title: string, items: Credit[]): HTMLElement {
  const box = el('section', 'credit-sec');
  box.append(el('h3', '', title));
  for (const item of items) {
    const p = el('p', 'credit');
    const link = el('a', '', item.name);
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    p.append(link, el('small', '', ` · ${item.license} · ${t(item.use as TextKey)}`));
    box.append(p);
  }
  return box;
}

export function infoSpec(close: () => void): ModalSpec {
  const extra = (): HTMLElement => {
    const box = el('div', 'credits');
    box.append(creditList(t('credits.data'), credits.data), creditList(t('credits.assets'), credits.assets));
    box.append(el('p', 'credit-note', t('credits.sound')), el('p', 'credit-note', t('credits.si')));
    return box;
  };
  return { kind: 'menu-list', title: `📚 ${t('menu.info')}`, lines: [t('credits.intro')], extra, buttons: [{ label: t('menu.back'), onClick: close, primary: true }] };
}

export interface SettingsCard {
  sound: boolean;
  onSound(): void;
  /** F5c: no shake, flash or menu spin. */
  motion: boolean;
  onMotion(): void;
  /** F6: normal / large text. */
  largeText: boolean;
  onText(): void;
  onReset(): void;
  close(): void;
}

export function settingsSpec(card: SettingsCard): ModalSpec {
  return {
    kind: 'menu-list',
    title: `⚙️ ${t('menu.settings')}`,
    lines: [],
    buttons: [
      { node: languagePicker },
      { label: `${card.sound ? '🔊' : '🔇'} ${t(card.sound ? 'pause.soundOn' : 'pause.soundOff')}`, onClick: card.onSound },
      { label: `${card.motion ? '🐢' : '🎢'} ${t(card.motion ? 'settings.motionReduced' : 'settings.motionFull')}`, onClick: card.onMotion },
      { label: `🔠 ${t(card.largeText ? 'settings.textLarge' : 'settings.textNormal')}`, onClick: card.onText },
      { label: t('menu.back'), onClick: card.close, primary: true },
      { label: `♻️ ${t('pause.reset')}`, onClick: card.onReset, danger: true },
    ],
  };
}
