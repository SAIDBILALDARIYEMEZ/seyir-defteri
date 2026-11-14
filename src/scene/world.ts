// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// three.js world: the Mars valley. Reads GameState, never mutates it.

import * as THREE from 'three';
import { BALANCE } from '../config/balance.ts';
import type { Cell, PlacedId, StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { isPlaceable } from '../sim/systems/build.ts';
import { buildScaffold, createGhost, FADE_BUILDING, makeFader } from './construction.ts';
import { createAstronaut } from './entities/astronaut.ts';
import { PUSULA_HEAD_HEIGHT, createPusula } from './entities/pusula.ts';
import { buildStation } from './entities/stations.ts';
import type { StationParts } from './entities/stations.ts';
import { buildTerrain } from './entities/terrain.ts';
import { createStorm } from './fx/storm.ts';
import type { StormMode } from './fx/storm.ts';
import { GRID_HALF, cellToWorld, stationCell } from './grid.ts';
import { CAMERA, FOOTPRINT, LABEL_HEIGHT, PUSULA_SIDE, STAND_OFFSET, STATION_IDS, WALK_SPEED } from './layout.ts';
import { createLighting } from './lighting.ts';
import { findPath } from './path.ts';
import type { Blocker, Point } from './path.ts';

export type PickId = StationId | 'pusula';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface World {
  /** Renders one frame. dt in seconds (0 while paused). */
  update(dt: number): void;
  /** Usable station (or PUSULA) under a screen point, or null. */
  pick(clientX: number, clientY: number): PickId | null;
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
  rotate(dxPixels: number): void;
  zoom(delta: number): void;
  /** Syncs visuals that depend on the game state (positions, build status, gauges). */
  sync(state: GameState, storm: StormMode): void;
  setNight(night: boolean): void;
  /** PUSULA rolls to this station; `danger` turns its light red. */
  setGuide(station: StationId, danger: boolean, snap?: boolean): void;
  /** Placement ghost: null hides it. */
  setGhost(id: PlacedId | null, cell: Cell | null, valid: boolean): void;
}

const DUSTY_PANEL = new THREE.Color(0x9a6a4a);
const CLEAN_PANEL = new THREE.Color(0x2f5fa8);
const WALK_LIMIT = GRID_HALF + 3;
/** Portrait phones: stop pulling the camera back here (fog would wash the valley out). */
const MAX_FIT = 1.9;

interface StationView extends StationParts {
  fade: (factor: number) => void;
  scaffold: THREE.Group;
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
  scene.add(buildTerrain());

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
  const standOf = (id: StationId): [number, number] => [posOf(id).x, posOf(id).z + STAND_OFFSET[id]];

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
  const freeSpot = (x: number, z: number): [number, number] => {
    let px = THREE.MathUtils.clamp(x, -WALK_LIMIT, WALK_LIMIT);
    let pz = THREE.MathUtils.clamp(z, -WALK_LIMIT, WALK_LIMIT);
    for (const b of blockers()) {
      const dx = px - b.x;
      const dz = pz - b.z;
      const d = Math.hypot(dx, dz);
      if (d >= b.r) continue;
      const k = d < 1e-3 ? 0 : b.r / d;
      px = d < 1e-3 ? b.x : b.x + dx * k;
      pz = d < 1e-3 ? b.z + b.r : b.z + dz * k;
    }
    return [px, pz];
  };

  const ada = createAstronaut();
  shadows(ada.group);
  ada.place(...landerStand);
  scene.add(ada.group);
  const pusula = createPusula();
  shadows(pusula.group);
  scene.add(pusula.group);
  const ghost = createGhost();
  scene.add(ghost.group);

  const storm = createStorm(scene);
  let stormMode: StormMode = 'none';
  let night = false;

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 600);
  let azimuth = 0;
  let radius: number = CAMERA.radius;
  const placeCamera = (): void => {
    const [tx, ty, tz] = CAMERA.target;
    // Narrow (portrait-ish) screens need more distance to keep the whole valley in view.
    const fit = THREE.MathUtils.clamp(1.45 / camera.aspect, 1, MAX_FIT);
    const r = radius * fit;
    const flatR = r * Math.cos(CAMERA.elevation);
    camera.position.set(tx + Math.sin(azimuth) * flatR, ty + r * Math.sin(CAMERA.elevation), tz + Math.cos(azimuth) * flatR);
    camera.lookAt(tx, ty, tz);
  };
  const resize = (): void => {
    const { innerWidth: w, innerHeight: h } = window;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    placeCamera();
  };
  window.addEventListener('resize', resize);
  resize();

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const probe = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aim = (clientX: number, clientY: number): void => {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  /** Walks around buildings: one straight leg per waypoint (B3 path-finding). */
  let walkId = 0;
  const walk = (x: number, z: number, onArrive: () => void): void => {
    const target = freeSpot(x, z);
    const from: Point = [ada.group.position.x, ada.group.position.z];
    const legs = findPath(from, target, blockers(), WALK_LIMIT);
    const id = ++walkId;
    const next = (): void => {
      const leg = legs.shift();
      if (!leg || id !== walkId) return onArrive();
      const d = Math.hypot(leg[0] - ada.group.position.x, leg[1] - ada.group.position.z);
      ada.walkTo(leg[0], leg[1], d / WALK_SPEED, next);
    };
    next();
  };

  return {
    update(dt) {
      ada.update(dt);
      pusula.update(dt);
      storm.update(dt);
      lighting.setMode(night ? 'night' : stormMode === 'dust' ? 'dust' : 'day');
      lighting.update(dt);
      renderer.render(scene, camera);
    },
    pick(clientX, clientY) {
      aim(clientX, clientY);
      const pickable = [pusula.group, ...STATION_IDS.filter((id) => views[id].usable).map((id) => views[id].group)];
      let hit: THREE.Object3D | null = raycaster.intersectObjects(pickable, true)[0]?.object ?? null;
      while (hit && !hit.userData.station) hit = hit.parent;
      return (hit?.userData.station as PickId | undefined) ?? null;
    },
    pickGround(clientX, clientY) {
      aim(clientX, clientY);
      const hit = raycaster.ray.intersectPlane(floor, probe);
      return hit ? { x: hit.x, z: hit.z } : null;
    },
    walkTo(station, onArrive) {
      walk(...standOf(station), onArrive);
    },
    walkToCell(cell, onArrive) {
      const [x, z] = cellToWorld(cell);
      walk(x, z + 2.6, onArrive);
    },
    walkToPoint(x, z, onArrive) {
      walk(x, z, onArrive ?? (() => undefined));
    },
    placeAda(station) {
      ada.place(...freeSpot(...(views[station].group.visible ? standOf(station) : landerStand)));
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
    rotate(dxPixels) {
      azimuth = THREE.MathUtils.clamp(azimuth - dxPixels * CAMERA.rotateSpeed, -CAMERA.maxAzimuth, CAMERA.maxAzimuth);
      placeCamera();
    },
    zoom(delta) {
      radius = THREE.MathUtils.clamp(radius + delta * CAMERA.zoomSpeed, CAMERA.minRadius, CAMERA.maxRadius);
      placeCamera();
    },
    sync(state, mode) {
      stormMode = mode;
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
        }
        view.scaffold.visible = status === 'building';
        view.fade(status === 'building' ? FADE_BUILDING : 1);
        view.usable = status === 'ready';
      }
      views.panels.panelMat?.color.copy(DUSTY_PANEL).lerp(CLEAN_PANEL, state.panelEff);
      const level = state.shelterLevel / BALANCE.actions.shelterBuild.maxLevel;
      views.shelter.mound?.scale.set(1 + level * 0.25, 0.55 + level * 0.6, 1 + level * 0.25);
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
    setGhost(id, cell, valid) {
      ghost.set(id, cell, valid);
    },
  };
}
