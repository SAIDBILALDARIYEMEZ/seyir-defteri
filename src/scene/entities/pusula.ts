// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// PUSULA: the small helper robot from primitives. Rolls to the station of the next task and
// shows a light on its antenna: teal when calm, blinking red when something is urgent.

import * as THREE from 'three';

export interface Pusula {
  group: THREE.Group;
  /** Rolls towards (x, z). `snap` places it there at once (new mission, new morning). */
  goTo(x: number, z: number, snap?: boolean): void;
  setDanger(danger: boolean): void;
  update(dt: number): void;
}

const SPEED = 9;
const CALM = 0x35e0d0;
const DANGER = 0xff3b2f;
const HEAD_HEIGHT = 2.5;

export function createPusula(): Pusula {
  const flat = (color: number): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ color, flatShading: true });
  const group = new THREE.Group();
  group.userData.station = 'pusula';
  const body = new THREE.Group();
  group.add(body);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    body.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(1, 0.8, 0.9), flat(0xf2c14e), 0, 0.75, 0);
  add(new THREE.SphereGeometry(0.42, 10, 8), flat(0xfaf6ee), 0, 1.5, 0);
  add(new THREE.BoxGeometry(0.5, 0.18, 0.1), flat(0x23323f), 0, 1.52, 0.38);
  const wheel = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 8);
  for (const x of [-0.58, 0.58]) add(wheel, flat(0x3b3632), x, 0.28, 0).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), flat(0xa9a39b), 0, 2.1, 0);
  const lightMat = new THREE.MeshBasicMaterial({ color: CALM });
  const light = add(new THREE.SphereGeometry(0.16, 8, 6), lightMat, 0, 2.4, 0);

  const target = new THREE.Vector3();
  const step = new THREE.Vector3();
  let danger = false;
  let clock = 0;

  return {
    group,
    goTo(x, z, snap = false) {
      target.set(x, 0, z);
      if (snap) group.position.copy(target);
    },
    setDanger(value) {
      danger = value;
      lightMat.color.setHex(danger ? DANGER : CALM);
    },
    update(dt) {
      clock += dt;
      step.subVectors(target, group.position);
      const dist = step.length();
      if (dist > 0.05) {
        group.rotation.y = Math.atan2(step.x, step.z);
        group.position.addScaledVector(step, Math.min(1, (SPEED * dt) / dist));
      } else {
        group.rotation.y *= 1 - Math.min(1, dt * 4);
      }
      body.position.y = Math.sin(clock * 3) * 0.05;
      light.scale.setScalar(danger ? 1 + Math.abs(Math.sin(clock * 6)) * 0.9 : 1);
    },
  };
}

export const PUSULA_HEAD_HEIGHT = HEAD_HEIGHT;
