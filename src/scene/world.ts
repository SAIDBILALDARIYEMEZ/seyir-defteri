// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// three.js world. Reads state, never mutates it. F0: placeholder valley with primitives.

import * as THREE from 'three';

export interface World {
  /** Renders one frame. dt in seconds. */
  update(dt: number): void;
}

const SKY = 0xd9a07f;
const GROUND = 0xb5532f;

export function createWorld(canvas: HTMLCanvasElement): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 30, 90);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffe2cc, 0x7a3b22, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1dd, 1.6);
  sun.position.set(12, 18, 8);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(100, 48),
    new THREE.MeshLambertMaterial({ color: GROUND }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Placeholder base: habitat dome, a module box and a solar panel slab.
  const flat = (color: number) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    flat(0xf2ece4),
  );
  const module = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2), flat(0xd8d2c8));
  module.position.set(5, 1, 1);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 2.2), flat(0x2f5fa8));
  panel.position.set(-6, 1.2, 2);
  panel.rotation.z = 0.35;
  scene.add(dome, module, panel);

  for (let i = 0; i < 14; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + (i % 4) * 0.35, 0), flat(0x8c3f24));
    const angle = i * 2.4;
    const radius = 10 + (i % 5) * 4;
    rock.position.set(Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius);
    rock.rotation.set(i, i * 0.7, 0);
    scene.add(rock);
  }

  const resize = (): void => {
    const { innerWidth: w, innerHeight: h } = window;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let orbit = 0.6;

  return {
    update(dt) {
      if (!reducedMotion) orbit += dt * 0.08;
      camera.position.set(Math.cos(orbit) * 22, 11, Math.sin(orbit) * 22);
      camera.lookAt(0, 1.5, 0);
      renderer.render(scene, camera);
    },
  };
}
