// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Bot strategies: (state, rng) -> action. F0 has placeholders; F1 adds the PRD §13 set
// (pusula, never-shelter, always-shelter, no-antenna).

import type { Action } from '../../src/sim/actions.ts';
import type { Rng } from '../../src/sim/rng.ts';
import type { GameState } from '../../src/sim/state.ts';

export type Strategy = (state: GameState, rng: Rng) => Action;

export const strategies: Record<string, Strategy> = {
  random: (_state, rng) =>
    rng.next() < 0.5
      ? { type: 'endSol', crewId: 0 }
      : { type: 'wait', crewId: 0, hours: rng.int(1, 3) },
  greedy: () => ({ type: 'endSol', crewId: 0 }),
  balanced: (state) =>
    state.hoursLeft > 5 ? { type: 'wait', crewId: 0, hours: 2 } : { type: 'endSol', crewId: 0 },
};
