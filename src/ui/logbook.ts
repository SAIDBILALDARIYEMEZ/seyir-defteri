// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Commander's Logbook (D-004 A1): one line per sol built from the sim's log codes, shown as a
// logbook page and downloadable as a PNG drawn on a canvas (no library).

import { BALANCE } from '../config/balance.ts';
import { t } from '../i18n/i18n.ts';
import type { TextKey } from '../i18n/i18n.ts';
import type { GameState, SolLog } from '../sim/state.ts';
import { dateOfSol } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import { el, fmt, formatDate } from './dom.ts';
import type { ModalSpec } from './overlays.ts';

const key = (text: string): TextKey => text as TextKey;
const share = (points: number): string => fmt((points / BALANCE.dose.budget) * 100);
const NOTE_FLAGS = ['dust', 'cold', 'foodEmpty', 'broken'] as const;
const DOSE_NOTE_MIN = 0.5;

export interface LogLine {
  head: string;
  text: string;
}

function lineOf(log: SolLog, win: WindowData): LogLine {
  const done: string[] = [];
  for (const type of [...new Set(log.actions)]) {
    if (type === 'shelterWait') {
      const hours = log.actions.filter((a) => a === type).length * BALANCE.actions.shelterWait.stepHours;
      done.push(t('log.shelterWait', { h: fmt(hours) }));
    } else done.push(t(key(`log.${type}`)));
  }
  const parts = [done.length ? t('log.did', { list: done.join(', ') }) : t('log.rest')];
  if (log.flags.includes('radEvent') || log.doseGained > DOSE_NOTE_MIN) {
    parts.push(t('log.flag.radEvent', { n: share(log.doseGained) }));
  }
  for (const flag of NOTE_FLAGS) if (log.flags.includes(flag)) parts.push(t(`log.flag.${flag}`));
  return { head: `${t('log.sol', { n: log.sol })} · ${formatDate(dateOfSol(win, log.sol))}`, text: parts.join(' ') };
}

export function logLines(state: GameState, win: WindowData): LogLine[] {
  return state.log.map((log) => lineOf(log, win));
}

export interface LogbookInfo {
  /** Result title, or '' while the mission is running. */
  result: string;
  code: string;
}

function subtitle(state: GameState, win: WindowData, info: LogbookInfo): string {
  const last = state.log[state.log.length - 1]?.sol ?? 1;
  const dates = `${formatDate(dateOfSol(win, 1))} – ${formatDate(dateOfSol(win, last))}`;
  return `${dates} · ${t('code.label')}: ${info.code}`;
}

const PAGE = { width: 1200, pad: 64, title: 46, body: 23, gap: 12, lineHeight: 1.4 };
const PAPER = { bg: '#f6ead2', ink: '#3a2414', accent: '#b4532a', rule: '#d9c7a3' };
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const rows: string[] = [];
  let row = '';
  for (const word of text.split(' ')) {
    const next = row ? `${row} ${word}` : word;
    if (row && ctx.measureText(next).width > maxWidth) {
      rows.push(row);
      row = word;
    } else row = next;
  }
  if (row) rows.push(row);
  return rows;
}

/** Draws the logbook page. Runs twice: once to measure the height, once to paint. */
export function drawLogbook(state: GameState, win: WindowData, info: LogbookInfo): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const lines = logLines(state, win);
  const width = PAGE.width - PAGE.pad * 2;
  const paint = (ctx: CanvasRenderingContext2D, draw: boolean): number => {
    let y = PAGE.pad;
    const text = (value: string, size: number, color: string, weight = 400): void => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      for (const row of wrap(ctx, value, width)) {
        y += size * PAGE.lineHeight;
        if (draw) ctx.fillText(row, PAGE.pad, y);
      }
    };
    text(`📖 ${t('logbook.title')}`, PAGE.title, PAPER.ink, 800);
    text(t('app.title'), PAGE.body, PAPER.accent, 700);
    text(subtitle(state, win, info), PAGE.body, PAPER.ink);
    if (info.result) text(info.result, PAGE.body + 4, PAPER.accent, 800);
    y += PAGE.gap * 2;
    for (const line of lines) {
      if (draw) {
        ctx.fillStyle = PAPER.rule;
        ctx.fillRect(PAGE.pad, y + PAGE.gap / 2, width, 2);
      }
      y += PAGE.gap;
      text(line.head, PAGE.body, PAPER.accent, 700);
      text(line.text, PAGE.body, PAPER.ink);
    }
    y += PAGE.gap * 3;
    text(`${t('app.tagline')} ${t('source.rad')}`, PAGE.body - 5, PAPER.accent);
    return y + PAGE.pad;
  };
  const probe = canvas.getContext('2d');
  if (!probe) return canvas;
  canvas.width = PAGE.width;
  canvas.height = Math.ceil(paint(probe, false));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.fillStyle = PAPER.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  paint(ctx, true);
  return canvas;
}

function downloadPng(state: GameState, win: WindowData, info: LogbookInfo): void {
  drawLogbook(state, win, info).toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seyir-defteri-${info.code}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
}

export function logbookSpec(state: GameState, win: WindowData, info: LogbookInfo, close: () => void): ModalSpec {
  return {
    kind: 'logbook',
    title: `📖 ${t('logbook.title')}`,
    lines: [subtitle(state, win, info), ...(info.result ? [info.result] : [])],
    extra: () => {
      const page = el('div', 'logbook-page');
      for (const line of logLines(state, win)) {
        const row = el('p', 'logbook-line');
        row.append(el('b', '', line.head), el('span', '', line.text));
        page.append(row);
      }
      if (state.log.length === 0) page.append(el('p', 'logbook-line', t('logbook.empty')));
      return page;
    },
    buttons: [
      { label: `⬇️ ${t('logbook.download')}`, onClick: () => downloadPng(state, win, info) },
      { label: t('menu.close'), onClick: close, primary: true },
    ],
  };
}
