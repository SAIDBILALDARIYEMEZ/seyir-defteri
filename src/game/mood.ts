// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F7: PUSULA's face from what the crew can see: alarm during a particle storm or at a critical
// level, worried when a storm is warned or a value runs low, happy otherwise. Reads the sim only.

import { BALANCE } from '../config/balance.ts';
import type { GameState } from '../sim/state.ts';
import { isEventNow } from '../sim/systems/time.ts';
import type { WindowData } from '../sim/window.ts';
import type { Mood } from '../ui/watch.ts';

export function moodOf(state: GameState, win: WindowData): Mood {
  const a = BALANCE.advisor;
  const critical = state.power <= a.powerLow || state.air <= a.airLow || (state.sol >= BALANCE.food.unlockSol && state.food <= a.foodLow);
  if (isEventNow(state, win) || critical) return 'alarm';
  const warned = state.today.urgent.length > 0;
  const low = state.air < a.airComfort || (state.sol >= BALANCE.food.unlockSol && state.food < a.foodComfort);
  return warned || low ? 'worried' : 'happy';
}
