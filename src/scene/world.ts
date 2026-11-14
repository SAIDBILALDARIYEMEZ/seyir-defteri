// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// three.js world: the Mars valley. Reads GameState, never mutates it.

import * as THREE from 'three';
import { BALANCE } from '../config/balance.ts';
import type { Cell, PlacedId, StationId, Turn } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { isPlaceable } from '../sim/systems/build.ts';
import { createOrbitCamera } from './camera.ts';
import type { OrbitCamera } from './camera.ts';
import { createPicker } from './picking.ts';
import { buildScaffold, createGhost, FADE_BUILDING, makeFader } from './construction.ts';
import { ADA_MODEL, createAstronaut } from './entities/astronaut.ts';
import { ROVER_DECOR_MODEL, SCENE_MODELS } from './entities/stationModels.ts';
import { addRoverDecor, swapLander, swapStation, syncModelLooks } from './modelSwap.ts';
import type { SwapView } from './modelSwap.ts';
import { loadModels } from './models/loader.ts';
import { createMarker } from './entities/marker.ts';
import { PUSULA_HEAD_HEIGHT, createPusula } from './entities/pusula.ts';
import { buildStation } from './entities/stations.ts';
import type { StationParts } from './entities/stations.ts';
import { buildTerrain } from './entities/terrain.ts';
import { createStorm } from './fx/storm.ts';
import type { StormMode } from './fx/storm.ts';
import { GRID_HALF, cellToWorld, stationCell } from './grid.ts';
import { FOOTPRINT, LABEL_HEIGHT, PUSULA_SIDE, STAND_OFFSET, STATION_IDS, WALK_SPEED } from './layout.ts';
import { createLighting } from './lighting.ts';
import { findPath, pushOut } from './path.ts';
import type { Blocker, Point } from './path.ts';

export type PickId = StationId | 'pusula' | 'lander';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
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
}

const DUSTY_PANEL = new THREE.Color(0x9a6a4a);
const CLEAN_PANEL = new THREE.Color(0x2f5fa8);
const WALK_LIMIT = GRID_HALF + 3;
const QUARTER = Math.PI / 2;
/** Rover decor (x, z, yaw): outside the walk area, near the Curiosity corner. */
const ROVER_SPOT: [number, number, number] = [GRID_HALF + 7, -GRID_HALF + 4, -2.3];

interface StationView extends StationParts, SwapView {
  usable: boolean;
}

function shadows(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const glass = (mesh.material as THREE.Material).transparent;
    mesh.castShadow = !glass;
    mesh.receiveShadow = true;
  });
}

export function createWorld(canvas: HTMLCanvasElement): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const lighting = createLighting(scene);
  const terrain = buildTerrain();
  scene.add(terrain);
  const lander = terrain.getObjectByName('lander') as THREE.Object3D;

  const views = {} as Record<StationId, StationView>;
  for (const id of STATION_IDS) {
    const parts = buildStation(id);
    shadows(parts.group);
    const scaffold = buildScaffold();
    scaffold.visible = false;
    parts.group.add(scaffold);
    views[id] = { ...parts, fade: makeFader(parts.group), scaffold, usable: !isPlaceable(id) };
    scene.add(parts.group);
  }
  const posOf = (id: StationId): THREE.Vector3 => views[id].group.position;
  /** In front of the station's door: the stand turns with the building's facing (B4). */
  const standOf = (id: StationId): [number, number] => {
    const turn = views[id].group.rotation.y;
    return [posOf(id).x + Math.sin(turn) * STAND_OFFSET[id], posOf(id).z + Math.cos(turn) * STAND_OFFSET[id]];
  };

  // Fixed stations never move; placed ones (starters included) appear once on the grid.
  for (const id of STATION_IDS) {
    if (isPlaceable(id)) views[id].group.visible = false;
    else {
      const [x, z] = cellToWorld(BALANCE.grid.fixed[id]);
      posOf(id).set(x, 0, z);
    }
  }
  const [landerX, landerZ] = cellToWorld(BALANCE.grid.lander);
  /** Before the habitat is set up, Ada waits in front of the rocket. */
  const landerStand: [number, number] = [landerX - 2.5, landerZ + 3];
  const LANDER_R = 2.6;
  const blockers = (): Blocker[] => [
    { x: landerX, z: landerZ, r: LANDER_R },
    ...STATION_IDS.filter((id) => views[id].group.visible).map((id) => ({ x: posOf(id).x, z: posOf(id).z, r: FOOTPRINT[id] })),
  ];

  /** Simple collision: keep the walk target inside the valley and outside every building. */
  const freeSpot = (x: number, z: number): [number, number] => pushOut(x, z, blockers(), WALK_LIMIT);

  const ada = createAstronaut();
  shadows(ada.group);
  ada.place(...landerStand);
  scene.add(ada.group);
  const pusula = createPusula();
  shadows(pusula.group);
  scene.add(pusula.group);
  const ghost = createGhost();
  scene.add(ghost.group);
  const marker = createMarker();
  scene.add(marker.group);

  const storm = createStorm(scene);
  let stormMode: StormMode = 'none';
  let night = false;

  const orbit = createOrbitCamera();
  const camera = orbit.camera;
  const resize = (): void => {
    const { innerWidth: w, innerHeight: h } = window;
    renderer.setSize(w, h, false);
    orbit.setAspect(w / h);
  };
  window.addEventListener('resize', resize);
  resize();

  const picker = createPicker(camera);
  const probe = new THREE.Vector3();
  /** Walks around buildings: one straight leg per waypoint (B3 path-finding). */
  let walkId = 0;
  const walk = (x: number, z: number, onArrive: () => void, face?: Point): void => {
    const target = freeSpot(x, z);
    const from: Point = [ada.group.position.x, ada.group.position.z];
    const legs = findPath(from, target, blockers(), WALK_LIMIT);
    const id = ++walkId;
    const next = (): void => {
      const leg = legs.shift();
      if (!leg || id !== walkId) {
        if (face && id === walkId) ada.face(...face);
        return onArrive();
      }
      const d = Math.hypot(leg[0] - ada.group.position.x, leg[1] - ada.group.position.z);
      ada.walkTo(leg[0], leg[1], d / WALK_SPEED, next);
    };
    next();
  };

  return {
    update(dt) {
      orbit.follow(ada.group.position.x, ada.group.position.z);
      orbit.update(dt);
      ada.update(dt);
      pusula.update(dt);
      marker.update(dt);
      storm.update(dt, orbit.focus());
      lighting.setMode(night ? 'night' : stormMode === 'none' ? 'day' : stormMode);
      lighting.update(dt);
      renderer.render(scene, camera);
    },
    pick(clientX, clientY) {
      const shown = STATION_IDS.filter((id) => views[id].group.visible).map((id) => views[id].group);
      return picker.tagged(clientX, clientY, [pusula.group, lander, ...shown]) as PickId | null;
    },
    isUsable: (id) => views[id].usable && views[id].group.visible,
    pickGround: (clientX, clientY) => picker.ground(clientX, clientY),
    walkTo(station, onArrive) {
      walk(...standOf(station), onArrive, [posOf(station).x, posOf(station).z]);
    },
    walkToCell(cell, onArrive) {
      const [x, z] = cellToWorld(cell);
      walk(x, z + 2.6, onArrive, [x, z]);
    },
    walkToPoint(x, z, onArrive) {
      walk(x, z, onArrive ?? (() => undefined));
    },
    placeAda(station) {
      const shown = views[station].group.visible;
      ada.place(...freeSpot(...(shown ? standOf(station) : landerStand)));
      if (shown) ada.face(posOf(station).x, posOf(station).z);
    },
    screenOf(target) {
      if (target === 'ada') probe.copy(ada.group.position).setY(3.6);
      else if (target === 'pusula') probe.copy(pusula.group.position).setY(PUSULA_HEAD_HEIGHT + 0.9);
      else probe.copy(posOf(target)).setY(LABEL_HEIGHT[target]);
      probe.project(camera);
      return {
        x: (probe.x * 0.5 + 0.5) * window.innerWidth,
        y: (-probe.y * 0.5 + 0.5) * window.innerHeight,
        visible: probe.z < 1 && (target === 'ada' || target === 'pusula' || views[target].group.visible),
      };
    },
    view: orbit,
    sync(state, mode) {
      stormMode = mode;
      lighting.setDayFraction(1 - state.hoursLeft / BALANCE.daylightHours);
      storm.setMode(mode);
      for (const id of STATION_IDS) {
        const view = views[id];
        if (!isPlaceable(id)) continue;
        const cell = stationCell(state, id);
        const b = state.buildings[id];
        const status = !b ? 'none' : b.solsLeft > 0 ? 'building' : 'ready';
        view.group.visible = cell !== null;
        if (cell) {
          const [x, z] = cellToWorld(cell);
          view.group.position.set(x, 0, z);
          view.group.rotation.y = -(b?.rot ?? 0) * QUARTER;
        }
        view.scaffold.visible = status === 'building';
        view.fade(status === 'building' ? FADE_BUILDING : 1);
        view.usable = status === 'ready';
      }
      views.panels.panelMat?.color.copy(DUSTY_PANEL).lerp(CLEAN_PANEL, state.panelEff);
      const level = state.shelterLevel / BALANCE.actions.shelterBuild.maxLevel;
      views.shelter.mound?.scale.set(1 + level * 0.25, 0.55 + level * 0.6, 1 + level * 0.25);
      syncModelLooks(views.panels, views.shelter, state.panelEff, state.shelterLevel);
    },
    setNight(value) {
      night = value;
    },
    setGuide(station, danger, snap) {
      const at = views[station].group.visible ? station : 'habitat';
      const stand = views[at].group.visible ? standOf(at) : landerStand;
      const [x, z] = freeSpot(stand[0] + PUSULA_SIDE, stand[1] + 1);
      pusula.goTo(x, z, snap);
      pusula.setDanger(danger);
    },
    setMarker(station) {
      const shown = station && views[station].group.visible ? station : null;
      marker.set(shown && { x: posOf(shown).x, z: posOf(shown).z, height: LABEL_HEIGHT[shown] + 1.6, radius: FOOTPRINT[shown] + 0.8 });
    },
    setGhost(id, cell, valid, rot = 0) {
      ghost.set(id, cell, valid, rot);
    },
    async useModels(onSwap) {
      await loadModels([...SCENE_MODELS, ADA_MODEL]);
      for (const id of STATION_IDS) swapStation(id, views[id]);
      swapLander(lander);
      if (ada.useModel()) shadows(ada.group);
      if (pusula.useModel()) shadows(pusula.group);
      onSwap();
      // The big rover decor comes last so it never delays the base.
      await loadModels([ROVER_DECOR_MODEL]);
      addRoverDecor(scene, ROVER_SPOT[0], ROVER_SPOT[1], ROVER_SPOT[2]);
    },
  };
}
