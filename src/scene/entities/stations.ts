// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Placeholder stations built from primitive shapes. Real models replace these later.

import * as THREE from 'three';
import type { StationId } from '../../sim/actions.ts';
import { COLORS } from '../layout.ts';

const flat = (color: number): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

const WHITE = 0xf2ece4;
const GREY = 0xa9a39b;
const DARK = 0x3b3632;

export interface StationParts {
  group: THREE.Group;
  /** Solar panel surface: tinted by dust. */
  panelMat?: THREE.MeshLambertMaterial;
  /** Regolith mound: grows with the shelter level. */
  mound?: THREE.Mesh;
}

function habitat(g: THREE.Group): void {
  g.add(mesh(new THREE.SphereGeometry(3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flat(WHITE)));
  g.add(mesh(new THREE.CylinderGeometry(3.2, 3.3, 0.4, 12), flat(GREY), 0, 0.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), flat(0xd8d2c8), 0, 0.9, 3));
  g.add(mesh(new THREE.BoxGeometry(0.9, 1.3, 0.1), flat(0x2f6f8f), 0, 0.75, 3.82));
}

function panels(g: THREE.Group): THREE.MeshLambertMaterial {
  const mat = flat(0x2f5fa8);
  for (const x of [-2.4, 0, 2.4]) {
    const slab = mesh(new THREE.BoxGeometry(2, 0.12, 2.6), mat, x, 1.3, 0);
    slab.rotation.x = 0.55;
    g.add(slab, mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 6), flat(GREY), x, 0.65, 0));
  }
  return mat;
}

function moxie(g: THREE.Group): void {
  g.add(mesh(new THREE.BoxGeometry(1.8, 1.6, 1.6), flat(0xd9a441), 0, 0.8, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 8), flat(WHITE), 1.5, 1.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 6), flat(DARK), -0.4, 2.1, 0));
}

function greenhouse(g: THREE.Group): void {
  const glass = new THREE.MeshLambertMaterial({ color: 0xbfe8d2, transparent: true, opacity: 0.55, flatShading: true });
  const tunnel = mesh(new THREE.CylinderGeometry(1.7, 1.7, 4.2, 10, 1, false, 0, Math.PI), glass);
  tunnel.rotation.set(0, 0, Math.PI / 2);
  g.add(tunnel, mesh(new THREE.BoxGeometry(4.2, 0.3, 3.4), flat(GREY), 0, 0.15, 0));
  for (const x of [-1.3, 0, 1.3]) g.add(mesh(new THREE.BoxGeometry(0.8, 0.7, 2), flat(0x4f9d4a), x, 0.6, 0));
}

function shelter(g: THREE.Group): THREE.Mesh {
  const mound = mesh(new THREE.SphereGeometry(2.4, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), flat(COLORS.rock));
  g.add(mound, mesh(new THREE.BoxGeometry(1.2, 1.3, 0.8), flat(DARK), 0, 0.65, 2.1));
  return mound;
}

function antenna(g: THREE.Group): void {
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 8), flat(GREY), 0, 0.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 6), flat(WHITE), 0, 2.2, 0));
  const dish = mesh(new THREE.ConeGeometry(1.5, 0.7, 12, 1, true), flat(WHITE), 0, 4.1, 0.3);
  dish.rotation.x = -2.2;
  (dish.material as THREE.Material).side = THREE.DoubleSide;
  g.add(dish);
}

function beacon(g: THREE.Group): void {
  g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.15, 12), flat(GREY), 0, 0.08, 0));
  g.add(mesh(new THREE.ConeGeometry(0.4, 1.1, 8), flat(0xf28c28), 0, 0.7, 0));
}

function curiosity(g: THREE.Group): void {
  g.add(mesh(new THREE.BoxGeometry(2.2, 0.6, 1.4), flat(WHITE), 0, 1, 0));
  const wheel = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
  for (const x of [-0.9, 0, 0.9]) {
    for (const z of [-0.9, 0.9]) {
      const w = mesh(wheel, flat(DARK), x, 0.4, z);
      w.rotation.x = Math.PI / 2;
      g.add(w);
    }
  }
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3, 6), flat(GREY), 0.7, 1.9, 0.3));
  g.add(mesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), flat(WHITE), 0.7, 2.6, 0.3));
}

function science(g: THREE.Group): void {
  const rock = mesh(new THREE.DodecahedronGeometry(1.4, 0), flat(0x7a4a3a), 0, 1, 0);
  rock.rotation.set(0.4, 0.8, 0.1);
  g.add(rock, mesh(new THREE.ConeGeometry(0.5, 1.4, 3), flat(GREY), 1.9, 0.7, 0.6));
  g.add(mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), flat(0x2f6f8f), 1.9, 1.5, 0.6));
}

export function buildStation(id: StationId): StationParts {
  const group = new THREE.Group();
  group.userData.station = id;
  const parts: StationParts = { group };
  switch (id) {
    case 'habitat': habitat(group); break;
    case 'panels': parts.panelMat = panels(group); break;
    case 'moxie': moxie(group); break;
    case 'greenhouse': greenhouse(group); break;
    case 'shelter': parts.mound = shelter(group); break;
    case 'antenna': antenna(group); break;
    case 'beacon': beacon(group); break;
    case 'curiosity': curiosity(group); break;
    case 'science': science(group); break;
  }
  return parts;
}

/** Sleep capsules and the ship: scenery only, never clickable. */
export function buildPassive(): THREE.Group {
  const g = new THREE.Group();
  const pod = new THREE.CapsuleGeometry(0.6, 1.4, 2, 8);
  for (let i = 0; i < 6; i++) {
    const p = mesh(pod, flat(0xc9c3bb), 6 + i * 1.7, 0.6, -14);
    p.rotation.x = Math.PI / 2;
    g.add(p);
  }
  const ship = new THREE.Group();
  ship.add(mesh(new THREE.CylinderGeometry(1.5, 1.8, 7, 10), flat(WHITE), 0, 4.5, 0));
  ship.add(mesh(new THREE.ConeGeometry(1.5, 2.6, 10), flat(0xc8452f), 0, 9.3, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = mesh(new THREE.BoxGeometry(0.2, 2.4, 1.6), flat(GREY), Math.cos(a) * 1.9, 1.2, Math.sin(a) * 1.9);
    fin.rotation.y = -a + Math.PI / 2;
    ship.add(fin);
  }
  ship.position.set(-6, 0, -17);
  g.add(ship);
  return g;
}

/** Hills around the valley and scattered rocks. Deterministic, no randomness. */
export function buildTerrain(): THREE.Group {
  const g = new THREE.Group();
  const ground = mesh(new THREE.CircleGeometry(140, 40), new THREE.MeshLambertMaterial({ color: COLORS.ground }));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = 50 + ((i * 7) % 5) * 4;
    const h = 5 + ((i * 5) % 7) * 1.6;
    if (Math.sin(a) > 0.3) continue; // keep the camera side open
    const hill = mesh(new THREE.ConeGeometry(9 + (i % 3) * 3, h, 6), flat(COLORS.hill), Math.cos(a) * r, h / 2 - 0.5, Math.sin(a) * r - 6);
    hill.rotation.y = i;
    g.add(hill);
  }
  for (let i = 0; i < 26; i++) {
    const a = i * 2.4;
    const r = 6 + ((i * 11) % 17) * 1.4;
    const rock = mesh(new THREE.DodecahedronGeometry(0.25 + (i % 4) * 0.2, 0), flat(COLORS.rock), Math.cos(a) * r + 2, 0.15, Math.sin(a) * r * 0.6 + 3);
    rock.rotation.set(i, i * 0.7, 0);
    g.add(rock);
  }
  return g;
}
