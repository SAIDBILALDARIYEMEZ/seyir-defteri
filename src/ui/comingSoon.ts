// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F0 placeholder overlay: title, tagline, "coming soon" and the TR/EN toggle.

import { getLang, onLangChange, setLang, t } from '../i18n/i18n.ts';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function mountComingSoon(root: HTMLElement): void {
  const card = el('main', 'coming-soon');
  const title = el('h1', '');
  const tagline = el('p', 'tagline');
  const status = el('p', 'status');
  const body = el('p', 'body');
  card.append(title, tagline, status, body);

  const toggle = el('button', 'lang-toggle');
  toggle.type = 'button';
  toggle.addEventListener('click', () => setLang(getLang() === 'tr' ? 'en' : 'tr'));

  root.append(card, toggle);

  onLangChange(() => {
    document.documentElement.lang = getLang();
    document.title = t('app.title');
    title.textContent = t('app.title');
    tagline.textContent = t('app.tagline');
    status.textContent = t('comingSoon.status');
    body.textContent = t('comingSoon.body');
    toggle.textContent = t('lang.switchTo');
    toggle.setAttribute('aria-label', t('lang.switchLabel'));
  });
}
