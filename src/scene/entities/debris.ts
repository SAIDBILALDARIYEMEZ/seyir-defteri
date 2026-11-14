// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6: pieces of the crashed rocket lying around the landing site (same pale panel metal as the
// pieces thrown out in the opening crash), each with a soft glint so a child spots them. Simple
// metal shapes made in code (no files). Upgrades bought with the parts show as an extra solar
// panel next to the panels and a food crate stack next to the greenhouse. Reads GameState only.

import * as THREE from 'three';
import { BALANCE } from '../../config/balance.ts';
import type { GameState } from '../../sim/state.ts';
import { collectedOf, hasUpgrade } from '../../sim/systems/explore.ts';
import { cellToWorld } from '../grid.ts';

/** Pick tag prefix: `debris:<index>`. */
export const DEBRIS_TAG = 'debris:';
const GLINT_SPEED = 2.4;
/** Pieces are drawn a bit bigger than life so a child can spot and tap them. */
const PIECE_SCALE = 1.6;

/** The piece index of a pick tag, or null when the tag is not a rocket piece. */
export function debrisIndex(id: string): number | null {
  return id.startsWith(DEBRIS_TAG) ? Number(id.slice(DEBRIS_TAG.length)) : null;
}

export const isDebrisTag = (id: string): id is `debris:${number}` => id.startsWith(DEBRIS_TAG);

export interface Extras {
  /** Everything to add to the scene (debris + upgrade props). */
  group: THREE.Group;
  /** Pickable roots: the debris still lying there. */
  roots(): THREE.Object3D[];
  /** World position of a piece. */
  spot(index: number): [number, number];
  /** Shows / hides pieces and upgrade props; `panels` / `greenhouse` give the station spots. */
  sync(state: GameState, at: { panels: THREE.Object3D; greenhouse: THREE.Object3D }): void;
  update(dt: number): void;
}

const metal = new THREE.MeshLambertMaterial({ color: 0xcfc8be, flatShading: true });
const dark = new THREE.MeshLambertMaterial({ color: 0x6d6660, flatShading: true });
const burnt = new THREE.MeshLambertMaterial({ color: 0x4a3a32, flatShading: true });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8, transparent: true, opacity: 0.9, depthWrite: false });

/** Three simple shapes by index: a bent panel, a strut with a bracket, a fin chunk. */
function piece(i: number): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
  };
  const kind = i % 3;
  if (kind === 0) {
    add(new THREE.BoxGeometry(1.1, 0.1, 0.8), metal, 0, 0.12, 0, 0.12, 0, 0.05);
    add(new THREE.BoxGeometry(0.7, 0.1, 0.8), i % 2 ? burnt : metal, 0.8, 0.3, 0, 0, 0, 0.55);
  } else if (kind === 1) {
    add(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 6), dark, 0, 0.12, 0, 0, 0, Math.PI / 2 - 0.08);
    add(new THREE.BoxGeometry(0.45, 0.3, 0.45), metal, 0.6, 0.2, 0, 0, 0.4, 0);
  } else {
    add(new THREE.BoxGeometry(0.16, 0.9, 1.1), metal, 0, 0.45, 0, 0.3, 0, 0.35);
    add(new THREE.BoxGeometry(0.5, 0.12, 0.5), burnt, -0.5, 0.08, 0.3, 0, 0.7, 0);
  }
  g.rotation.y = i * 1.37;
  // The glint: a small unlit diamond above the piece that pulses (no real light: D-021).
  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glintMat);
  glint.position.y = 0.9;
  glint.name = 'glint';
  g.add(glint);
  return g;
}

/** Extra solar panel (upgrade): a tilted blue panel on a short post. */
function extraPanel(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6), dark);
  post.position.y = 0.45;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.2), new THREE.MeshLambertMaterial({ color: 0x2f5fa8, flatShading: true }));
  panel.position.y = 0.95;
  panel.rotation.x = -0.45;
  post.castShadow = panel.castShadow = true;
  g.add(post, panel);
  return g;
}

/** Bigger food store (upgrade): a stack of sealed crates. */
function foodCrates(): THREE.Group {
  const g = new THREE.Group();
  const crate = new THREE.MeshLambertMaterial({ color: 0xd9a441, flatShading: true });
  const spots: [number, number, number][] = [[0, 0.3, 0], [0.65, 0.3, 0.1], [0.3, 0.9, 0.05]];
  for (const [x, y, z] of spots) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), crate);
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

export function createExtras(): Extras {
  const group = new THREE.Group();
  const pieces = BALANCE.debris.pieces.map((cell, i) => {
    const g = piece(i);
    const [x, z] = cellToWorld(cell);
    g.position.set(x, 0, z);
    g.scale.setScalar(PIECE_SCALE);
    g.userData.station = `${DEBRIS_TAG}${i}`;
    group.add(g);
    return { g, glint: g.getObjectByName('glint') as THREE.Object3D, phase: i * 0.9 };
  });
  const panel = extraPanel();
  const crates = foodCrates();
  panel.visible = crates.visible = false;
  group.add(panel, crates);
  let time = 0;
  return {
    group,
    roots: () => pieces.filter((p) => p.g.visible).map((p) => p.g),
    spot: (i) => [pieces[i]?.g.position.x ?? 0, pieces[i]?.g.position.z ?? 0],
    sync(state, at) {
      const got = collectedOf(state);
      pieces.forEach((p, i) => (p.g.visible = !got.includes(i)));
      panel.visible = hasUpgrade(state, 'extraPanel') && at.panels.visible;
      crates.visible = hasUpgrade(state, 'foodStore') && at.greenhouse.visible;
      // Beside the station, turned with it (local offset: right side of the building).
      panel.position.copy(at.panels.position).add(new THREE.Vector3(2.4, 0, 0.6).applyAxisAngle(THREE.Object3D.DEFAULT_UP, at.panels.rotation.y));
      panel.rotation.y = at.panels.rotation.y;
      crates.position.copy(at.greenhouse.position).add(new THREE.Vector3(-2.5, 0, 0.8).applyAxisAngle(THREE.Object3D.DEFAULT_UP, at.greenhouse.rotation.y));
      crates.rotation.y = at.greenhouse.rotation.y;
    },
    update(dt) {
      time += dt;
      for (const p of pieces) {
        if (!p.g.visible) continue;
        const k = 0.5 + 0.5 * Math.sin(time * GLINT_SPEED + p.phase);
        p.glint.scale.setScalar(0.3 + k * 0.7);
        p.glint.rotation.y = time * 1.5;
      }
    },
  };
}
