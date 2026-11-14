// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Ada: the animated astronaut model (Idle / Run clips blended, closed helmet) once it is
// loaded, else a helmeted astronaut from primitives. Turns smoothly into her walking direction.

import * as THREE from 'three';
import { addHelmet } from '../models/helmet.ts';
import type { Helmet } from '../models/helmet.ts';
import { cloneModel, modelClips } from '../models/loader.ts';
import { tintSuit } from '../models/tint.ts';

export const ADA_MODEL = 'quaternius/Astronaut_FinnTheFrog';

export interface Astronaut {
  group: THREE.Group;
  /** Starts a walk to (x, z) lasting `seconds`; `onArrive` runs once at the end. */
  walkTo(x: number, z: number, seconds: number, onArrive: () => void): void;
  place(x: number, z: number): void;
  /** Stops the current walk where she stands (its callback never runs). */
  stop(): void;
  /** Turns to look at (x, z), e.g. the building she walked to. */
  face(x: number, z: number): void;
  /** Swaps the primitive body for the loaded model; false if the model is missing. */
  useModel(): boolean;
  /** Waves while standing (F5c success cutscene). */
  wave(on: boolean): void;
  update(dt: number): void;
}

const SCALE = 1.5;
const MODEL_HEIGHT = 3.1;
const SUIT = 0xf4f1ec;
const STRIPE = 0x1fb5a8;
/** Turn rate (1/s) towards the walking direction. */
const TURN = 12;
const BLEND_S = 0.2;

interface Body {
  root: THREE.Object3D;
  setWalking(on: boolean): void;
  setWaving(on: boolean): void;
  update(dt: number, phase: number): void;
}

function primitiveBody(): Body {
  const flat = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const add = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, parent = body): THREE.Mesh => {
    const m = new THREE.Mesh(geo, flat(color));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  add(new THREE.CapsuleGeometry(0.4, 0.5, 2, 8), SUIT, 0, 0.95, 0);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 8), STRIPE, 0, 1, 0);
  add(new THREE.SphereGeometry(0.44, 10, 8), 0xffffff, 0, 1.75, 0);
  const visor = add(new THREE.SphereGeometry(0.34, 10, 8), 0xe0a52c, 0, 1.76, 0.2);
  visor.scale.z = 0.7;
  add(new THREE.BoxGeometry(0.6, 0.7, 0.3), 0xbdb7ae, 0, 1.05, -0.42);
  const limb = (x: number, y: number, h: number): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    add(new THREE.BoxGeometry(0.24, h, 0.28), 0xe6e1d9, 0, -h / 2, 0, pivot);
    body.add(pivot);
    return pivot;
  };
  const legs = [limb(-0.2, 0.55, 0.55), limb(0.2, 0.55, 0.55)];
  const arms = [limb(-0.52, 1.3, 0.55), limb(0.52, 1.3, 0.55)];
  root.scale.setScalar(SCALE);
  let walking = false;
  let waving = false;
  let clock = 0;
  return {
    root,
    setWalking: (on) => (walking = on),
    setWaving: (on) => (waving = on),
    update(dt, phase) {
      clock += dt;
      const swing = walking ? Math.sin(phase) * 0.6 : 0;
      legs.forEach((leg, i) => (leg.rotation.x = i === 0 ? swing : -swing));
      arms.forEach((arm, i) => (arm.rotation.x = i === 0 ? -swing * 0.8 : swing * 0.8));
      const right = arms[1];
      if (right) right.rotation.z = waving && !walking ? 2.6 + Math.sin(clock * 8) * 0.35 : 0;
      // Low gravity: a light bounce with every step.
      body.position.y = walking ? Math.abs(Math.sin(phase)) * 0.1 : 0;
    },
  };
}

function modelBody(): Body | null {
  const model = cloneModel(ADA_MODEL, { height: MODEL_HEIGHT, ownMaterials: true });
  if (!model) return null;
  model.traverse((o) => {
    // Kid-safe: the source character carries a pistol; it is never shown.
    if (/pistol|gun|weapon/i.test(o.name)) o.visible = false;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) tintSuit(mesh.material, SUIT);
  });
  const helmet: Helmet | null = addHelmet(model, STRIPE);
  const mixer = new THREE.AnimationMixer(model);
  const clip = (name: string): THREE.AnimationAction | null => {
    const c = modelClips(ADA_MODEL).find((x) => x.name === name);
    return c ? mixer.clipAction(c) : null;
  };
  const idle = clip('Idle');
  const run = clip('Run') ?? clip('Walk');
  const wave = clip('Wave');
  idle?.play();
  let current = idle;
  let walking = false;
  let waving = false;
  const blendTo = (next: THREE.AnimationAction | null): void => {
    if (!next || next === current) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, BLEND_S, false);
    current = next;
  };
  const pick = (): void => blendTo(walking ? run : waving ? (wave ?? idle) : idle);
  return {
    root: model,
    setWalking(on) {
      if (on === walking) return;
      walking = on;
      pick();
    },
    setWaving(on) {
      if (on === waving) return;
      waving = on;
      pick();
    },
    update(dt) {
      mixer.update(dt);
      helmet?.update();
    },
  };
}

export function createAstronaut(): Astronaut {
  const group = new THREE.Group();
  let body = primitiveBody();
  group.add(body.root);

  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  let duration = 0;
  let elapsed = 0;
  let arrive: (() => void) | null = null;
  let phase = 0;
  let yawGoal = 0;

  const lookAt = (x: number, z: number, snap: boolean): void => {
    const dx = x - group.position.x;
    const dz = z - group.position.z;
    if (dx * dx + dz * dz <= 0.01) return;
    yawGoal = Math.atan2(dx, dz);
    if (snap) group.rotation.y = yawGoal;
  };

  return {
    group,
    walkTo(x, z, seconds, onArrive) {
      from.copy(group.position);
      to.set(x, 0, z);
      duration = seconds;
      elapsed = 0;
      arrive = onArrive;
      lookAt(x, z, false);
    },
    stop() {
      arrive = null;
    },
    place(x, z) {
      group.position.set(x, 0, z);
      group.rotation.y = yawGoal = 0;
      arrive = null;
      body.setWalking(false);
    },
    face: (x, z) => lookAt(x, z, false),
    useModel() {
      const next = modelBody();
      if (!next) return false;
      group.remove(body.root);
      body = next;
      group.add(body.root);
      return true;
    },
    wave: (on) => body.setWaving(on),
    update(dt) {
      const walking = arrive !== null;
      body.setWalking(walking);
      if (walking) {
        elapsed += dt;
        const k = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
        group.position.lerpVectors(from, to, k);
        phase += dt * 10;
        if (k >= 1) {
          const done = arrive;
          arrive = null;
          done?.();
        }
      }
      // Shortest way round to the goal heading, eased.
      const turn = THREE.MathUtils.euclideanModulo(yawGoal - group.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      group.rotation.y += turn * (1 - Math.exp(-TURN * dt));
      body.update(dt, phase);
    },
  };
}
