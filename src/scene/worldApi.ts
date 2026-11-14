// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The world's public interface (moved out of world.ts in F5c to keep it under 300 lines).

import type { Cell, PlacedId, StationId, Turn } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import type { OrbitCamera } from './camera.ts';
import type { Cutscene, Stage } from './cutscenes/cutscene.ts';
import type { StormMode } from './fx/storm.ts';

export type PickId = StationId | 'pusula' | 'lander';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
  depth?: number; // projected depth: smaller = closer to the camera
}

export interface World {
  /** Renders one frame. dt in seconds (0 while paused). */
  update(dt: number): void;
  /** Visible station, PUSULA or the rocket under a screen point, or null. */
  pick(clientX: number, clientY: number): PickId | null;
  /** Built and ready (not under construction): Ada can work there. */
  isUsable(id: StationId): boolean;
  /** Ground point under a screen point, or null (sky). */
  pickGround(clientX: number, clientY: number): { x: number; z: number } | null;
  /** Ada walks to the front of a station. */
  walkTo(station: StationId, onArrive: () => void): void;
  /** Ada walks to the front of a grid cell (building site). */
  walkToCell(cell: Cell, onArrive: () => void): void;
  /** Free walk on the ground (click-to-walk); stops outside buildings. */
  walkToPoint(x: number, z: number, onArrive?: () => void): void;
  placeAda(station: StationId): void;
  /** Hides Ada inside a building (shelter, F5b) or shows her again. */
  setAdaVisible(visible: boolean): void;
  /** Screen position of a station label, or of Ada's / PUSULA's head. */
  screenOf(target: StationId | 'ada' | 'pusula'): ScreenPoint;
  /** Camera (B4): drag = turn around + tilt, twist / pinch for two fingers, buttons, compass. */
  view: OrbitCamera;
  /** Syncs visuals that depend on the game state (positions, build status, gauges). */
  sync(state: GameState, storm: StormMode): void;
  setNight(night: boolean): void;
  /** PUSULA rolls to this station; `danger` turns its light red. */
  setGuide(station: StationId, danger: boolean, snap?: boolean): void;
  /** 3D arrow + ground ring over a station (F5a); null hides it. */
  setMarker(station: StationId | null): void;
  /** Placement ghost: null hides it. */
  setGhost(id: PlacedId | null, cell: Cell | null, valid: boolean, rot?: Turn): void;
  /** Loads the low-poly models and swaps them in (F5a). Never rejects; missing ones stay primitive. */
  useModels(onSwap: () => void): Promise<void>;
  /** F5c: the pieces a cutscene moves (scene, Ada, PUSULA, rocket, cameras). */
  stage(): Stage;
  /** F5c: compiles the shaders a cutscene needs (no first-use stalls); frames pause meanwhile. */
  warm(cutscene: Cutscene): Promise<void>;
  /** F5c: a running cutscene owns the camera, sky and storm; null gives them back. */
  play(cutscene: Cutscene | null): void;
}

