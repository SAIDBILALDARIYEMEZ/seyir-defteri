// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Main-menu backdrop (F5c): the player's newest saved village, or a sample village on the
// suggested spots when there is no save yet. Scene-only: it is drawn, never played.

import { BALANCE } from '../config/balance.ts';
import type { PlacedId } from '../sim/actions.ts';
import { createInitialState } from '../sim/state.ts';
import type { Building, GameState } from '../sim/state.ts';
import { PLACEABLES } from '../sim/systems/build.ts';
import type { WindowData } from '../sim/window.ts';
import { loadGame } from '../save/save.ts';

let sample: GameState | null = null;

function sampleVillage(seed: number, win: WindowData): GameState {
  const base = createInitialState(seed, win);
  const buildings: Partial<Record<PlacedId, Building>> = {};
  for (const id of PLACEABLES) buildings[id] = { cell: BALANCE.grid.slots[id], solsLeft: 0 };
  return { ...base, buildings, panelEff: 1, shelterLevel: BALANCE.actions.shelterBuild.maxLevel };
}

export function backdropOf(seed: number, win: WindowData): GameState {
  const saved = loadGame();
  if (saved && Object.keys(saved.buildings).length >= 2) return saved;
  sample ??= sampleVillage(seed, win);
  return sample;
}
