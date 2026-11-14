// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Build-mode visuals: a station that is still being built is see-through inside an orange
// scaffold; the placement ghost (green = valid spot, red = not) with the grid lines.

import * as THREE from 'three';
import { BALANCE } from '../config/balance.ts';
import type { PlacedId, Cell, Turn } from '../sim/actions.ts';
import { PLACEABLES } from '../sim/systems/build.ts';
import { buildStation } from './entities/stations.ts';
import { CELL, cellToWorld } from './grid.ts';
import { BUILDING_OPACITY, COLORS } from './layout.ts';

const SCAFFOLD_SIZE = 4.2;
const SCAFFOLD_HEIGHT = 3.4;

/** Orange poles and rails around a building site. */
export function buildScaffold(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.scaffold, flatShading: true });
  const half = SCAFFOLD_SIZE / 2;
  const pole = new THREE.CylinderGeometry(0.09, 0.09, SCAFFOLD_HEIGHT, 5);
  const rail = new THREE.BoxGeometry(SCAFFOLD_SIZE, 0.1, 0.1);
  for (const x of [-half, half]) {
    for (const z of [-half, half]) {
      const p = new THREE.Mesh(pole, mat);
      p.position.set(x, SCAFFOLD_HEIGHT / 2, z);
      p.castShadow = true;
      g.add(p);
    }
  }
  for (const y of [1.2, SCAFFOLD_HEIGHT - 0.1]) {
    for (const [z, turn] of [[-half, 0], [half, 0], [-half, 1], [half, 1]] as const) {
      const r = new THREE.Mesh(rail, mat);
      if (turn) r.position.set(z, y, 0);
      else r.position.set(0, y, z);
      r.rotation.y = turn ? Math.PI / 2 : 0;
      g.add(r);
    }
  }
  return g;
}

/** Fades every material of a station group (shared by all its meshes) to `factor`. */
export function makeFader(group: THREE.Object3D): (factor: number) => void {
  const mats: { mat: THREE.Material; opacity: number }[] = [];
  group.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (mat && !mats.some((m) => m.mat === mat)) mats.push({ mat, opacity: mat.opacity });
  });
  let current = 1;
  return (factor) => {
    if (factor === current) return;
    current = factor;
    for (const { mat, opacity } of mats) {
      mat.transparent = factor < 1 || opacity < 1;
      mat.opacity = opacity * factor;
      mat.depthWrite = factor >= 1;
      mat.needsUpdate = true;
    }
  };
}

export const FADE_BUILDING = BUILDING_OPACITY;

export interface Ghost {
  group: THREE.Group;
  /** Shows the ghost of `id` on `cell`; null hides it. */
  set(id: PlacedId | null, cell: Cell | null, valid: boolean, rot?: Turn): void;
}

export function createGhost(): Ghost {
  const group = new THREE.Group();
  const ok = new THREE.MeshBasicMaterial({ color: COLORS.ghostOk, transparent: true, opacity: 0.5, depthWrite: false });
  const bad = new THREE.MeshBasicMaterial({ color: COLORS.ghostBad, transparent: true, opacity: 0.5, depthWrite: false });
  const g = BALANCE.grid;
  const lines = new THREE.GridHelper(g.cols * CELL, g.cols, 0xffffff, 0xffffff);
  const lineMat = lines.material as THREE.Material;
  lineMat.transparent = true;
  lineMat.opacity = 0.28;
  lines.position.y = 0.04;
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(CELL, CELL), ok);
  tile.rotation.x = -Math.PI / 2;
  tile.position.y = 0.06;
  const models = {} as Record<PlacedId, THREE.Group>;
  for (const id of PLACEABLES) {
    const model = buildStation(id).group;
    model.userData.station = undefined;
    model.visible = false;
    models[id] = model;
  }
  group.add(lines, tile, ...Object.values(models));
  group.visible = false;
  let shown: PlacedId | null = null;
  let shownValid: boolean | null = null;
  return {
    group,
    set(id, cell, valid, rot = 0) {
      group.visible = id !== null;
      for (const key of PLACEABLES) models[key].visible = key === id && cell !== null;
      tile.visible = cell !== null;
      if (!id || !cell) return;
      const [x, z] = cellToWorld(cell);
      tile.position.set(x, 0.06, z);
      models[id].position.set(x, 0, z);
      models[id].rotation.y = -rot * (Math.PI / 2);
      if (shown === id && shownValid === valid) return;
      shown = id;
      shownValid = valid;
      tile.material = valid ? ok : bad;
      models[id].traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = valid ? ok : bad;
      });
    },
  };
}
