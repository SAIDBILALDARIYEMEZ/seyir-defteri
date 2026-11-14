// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Cutscene props (F5c), made from the existing CC0 lander model or primitives: rocket with a
// flickering flame, starfield, a procedural Mars, a dust burst, flying debris, base lights.
// Visual effects only: nothing here is data. Fix pass: props come from a small pool (built once,
// reset on reuse), and base lights are unlit glows, because adding or hiding real lights makes
// three.js recompile every shader (the ~300 ms freezes of the evacuation scene).

import * as THREE from 'three';
import { LANDER_MODEL, buildLander } from '../entities/stationModels.ts';
import { hasModel } from '../models/loader.ts';
import { primitiveLander } from '../entities/wreck.ts';

const pool = new Map<string, unknown>();
/** One instance per key, built on first use and kept for later cutscenes. */
export function pooled<T>(key: string, make: () => T, stale: (item: T) => boolean = () => false): T {
  const have = pool.get(key) as T | undefined;
  if (have !== undefined && !stale(have)) return have;
  const item = make();
  pool.set(key, item);
  return item;
}

/** Ease in-out (smootherstep) on 0..1. */
export const ease = (u: number): number => {
  const x = THREE.MathUtils.clamp(u, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Local 0..1 progress of time `t` inside [from, to]. */
export const span = (t: number, from: number, to: number): number => THREE.MathUtils.clamp((t - from) / (to - from), 0, 1);

export interface Rocket {
  group: THREE.Group;
  /** Tilts with the body (the flame too); the group only moves and turns. */
  pivot: THREE.Group;
  /** 0 = off, 1 = full burn. */
  flame: number;
  /** Built from the model (false: primitive fallback). */
  model: boolean;
  /** Back to upright, flame off, visible, at the origin. */
  reset(): void;
  update(dt: number): void;
}

/** The lander model (or the primitive rocket) with a flame under it. Origin at its feet. */
export function makeRocket(): Rocket {
  const group = new THREE.Group();
  const pivot = new THREE.Group();
  const body = buildLander();
  pivot.add(body ?? primitiveLander());
  group.add(pivot);
  const glow = (color: number, r: number, h: number): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    m.rotation.x = Math.PI;
    m.position.y = -h / 2 + 0.2;
    return m;
  };
  const flame = new THREE.Group();
  flame.add(glow(0xff7a2a, 1.1, 4.5), glow(0xfff1a8, 0.55, 2.6));
  pivot.add(flame);
  let clock = 0;
  const rocket: Rocket = {
    group,
    pivot,
    flame: 0,
    model: body !== null,
    reset() {
      rocket.flame = 0;
      group.visible = true;
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      group.quaternion.identity();
      group.scale.setScalar(1);
      pivot.position.set(0, 0, 0);
      pivot.rotation.set(0, 0, 0);
    },
    update(dt) {
      clock += dt;
      const k = rocket.flame;
      flame.visible = k > 0.02;
      const flicker = 1 + Math.sin(clock * 37) * 0.08 + Math.sin(clock * 23) * 0.06;
      flame.scale.set(k * flicker, k * (0.8 + flicker * 0.3), k * flicker);
    },
  };
  return rocket;
}

/** A pooled rocket, rebuilt once when the model has arrived since it was made. */
export function rocketFor(key: string): Rocket {
  const r = pooled(key, makeRocket, (x) => !x.model && hasModel(LANDER_MODEL));
  r.reset();
  return r;
}

/** Stars on a far sphere (fixed pixel size, no fog). */
export function makeStars(count = 1600, radius = 300): THREE.Points {
  const pos = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(radius);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false });
  return new THREE.Points(geo, mat);
}

/** A low-poly Mars: rusty facets with darker plains and a thin glowing atmosphere. */
export function makeMars(radius: number): THREE.Group {
  const geo = new THREE.IcosahedronGeometry(radius, 5);
  const vertices = geo.getAttribute('position');
  const colors = new Float32Array(vertices.count * 3);
  const p = new THREE.Vector3();
  const c = new THREE.Color();
  const light = new THREE.Color(0xd9773e);
  const dark = new THREE.Color(0x7a3418);
  const cap = new THREE.Color(0xf4e9df);
  for (let i = 0; i < vertices.count; i++) {
    p.fromBufferAttribute(vertices, i).normalize();
    // Smooth pseudo-noise from a few sines: plains and highlands, no texture file.
    const n = Math.sin(p.x * 5.1 + p.y * 2.3) * 0.5 + Math.sin(p.z * 7.3 - p.x * 3.1) * 0.3 + Math.sin(p.y * 11 + p.z * 4) * 0.2;
    c.copy(light).lerp(dark, THREE.MathUtils.clamp(0.5 + n * 0.6, 0, 1));
    if (p.y > 0.93) c.lerp(cap, 0.85);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const planet = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const air = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.06, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xff9a5a, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const group = new THREE.Group();
  group.add(planet, air);
  return group;
}

export interface Burst {
  points: THREE.Points;
  /** Hidden and ready to fire again. */
  hide(): void;
  /** Starts the burst at (x, z) on the ground. */
  fire(x: number, z: number): void;
  update(dt: number): void;
}

/** A big dust cloud thrown out in a ring and up, fading out over a few seconds. */
export function makeBurst(count = 450, color = 0xd9a27a): Burst {
  const pos = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({ color, size: 1.3, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  let age = 0;
  return {
    points,
    hide: () => void (points.visible = false),
    fire(x, z) {
      age = 0;
      points.visible = true;
      points.position.set(x, 0, z);
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 6 + Math.random() * 16;
        pos.set([0, Math.random() * 1.5, 0], i * 3);
        vel.set([Math.cos(a) * speed, 2 + Math.random() * 9, Math.sin(a) * speed], i * 3);
      }
      attr.needsUpdate = true;
    },
    update(dt) {
      if (!points.visible) return;
      age += dt;
      const drag = Math.exp(-1.6 * dt);
      for (let i = 0; i < count * 3; i += 3) {
        vel[i] = (vel[i] ?? 0) * drag;
        vel[i + 1] = ((vel[i + 1] ?? 0) - 2.5 * dt) * drag;
        vel[i + 2] = (vel[i + 2] ?? 0) * drag;
        pos[i] = (pos[i] ?? 0) + (vel[i] ?? 0) * dt;
        pos[i + 1] = Math.max(0.2, (pos[i + 1] ?? 0) + (vel[i + 1] ?? 0) * dt);
        pos[i + 2] = (pos[i + 2] ?? 0) + (vel[i + 2] ?? 0) * dt;
      }
      attr.needsUpdate = true;
      mat.size = 1.3 + age * 1.1;
      mat.opacity = age < 0.15 ? age / 0.15 : Math.max(0, 0.95 - (age - 0.15) * 0.28);
      if (mat.opacity <= 0) points.visible = false;
    },
  };
}

export interface Debris {
  group: THREE.Group;
  hide(): void;
  fire(x: number, y: number, z: number): void;
  update(dt: number): void;
}

/** A few panel pieces thrown out of the crash; they bounce once and lie still. */
export function makeDebris(count = 6): Debris {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xcfc8be, flatShading: true });
  const parts = Array.from({ length: count }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5 + (i % 3) * 0.3, 0.12, 0.4 + (i % 2) * 0.4), mat);
    m.castShadow = true;
    m.visible = false;
    group.add(m);
    return { m, v: new THREE.Vector3(), spin: new THREE.Vector3() };
  });
  return {
    group,
    hide: () => parts.forEach((p) => (p.m.visible = false)),
    fire(x, y, z) {
      for (const p of parts) {
        const a = Math.random() * Math.PI * 2;
        p.m.visible = true;
        p.m.position.set(x, y, z);
        p.v.set(Math.cos(a) * (5 + Math.random() * 7), 6 + Math.random() * 6, Math.sin(a) * (5 + Math.random() * 7));
        p.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      }
    },
    update(dt) {
      for (const p of parts) {
        if (!p.m.visible) continue;
        p.v.y -= 9 * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += p.spin.x * dt;
        p.m.rotation.y += p.spin.y * dt;
        p.m.rotation.z += p.spin.z * dt;
        if (p.m.position.y < 0.1) {
          p.m.position.y = 0.1;
          p.v.multiplyScalar(0.35);
          p.v.y = Math.abs(p.v.y) > 1 ? Math.abs(p.v.y) : 0;
          p.spin.multiplyScalar(0.4);
        }
      }
    },
  };
}

/** Cinematic camera: pose by position + look-at, optional shake, and a blend into another camera. */
export interface Rig {
  camera: THREE.PerspectiveCamera;
  pose(pos: THREE.Vector3Like, look: THREE.Vector3Like): void;
  /** Adds a shake of `amount` (world units); call after pose(). */
  shake(amount: number, time: number): void;
  /** Mixes the current pose towards `target` by k (0..1): position, rotation and field of view. */
  blendTo(target: THREE.PerspectiveCamera, k: number): void;
}

export function makeRig(fov = 50): Rig {
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 1200);
  const q = new THREE.Quaternion();
  const look = new THREE.Vector3();
  return {
    camera,
    pose(pos, at) {
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(look.set(at.x, at.y, at.z));
    },
    shake(amount, time) {
      if (amount <= 0) return;
      camera.position.x += Math.sin(time * 41) * amount + Math.sin(time * 17) * amount * 0.6;
      camera.position.y += Math.sin(time * 53 + 1) * amount * 0.7;
      camera.rotation.z += Math.sin(time * 29) * amount * 0.02;
    },
    blendTo(target, k) {
      const e = ease(k);
      q.copy(camera.quaternion);
      camera.position.lerp(target.position, e);
      camera.quaternion.slerpQuaternions(q, target.quaternion, e);
      const fovGoal = THREE.MathUtils.lerp(fov, target.fov, e);
      if (Math.abs(camera.fov - fovGoal) > 0.01) {
        camera.fov = fovGoal;
        camera.updateProjectionMatrix();
      }
    },
  };
}
