// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Guide mark in the world (F5a, adapted from the trial build): a turning, bouncing arrow above
// the target and a pulsing ring on the ground around it. Seen from every camera angle.

import * as THREE from 'three';

export interface Marker {
  group: THREE.Group;
  /** Points at (x, z) with the arrow at `height`, or hides with null. */
  set(at: { x: number; z: number; height: number; radius: number } | null): void;
  update(dt: number): void;
}

const COLOR = 0xffb347;

export function createMarker(): Marker {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: COLOR });
  const arrow = new THREE.Group();
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 4), mat);
  head.rotation.x = Math.PI;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1, 0.38), mat);
  shaft.position.y = 1.05;
  arrow.add(head, shaft);
  const ringMat = new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0.6, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 48), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(arrow, ring);
  group.visible = false;
  let clock = 0;
  let lift = 0;
  let base = 1;
  return {
    group,
    set(at) {
      group.visible = at !== null;
      if (!at) return;
      group.position.set(at.x, 0, at.z);
      lift = at.height;
      base = at.radius;
    },
    update(dt) {
      if (!group.visible) return;
      clock += dt;
      arrow.position.y = lift + Math.abs(Math.sin(clock * 3)) * 0.8;
      arrow.rotation.y = clock * 1.5;
      const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
      ringMat.opacity = 0.35 + pulse * 0.45;
      const s = base * (1 + pulse * 0.1);
      ring.scale.set(s, s, 1);
    },
  };
}
