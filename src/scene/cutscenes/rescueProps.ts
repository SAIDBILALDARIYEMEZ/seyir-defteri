// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Props for the early-evacuation closing (F5c): a small emergency capsule under an orange
// parachute, a blinking light high in the night sky, and the base lights that go out. Unlit materials only (no real lights,
// so nothing recompiles), built once and reused. Visual effects, not data.

import * as THREE from 'three';

export interface Capsule {
  group: THREE.Group;
  chute: THREE.Group;
  /** Small thruster glow under the capsule, 0..1. */
  burn: number;
  reset(): void;
  update(dt: number): void;
}

export function makeCapsule(): Capsule {
  const group = new THREE.Group();
  const mat = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const body = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2, 10), mat(0xeae4da));
  body.position.y = 1.1;
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.3, 10), mat(0x8a4a2a));
  shield.position.y = 0.15;
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.1), mat(0x23323f));
  window_.position.set(0, 1.2, 0.85);
  window_.rotation.x = -0.55;
  group.add(body, shield, window_);
  const chute = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0xff8a3d, side: THREE.DoubleSide, flatShading: true }),
  );
  canopy.position.y = 7.5;
  chute.add(canopy);
  const cord = new THREE.MeshBasicMaterial({ color: 0xf2ece4 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5.6, 4), cord);
    line.position.set(Math.cos(a) * 1.5, 4.9, Math.sin(a) * 1.5);
    line.rotation.set(Math.sin(a) * -0.3, 0, Math.cos(a) * 0.3);
    chute.add(line);
  }
  group.add(chute);
  const glow = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.8, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.rotation.x = Math.PI;
  glow.position.y = -0.8;
  group.add(glow);
  let clock = 0;
  const capsule: Capsule = {
    group,
    chute,
    burn: 0,
    reset() {
      capsule.burn = 0;
      group.visible = chute.visible = true;
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
    },
    update(dt) {
      clock += dt;
      glow.visible = capsule.burn > 0.02;
      const k = capsule.burn * (1 + Math.sin(clock * 31) * 0.1);
      glow.scale.set(k, k, k);
      chute.rotation.y += dt * 0.3;
    },
  };
  return capsule;
}

/** A light high in the sky that blinks (the capsule coming from orbit). */
export function makeBlinker(): { mesh: THREE.Mesh; update(t: number, on: boolean): void } {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }));
  return {
    mesh,
    update(t, on) {
      mesh.visible = on && Math.sin(t * 7) > -0.2;
    },
  };
}

/**
 * Warm lights over the base's buildings (evacuation scene): an unlit bulb plus a soft glow on the
 * ground. No real lights, so switching them off never recompiles shaders. Built once (6 slots).
 */
export interface BaseLights {
  group: THREE.Group;
  /** Puts the slots over these spots (extra slots stay dark). */
  place(spots: { x: number; z: number }[]): number;
  /** Number of lights still on. */
  set(on: number): void;
}

export function makeBaseLights(slots = 6): BaseLights {
  const group = new THREE.Group();
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
  const bulbGeo = new THREE.SphereGeometry(0.3, 8, 6);
  const glowGeo = new THREE.CircleGeometry(4, 20);
  const lamps = Array.from({ length: slots }, () => {
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    group.add(bulb, glow);
    return { bulb, glow };
  });
  let used = 0;
  return {
    group,
    place(spots) {
      used = Math.min(slots, spots.length);
      lamps.forEach((l, i) => {
        const s = spots[i];
        if (!s) return;
        l.bulb.position.set(s.x, 3.2, s.z + 1.5);
        l.glow.position.set(s.x, 0.05, s.z + 1.5);
      });
      return used;
    },
    set(on) {
      lamps.forEach((l, i) => {
        l.bulb.visible = l.glow.visible = i < Math.min(on, used);
      });
    },
  };
}
