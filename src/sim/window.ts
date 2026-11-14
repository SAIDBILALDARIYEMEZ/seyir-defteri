// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// A "window" is one real month of space weather. Pure data + helpers, built from snapshots.

import { BALANCE } from '../config/balance.ts';

export type SolarEventKind = 'sep' | 'flr' | 'cme' | 'gst';

export interface SolarEvent {
  sol: number;
  kind: SolarEventKind;
  id: string;
}

export interface WindowData {
  id: string;
  /** ISO date (UTC) of sol 1. Game simplification: one sol = one UTC calendar day. */
  startDate: string;
  /** Median Mars surface dose rate of the month, uGy/h (Curiosity RAD). */
  quietRate: number;
  /** Hourly mean dose rate, uGy/h. Index = (sol - 1) * 24 + utcHour. */
  hourly: number[];
  /** Sols with a DONKI particle-storm (SEP) report. Measured near Earth, not at Mars. */
  sepSols: number[];
  /** Sols where RAD itself measured an event at Mars (derived from `hourly`). */
  radEventSols: number[];
  /** DONKI events for story cards. */
  solarEvents: SolarEvent[];
}

/** Shapes of the snapshot files written by tools/data/fetch.mjs. */
export interface RadSnapshot {
  startDate: string;
  median: number;
  /** Hourly means from startDate 00:00 UTC; null where RAD has no reading. */
  hourly: (number | null)[];
}

export interface DonkiSnapshot {
  sep: { id: string; time: string }[];
  gst: { id: string; time: string }[];
  flr: { id: string; time: string }[];
  cme: { count: number; fastest: { id: string; time: string; speed: number }[] };
}

const MS_PER_DAY = 86_400_000;

export function solOfDate(startDate: string, isoTime: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return Math.floor((Date.parse(isoTime) - start) / MS_PER_DAY) + 1;
}

export function dateOfSol(win: WindowData, sol: number): string {
  const ms = Date.parse(`${win.startDate}T00:00:00Z`) + (sol - 1) * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

export function rateAt(win: WindowData, sol: number, hour: number): number {
  return win.hourly[(sol - 1) * BALANCE.hoursPerSol + hour] ?? win.quietRate;
}

export function isEventRate(win: WindowData, rate: number): boolean {
  return rate >= win.quietRate * BALANCE.dose.eventRateFactor;
}

export function findRadEventSols(quietRate: number, hourly: number[]): number[] {
  const sols: number[] = [];
  for (let sol = 1; sol <= BALANCE.totalSols; sol++) {
    const day = hourly.slice((sol - 1) * BALANCE.hoursPerSol, sol * BALANCE.hoursPerSol);
    if (day.some((r) => r >= quietRate * BALANCE.dose.eventRateFactor)) sols.push(sol);
  }
  return sols;
}

/** Builds a window from the saved snapshots. Gaps in RAD are filled with the month median. */
export function buildWindow(id: string, rad: RadSnapshot, donki: DonkiSnapshot | null): WindowData {
  const hours = BALANCE.totalSols * BALANCE.hoursPerSol;
  const hourly = Array.from({ length: hours }, (_, i) => rad.hourly[i] ?? rad.median);
  const inWindow = (sol: number): boolean => sol >= 1 && sol <= BALANCE.totalSols;
  const solarEvents: SolarEvent[] = [];
  if (donki) {
    const add = (kind: SolarEventKind, list: { id: string; time: string }[]): void => {
      for (const e of list) {
        const sol = solOfDate(rad.startDate, e.time);
        if (inWindow(sol)) solarEvents.push({ sol, kind, id: e.id });
      }
    };
    add('sep', donki.sep);
    add('gst', donki.gst);
    add('flr', donki.flr);
    add('cme', donki.cme.fastest);
  }
  const sepSols = [...new Set(solarEvents.filter((e) => e.kind === 'sep').map((e) => e.sol))];
  sepSols.sort((a, b) => a - b);
  return {
    id,
    startDate: rad.startDate,
    quietRate: rad.median,
    hourly,
    sepSols,
    radEventSols: findRadEventSols(rad.median, hourly),
    solarEvents,
  };
}
