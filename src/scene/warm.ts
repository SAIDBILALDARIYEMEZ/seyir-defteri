// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Shader warm-up (F5c fix). three.js compiles a material's shader the first time it is drawn,
// which froze the cutscenes for 0.1-0.5 s at each new effect (much longer on slower GPUs), and it
// uploads a mesh's buffers and textures the first time it is on screen (stalls while the camera
// tours the village). Before a cutscene starts, every hidden object is shown for a moment,
// compiled in parallel with compileAsync, then drawn once with frustum culling off (uploads every
// buffer and texture, builds the shadow programs), and put back. Frames pause meanwhile.

import type * as THREE from 'three';

export async function warmShaders(
  renderer: THREE.WebGLRenderer,
  scenes: THREE.Scene[],
  camera: THREE.Camera,
  pause: (on: boolean) => void,
): Promise<void> {
  const hidden: THREE.Object3D[] = [];
  const culled: THREE.Object3D[] = [];
  for (const scene of scenes) {
    scene.traverse((o) => {
      if (o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
      if (o.visible) return;
      hidden.push(o);
      o.visible = true;
    });
  }
  pause(true);
  try {
    await Promise.all(scenes.map((scene) => renderer.compileAsync(scene, camera)));
    for (const scene of scenes) renderer.render(scene, camera);
  } catch {
    // A failed warm-up only brings back the old first-use stall; the cutscene still plays.
  } finally {
    for (const o of hidden) o.visible = false;
    for (const o of culled) o.frustumCulled = true;
    pause(false);
  }
}
