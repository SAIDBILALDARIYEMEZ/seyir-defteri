// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Rank badge + XP bar under the HUD, and the short "+XP" toast (B3 learning layer).

import { PROGRESSION } from '../config/progression.ts';
import { t } from '../i18n/i18n.ts';
import { rankOf, rankProgress } from '../profile/profile.ts';
import { el } from './dom.ts';
import { popAnchor, popContent } from './pop.ts';

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
  // F7: an astronaut head + rank stars + XP bar; a tap explains XP and rank in one sentence.
  const root = el('button', 'rank-badge');
  const head = el('span', 'rank-head', '👩‍🚀');
  const stars = el('span', 'rank-stars');
  const name = el('b', 'rank-name');
  const bar = el('span', 'xp-bar');
  const fill = el('span', 'xp-fill');
  const note = el('small', 'xp-note');
  bar.append(fill);
  const side = el('span', 'rank-side');
  side.append(stars, bar);
  root.append(head, side);
  let lastXp = 0;
  popAnchor(root, () => [
    ...popContent(rankLabel(lastXp), t('rank.pop')),
    el('br'),
    el('small', '', note.textContent ?? ''),
  ]);
  const toasts = el('div', 'xp-toasts');
  toasts.setAttribute('aria-live', 'polite');
  parent.append(root, toasts);
  return {
    root,
    update(xp) {
      lastXp = xp;
      const r = rankOf(xp);
      name.textContent = rankLabel(xp);
      const total = PROGRESSION.ranks.length;
      stars.textContent = '★'.repeat(r.index + 1) + '☆'.repeat(Math.max(0, total - r.index - 1));
      root.setAttribute('aria-label', `${rankLabel(xp)} · ${xp} XP`);
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
