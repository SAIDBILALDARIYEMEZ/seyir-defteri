// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene contract (F5c): a cutscene owns its camera, may bring its own scene (space), and sets
// the sky, storm and sun while it runs. It never touches GameState or the DOM: it reports named
// beats, and game/cinema.ts turns them into subtitles, overlays and sounds.

import type * as THREE from 'three';
import type { StationId } from '../../sim/actions.ts';
import type { Astronaut } from '../entities/astronaut.ts';
import type { Pusula } from '../entities/pusula.ts';
import type { StormMode } from '../fx/storm.ts';
import type { SkyMode } from '../lighting.ts';

export interface Stage {
  scene: THREE.Scene;
  ada: Astronaut;
  pusula: Pusula;
  /** The landing rocket in the valley (scenery). */
  lander: THREE.Object3D;
  /** Where Ada waits before the habitat exists. */
  landerStand: [number, number];
  /** The game's orbit camera: cutscenes blend into it at the end. */
  gameCamera: THREE.PerspectiveCamera;
  /** Shown stations (built or under construction). */
  spots(): { id: StationId; x: number; z: number }[];
  /** Ada's spot in front of the habitat, or null when it is not placed. */
  habitatStand(): [number, number] | null;
}

export interface Cutscene {
  camera: THREE.PerspectiveCamera;
  /** Own scene (space shot) or null for the valley. */
  scene: THREE.Scene | null;
  /** null = the world's normal sky. */
  sky: SkyMode | null;
  storm: StormMode;
  /** Share of the daylight used (0 = dawn), or null to keep the game's. */
  day: number | null;
  update(dt: number): void;
}

/** Beat ids a cutscene reports; the controller maps them to UI and sound. */
export type Beat =
  | 'bars'
  | 'title'
  | 'whoosh'
  | 'fadeOut'
  | 'fadeIn'
  | 'storm'
  | 'warn'
  | 'impact'
  | 'flash'
  | 'black'
  | 'wake'
  | 'talk'
  | 'clear'
  | 'land'
  | 'lightsOut'
  | 'final'
  | 'board'
  | 'liftoff'
  | 'end';

/** Options every cutscene gets from the controller. */
export interface CutsceneOptions {
  /** Reduce motion (F5c setting): no camera shake. */
  calm: boolean;
  /** Seconds the cutscene's main dialogue needs (from word counts); shots wait for it. */
  talk: number;
  /** `at`: the beat's scheduled time on the cutscene clock. */
  onBeat(beat: Beat, at: number): void;
  /** Every frame with the cutscene clock (frame-driven overlay effects and subtitles). */
  onTick(t: number): void;
  /** Runs once when the last shot ends (not on skip). */
  onEnd(): void;
}

/** A running cutscene plus its clean-up (props removed, Ada / PUSULA / rocket restored). */
export interface Playing extends Cutscene {
  dispose(): void;
}

/** Fires each beat once when the clock passes its time. */
export function beatClock(beats: [number, Beat][], onBeat: (beat: Beat, at: number) => void): (t: number) => void {
  const list = [...beats].sort((a, b) => a[0] - b[0]);
  let next = 0;
  return (t) => {
    for (let b = list[next]; b && b[0] <= t; b = list[++next]) onBeat(b[1], b[0]);
  };
}
