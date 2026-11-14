// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Simple storm particles: drifting dust, or white flecks on a radiation-event hour
// (inspired by the "snow" in Curiosity's navigation camera; a visual effect, not data).

import * as THREE from 'three';

export type StormMode = 'none' | 'dust' | 'rad';

export interface Storm {
  setMode(mode: StormMode): void;
  /** `center`: the camera's look-at point; the particles travel with the view (F5a). */
  update(dt: number, center: THREE.Vector3): void;
}

const COUNT = 420;
const BOX = { x: 70, y: 16, z: 50 };
const LOOK = {
  dust: { color: 0xf0c49a, size: 0.45, speed: 16, opacity: 0.75 },
  rad: { color: 0xffffff, size: 0.28, speed: 3, opacity: 0.95 },
};

export function createStorm(scene: THREE.Scene): Storm {
  const pos = new Float32Array(COUNT * 3);
  const scatter = (i: number): void => {
    pos[i * 3] = (Math.random() - 0.5) * BOX.x;
    pos[i * 3 + 1] = Math.random() * BOX.y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
  };
  for (let i = 0; i < COUNT; i++) scatter(i);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({ transparent: true, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);
  let mode: StormMode = 'none';

  return {
    setMode(next) {
      if (next === mode) return;
      mode = next;
      points.visible = mode !== 'none';
      if (mode === 'none') return;
      const look = LOOK[mode];
      mat.color.setHex(look.color);
      mat.size = look.size;
      mat.opacity = look.opacity;
    },
    update(dt, center) {
      if (mode === 'none') return;
      points.position.set(center.x, 0, center.z);
      const speed = LOOK[mode].speed;
      for (let i = 0; i < COUNT; i++) {
        if (mode === 'rad' && Math.random() < dt * 2) scatter(i);
        const x = (pos[i * 3] ?? 0) + speed * dt;
        pos[i * 3] = x > BOX.x / 2 ? x - BOX.x : x;
      }
      attr.needsUpdate = true;
    },
  };
}
