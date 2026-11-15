// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Wrist watch (PUSULA text + tappable task list) and the station name labels.

import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import { isStationLocked, stationUnlockSol } from '../sim/rules.ts';
import { buildStatus, isBuildable } from '../sim/systems/build.ts';
import type { GameState } from '../sim/state.ts';
import type { ScreenPoint } from '../scene/world.ts';
import { button, el } from './dom.ts';
import { sentences } from './overlays.ts';
import { glossify, setGlossText } from './glossary.ts';
import { BALANCE } from '../config/balance.ts';
import type { RescueProgress } from './rescue.ts';
import type { FeedItem } from './watchFeed.ts';

export interface WatchTask {
  /** Already translated. */
  label: string;
  onPick: () => void;
  /** Carried over from an earlier sol (F5a). */
  overdue?: boolean;
  /** Not enough power yet: the panels fill the battery as the day goes on (F5b). */
  waiting?: boolean;
}

export interface WatchView {
  text: string;
  tasks: WatchTask[];
  /** Tasks that do not fit today's daylight (F5b), already translated. */
  deferred: string[];
  /** Nothing meaningful left: the big "End the day" button and what the night brings. */
  endDay: { night: string } | null;
  rescue: RescueProgress | null;
  feed: FeedItem[];
  /** F6: particle-storm warning banner at the top of the watch, or null. */
  storm: string | null;
}

export interface Watch {
  root: HTMLElement;
  update(view: WatchView): void;
}

const FEED_ICON: Record<FeedItem['kind'], string> = { alert: '⚠️', pusula: '🧭', fact: '💡' };

/** "Today" and "Overdue" groups, at most `listMax` rows; more overdue ones as "+N overdue". */
function taskRows(tasks: WatchTask[]): HTMLElement[] {
  const max = BALANCE.overdue.listMax;
  const today = tasks.filter((x) => !x.overdue);
  const late = tasks.filter((x) => x.overdue);
  const shownToday = today.slice(0, max);
  const shownLate = late.slice(0, Math.max(0, max - shownToday.length));
  const row = (task: WatchTask): HTMLElement => {
    const b = button(`watch-task${task.overdue ? ' is-overdue' : ''}${task.waiting ? ' is-waiting' : ''}`, task.label, task.onPick);
    if (task.waiting) b.append(el('small', 'task-wait', `⚡ ${t('watch.waitPower')}`));
    return b;
  };
  const out: HTMLElement[] = [];
  if (shownToday.length > 0) out.push(el('span', 'watch-group', t('watch.today')), ...shownToday.map(row));
  if (late.length > 0) out.push(el('span', 'watch-group late', `⏰ ${t('overdue.tag')}`), ...shownLate.map(row));
  const hidden = late.length - shownLate.length;
  if (hidden > 0) out.push(el('span', 'watch-more', t('watch.moreLate', { n: hidden })));
  return out;
}

export function mountWatch(parent: HTMLElement, onPusula: () => void, onEndDay: () => void): Watch {
  const root = el('aside', 'watch');
  const title = button('watch-title', '', onPusula);
  const text = el('p', 'watch-text');
  const storm = el('p', 'watch-storm');
  storm.setAttribute('role', 'alert');
  const list = el('div', 'watch-tasks');
  const later = el('p', 'watch-later');
  const end = el('div', 'watch-end');
  const endBtn = button('btn primary big end-day', '', onEndDay);
  const endNote = el('p', 'end-note');
  end.append(endBtn, endNote);
  const chain = el('div', 'watch-rescue');
  const feedBox = el('ol', 'watch-feed');
  feedBox.setAttribute('aria-live', 'polite');
  root.append(title, storm, text, list, later, end, chain, feedBox);
  parent.append(root);
  return {
    root,
    update({ text: pusulaText, tasks, deferred, endDay, rescue, feed, storm: stormText }) {
      storm.hidden = !stormText;
      if (stormText && storm.textContent !== stormText) {
        setGlossText(storm, stormText);
        root.scrollTop = 0; // a new or changed storm warning is always in view
      }
      feedBox.hidden = feed.length === 0;
      feedBox.replaceChildren(
        ...feed.map((item) => {
          const li = el('li', `feed-item ${item.kind}`);
          if (item.kind === 'fact') li.append(el('strong', '', `💡 ${t('feed.fact')}: `));
          li.append(...glossify(item.kind === 'fact' ? item.text : `${FEED_ICON[item.kind]} ${item.text}`));
          return li;
        }),
      );
      chain.hidden = !rescue;
      if (rescue) {
        const steps = rescue.steps.map((step, i) => {
          const state = step.done ? 'done' : step.current ? 'current' : '';
          return el('span', `rescue-step ${state}`, `${step.done ? '✅' : `${i + 1}.`} ${step.label}`);
        });
        chain.replaceChildren(el('span', 'watch-sub', `🚀 ${rescue.title}`), ...steps);
        if (rescue.note) chain.append(el('span', 'rescue-note', rescue.note));
      }
      title.textContent = `🧭 ${t('watch.title')}`;
      // F7: the watch shows PUSULA's first sentence; the PUSULA card has the rest.
      setGlossText(text, sentences(pusulaText).slice(0, 1).join(' '));
      list.replaceChildren(...taskRows(tasks));
      later.hidden = deferred.length === 0;
      later.textContent = `🌙 ${t('watch.later', { list: deferred.join(', ') })}`;
      end.hidden = !endDay;
      endBtn.textContent = `🌙 ${t('watch.endDay')}`;
      endNote.textContent = endDay?.night ?? '';
    },
  };
}

export interface Labels {
  root: HTMLElement;
  refresh(state: GameState): void;
  /** Call every frame: follows the camera. */
  place(screenOf: (id: StationId) => ScreenPoint): void;
}

export function mountLabels(parent: HTMLElement, onPick: (id: StationId) => void): Labels {
  const root = el('nav', 'labels');
  const ids = Object.keys(stations) as StationId[];
  const nodes = ids.map((id) => {
    const b = button('label', '', () => onPick(id));
    root.append(b);
    return b;
  });
  parent.append(root);
  return {
    root,
    refresh(state) {
      nodes.forEach((node, i) => {
        const id = ids[i] ?? 'habitat';
        const broken = state.broken.includes(id);
        const locked = isStationLocked(state, id);
        // Build mode: an unplaced station has no label; one being built shows the sols left.
        const status = isBuildable(id) ? buildStatus(state, id) : 'ready';
        node.hidden = status === 'locked' || status === 'available';
        const building = status === 'building';
        const solsLeft = isBuildable(id) ? (state.buildings[id]?.solsLeft ?? 0) : 0;
        const name = `${locked && !building ? '🔒' : stations[id].icon} ${t(`station.${id}`)}`;
        const extra = building ? ` ${t('build.label', { n: solsLeft })}` : broken && !locked ? ` 🔧 ${t('station.needsRepair')}` : '';
        node.textContent = `${name}${extra}`;
        node.classList.toggle('broken', broken && !locked);
        node.classList.toggle('locked', locked);
        node.classList.toggle('building', building);
        node.disabled = locked;
        node.title = locked && !building ? t('station.opensOn', { n: stationUnlockSol(id) }) : '';
      });
    },
    place(screenOf) {
      // F5b: no label sits on another label or under the HUD, the camera buttons, the watch
      // or a panel. The nearest station is placed first; a label that clashes moves up, down
      // or sideways, and hides when no spot is free.
      const blocks = [...document.querySelectorAll<HTMLElement>(LABEL_BLOCKERS)]
        .filter((b) => !b.hidden && b.offsetParent !== null)
        .map((b) => b.getBoundingClientRect());
      const items = nodes
        .map((node, i) => ({ node, p: screenOf(ids[i] ?? 'habitat') }))
        .filter(({ node, p }) => {
          if (!p.visible || node.hidden) node.style.visibility = 'hidden';
          return p.visible && !node.hidden;
        })
        .sort((a, b) => (a.p.depth ?? 0) - (b.p.depth ?? 0));
      const taken: Box[] = [];
      for (const { node, p } of items) {
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        const spot = freeSpot(p.x, p.y, w, h, taken, blocks);
        if (!spot) {
          node.style.visibility = 'hidden';
          continue;
        }
        taken.push(spot);
        node.style.transform = `translate(${Math.round(spot.left)}px, ${Math.round(spot.top)}px)`;
        node.style.visibility = 'visible';
      }
    },
  };
}

/** UI that labels must not hide under. */
const LABEL_BLOCKERS = '.hud-group, .hud-chips, .chip.star, .chip.gear, .rank-badge, .date-badge, .cam-controls, .watch, .depot, .info-card, .action-menu, .shelter-band, .place-banner, .guide-bubble';
const LABEL_GAP = 4;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const hits = (a: Box, b: Box): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** First free box for a label centred above (x, y): as is, up, down, then clear of the UI. */
function freeSpot(x: number, y: number, w: number, h: number, taken: Box[], blocks: Box[]): Box | null {
  const box = (cx: number, bottom: number): Box => ({ left: cx - w / 2, top: bottom - h, right: cx + w / 2, bottom });
  const step = h + LABEL_GAP;
  const tries = [box(x, y), box(x, y - step), box(x, y + step), box(x, y - 2 * step)];
  // Clear of a panel by a short slide only: a label never wanders far from its station.
  for (const b of blocks) {
    if (!hits(tries[0] as Box, b)) continue;
    for (const cx of [b.right + w / 2 + LABEL_GAP, b.left - w / 2 - LABEL_GAP]) {
      if (Math.abs(cx - x) <= w) tries.push(box(cx, y));
    }
  }
  const inView = (b: Box): boolean => b.left >= 0 && b.top >= 0 && b.right <= window.innerWidth && b.bottom <= window.innerHeight;
  return tries.find((b) => inView(b) && !taken.some((o) => hits(b, o)) && !blocks.some((o) => hits(b, o))) ?? null;
}
