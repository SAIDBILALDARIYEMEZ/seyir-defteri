// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Valley layout and camera limits. Visual numbers only: game balance stays in balance.ts.

import type { StationId } from '../sim/actions.ts';

/** Every station id, in the order labels are drawn. Positions come from the grid (grid.ts). */
export const STATION_IDS: StationId[] = [
  'habitat',
  'panels',
  'moxie',
  'greenhouse',
  'shelter',
  'antenna',
  'beacon',
  'curiosity',
  'science',
];

/** Walking keeps this far from a station's center (simple collision). */
export const FOOTPRINT: Record<StationId, number> = {
  habitat: 3.6,
  panels: 3.4,
  moxie: 2.2,
  greenhouse: 2.6,
  shelter: 2.8,
  antenna: 1.6,
  beacon: 1.8,
  curiosity: 1.8,
  science: 2.2,
};

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
  radius: 50,
  minRadius: 32,
  maxRadius: 66,
  elevation: 0.5,
  maxAzimuth: 0.55,
  /** Slightly right of the grid center: the store and the watch cover the right edge. */
  target: [2, 0, 1] as const,
  rotateSpeed: 0.004,
  zoomSpeed: 0.02,
};

/** Opacity factor of a station that is not unlocked yet. */
export const LOCKED_OPACITY = 0.22;

/** PUSULA waits this far to the side of where Ada stands. */
export const PUSULA_SIDE = 3;

/** Walking speed of Ada in the valley (world units per second). Visual only. */
export const WALK_SPEED = 7;

/** Opacity factor of a station that is still being built (scaffold around it). */
export const BUILDING_OPACITY = 0.35;

export const COLORS = {
  skyDay: 0xe6ad90,
  skyNight: 0x2b3157,
  skyDust: 0xc98a5a,
  ground: 0xb5532f,
  hill: 0x9c4526,
  rock: 0x8c3f24,
  groundDark: 0x9a4426,
  groundLight: 0xcf7447,
  skyTop: 0xc4785a,
  scaffold: 0xf2a33a,
  ghostOk: 0x4fdc7a,
  ghostBad: 0xff5a4a,
};
