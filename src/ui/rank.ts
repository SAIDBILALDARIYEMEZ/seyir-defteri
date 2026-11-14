// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Rank badge + XP bar under the HUD, and the short "+XP" toast (B3 learning layer).

import { PROGRESSION } from '../config/progression.ts';
import { t } from '../i18n/i18n.ts';
import { rankOf, rankProgress } from '../profile/profile.ts';
import { el } from './dom.ts';

const RANK_ICONS = ['🎗️', '🥉', '🥈', '🥇', '🏆'];

export interface RankBadge {
  root: HTMLElement;
  update(xp: number): void;
  toast(text: string, big?: boolean): void;
}

export function rankLabel(xp: number): string {
  const r = rankOf(xp);
  return `${RANK_ICONS[r.index] ?? '🎗️'} ${t(`rank.${r.id}`)}`;
}

export function mountRank(parent: HTMLElement): RankBadge {
  const root = el('div', 'rank-badge');
  const name = el('b', 'rank-name');
  const bar = el('span', 'xp-bar');
  const fill = el('span', 'xp-fill');
  const note = el('small', 'xp-note');
  bar.append(fill);
  root.append(name, bar, note);
  const toasts = el('div', 'xp-toasts');
  toasts.setAttribute('aria-live', 'polite');
  parent.append(root, toasts);
  return {
    root,
    update(xp) {
      const r = rankOf(xp);
      name.textContent = rankLabel(xp);
      fill.style.width = `${Math.round(rankProgress(xp) * 100)}%`;
      const nextRank = PROGRESSION.ranks[r.index + 1];
      note.textContent = r.next === null || !nextRank
        ? `${xp} XP · ${t('xp.top')}`
        : `${xp} XP · ${t('xp.next', { n: r.next - xp, rank: t(`rank.${nextRank.id}`) })}`;
    },
    toast(text, big = false) {
      const node = el('div', `xp-toast${big ? ' big' : ''}`, text);
      toasts.append(node);
      window.setTimeout(() => node.remove(), PROGRESSION.toastMs * (big ? 2 : 1));
    },
  };
}
