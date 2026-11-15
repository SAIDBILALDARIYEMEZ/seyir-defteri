// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F7 PUSULA character: a big friendly face (happy / worried / alarm) with a one-sentence speech
// bubble, today's tasks as small icon chips (a tap walks Ada there), the rescue plan as a
// 3-icon progress bar (📡 → 📍 → 🛬) and the particle-storm warning as one purple line.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import { button, el } from './dom.ts';
import { glossify, setGlossText } from './glossary.ts';
import { sentences } from './overlays.ts';
import { infoButton } from './pop.ts';
import type { RescueProgress } from './rescue.ts';
import type { FeedItem } from './watchFeed.ts';

export type Mood = 'happy' | 'worried' | 'alarm';

export interface WatchTask {
  /** Already translated. */
  label: string;
  /** The station's icon (F7 chips). */
  icon?: string;
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
  /** F6: particle-storm warning, or null (F7: shown as one short purple line). */
  storm: string | null;
  /** F7: PUSULA's face. */
  mood?: Mood;
}

export interface Watch {
  root: HTMLElement;
  update(view: WatchView): void;
}

const RESCUE_ICONS = ['📡', '📍', '🛬'];
const first = (text: string): string => sentences(text)[0] ?? text;

/** A drawn face (CSS shapes, no image): eyes, brows and a mouth that change with the mood. */
function face(onTap: () => void): { node: HTMLElement; set(mood: Mood): void } {
  const node = button('pusula-face happy', '', onTap);
  node.append(el('span', 'pf-antenna'), el('span', 'pf-eye l'), el('span', 'pf-eye r'), el('span', 'pf-brow l'), el('span', 'pf-brow r'), el('span', 'pf-mouth'));
  return {
    node,
    set(mood) {
      node.className = `pusula-face ${mood}`;
    },
  };
}

export function mountWatch(parent: HTMLElement, onPusula: () => void, onEndDay: () => void): Watch {
  const root = el('aside', 'watch pusula');
  const head = el('div', 'pusula-head');
  const pf = face(onPusula);
  pf.node.setAttribute('aria-label', 'PUSULA');
  const bubble = el('p', 'pusula-bubble');
  head.append(pf.node, bubble);
  const storm = el('p', 'pusula-storm');
  storm.setAttribute('role', 'alert');
  const chips = el('div', 'pusula-chips');
  const later = el('p', 'watch-later');
  const end = el('div', 'watch-end');
  const endBtn = button('btn primary big end-day', '', onEndDay);
  const endNote = el('p', 'end-note');
  end.append(endBtn, endNote);
  const rescueBar = el('div', 'pusula-rescue');
  const feedBox = el('div', 'pusula-feed');
  root.append(head, storm, chips, later, end, rescueBar, feedBox);
  parent.append(root);

  return {
    root,
    update({ text, tasks, deferred, endDay, rescue, feed, storm: stormText, mood = 'happy' }) {
      pf.set(mood);
      setGlossText(bubble, first(text));
      storm.hidden = !stormText;
      if (stormText) {
        const line = `☢️ ${first(stormText)}`;
        if (storm.textContent !== line) {
          setGlossText(storm, line);
          root.scrollTop = 0;
        }
      }
      const shown = tasks.slice(0, BALANCE.overdue.listMax);
      chips.replaceChildren(
        ...shown.map((task) => {
          const chip = button(`pusula-chip${task.overdue ? ' is-overdue' : ''}${task.waiting ? ' is-waiting' : ''}`, '', task.onPick);
          chip.append(el('span', 'chip-icon', task.icon ?? '•'), el('span', 'chip-label', task.label));
          if (task.overdue) chip.append(el('span', 'chip-tag', '⏰'));
          if (task.waiting) chip.append(el('span', 'chip-tag', '⚡'));
          chip.title = task.waiting ? `${task.label} · ${t('watch.waitPower')}` : task.label;
          return chip;
        }),
      );
      later.hidden = deferred.length === 0;
      later.textContent = `🌙 ${deferred.join(' · ')}`;
      later.title = t('watch.later', { list: deferred.join(', ') });
      end.hidden = !endDay;
      endBtn.textContent = `🌙 ${t('watch.endDay')}`;
      endNote.textContent = endDay ? first(endDay.night) : '';
      rescueBar.hidden = !rescue;
      if (rescue) {
        const steps = rescue.steps.flatMap((step, i) => {
          const node = el('span', `pr-step${step.done ? ' done' : step.current ? ' current' : ''}`, step.done ? `✅` : RESCUE_ICONS[i] ?? '•');
          node.title = step.label;
          return i === 0 ? [node] : [el('span', `pr-line${step.done || step.current ? ' on' : ''}`), node];
        });
        rescueBar.replaceChildren(el('span', 'pr-rocket', '🚀'), ...steps);
        rescueBar.title = rescue.title;
        rescueBar.setAttribute('aria-label', `${rescue.title}: ${rescue.steps.map((x) => `${x.label}${x.done ? ' ✅' : ''}`).join(', ')}`);
      }
      // Alerts as one short line each; real facts only behind 💡 (F7 text diet).
      const alerts = feed.filter((item) => item.kind !== 'fact').slice(0, 2);
      const fact = feed.find((item) => item.kind === 'fact');
      feedBox.hidden = alerts.length === 0 && !fact;
      feedBox.replaceChildren(
        ...alerts.map((item) => {
          const p = el('p', `feed-item ${item.kind}`);
          p.append(...glossify(`${item.kind === 'alert' ? '⚠️' : '🧭'} ${first(item.text)}`));
          return p;
        }),
        ...(fact ? [infoButton(() => fact.text, `💡 ${t('feed.fact')}`)] : []),
      );
    },
  };
}
