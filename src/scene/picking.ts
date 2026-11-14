// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Screen-to-world picking through the live camera: tagged objects (`userData.station`) and the
// ground plane. Raycasts real meshes only (CLAUDE.md: no invisible hit volumes).

import * as THREE from 'three';

export interface Picker {
  /** The first tagged object under a screen point, or null. */
  tagged(clientX: number, clientY: number, roots: THREE.Object3D[]): string | null;
  ground(clientX: number, clientY: number): { x: number; z: number } | null;
}

export function createPicker(camera: THREE.Camera): Picker {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const probe = new THREE.Vector3();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const aim = (clientX: number, clientY: number): void => {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };
  return {
    tagged(clientX, clientY, roots) {
      aim(clientX, clientY);
      let hit: THREE.Object3D | null = raycaster.intersectObjects(roots, true)[0]?.object ?? null;
      while (hit && !hit.userData.station) hit = hit.parent;
      return (hit?.userData.station as string | undefined) ?? null;
    },
    ground(clientX, clientY) {
      aim(clientX, clientY);
      const hit = raycaster.ray.intersectPlane(floor, probe);
      return hit ? { x: hit.x, z: hit.z } : null;
    },
  };
}
