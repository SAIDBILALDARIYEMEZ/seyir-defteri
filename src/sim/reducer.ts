// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pure reducer: (state, action, rng) -> new state. No three.js, no DOM, no Math.random.

import { BALANCE } from '../config/balance.ts';
import type { Action } from './actions.ts';
import type { Rng } from './rng.ts';
import type { GameState } from './state.ts';

function endSol(state: GameState): GameState {
  if (state.sol >= BALANCE.totalSols) return { ...state, hoursLeft: 0, phase: 'won' };
  return { ...state, sol: state.sol + 1, hoursLeft: BALANCE.daylightHours };
}

export function reduce(state: GameState, action: Action, _rng: Rng): GameState {
  if (state.phase !== 'playing') return state;
  switch (action.type) {
    case 'wait': {
      const hours = Math.max(0, Math.min(action.hours, state.hoursLeft));
      const next = { ...state, hoursLeft: state.hoursLeft - hours };
      return next.hoursLeft <= 0 ? endSol(next) : next;
    }
    case 'endSol':
      return endSol(state);
  }
}
