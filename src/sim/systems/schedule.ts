// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Random events (dust storms, malfunctions) are rolled once from the seed.
// These are game events, not NASA data, and are never labeled as real.

import { BALANCE } from '../../config/balance.ts';
import type { StationId } from '../actions.ts';
import type { Rng } from '../rng.ts';

export interface DustStorm {
  start: number;
  len: number;
}

export interface Malfunction {
  sol: number;
  station: StationId;
}

export interface Schedule {
  dust: DustStorm[];
  malfunctions: Malfunction[];
}

export function rollSchedule(rng: Rng): Schedule {
  const { dust, malfunction, totalSols } = BALANCE;
  const storms: DustStorm[] = [];
  const count = rng.int(dust.minStorms, dust.maxStorms);
  for (let i = 0; i < count; i++) {
    storms.push({
      start: rng.int(dust.earliestSol, totalSols - dust.maxLen),
      len: rng.int(dust.minLen, dust.maxLen),
    });
  }
  const malfunctions: Malfunction[] = [];
  for (let i = 0; i < malfunction.count; i++) {
    const station = malfunction.stations[rng.int(0, malfunction.stations.length - 1)] ?? 'moxie';
    malfunctions.push({ sol: rng.int(malfunction.earliestSol, totalSols), station });
  }
  return { dust: storms, malfunctions };
}

export function isDustSol(schedule: Schedule, sol: number): boolean {
  return schedule.dust.some((d) => sol >= d.start && sol < d.start + d.len);
}
