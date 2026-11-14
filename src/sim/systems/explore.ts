// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6 exploring: rocket debris to collect (parts) and the two upgrades bought with them.
// Pure: codes only, never text. Numbers in BALANCE.debris / BALANCE.upgrades.

import { BALANCE } from '../../config/balance.ts';
import type { Cell, ReasonCode, StationId, UpgradeId } from '../actions.ts';
import type { GameState } from '../state.ts';

export const UPGRADES: readonly UpgradeId[] = ['foodStore', 'extraPanel'];

/** Older saves have no debris / upgrade lists. */
export const collectedOf = (state: GameState): readonly number[] => state.debris ?? [];
export const upgradesOf = (state: GameState): readonly UpgradeId[] => state.upgrades ?? [];
export const hasUpgrade = (state: GameState, id: UpgradeId): boolean => upgradesOf(state).includes(id);

/** Food store size: the base store plus the foodStore upgrade. */
export function foodMax(state: GameState): number {
  return BALANCE.food.max + (hasUpgrade(state, 'foodStore') ? BALANCE.upgrades.foodStore.food : 0);
}

/** Panel income factor from upgrades (1 = none). */
export function incomeFactor(state: GameState): number {
  return 1 + (hasUpgrade(state, 'extraPanel') ? BALANCE.upgrades.extraPanel.incomeFactor : 0);
}

/** Debris pieces not collected yet (indices into BALANCE.debris.pieces). */
export function debrisLeft(state: GameState): number[] {
  const got = collectedOf(state);
  return BALANCE.debris.pieces.map((_, i) => i).filter((i) => !got.includes(i));
}

/** Cells blocked by debris still lying there (placement rule: that cell only). */
export function debrisCells(state: GameState): Cell[] {
  return debrisLeft(state).map((i) => BALANCE.debris.pieces[i] as Cell);
}

export function collectReason(state: GameState, id: number): ReasonCode | null {
  if (!Number.isInteger(id) || id < 0 || id >= BALANCE.debris.pieces.length) return 'collected';
  if (collectedOf(state).includes(id)) return 'collected';
  const today = state.today.actions.filter((a) => a === 'bonus').length;
  return today >= BALANCE.debris.perSol ? 'alreadyToday' : null;
}

export function collect(state: GameState, id: number): GameState {
  const piece = BALANCE.debris.pieces[id];
  if (!piece) return state;
  return { ...state, parts: state.parts + piece.parts, debris: [...collectedOf(state), id] };
}

export const upgradeStation = (id: UpgradeId): StationId => BALANCE.upgrades[id].station;

/** Why an upgrade cannot be bought (station readiness, time and power are checked by rules.ts). */
export function upgradeReason(state: GameState, id: UpgradeId): ReasonCode | null {
  if (!UPGRADES.includes(id)) return 'locked';
  if (hasUpgrade(state, id)) return 'alreadyBuilt';
  return state.parts < BALANCE.upgrades[id].parts ? 'noParts' : null;
}

/** Parts left after every station not placed yet is paid for (PUSULA never spends build parts). */
export function spareParts(state: GameState): number {
  const stations = BALANCE.build.stations;
  const owed = (Object.keys(stations) as (keyof typeof stations)[])
    .filter((id) => !state.buildings[id])
    .reduce((sum, id) => sum + stations[id].parts, 0);
  return state.parts - owed;
}

export function buyUpgrade(state: GameState, id: UpgradeId): GameState {
  return { ...state, parts: state.parts - BALANCE.upgrades[id].parts, upgrades: [...upgradesOf(state), id] };
}
