// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// GameState: plain serializable data. F0 placeholder shape; F1 adds gauges and events.

import { BALANCE } from '../config/balance.ts';

export interface CrewMember {
  id: number;
  awake: boolean;
}

export type GamePhase = 'playing' | 'won' | 'lost';

export interface GameState {
  seed: number;
  sol: number;
  hoursLeft: number;
  phase: GamePhase;
  /** Array from day one: the data model supports up to BALANCE.maxCrew astronauts. */
  crew: CrewMember[];
}

export function createInitialState(seed: number, crewCount = 1): GameState {
  const count = Math.max(1, Math.min(BALANCE.maxCrew, crewCount));
  return {
    seed,
    sol: 1,
    hoursLeft: BALANCE.daylightHours,
    phase: 'playing',
    crew: Array.from({ length: count }, (_, id) => ({ id, awake: id === 0 })),
  };
}
