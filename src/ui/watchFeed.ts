// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The wrist watch's message feed (F5a, from the trial build): alerts first, then PUSULA's
// reminders, then one "Real fact" per sol. Reads the state only.

import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import { taskDone } from '../sim/systems/overdue.ts';
import type { GameState } from '../sim/state.ts';
import { isDustSol } from '../sim/systems/schedule.ts';
import { isEventNow } from '../sim/systems/time.ts';
import { sepWarnedToday, visibleWarnings } from '../sim/systems/warnings.ts';
import type { WindowData } from '../sim/window.ts';

export interface FeedItem {
  kind: 'alert' | 'pusula' | 'fact';
  text: string;
}

/** Real-life facts of the station cards, one per sol in turn. */
const FACTS = ['moxie', 'panels', 'antenna', 'greenhouse', 'curiosity', 'shelter', 'science', 'beacon', 'habitat', 'lander'];
const MAX_ITEMS = 3;

export function feedOf(state: GameState, win: WindowData): FeedItem[] {
  const items: FeedItem[] = [];
  if (isDustSol(state.schedule, state.sol)) items.push({ kind: 'alert', text: t('feed.dustNow') });
  // Particle-storm warnings have their own banner at the top of the watch (stormBanner).
  for (const w of visibleWarnings(state, win).filter((x) => x.kind === 'dust')) {
    items.push({ kind: 'alert', text: t('feed.dust', { n: w.sol }) });
  }
  if (state.broken.length > 0) items.push({ kind: 'alert', text: t('feed.broken', { n: state.broken.length }) });
  // Only the overdue tasks still undone today.
  const late = state.overdue.filter((task) => !taskDone(state, task)).length;
  if (late > 0) items.push({ kind: 'pusula', text: t('feed.overdue', { n: late }) });
  const fact = FACTS[state.sol % FACTS.length] ?? 'moxie';
  items.push({ kind: 'fact', text: t(`sinfo.${fact}.real` as TextKey) });
  // Alerts never drop out; the fact makes way when the feed is full.
  return items.length > MAX_ITEMS ? [...items.slice(0, MAX_ITEMS - 1), ...items.slice(-1)].slice(0, MAX_ITEMS) : items;
}

/**
 * F6: the particle-storm warning at the top of the watch, from the warning day to the storm day:
 * when it comes and what to do (outside work before it, the shelter while it is on). Only what
 * the crew can see today (warnings + the current reading), never the future of the curve.
 */
export function stormBanner(state: GameState, win: WindowData): string | null {
  if (state.phase !== 'playing') return null;
  if (isEventNow(state, win) || sepWarnedToday(state, win)) return t('storm.banner.today');
  const next = visibleWarnings(state, win).find((w) => w.kind === 'sep' && w.sol > state.sol);
  if (!next) return null;
  const n = next.sol - state.sol;
  return t(n === 1 ? 'storm.banner.tomorrow' : 'storm.banner.ahead', { n, sol: next.sol });
}
