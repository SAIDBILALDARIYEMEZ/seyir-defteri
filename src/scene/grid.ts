// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Maps the sim's build grid (BALANCE.grid) to the 3D valley. The grid is centered on the
// origin; one cell is CELL world units. The camera looks from +z, so grid row y grows towards it.

import { BALANCE } from '../config/balance.ts';
import type { Cell, StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { isBuildable } from '../sim/systems/build.ts';

export const CELL = 3;
const midX = (BALANCE.grid.cols - 1) / 2;
const midY = (BALANCE.grid.rows - 1) / 2;
/** Half the grid's width in world units. */
export const GRID_HALF = (BALANCE.grid.cols * CELL) / 2;

export function cellToWorld(cell: Cell): [number, number] {
  return [(cell.x - midX) * CELL, (cell.y - midY) * CELL];
}

export function worldToCell(x: number, z: number): Cell {
  return { x: Math.round(x / CELL + midX), y: Math.round(z / CELL + midY) };
}

/** Grid cell of a station, or null when a buildable station is not placed yet. */
export function stationCell(state: GameState, id: StationId): Cell | null {
  if (isBuildable(id)) return state.buildings[id]?.cell ?? null;
  return BALANCE.grid.fixed[id];
}
