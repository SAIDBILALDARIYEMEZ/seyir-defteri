// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Swaps the primitive placeholders for the loaded low-poly models (F5a). The game is playable
// with primitives from the first frame; models replace them when (and only if) they load.

import * as THREE from 'three';
import type { StationId } from '../sim/actions.ts';
import { makeFader } from './construction.ts';
import { WRECK } from './entities/wreck.ts';
import { buildLander, buildRoverDecor, buildStationModel, PANEL_CLEAN, PANEL_DUSTY } from './entities/stationModels.ts';

export interface SwapView {
  group: THREE.Group;
  scaffold: THREE.Group;
  fade: (factor: number) => void;
  panelMat?: THREE.MeshLambertMaterial;
  mound?: THREE.Mesh;
  panelMats?: THREE.MeshStandardMaterial[];
  piles?: THREE.Object3D[];
}

export function castShadows(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const glass = (mesh.material as THREE.Material).transparent;
    mesh.castShadow = mesh.castShadow && !glass;
    mesh.receiveShadow = true;
  });
}

/**
 * Replaces a station's primitive parts with its model. The primitives are removed, not hidden:
 * the raycaster also hits invisible meshes (CLAUDE.md: no invisible hit volumes).
 */
export function swapStation(id: StationId, view: SwapView): boolean {
  const model = buildStationModel(id);
  if (!model) return false;
  for (const child of [...view.group.children]) if (child !== view.scaffold) view.group.remove(child);
  castShadows(model.group);
  view.group.add(model.group);
  view.fade = makeFader(view.group);
  view.panelMat = undefined;
  view.mound = undefined;
  view.panelMats = model.panelMats;
  view.piles = model.piles;
  return true;
}

const clean = new THREE.Color(PANEL_CLEAN);
const dusty = new THREE.Color(PANEL_DUSTY);

/** Dust on the model panels (0 = dusty, 1 = clean) and one regolith pile per shelter level. */
export function syncModelLooks(panels: SwapView, shelter: SwapView, panelEff: number, shelterLevel: number): void {
  for (const mat of panels.panelMats ?? []) mat.color.copy(dusty).lerp(clean, panelEff);
  shelter.piles?.forEach((pile, i) => (pile.visible = i < shelterLevel));
}

/** The landing rocket model inside the terrain's `lander` group (keeps its pick tag). */
export function swapLander(lander: THREE.Object3D): void {
  const model = buildLander();
  if (!model) return;
  // F5c: the model goes into the tilted "wreck" pivot (crashed pose), the group stays put.
  const pivot = lander.getObjectByName(WRECK.name) ?? lander;
  for (const child of [...pivot.children]) pivot.remove(child);
  castShadows(model);
  pivot.add(model);
}

/** The rover decor at the valley edge, or nothing if its file did not load. */
export function addRoverDecor(scene: THREE.Scene, x: number, z: number, yaw: number): void {
  const rover = buildRoverDecor();
  if (!rover) return;
  rover.position.set(x, 0, z);
  rover.rotation.y = yaw;
  scene.add(rover);
}
