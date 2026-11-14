// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// "This storm was real" card (B3): the biggest RAD reading of the window, a small line chart
// of the real Curiosity RAD curve around it, and the player's dose that sol. SVG, no library.

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';
import { whatIfSolDose } from '../sim/systems/time.ts';
import { dateOfSol, rateAt } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { sourceTag, svg } from './cards.ts';
import { el, fmt, formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';

const CHART = { w: 360, h: 120, pad: 8, base: 100 };
/** Sols shown on each side of the peak. */
const SPAN = 3;

/** Sol and rate of the highest hourly RAD reading in the window. */
export function peakOf(win: WindowData): { sol: number; rate: number } {
  let best = 0;
  win.hourly.forEach((rate, i) => {
    if (rate > (win.hourly[best] ?? 0)) best = i;
  });
  return { sol: Math.floor(best / BALANCE.hoursPerSol) + 1, rate: win.hourly[best] ?? win.quietRate };
}

function lineChart(win: WindowData, from: number, to: number, peakSol: number): SVGElement {
  const rates: number[] = [];
  for (let sol = from; sol <= to; sol++) for (let h = 0; h < BALANCE.hoursPerSol; h++) rates.push(rateAt(win, sol, h));
  const top = Math.max(...rates, win.quietRate * 2) * 1.05;
  const x = (i: number): number => CHART.pad + (i / Math.max(1, rates.length - 1)) * (CHART.w - CHART.pad * 2);
  const y = (rate: number): number => CHART.base - (rate / top) * (CHART.base - 6);
  const root = svg('svg', { viewBox: `0 0 ${CHART.w} ${CHART.h}`, class: 'rad-chart storm-chart', role: 'img' });
  const perSol = BALANCE.hoursPerSol;
  const px = x((peakSol - from) * perSol);
  const band = svg('rect', { x: px, y: 4, width: x(perSol) - x(0), height: CHART.base - 4, class: 'storm-band' });
  root.append(band);
  const quietY = y(win.quietRate);
  root.append(svg('line', { x1: CHART.pad, x2: CHART.w - CHART.pad, y1: quietY, y2: quietY, class: 'rad-quiet' }));
  const points = rates.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ');
  root.append(svg('polyline', { points, class: 'storm-line', fill: 'none' }));
  const label = (lx: number, text: string, anchor: string): void => {
    const node = svg('text', { x: lx, y: CHART.h - 4, 'text-anchor': anchor, class: 'rad-axis' });
    node.textContent = text;
    root.append(node);
  };
  label(CHART.pad, t('log.sol', { n: from }), 'start');
  label(px + (x(perSol) - x(0)) / 2, t('log.sol', { n: peakSol }), 'middle');
  label(CHART.w - CHART.pad, t('log.sol', { n: to }), 'end');
  return root;
}

export function stormSpec(state: GameState, win: WindowData, close: () => void): ModalSpec {
  const peak = peakOf(win);
  const from = Math.max(1, peak.sol - SPAN);
  const to = Math.min(BALANCE.totalSols, peak.sol + SPAN);
  const log = state.log.find((l) => l.sol === peak.sol);
  const hab = whatIfSolDose(win, peak.sol, 0, 0);
  const shel = whatIfSolDose(win, peak.sol, BALANCE.actions.shelterBuild.maxLevel, BALANCE.daylightHours);
  const lines = [
    t(`storm.${win.id}` as TextKey),
    t('storm.peak', { rate: fmt(peak.rate), quiet: fmt(win.quietRate) }),
    log ? t('storm.you', { got: fmt(log.doseGained) }) : t('storm.notReached'),
    t('storm.compare', { hab: fmt(hab), shel: fmt(shel) }),
  ];
  return {
    kind: 'event storm-real',
    title: `🌩️ ${t('storm.title')}`,
    date: formatDate(dateOfSol(win, peak.sol)),
    lines,
    extra: () => {
      const box = el('div', 'storm-box');
      box.append(el('span', 'chart-caption', t('storm.caption', { from, to })), lineChart(win, from, to, peak.sol));
      return box;
    },
    source: `${sourceTag('source.rad', win)} · ${sourceTag('source.donki', win)}`,
    buttons: [{ label: t('event.ok'), onClick: close, primary: true }],
  };
}
