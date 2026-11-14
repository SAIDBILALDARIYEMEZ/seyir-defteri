// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Learning cards: gauge info card, PUSULA card (task + tip of the day) and the
// "Where does this number come from?" card with the real RAD curve of one sol.

import { BALANCE } from '../config/balance.ts';
import info from '../content/info.json';
import tips from '../content/tips.json';
import { savedDate } from '../data/windows.ts';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { GameState } from '../sim/state.ts';
import { doseOver } from '../sim/systems/time.ts';
import { dateOfSol, rateAt } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { el, fmt, formatDate } from './dom.ts';
import type { GaugeId } from './hud.ts';
import type { ModalSpec } from './overlays.ts';

const key = (text: string): TextKey => text as TextKey;
const budgetShare = (points: number): string => fmt((points / BALANCE.dose.budget) * 100);

/** Source tag with the SAVED date where the source is one of our snapshots. */
export function sourceTag(source: string, win: WindowData): string {
  const kind = source === 'source.rad' ? 'rad' : source === 'source.donki' ? 'donki' : null;
  const tag = t(key(source));
  return kind ? `${tag} · ${t('source.saved', { date: formatDate(savedDate(win.id, kind)) })}` : tag;
}

export function infoSpec(id: GaugeId, win: WindowData, close: () => void): ModalSpec {
  const rows: [string, string][] = (['what', 'uses', 'how'] as const).map((part) => [
    t(`info.label.${part}`),
    t(`info.${id}.${part}`),
  ]);
  return {
    kind: 'info',
    title: `${info[id].icon} ${t(`info.${id}.title`)}`,
    lines: rows,
    fact: t(`info.${id}.fact`, { rate: fmt(win.quietRate), uGy: BALANCE.dose.uGyPerPoint }),
    source: sourceTag(info[id].source, win),
    buttons: [{ label: t('event.ok'), onClick: close, primary: true }],
  };
}

export interface PusulaCard {
  /** What PUSULA asks for now, already translated. */
  task: string;
  onGo: (() => void) | null;
  close: () => void;
}

export function pusulaSpec(state: GameState, win: WindowData, card: PusulaCard): ModalSpec {
  const tip = tips[state.sol % tips.length] ?? tips[0];
  const flares = win.solarEvents.filter((e) => e.sol === state.sol && e.kind === 'flr').length;
  const lines: string[] = [card.task];
  if (flares > 0) lines.push(`🌞 ${t('pusula.sunNews', { n: flares, date: formatDate(dateOfSol(win, state.sol)) })}`);
  const buttons: ModalSpec['buttons'] = [{ label: t('event.ok'), onClick: card.close, primary: !card.onGo }];
  const go = card.onGo;
  if (go) buttons.unshift({ label: t('pusula.go'), onClick: () => { card.close(); go(); }, primary: true });
  return {
    kind: 'event',
    title: `🧭 ${t('watch.title')}`,
    lines,
    fact: tip ? `💡 ${t('pusula.tip')}: ${t(key(tip.text))}` : undefined,
    source: tip ? sourceTag(tip.source, win) : undefined,
    buttons,
  };
}

const SVG = 'http://www.w3.org/2000/svg';
const CHART = { w: 360, h: 130, pad: 6, base: 112 };

export function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** Real hourly RAD dose rate of one game sol (05:00 UTC to 05:00 UTC), drawn up to `upto` hours. */
function radChart(win: WindowData, sol: number, upto: number): SVGElement {
  const hours = BALANCE.hoursPerSol;
  const rates = Array.from({ length: hours }, (_, i) => {
    const h = BALANCE.dayStartHour + i;
    return rateAt(win, sol + Math.floor(h / hours), h % hours);
  });
  const top = Math.max(...rates, win.quietRate * 3);
  const colW = (CHART.w - CHART.pad * 2) / hours;
  const yOf = (rate: number): number => CHART.base - (rate / top) * (CHART.base - 10);
  const root = svg('svg', { viewBox: `0 0 ${CHART.w} ${CHART.h}`, class: 'rad-chart', role: 'img' });
  root.append(svg('rect', { x: CHART.pad, y: 4, width: colW * BALANCE.daylightHours, height: CHART.base - 4, class: 'rad-work' }));
  rates.slice(0, upto).forEach((rate, i) => {
    const y = yOf(rate);
    const storm = rate > win.quietRate * BALANCE.dose.eventRateFactor;
    root.append(svg('rect', { x: CHART.pad + i * colW + 1, y, width: colW - 2, height: Math.max(1.5, CHART.base - y), class: storm ? 'rad-bar storm' : 'rad-bar' }));
  });
  const quietY = yOf(win.quietRate);
  root.append(svg('line', { x1: CHART.pad, x2: CHART.w - CHART.pad, y1: quietY, y2: quietY, class: 'rad-quiet' }));
  const label = (x: number, text: string, anchor: string): void => {
    const node = svg('text', { x, y: CHART.h - 3, 'text-anchor': anchor, class: 'rad-axis' });
    node.textContent = text;
    root.append(node);
  };
  const start = `${String(BALANCE.dayStartHour).padStart(2, '0')}:00`;
  label(CHART.pad, `${start} UTC`, 'start');
  label(CHART.w / 2, t('data.axisMid'), 'middle');
  label(CHART.w - CHART.pad, start, 'end');
  return root;
}

function bar(label: string, share: number, className: string): HTMLElement {
  const row = el('div', `dose-bar ${className}`);
  const track = el('span', 'dose-track');
  const fill = el('span', 'dose-fill');
  fill.style.width = `${Math.max(0, Math.min(1, share)) * 100}%`;
  track.append(fill);
  row.append(el('span', 'dose-label', label), track);
  return row;
}

export interface DataCard {
  sol: number;
  /** Hours of the sol already measured (24 = the whole sol). */
  upto: number;
  /** Storm dose points the player got on this sol, or null while the sol is running. */
  gained: number | null;
  close: () => void;
}

export function dataSpec(win: WindowData, card: DataCard): ModalSpec {
  const { dose, hoursPerSol, dayStartHour } = BALANCE;
  const rates = Array.from({ length: card.upto }, (_, i) => {
    const h = dayStartHour + i;
    return rateAt(win, card.sol + Math.floor(h / hoursPerSol), h % hoursPerSol);
  });
  const lines: (string | [string, string])[] = [
    [t('data.measured'), formatDate(dateOfSol(win, card.sol))],
    [t('data.quiet'), t('data.rate', { n: fmt(win.quietRate) })],
  ];
  if (rates.length) lines.push([t('data.peak'), t('data.rate', { n: fmt(Math.max(...rates)) })]);
  if (card.upto < hoursPerSol) lines.push(t('data.notYet'));
  const gained = card.gained;
  return {
    kind: 'info data',
    title: `📈 ${t('data.title')}`,
    lines,
    extra: () => {
      const box = el('div', 'data-box');
      if (gained !== null) {
        const open = doseOver(win, card.sol, dayStartHour, hoursPerSol, 0);
        box.append(
          bar(t('data.yours', { n: budgetShare(gained) }), gained / dose.budget, 'yours'),
          bar(t('data.open', { n: budgetShare(open) }), open / dose.budget, 'open'),
        );
      }
      box.append(el('span', 'chart-caption', t('data.caption')), radChart(win, card.sol, card.upto));
      box.append(el('span', 'chart-caption', t('data.legend')));
      return box;
    },
    fact: t('data.scale', { n: dose.uGyPerPoint }),
    source: sourceTag('source.rad', win),
    buttons: [{ label: t('event.ok'), onClick: card.close, primary: true }],
  };
}
