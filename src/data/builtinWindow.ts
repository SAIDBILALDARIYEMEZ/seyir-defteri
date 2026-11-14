// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Built-in copy of the 2024-05-20 event: hourly means read by hand from RadLab on 2026-11-14.
// Used by the tests and as the fallback when the full snapshot files are missing.

import { buildWindow } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';

export const BUILTIN_SOURCE = {
  source: 'NASA OSDR RadLab, MSL-RAD-Surface (Curiosity RAD), absorbed dose rate, hourly means',
  url: 'https://visualization.osdr.nasa.gov/radlab/api/',
  fetchedAt: '2026-11-14',
  license: 'NASA open data',
  note: 'Only 2024-05-19..22 are measured values; other days use the quiet rate of about 4 uGy/h.',
} as const;

const QUIET = 4;
const START = '2024-05-03';
const EVENT_SOL = 18; // 2024-05-20

/** uGy/h for 2024-05-20, UTC hours 0-23. */
const MAY_20 = [
  4, 4, 4, 4, 4, 94, 276, 221, 146, 94, 91, 91, 80, 63, 52, 45, 42, 36, 32, 30, 28, 26, 24, 22,
];

function hourlyTable(): number[] {
  const hourly = new Array<number>(30 * 24).fill(QUIET);
  const at = (sol: number, hour: number): number => (sol - 1) * 24 + hour;
  MAY_20.forEach((v, h) => (hourly[at(EVENT_SOL, h)] = v));
  // 21 May: slow decay from 20 to 7. 22 May: about 6.
  for (let h = 0; h < 24; h++) {
    hourly[at(EVENT_SOL + 1, h)] = Math.round((20 - (13 * h) / 23) * 10) / 10;
    hourly[at(EVENT_SOL + 2, h)] = 6;
  }
  return hourly;
}

export function builtinWindow(): WindowData {
  const win = buildWindow('w1', { startDate: START, median: QUIET, hourly: hourlyTable() }, null);
  // The warning for the event day stands in for the DONKI SEP list until snapshots exist.
  return { ...win, sepSols: [EVENT_SOL], solarEvents: [{ sol: EVENT_SOL, kind: 'sep', id: 'builtin' }] };
}
