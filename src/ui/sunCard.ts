// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Main-menu "Today on the Sun" card (PRD §10.1): last 7 days of NASA DONKI notifications.
// Shows the SAVED snapshot at once, then the LIVE answer if it arrives (6 s timeout, adapter).
// Offline or failing: it simply stays SAVED + date; it never blocks or breaks the menu.

import { loadSun, savedSun } from '../adapters/donki.ts';
import type { SunData } from '../adapters/donki.ts';
import { SUN_DAYS, SUN_TYPES } from '../adapters/donkiSummary.ts';
import { onLangChange, t } from '../i18n/i18n.ts';
import { el, formatDate } from './dom.ts';

const ICON = { FLR: '🌞', CME: '💨', SEP: '☢️', GST: '🧲' } as const;

export function mountSunCard(parent: HTMLElement): HTMLElement {
  const box = el('section', 'sun-card');
  const head = el('div', 'sun-head');
  const title = el('b', 'sun-title');
  const badge = el('span', 'sun-badge');
  head.append(title, badge);
  const counts = el('p', 'sun-counts');
  const latest = el('p', 'sun-latest');
  const source = el('p', 'sun-source');
  box.append(head, counts, latest, source);
  parent.append(box);
  let data: SunData = savedSun();
  const paint = (): void => {
    const s = data.summary;
    title.textContent = `☀️ ${t('sun.title')}`;
    badge.textContent = data.mode === 'live' ? t('sun.live') : t('sun.saved', { date: formatDate(s.fetchedAt.slice(0, 10)) });
    badge.className = `sun-badge ${data.mode}`;
    counts.textContent = `${t('sun.days', { n: SUN_DAYS })} ${SUN_TYPES.map((k) => `${ICON[k]} ${s.counts[k]} ${t(`sun.type.${k}`)}`).join(' · ')}`;
    latest.textContent = s.latest
      ? t('sun.latest', { what: t(`sun.type.${s.latest.type}`), date: formatDate(s.latest.time.slice(0, 10)) })
      : t('sun.quiet');
    source.textContent = t('sun.source');
  };
  paint();
  onLangChange(paint);
  void loadSun().then((next) => {
    data = next;
    paint();
  });
  return box;
}
