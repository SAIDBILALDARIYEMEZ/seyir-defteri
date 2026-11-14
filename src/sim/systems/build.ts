// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Build mode: station status (locked -> available -> building -> ready), the unlock chain,
// grid placement rules and overnight construction. Pure: codes only, never text.

import { BALANCE } from '../../config/balance.ts';
import type { BuildableId, Cell, PlacedId, ReasonCode, StarterId, StationId, Turn } from '../actions.ts';
import { snapshotOf } from '../state.ts';
import { debrisCells } from './explore.ts';
import type { GameState } from '../state.ts';

export type BuildStatus = 'locked' | 'available' | 'building' | 'ready';

export const BUILDABLES: readonly BuildableId[] = ['moxie', 'greenhouse', 'shelter', 'antenna', 'beacon'];

/** Starters wait in the depot next to the lander and are placed for free on sol 1 (B3). */
export const STARTERS: readonly StarterId[] = ['habitat', 'panels'];
export const PLACEABLES: readonly PlacedId[] = [...STARTERS, ...BUILDABLES];

export function isStarter(station: StationId): station is StarterId {
  return (STARTERS as readonly string[]).includes(station);
}

export function isPlaceable(station: StationId): station is PlacedId {
  return isStarter(station) || isBuildable(station);
}

/** True once the habitat and the panels are on the grid; nothing else works before. */
export function setupDone(state: GameState): boolean {
  return STARTERS.every((id) => state.buildings[id] !== undefined);
}

export function isBuildable(station: StationId): station is BuildableId {
  return (BUILDABLES as readonly string[]).includes(station);
}

export function isReady(state: GameState, station: StationId): boolean {
  if (!isBuildable(station)) return true;
  return state.buildings[station]?.solsLeft === 0;
}

const NEED_CODE: Record<BuildableId, ReasonCode> = {
  moxie: 'needMoxie',
  greenhouse: 'needGreenhouse',
  shelter: 'needShelter',
  antenna: 'needAntenna',
  beacon: 'needBeacon',
};

/** Why a station cannot be placed yet (unlock chain), or null when it is unlocked. */
export function lockReason(state: GameState, id: BuildableId): ReasonCode | null {
  const rule = BALANCE.build.stations[id];
  if (rule.needs && !isReady(state, rule.needs)) return NEED_CODE[rule.needs];
  return state.sol < rule.minSol ? 'tooEarly' : null;
}

export function buildStatus(state: GameState, id: BuildableId): BuildStatus {
  const b = state.buildings[id];
  if (b) return b.solsLeft === 0 ? 'ready' : 'building';
  return lockReason(state, id) ? 'locked' : 'available';
}

/** Why a station's own actions cannot run: not built yet or still under construction. */
export function notReadyReason(state: GameState, station: StationId): ReasonCode | null {
  if (!isBuildable(station)) return null;
  const status = buildStatus(state, station);
  if (status === 'ready') return null;
  return status === 'building' ? 'underConstruction' : 'notBuilt';
}

const gap = (a: Cell, b: Cell): number => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Every occupied cell: fixed stations, the lander and everything placed (except `ignore`). */
export function occupiedCells(state: GameState, ignore: PlacedId | null = null): Cell[] {
  const placed = PLACEABLES.flatMap((id) => {
    const b = state.buildings[id];
    return b && id !== ignore ? [b.cell] : [];
  });
  return [...Object.values(BALANCE.grid.fixed), BALANCE.grid.lander, ...placed];
}

/** Grid rule for a building on `cell` (`ignore`: the station being moved), or null when valid. */
export function placementReason(state: GameState, cell: Cell, ignore: PlacedId | null = null): ReasonCode | null {
  const g = BALANCE.grid;
  const inside =
    Number.isInteger(cell.x) && Number.isInteger(cell.y) &&
    cell.x >= 0 && cell.y >= 0 && cell.x < g.cols && cell.y < g.rows;
  if (!inside) return 'cellOutside';
  if (g.craters.some((c) => gap(c, cell) <= c.r)) return 'nearCrater';
  const others = occupiedCells(state, ignore);
  if (others.some((o) => gap(o, cell) === 0)) return 'cellTaken';
  // F6: a rocket piece still lying there blocks its own cell (not the gap around it).
  if (debrisCells(state).some((o) => gap(o, cell) === 0)) return 'cellTaken';
  return others.some((o) => gap(o, cell) < g.minGap) ? 'tooClose' : null;
}

/** Sol-1 setup rule: a starter goes on any valid cell, once. */
export function placeReason(state: GameState, id: StarterId, cell: Cell): ReasonCode | null {
  return state.buildings[id] ? 'alreadyPlaced' : placementReason(state, cell);
}

/** Moving: only a ready station, to another valid cell. */
export function relocateReason(state: GameState, id: PlacedId, cell: Cell): ReasonCode | null {
  const b = state.buildings[id];
  if (!b) return 'notBuilt';
  if (b.solsLeft > 0) return 'underConstruction';
  return placementReason(state, cell, id);
}

/** The suggested slot if still valid, else the nearest valid cell to it (PUSULA's pick). */
export function suggestCell(state: GameState, id: PlacedId): Cell {
  const slot = BALANCE.grid.slots[id];
  if (!placementReason(state, slot, id)) return slot;
  for (let r = 1; r < BALANCE.grid.cols; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cell = { x: slot.x + dx, y: slot.y + dy };
        if (!placementReason(state, cell, id)) return cell;
      }
    }
  }
  return slot;
}

/** Puts a starter on the grid. On the sol's morning the snapshot follows, so a replay keeps it. */
export function placeStarter(state: GameState, id: StarterId, cell: Cell, rot: Turn = 0): GameState {
  const next: GameState = {
    ...state,
    buildings: { ...state.buildings, [id]: { cell: { x: cell.x, y: cell.y }, solsLeft: 0, rot } },
  };
  if (next.today.actions.length > 0) return next;
  const snap = snapshotOf(next);
  return { ...next, mornings: next.mornings.map((m) => (m.sol === next.sol ? snap : m)) };
}

export function relocate(state: GameState, id: PlacedId, cell: Cell, rot?: Turn): GameState {
  const b = state.buildings[id];
  if (!b) return state;
  const moved = { ...b, cell: { x: cell.x, y: cell.y }, rot: rot ?? b.rot ?? 0 };
  return { ...state, buildings: { ...state.buildings, [id]: moved } };
}

/** Turns a placed station a quarter turn clockwise. Cosmetic: no time, power or parts (B4). */
export function rotateBuilding(state: GameState, id: PlacedId): GameState {
  const b = state.buildings[id];
  if (!b) return state;
  const rot = (((b.rot ?? 0) + 1) % 4) as Turn;
  return { ...state, buildings: { ...state.buildings, [id]: { ...b, rot } } };
}

/** Full check of a build order (chain, parts, spot). Time and power are checked by rules.ts. */
export function buildReason(state: GameState, id: BuildableId, cell: Cell): ReasonCode | null {
  if (state.buildings[id]) return 'alreadyBuilt';
  const lock = lockReason(state, id);
  if (lock) return lock;
  if (state.parts < BALANCE.build.stations[id].parts) return 'noParts';
  return placementReason(state, cell);
}

export function startBuilding(state: GameState, id: BuildableId, cell: Cell, rot: Turn = 0): GameState {
  const rule = BALANCE.build.stations[id];
  return {
    ...state,
    parts: state.parts - rule.parts,
    buildings: { ...state.buildings, [id]: { cell: { x: cell.x, y: cell.y }, solsLeft: rule.sols, rot } },
  };
}

/** One night of construction. Returns the new state and the ids finished tonight. */
export function progressBuilds(state: GameState): { state: GameState; finished: BuildableId[] } {
  const buildings = { ...state.buildings };
  const finished: BuildableId[] = [];
  for (const id of BUILDABLES) {
    const b = buildings[id];
    if (!b || b.solsLeft === 0) continue;
    buildings[id] = { ...b, solsLeft: b.solsLeft - 1 };
    if (b.solsLeft === 1) finished.push(id);
  }
  let next: GameState = { ...state, buildings };
  // The finished antenna opens the radio link: rescue chain step 1.
  if (finished.includes('antenna') && next.rescueStage < 1) next = { ...next, rescueStage: 1 };
  return { state: next, finished };
}
