// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Ada: helmeted astronaut from primitives (white helmet, gold visor, coloured stripe).

import * as THREE from 'three';

export interface Astronaut {
  group: THREE.Group;
  /** Starts a walk to (x, z) lasting `seconds`; `onArrive` runs once at the end. */
  walkTo(x: number, z: number, seconds: number, onArrive: () => void): void;
  place(x: number, z: number): void;
  update(dt: number): void;
}

const SCALE = 1.5;

export function createAstronaut(): Astronaut {
  const flat = (color: number): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ color, flatShading: true });
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const add = (geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, flat(color));
    m.position.set(x, y, z);
    body.add(m);
    return m;
  };
  add(new THREE.CapsuleGeometry(0.4, 0.5, 2, 8), 0xf4f1ec, 0, 0.95, 0);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 8), 0x1fb5a8, 0, 1, 0);
  add(new THREE.SphereGeometry(0.44, 10, 8), 0xffffff, 0, 1.75, 0);
  const visor = add(new THREE.SphereGeometry(0.34, 10, 8), 0xe0a52c, 0, 1.76, 0.2);
  visor.scale.z = 0.7;
  add(new THREE.BoxGeometry(0.6, 0.7, 0.3), 0xbdb7ae, 0, 1.05, -0.42);
  const legGeo = new THREE.BoxGeometry(0.26, 0.55, 0.3);
  const legs = [add(legGeo, 0xe6e1d9, -0.2, 0.28, 0), add(legGeo, 0xe6e1d9, 0.2, 0.28, 0)];
  group.scale.setScalar(SCALE);

  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  let duration = 0;
  let elapsed = 0;
  let arrive: (() => void) | null = null;
  let phase = 0;

  return {
    group,
    walkTo(x, z, seconds, onArrive) {
      from.copy(group.position);
      to.set(x, 0, z);
      duration = seconds;
      elapsed = 0;
      arrive = onArrive;
      if (from.distanceToSquared(to) > 0.01) group.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    },
    place(x, z) {
      group.position.set(x, 0, z);
      group.rotation.y = 0;
      arrive = null;
    },
    update(dt) {
      const walking = arrive !== null;
      if (walking) {
        elapsed += dt;
        const k = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
        group.position.lerpVectors(from, to, k);
        phase += dt * 10;
        if (k >= 1) {
          const done = arrive;
          arrive = null;
          group.rotation.y = 0;
          done?.();
        }
      }
      const swing = walking ? Math.sin(phase) * 0.5 : 0;
      legs.forEach((leg, i) => (leg.rotation.x = i === 0 ? swing : -swing));
      body.position.y = walking ? Math.abs(Math.sin(phase)) * 0.06 : 0;
    },
  };
}
