// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// three.js world: the Mars valley. Reads GameState, never mutates it.

import * as THREE from 'three';
import { BALANCE } from '../config/balance.ts';
import type { StationId } from '../sim/actions.ts';
import type { GameState } from '../sim/state.ts';
import { createAstronaut } from './entities/astronaut.ts';
import { buildPassive, buildStation, buildTerrain } from './entities/stations.ts';
import type { StationParts } from './entities/stations.ts';
import { createStorm } from './fx/storm.ts';
import type { StormMode } from './fx/storm.ts';
import { CAMERA, COLORS, LABEL_HEIGHT, STAND_OFFSET, STATION_IDS, STATION_POS } from './layout.ts';

export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

export interface World {
  /** Renders one frame. dt in seconds (0 while paused). */
  update(dt: number): void;
  /** Station under a screen point, or null. */
  pick(clientX: number, clientY: number): StationId | null;
  walkTo(station: StationId, seconds: number, onArrive: () => void): void;
  placeAda(station: StationId): void;
  adaStation(): StationId;
  /** Screen position of a station label, or of Ada's head. */
  screenOf(target: StationId | 'ada'): ScreenPoint;
  rotate(dxPixels: number): void;
  zoom(delta: number): void;
  /** Syncs visuals that depend on the game state. */
  sync(state: GameState, storm: StormMode): void;
  setNight(night: boolean): void;
}

const DUSTY_PANEL = new THREE.Color(0x9a6a4a);
const CLEAN_PANEL = new THREE.Color(0x2f5fa8);
const SKY_LERP = 2.5;

export function createWorld(canvas: HTMLCanvasElement): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const sky = new THREE.Color(COLORS.skyDay);
  const skyTarget = new THREE.Color(COLORS.skyDay);
  scene.background = sky;
  const fog = new THREE.Fog(COLORS.skyDay, 60, 170);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 300);
  const hemi = new THREE.HemisphereLight(0xffe2cc, 0x7a3b22, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
  sun.position.set(12, 18, 8);
  scene.add(hemi, sun, buildTerrain(), buildPassive());

  const stations = {} as Record<StationId, StationParts>;
  const pickable: THREE.Object3D[] = [];
  for (const id of STATION_IDS) {
    const parts = buildStation(id);
    const [x, z] = STATION_POS[id];
    parts.group.position.set(x, 0, z);
    stations[id] = parts;
    pickable.push(parts.group);
    scene.add(parts.group);
  }

  const standOf = (id: StationId): [number, number] => {
    const [x, z] = STATION_POS[id];
    return [x, z + STAND_OFFSET[id]];
  };
  const ada = createAstronaut();
  let adaAt: StationId = 'habitat';
  ada.place(...standOf(adaAt));
  scene.add(ada.group);

  const storm = createStorm(scene);
  let stormMode: StormMode = 'none';
  let night = false;

  let azimuth = 0;
  let radius: number = CAMERA.radius;
  const placeCamera = (): void => {
    const [tx, ty, tz] = CAMERA.target;
    // Narrow (portrait-ish) screens need more distance to keep the whole valley in view.
    const fit = Math.max(1, 1.45 / camera.aspect);
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

  return {
    update(dt) {
      ada.update(dt);
      storm.update(dt);
      skyTarget.setHex(night ? COLORS.skyNight : stormMode === 'dust' ? COLORS.skyDust : COLORS.skyDay);
      sky.lerp(skyTarget, Math.min(1, dt * SKY_LERP));
      fog.color.copy(sky);
      const light = night ? 0.35 : 1;
      hemi.intensity += (1.1 * light - hemi.intensity) * Math.min(1, dt * SKY_LERP);
      sun.intensity += (1.6 * light - sun.intensity) * Math.min(1, dt * SKY_LERP);
      renderer.render(scene, camera);
    },
    pick(clientX, clientY) {
      ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      let hit: THREE.Object3D | null = raycaster.intersectObjects(pickable, true)[0]?.object ?? null;
      while (hit && !hit.userData.station) hit = hit.parent;
      return (hit?.userData.station as StationId | undefined) ?? null;
    },
    walkTo(station, seconds, onArrive) {
      adaAt = station;
      ada.walkTo(...standOf(station), seconds, onArrive);
    },
    placeAda(station) {
      adaAt = station;
      ada.place(...standOf(station));
    },
    adaStation: () => adaAt,
    screenOf(target) {
      if (target === 'ada') probe.copy(ada.group.position).setY(3.6);
      else probe.set(STATION_POS[target][0], LABEL_HEIGHT[target], STATION_POS[target][1]);
      probe.project(camera);
      return {
        x: (probe.x * 0.5 + 0.5) * window.innerWidth,
        y: (-probe.y * 0.5 + 0.5) * window.innerHeight,
        visible: probe.z < 1,
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
      stations.panels.panelMat?.color.copy(DUSTY_PANEL).lerp(CLEAN_PANEL, state.panelEff);
      const level = state.shelterLevel / BALANCE.actions.shelterBuild.maxLevel;
      stations.shelter.mound?.scale.set(1 + level * 0.25, 0.55 + level * 0.6, 1 + level * 0.25);
    },
    setNight(value) {
      night = value;
    },
  };
}
