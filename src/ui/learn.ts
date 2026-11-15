// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Learning-layer cards (B3): PUSULA's knowledge capsule, the recall question (3 big buttons,
// no timer, no keyboard, "Skip"), the 5-hazards table and the storm picker.

import concepts from '../content/concepts.json';
import hazards from '../content/hazards.json';
import stations from '../content/stations.json';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { StationId } from '../sim/actions.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { button, el, formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';
import { popAnchor } from './pop.ts';

export type Concept = (typeof concepts)[number];
export const CONCEPTS: readonly Concept[] = concepts;
const key = (id: string, part: string): TextKey => `concept.${id}.${part}` as TextKey;

export function conceptsFor(station: StationId | null): string[] {
  return CONCEPTS.filter((c) => station === null || c.stations.includes(station)).map((c) => c.id);
}

export function capsuleSpec(id: string, close: () => void): ModalSpec {
  const c = CONCEPTS.find((x) => x.id === id);
  return {
    kind: 'event learn',
    title: `${c?.icon ?? '🧭'} ${t('learn.capsule')}: ${t(key(id, 'title'))}`,
    lines: [t(key(id, 'capsule'))],
    buttons: [{ label: t('learn.ok'), onClick: close, primary: true }],
  };
}

/** Recall question. `onAnswer(correct)` gives the XP; the card then shows the answer. */
export function quizSpec(id: string, xp: number, onAnswer: (correct: boolean) => void, close: () => void): ModalSpec {
  const c = CONCEPTS.find((x) => x.id === id);
  const answer = c?.answer ?? 0;
  return {
    kind: 'event learn quiz',
    title: `${c?.icon ?? '🧭'} ${t('learn.quiz')}`,
    lines: [t(key(id, 'question'))],
    extra: () => {
      const box = el('div', 'quiz');
      const options = el('div', 'quiz-options');
      const foot = el('div', 'quiz-foot');
      const skip = button('btn big', t('learn.skip'), close);
      foot.append(skip);
      [0, 1, 2].forEach((i) => {
        const b = button('btn quiz-option', t(key(id, `o${i}`)), () => {
          const correct = i === answer;
          onAnswer(correct);
          options.querySelectorAll('button').forEach((node, j) => {
            node.disabled = true;
            node.classList.toggle('right', j === answer);
            node.classList.toggle('wrong', j === i && !correct);
          });
          const verdict = correct ? t('learn.right', { n: xp }) : t('learn.wrong', { answer: t(key(id, `o${answer}`)) });
          box.insertBefore(el('p', `quiz-verdict ${correct ? 'right' : 'wrong'}`, verdict), foot);
          box.insertBefore(el('p', 'card-fact', t(key(id, 'explain'))), foot);
          foot.replaceChildren(button('btn primary big', t('learn.continue'), close));
        });
        options.append(b);
      });
      box.append(options, foot);
      return box;
    },
    buttons: [],
  };
}

/** The NASA "5 hazards of human spaceflight" with the station that teaches each one. */
export function hazardTable(): HTMLElement {
  const box = el('div', 'hazards');
  box.append(el('h3', '', `🛰️ ${t('hazard.title')}`));
  const table = el('table', 'hazard-table');
  const head = el('tr');
  head.append(el('th', '', t('hazard.col.hazard')), el('th', '', t('hazard.col.station')));
  table.append(head);
  for (const h of hazards) {
    const row = el('tr');
    const name = el('td');
    name.append(el('b', '', `${h.icon} ${t(`hazard.${h.id}.name` as TextKey)}`), el('small', '', t(`hazard.${h.id}.what` as TextKey)));
    const where = h.stations.length
      ? h.stations.map((s) => `${stations[s as StationId].icon} ${t(`station.${s}` as TextKey)}`).join(', ')
      : t('hazard.whole');
    row.append(name, el('td', '', where));
    table.append(row);
  }
  box.append(table, el('p', 'card-source', t('hazard.source')));
  return box;
}

/** One-line hazard for a store card, or null. */
export function hazardOf(station: StationId): string | null {
  const h = hazards.find((x) => x.stations.includes(station));
  return h ? t('build.teaches', { hazard: t(`hazard.${h.id}.name` as TextKey) }) : null;
}

/** Storm picker (unlocked after the first win): one big button per real month. */
export function pickStormSpec(windows: WindowData[], onPick: (win: WindowData) => void, close: () => void, locked = false): ModalSpec {
  return {
    kind: 'event pick',
    title: `🌩️ ${t('pick.title')}`,
    lines: [t(locked ? 'pick.locked' : 'pick.body')],
    extra: () => {
      const list = el('div', 'pick-list');
      windows.forEach((win, i) => {
        // F7: before the first win the three storms show locked; a tap says why.
        const b = locked
          ? popAnchor(button('btn pick-option locked', '', () => undefined), () => t('pick.lockedTap'))
          : button('btn pick-option', '', () => { close(); onPick(win); });
        b.append(el('b', '', `${locked ? '🔒 ' : ''}${i + 1}. ${formatDate(dateOfSol(win, 1))}`), el('span', '', t(`pick.${win.id}` as TextKey)));
        list.append(b);
      });
      return list;
    },
    buttons: [{ label: t('pause.confirm.no'), onClick: close }],
  };
}
