// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pure helpers for the `?debug` panel: set a gauge, start a game event. Never used in play.

import type { StationId } from './actions.ts';
import type { GameState } from './state.ts';

export const DEBUG_GAUGES = [
  'power',
  'air',
  'food',
  'dose',
  'science',
  'panelEff',
  'shelterLevel',
  'hoursLeft',
] as const;
export type DebugGauge = (typeof DEBUG_GAUGES)[number];

export const DEBUG_DUST_SOLS = 2;

export function setGauge(state: GameState, gauge: DebugGauge, value: number): GameState {
  return Number.isFinite(value) ? { ...state, [gauge]: value } : state;
}

export function triggerDust(state: GameState): GameState {
  const dust = [...state.schedule.dust, { start: state.sol, len: DEBUG_DUST_SOLS }];
  return { ...state, schedule: { ...state.schedule, dust } };
}

export function triggerMalfunction(state: GameState, station: StationId): GameState {
  return state.broken.includes(station) ? state : { ...state, broken: [...state.broken, station] };
}
