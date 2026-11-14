// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Main menu (F5b, laid out like the trial build's): Continue, New mission, Saved games,
// Info & Sources, Settings, and the class mission code. No "coming soon" buttons.

import { t } from '../i18n/i18n.ts';
import { CODE_LENGTH } from '../lib/missionCode.ts';
import { button, el } from './dom.ts';
import { mountSunCard } from './sunCard.ts';

export interface MainMenu {
  root: HTMLElement;
  refresh(): void;
}

export interface MenuHandlers {
  onContinue(): void;
  onNewMission(): void;
  onSaves(): void;
  onInfo(): void;
  onSettings(): void;
  /** Sol of the newest saved mission, or null when there is no save. */
  savedSol(): number | null;
  /** Number of saved games (the Saved games button shows it). */
  saveCount(): number;
  /** Starts the mission of a code; false when the code is not valid. */
  onCode(code: string): boolean;
  /** Plays the opening cutscene again (F5c). */
  onIntro(): void;
}

export function mountMainMenu(parent: HTMLElement, on: MenuHandlers): MainMenu {
  const root = el('main', 'main-menu');
  const card = el('div', 'menu-card');
  const kicker = el('p', 'menu-kicker');
  const title = el('h1');
  const tagline = el('p', 'tagline');
  const list = el('div', 'menu-buttons');
  const resume = button('btn primary big', '', on.onContinue);
  const start = button('btn big', '', on.onNewMission);
  const saves = button('btn', '', on.onSaves);
  const info = button('btn', '', on.onInfo);
  const settings = button('btn', '', on.onSettings);
  const intro = button('btn', '', on.onIntro);
  list.append(resume, start, saves, intro, info, settings);
  const codeRow = el('form', 'code-row');
  const input = el('input', 'code-input');
  input.maxLength = CODE_LENGTH;
  input.autocomplete = 'off';
  input.spellcheck = false;
  const go = el('button', 'btn');
  go.type = 'submit';
  const error = el('p', 'code-error');
  const toggle = button('btn link', '', () => {
    codeRow.hidden = !codeRow.hidden;
    if (!codeRow.hidden) input.focus();
  });
  codeRow.hidden = true;
  codeRow.append(input, go);
  codeRow.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = on.onCode(input.value);
    error.hidden = ok;
    if (ok) {
      input.value = '';
      codeRow.hidden = true;
    }
  });
  error.hidden = true;
  card.append(kicker, title, tagline, list, toggle, codeRow, error);
  mountSunCard(card); // F6: live "Today on the Sun" (PRD §10.1)
  root.append(card);
  parent.append(root);
  return {
    root,
    refresh() {
      const sol = on.savedSol();
      const count = on.saveCount();
      kicker.textContent = t('menu.kicker');
      title.textContent = t('app.title');
      tagline.textContent = t('app.tagline');
      resume.hidden = sol === null;
      resume.textContent = `▶️ ${t('menu.continue', { n: sol ?? 1 })}`;
      start.textContent = `🚀 ${t('menu.newMission')}`;
      start.classList.toggle('primary', sol === null);
      saves.textContent = `📂 ${t('menu.saves')}${count > 0 ? ` (${count})` : ''}`;
      saves.disabled = count === 0;
      info.textContent = `📚 ${t('menu.info')}`;
      settings.textContent = `⚙️ ${t('menu.settings')}`;
      intro.textContent = `🎬 ${t('menu.intro')}`;
      toggle.textContent = `🔑 ${t('menu.enterCode')}`;
      input.placeholder = t('code.placeholder');
      input.setAttribute('aria-label', t('menu.enterCode'));
      go.textContent = t('code.start');
      error.textContent = t('code.invalid');
    },
  };
}
