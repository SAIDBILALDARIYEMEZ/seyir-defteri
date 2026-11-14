// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The wrist watch's message feed (F5a, from the trial build): alerts first, then PUSULA's
// reminders, then one "Real fact" per sol. Reads the state only.

import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import { taskDone } from '../sim/systems/overdue.ts';
import type { GameState } from '../sim/state.ts';
import { isDustSol } from '../sim/systems/schedule.ts';
import { visibleWarnings } from '../sim/systems/warnings.ts';
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
  for (const w of visibleWarnings(state, win)) {
    items.push({ kind: 'alert', text: t(w.kind === 'sep' ? 'feed.sep' : 'feed.dust', { n: w.sol }) });
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
