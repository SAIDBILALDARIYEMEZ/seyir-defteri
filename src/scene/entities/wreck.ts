// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// The crashed rocket (F5c fix): the landing rocket leans and sits a little sunk in the sand, with a
// scorch mark and a few broken panels around it, so the game matches the opening crash. Visual
// only: the rocket group (pick tag, position, walk blocker) is unchanged; only the inner "wreck"
// pivot tilts. The opening cutscene ends in exactly this pose, so the swap shows no jump.

import * as THREE from 'three';

/** Lean (radians, around z), sink into the sand and the pivot's name inside the rocket group. */
export const WRECK = { tilt: -0.24, sink: 0.35, name: 'wreck' } as const;

/** Puts a rocket body into the crashed pose. */
export function wreckPose(pivot: THREE.Object3D): void {
  pivot.rotation.set(0, 0, WRECK.tilt);
  pivot.position.set(0, -WRECK.sink, 0);
}

/** The primitive rocket (fallback when the model is not loaded). Origin at its feet. */
export function primitiveLander(): THREE.Group {
  const flat = (color: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const ship = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: number, y: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, flat(color));
    m.position.y = y;
    m.castShadow = true;
    ship.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(1.5, 1.8, 7, 10), 0xf2ece4, 4.5);
  add(new THREE.ConeGeometry(1.5, 2.6, 10), 0xc8452f, 9.3);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const fin = add(new THREE.BoxGeometry(0.2, 2.4, 1.6), 0xa9a39b, 1.2);
    fin.position.set(Math.cos(a) * 1.9, 1.2, Math.sin(a) * 1.9);
    fin.rotation.y = -a + Math.PI / 2;
  }
  return ship;
}

/** Scorch mark and broken panels on the ground around (x, z). Not pickable (outside the rocket group). */
export function wreckDetails(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const scorch = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x2a140c, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.set(x + 0.6, 0.03, z);
  g.add(scorch);
  const panel = new THREE.MeshLambertMaterial({ color: 0xcfc8be, flatShading: true });
  const burnt = new THREE.MeshLambertMaterial({ color: 0x4a3a32, flatShading: true });
  // Fixed spots (no randomness): [dx, dz, yaw, tilt, burnt]
  const pieces: [number, number, number, number, boolean][] = [
    [3.6, 1.8, 0.6, 0.25, false],
    [-2.8, 3.4, 2.1, -0.18, true],
    [4.4, -2.6, 1.2, 0.12, false],
    [-3.9, -1.5, 0.3, 0.3, true],
  ];
  pieces.forEach(([dx, dz, yaw, tilt, isBurnt], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9 + (i % 2) * 0.5, 0.12, 0.7), isBurnt ? burnt : panel);
    m.position.set(x + dx, 0.1, z + dz);
    m.rotation.set(tilt, yaw, 0);
    m.castShadow = true;
    g.add(m);
  });
  return g;
}
