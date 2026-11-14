// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Result screen (PRD §12): grade, what happened and why, the decision that made a difference,
// "What we learned", the "Real data from your game" card and the mission code.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import { RESCUE_DONE } from '../sim/state.ts';
import type { GameState, SolLog } from '../sim/state.ts';
import { whatIfSolDose } from '../sim/systems/time.ts';
import { dateOfSol, rateAt } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { sourceTag, svg } from './cards.ts';
import { el, fmt, formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';
import { legendScience } from '../sim/systems/night.ts';

const share = (points: number): string => fmt((points / BALANCE.dose.budget) * 100);
const ICON = { legend: '🏆', success: '🚀', hardRescue: '🛟', evacuation: '🧳' } as const;
const DOSE_NOTE_MIN = 0.5;
const LEARNED_COUNT = 3;
const CHART = { w: 360, h: 96, pad: 6, base: 80 };

export function resultTitle(state: GameState): string {
  const result = state.result ?? 'evacuation';
  return `${ICON[result]} ${t(`result.${result}`)}`;
}

const count = (log: SolLog[], action: string): number => log.filter((l) => l.actions.includes(action)).length;
const shelterHours = (log: SolLog): number =>
  log.actions.filter((a) => a === 'shelterWait').length * BALANCE.actions.shelterWait.stepHours;

function whatAndWhy(state: GameState): string[] {
  const { dose } = BALANCE;
  if (state.phase === 'lost') return [t(`result.what.lost.${state.lossReason ?? 'air'}`, { n: state.sol }), t('result.why.lost')];
  if (state.result === 'legend') return [t('result.what.won'), t('result.why.legend')];
  if (state.result === 'hardRescue') return [t('result.what.won'), t('result.why.hardRescue')];
  const why = state.dose >= dose.legendMax
    ? t('result.why.successDose', { n: share(dose.legendMax) })
    : t('result.why.successScience', { n: legendScience(state.windowId) });
  return [t('result.what.won'), why];
}

/** The decisions that changed the outcome, read from the logbook codes. */
function keyDecisions(state: GameState, win: WindowData): string[] {
  const log = state.log;
  const storm = log.reduce<SolLog | null>((top, l) => (l.doseGained > (top?.doseGained ?? DOSE_NOTE_MIN) ? l : top), null);
  if (state.phase === 'lost') {
    const cold = log.find((l) => l.flags.includes('cold'));
    if (state.lossReason === 'air') {
      return [cold ? t('result.key.cold', { n: cold.sol }) : t('result.key.air', { made: count(log, 'moxie'), sols: log.length })];
    }
    if (state.lossReason === 'food') return [t('result.key.food', { n: count(log, 'greenhouse'), sols: log.length })];
    if (state.lossReason === 'noSignal') return [t('result.key.noSignal')];
    return storm ? [t('result.key.dose', { sol: storm.sol, got: share(storm.doseGained), h: fmt(shelterHours(storm)) })] : [];
  }
  const out: string[] = [];
  if (storm) {
    const params = { sol: storm.sol, got: share(storm.doseGained), alt: share(whatIfSolDose(win, storm.sol, 0, 0)), h: fmt(shelterHours(storm)) };
    out.push(t(shelterHours(storm) > 0 ? 'result.key.sheltered' : 'result.key.noShelter', params));
  }
  out.push(t(state.rescueStage >= RESCUE_DONE ? 'result.key.rescue' : 'result.key.noRescue'));
  return out;
}

function learned(state: GameState): string[] {
  const list: string[] = [];
  if (state.lossReason === 'air') list.push(t('learned.air'));
  if (state.lossReason === 'food') list.push(t('learned.food'));
  if (state.lossReason === 'noSignal') list.push(t('learned.rescue'));
  list.push(t('learned.shelter'), t(state.rescueStage >= 2 ? 'learned.delay' : 'learned.rescue'), t('learned.power'));
  return list.slice(0, LEARNED_COUNT);
}

/** Real RAD curve of the whole window: the highest hourly rate of each sol. */
function monthChart(win: WindowData): SVGElement {
  const peaks = Array.from({ length: BALANCE.totalSols }, (_, i) =>
    Math.max(...Array.from({ length: BALANCE.hoursPerSol }, (_, h) => rateAt(win, i + 1, h))),
  );
  const top = Math.max(...peaks, win.quietRate * 3);
  const colW = (CHART.w - CHART.pad * 2) / peaks.length;
  const yOf = (rate: number): number => CHART.base - (rate / top) * (CHART.base - 8);
  const root = svg('svg', { viewBox: `0 0 ${CHART.w} ${CHART.h}`, class: 'rad-chart', role: 'img' });
  peaks.forEach((rate, i) => {
    const y = yOf(rate);
    const storm = rate >= win.quietRate * BALANCE.dose.eventRateFactor;
    root.append(svg('rect', { x: CHART.pad + i * colW + 1, y, width: colW - 2, height: Math.max(1.5, CHART.base - y), class: storm ? 'rad-bar storm' : 'rad-bar' }));
  });
  const quietY = yOf(win.quietRate);
  root.append(svg('line', { x1: CHART.pad, x2: CHART.w - CHART.pad, y1: quietY, y2: quietY, class: 'rad-quiet' }));
  const label = (x: number, text: string, anchor: string): void => {
    const node = svg('text', { x, y: CHART.h - 3, 'text-anchor': anchor, class: 'rad-axis' });
    node.textContent = text;
    root.append(node);
  };
  label(CHART.pad, t('log.sol', { n: 1 }), 'start');
  label(CHART.w - CHART.pad, t('log.sol', { n: BALANCE.totalSols }), 'end');
  return root;
}

function realDataBox(win: WindowData): HTMLElement {
  const box = el('div', 'data-box real-data');
  const kinds = (kind: string): number => win.solarEvents.filter((e) => e.kind === kind).length;
  const dates = `${formatDate(dateOfSol(win, 1))} – ${formatDate(dateOfSol(win, BALANCE.totalSols))}`;
  const storms = win.radEventSols.map((sol) => formatDate(dateOfSol(win, sol))).join(', ');
  box.append(
    el('h3', '', `🛰️ ${t('real.title')}`),
    el('p', '', t('real.window', { dates })),
    el('p', '', storms ? t('real.mars', { dates: storms }) : t('real.marsNone')),
    el('p', '', t('real.earth', { sep: kinds('sep'), flr: kinds('flr'), gst: kinds('gst') })),
    el('span', 'chart-caption', t('real.caption', { quiet: fmt(win.quietRate) })),
    monthChart(win),
    el('p', 'card-source', `${sourceTag('source.rad', win)} · ${sourceTag('source.donki', win)}`),
  );
  return box;
}

export interface ResultHandlers {
  code: string;
  /** Profile layer (B3): XP earned this mission and the rank. */
  progress: { gained: number; rank: string; rankUp: string | null };
  /** Null when no replay is possible. */
  replay: { label: string; onClick: () => void } | null;
  onLogbook(): void;
  onNewMission(): void;
  onMenu(): void;
}

export function resultSpec(state: GameState, win: WindowData, on: ResultHandlers): ModalSpec {
  const stage = state.rescueStage;
  const rescueSteps = [stage >= 1, stage >= 2, stage >= RESCUE_DONE].filter(Boolean).length;
  const buttons: ModalSpec['buttons'] = [
    { label: `📖 ${t('logbook.open')}`, onClick: on.onLogbook },
    { label: t('result.menu'), onClick: on.onMenu },
    { label: t('menu.newMission'), onClick: on.onNewMission, primary: !on.replay },
  ];
  if (on.replay) buttons.push({ ...on.replay, primary: true });
  return {
    kind: `result ${state.phase}`,
    title: resultTitle(state),
    lines: whatAndWhy(state),
    extra: () => {
      const box = el('div', 'result-body');
      const section = (title: string, items: string[]): void => {
        if (items.length === 0) return;
        const list = el('ul', 'result-list');
        for (const item of items) list.append(el('li', '', item));
        box.append(el('h3', '', title), list);
      };
      section(`🔑 ${t('result.key.title')}`, keyDecisions(state, win));
      const stats = el('div', 'result-stats');
      const stat = (label: string, value: string): void => {
        const cell = el('span', 'result-stat');
        cell.append(el('b', '', value), el('small', '', label));
        stats.append(cell);
      };
      stat(t('hud.dose'), `☢️ ${share(state.dose)}%`);
      stat(t('hud.science'), `⭐ ${state.science}`);
      stat(t('rescue.title'), `🚀 ${rescueSteps}/3`);
      stat(t('result.sols'), `${state.log.length}/${BALANCE.totalSols}`);
      stat(t('result.xp'), `+${on.progress.gained} XP`);
      stat(t('result.rank'), on.progress.rank);
      box.append(stats);
      if (on.progress.rankUp) box.append(el('p', 'rank-up', t('result.rankUp', { rank: on.progress.rankUp })));
      section(`💡 ${t('learned.title')}`, learned(state));
      box.append(realDataBox(win));
      const code = el('p', 'mission-code');
      code.append(el('span', '', t('code.label')), el('b', '', on.code), el('small', '', t('code.hint')));
      box.append(code);
      return box;
    },
    buttons,
  };
}
