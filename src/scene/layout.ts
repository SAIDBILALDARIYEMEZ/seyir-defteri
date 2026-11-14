// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Valley layout and camera limits. Visual numbers only: game balance stays in balance.ts.

import type { StationId } from '../sim/actions.ts';

/** Ground position [x, z] of each station. The camera looks from +z towards -z. */
export const STATION_POS: Record<StationId, readonly [number, number]> = {
  habitat: [0, -3],
  panels: [-10, 1],
  moxie: [-5.5, -8],
  greenhouse: [6.5, -8],
  shelter: [11, 0],
  antenna: [-14, -8],
  beacon: [3, 7],
  curiosity: [-15, 9],
  science: [16, 8],
};

export const STATION_IDS = Object.keys(STATION_POS) as StationId[];

/** How far in front of a station (towards the camera) the astronaut stops. */
export const STAND_OFFSET: Record<StationId, number> = {
  habitat: 4.4,
  panels: 2.8,
  moxie: 2.4,
  greenhouse: 3,
  shelter: 3.4,
  antenna: 2.4,
  beacon: 2.2,
  curiosity: 2.8,
  science: 2.8,
};

/** Height of the floating name label above each station. */
export const LABEL_HEIGHT: Record<StationId, number> = {
  habitat: 4.6,
  panels: 3.2,
  moxie: 3.4,
  greenhouse: 3.6,
  shelter: 3.4,
  antenna: 5.6,
  beacon: 2.4,
  curiosity: 3.6,
  science: 3.4,
};

export const CAMERA = {
  fov: 40,
  radius: 44,
  minRadius: 30,
  maxRadius: 52,
  elevation: 0.5,
  maxAzimuth: 0.55,
  target: [0, 0, -1.5] as const,
  rotateSpeed: 0.004,
  zoomSpeed: 0.02,
};

/** Seconds of walking animation per simulated walking hour. */
export const WALK_SECONDS_PER_HOUR = 2.4;

export const COLORS = {
  skyDay: 0xe6ad90,
  skyNight: 0x2b3157,
  skyDust: 0xc98a5a,
  ground: 0xb5532f,
  hill: 0x9c4526,
  rock: 0x8c3f24,
};
