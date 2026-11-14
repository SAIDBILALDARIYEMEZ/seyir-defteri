// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Shared game-controller context: the session (state, seed, window, UI mode) plus the services
// the controller modules call on each other. game.ts creates it and fills in the functions.

import type { Placement } from '../input/placement.ts';
import type { Rng } from '../sim/rng.ts';
import type { Action, StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import type { WindowData } from '../sim/window.ts';
import type { World } from '../scene/world.ts';
import type { ActionMenu, ModalSpec } from '../ui/overlays.ts';
import type { Cinema } from './cinema.ts';

export interface Mission {
  seed: number;
  win: WindowData;
}

/** Seed + window choices live outside the game (main.ts owns Math.random and storage flags). */
export interface Missions {
  /** Seed + window for a "New Mission" (first game: window 1, later: random seed, D-011). */
  next(): Mission;
  ofSave(seed: number, windowId: string): Mission;
  fromCode(code: string): Mission | null;
  codeOf(seed: number, windowId: string): string;
  /** The three real months, for the storm picker. */
  windows(): WindowData[];
  /** A new random-seed mission in the picked window. */
  pick(win: WindowData): Mission;
}

export interface Session {
  seed: number;
  win: WindowData;
  rng: Rng;
  state: GameState;
  /** While the night card is open the HUD keeps the end-of-day values (D-011). */
  frozen: GameState | null;
  /** 'cine': a cutscene runs (F5c); the HUD and input are off. */
  mode: 'menu' | 'play' | 'cine';
  walking: boolean;
  /** Ada waits inside the shelter (F5b): only "Go outside" and the pause menu work. */
  sheltered: boolean;
  openStation: StationId | null;
  modals: number;
  closePause: (() => void) | null;
}

export interface Ctx {
  s: Session;
  ui: HTMLElement;
  world: World;
  missions: Missions;
  menu: ActionMenu;
  placement: Placement;
  cinema: Cinema;
  render(snapGuide?: boolean): void;
  modal(build: () => ModalSpec): () => void;
  perform(action: Action, quiet?: boolean): void;
  /** True when the player can act (playing, not walking, no card open). */
  free(): boolean;
  /** True when Ada may start a new walk: like free(), but a walk in progress can be retargeted (F5b). */
  canWalk(): boolean;
  /** Saves now (autosave, pause menu); returns false when storage is blocked. */
  save(): boolean;
  /** "Wait in the shelter": Ada walks in and waits there hour by hour (F5b). */
  enterShelter(): void;
}

export const CREW_ID = 0;
