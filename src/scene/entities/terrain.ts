// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The valley: a flat build floor, sand dunes and hills around it, rocks, the craters of the
// build grid, and the crashed landing rocket. Deterministic, no randomness.

import * as THREE from 'three';
import { BALANCE } from '../../config/balance.ts';
import { CELL, GRID_HALF, cellToWorld } from '../grid.ts';
import { COLORS } from '../layout.ts';
import { WRECK, primitiveLander, wreckDetails, wreckPose } from './wreck.ts';

const flat = (color: number): THREE.MeshLambertMaterial =>
  new THREE.MeshLambertMaterial({ color, flatShading: true });

const SIZE = 260;
const SEGMENTS = 90;
/** The build floor stays flat this far beyond the grid edge. */
const FLAT_MARGIN = 4;

/** Low-frequency sine "noise": the same valley every time. */
function wobble(x: number, z: number): number {
  return (
    Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09 - 0.7) * 0.6 +
    Math.sin(x * 0.23 - z * 0.17) * 0.3 +
    Math.cos(x * 0.05 + z * 0.07) * 0.4
  );
}

/** Ground height: flat over the build grid, long dune ridges and rising hills further out. */
export function heightAt(x: number, z: number): number {
  const edge = Math.max(Math.abs(x), Math.abs(z)) - GRID_HALF - FLAT_MARGIN;
  if (edge <= 0) return 0;
  const k = Math.min(1, edge / 30);
  // Dunes: ridges running across the wind (diagonal), growing away from the base.
  const dunes = Math.pow(Math.max(0, Math.sin(x * 0.16 + z * 0.09 + wobble(x, z))), 2) * 2.2 * k;
  const rise = Math.pow(Math.min(1, edge / 70), 1.6) * 16;
  return dunes + rise + wobble(x, z) * k * 0.8;
}

function ground(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(COLORS.ground);
  const dark = new THREE.Color(COLORS.groundDark);
  const light = new THREE.Color(COLORS.groundLight);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const shade = wobble(x * 1.9, z * 1.6);
    c.copy(base).lerp(shade > 0 ? light : dark, Math.min(0.8, Math.abs(shade) * 0.45 + y * 0.02));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.receiveShadow = true;
  return mesh;
}

/** A shallow bowl with a raised rim for each crater of the build grid. */
function craters(): THREE.Group {
  const g = new THREE.Group();
  for (const crater of BALANCE.grid.craters) {
    const [x, z] = cellToWorld(crater);
    const r = (crater.r + 0.5) * CELL;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.7, 5, 18), flat(COLORS.hill));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.z = 0.5;
    rim.position.set(x, 0.05, z);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(r, 18), flat(COLORS.groundDark));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0.02, z);
    rim.receiveShadow = floor.receiveShadow = true;
    rim.castShadow = true;
    g.add(rim, floor);
  }
  return g;
}

function rocks(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 40; i++) {
    const a = i * 2.4;
    const r = GRID_HALF + FLAT_MARGIN + 1 + ((i * 11) % 17) * 1.3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const size = 0.3 + (i % 4) * 0.28;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), flat(COLORS.rock));
    rock.position.set(x, heightAt(x, z) + size * 0.4, z);
    rock.rotation.set(i, i * 0.7, 0);
    rock.castShadow = true;
    g.add(rock);
  }
  return g;
}

function hills(): THREE.Group {
  const g = new THREE.Group();
  // A full ring (the camera turns 360 degrees, B4), beyond the farthest camera position.
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 112 + ((i * 7) % 5) * 6;
    const h = 10 + ((i * 5) % 7) * 2.5;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(14 + (i % 3) * 5, h, 7), flat(COLORS.hill));
    hill.position.set(x, heightAt(x, z) + h / 2 - 1, z);
    hill.rotation.y = i;
    g.add(hill);
  }
  return g;
}

/** The landing rocket on its grid cell: tapping it only opens its info card (F5a). */
function passive(): THREE.Group {
  const g = new THREE.Group();
  const ship = new THREE.Group();
  // F5c: the body leans inside a pivot; the group (pick tag, position) stays upright.
  const body = primitiveLander();
  body.name = WRECK.name;
  wreckPose(body);
  ship.add(body);
  const [lx, lz] = cellToWorld(BALANCE.grid.lander);
  ship.position.set(lx, 0, lz);
  ship.name = 'lander';
  ship.userData.station = 'lander';
  g.add(ship, wreckDetails(lx, lz));
  return g;
}

export function buildTerrain(): THREE.Group {
  const g = new THREE.Group();
  g.add(ground(), craters(), rocks(), hills(), passive());
  return g;
}
