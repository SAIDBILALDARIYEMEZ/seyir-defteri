// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Build mode: station status (locked -> available -> building -> ready), the unlock chain,
// grid placement rules and overnight construction. Pure: codes only, never text.

import { BALANCE } from '../../config/balance.ts';
import type { BuildableId, Cell, ReasonCode, StationId } from '../actions.ts';
import type { GameState } from '../state.ts';

export type BuildStatus = 'locked' | 'available' | 'building' | 'ready';

export const BUILDABLES: readonly BuildableId[] = ['moxie', 'greenhouse', 'shelter', 'antenna', 'beacon'];

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

/** Every occupied cell: the fixed stations plus everything placed so far. */
export function occupiedCells(state: GameState): Cell[] {
  const placed = BUILDABLES.flatMap((id) => {
    const b = state.buildings[id];
    return b ? [b.cell] : [];
  });
  return [...Object.values(BALANCE.grid.fixed), ...placed];
}

/** Grid rule for a new building on `cell`, or null when the spot is valid. */
export function placementReason(state: GameState, cell: Cell): ReasonCode | null {
  const g = BALANCE.grid;
  const inside =
    Number.isInteger(cell.x) && Number.isInteger(cell.y) &&
    cell.x >= 0 && cell.y >= 0 && cell.x < g.cols && cell.y < g.rows;
  if (!inside) return 'cellOutside';
  if (g.craters.some((c) => gap(c, cell) <= c.r)) return 'nearCrater';
  const others = occupiedCells(state);
  if (others.some((o) => gap(o, cell) === 0)) return 'cellTaken';
  return others.some((o) => gap(o, cell) < g.minGap) ? 'tooClose' : null;
}

/** Full check of a build order (chain, parts, spot). Time and power are checked by rules.ts. */
export function buildReason(state: GameState, id: BuildableId, cell: Cell): ReasonCode | null {
  if (state.buildings[id]) return 'alreadyBuilt';
  const lock = lockReason(state, id);
  if (lock) return lock;
  if (state.parts < BALANCE.build.stations[id].parts) return 'noParts';
  return placementReason(state, cell);
}

export function startBuilding(state: GameState, id: BuildableId, cell: Cell): GameState {
  const rule = BALANCE.build.stations[id];
  return {
    ...state,
    parts: state.parts - rule.parts,
    buildings: { ...state.buildings, [id]: { cell: { x: cell.x, y: cell.y }, solsLeft: rule.sols } },
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

/** Room for B3: crates found while exploring add bonus parts and science. */
export function addBonus(state: GameState, parts: number, science: number): GameState {
  return {
    ...state,
    parts: state.parts + Math.max(0, Math.floor(parts)),
    science: state.science + Math.max(0, Math.floor(science)),
  };
}
