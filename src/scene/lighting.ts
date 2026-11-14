// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Sky dome (gradient), fog, soft sun with shadows and a warm/cool hemisphere light. Blends
// smoothly between day, dust storm and night. One shadow-casting light keeps it cheap.

import * as THREE from 'three';
import { COLORS } from './layout.ts';

export type SkyMode = 'day' | 'dust' | 'night';

export interface Lighting {
  setMode(mode: SkyMode): void;
  update(dt: number): void;
}

interface Palette {
  top: number;
  horizon: number;
  sun: number;
  sunPower: number;
  hemi: number;
  fogFar: number;
}

const PALETTES: Record<SkyMode, Palette> = {
  day: { top: COLORS.skyTop, horizon: COLORS.skyDay, sun: 0xfff1dd, sunPower: 2.4, hemi: 1.2, fogFar: 190 },
  dust: { top: 0xa86a44, horizon: COLORS.skyDust, sun: 0xffd2a8, sunPower: 1.1, hemi: 1.1, fogFar: 110 },
  night: { top: 0x10132b, horizon: COLORS.skyNight, sun: 0x9fb0ff, sunPower: 0.5, hemi: 0.55, fogFar: 170 },
};

const BLEND = 2.5;
const SHADOW_MAP = 1024;
const SHADOW_SPAN = 30;

function skyDome(top: THREE.Color, horizon: THREE.Color): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: top }, horizon: { value: horizon } },
    vertexShader: `varying float h;
      void main() { h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying float h;
      void main() { gl_FragColor = vec4(mix(horizon, top, smoothstep(0.0, 0.55, h)), 1.0); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(240, 24, 12), mat);
}

export function createLighting(scene: THREE.Scene): Lighting {
  const top = new THREE.Color(PALETTES.day.top);
  const horizon = new THREE.Color(PALETTES.day.horizon);
  scene.add(skyDome(top, horizon));
  const fog = new THREE.Fog(PALETTES.day.horizon, 70, PALETTES.day.fogFar);
  scene.fog = fog;
  scene.background = horizon;

  const hemi = new THREE.HemisphereLight(0xffe2cc, 0x6a3420, PALETTES.day.hemi);
  const sun = new THREE.DirectionalLight(PALETTES.day.sun, PALETTES.day.sunPower);
  // Low afternoon sun from the right: long soft shadows towards the camera's left.
  sun.position.set(24, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const cam = sun.shadow.camera;
  cam.left = cam.bottom = -SHADOW_SPAN;
  cam.right = cam.top = SHADOW_SPAN;
  cam.near = 1;
  cam.far = 110;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(hemi, sun, sun.target);

  let target = PALETTES.day;
  const tmp = new THREE.Color();
  return {
    setMode(mode) {
      target = PALETTES[mode];
    },
    update(dt) {
      const k = Math.min(1, dt * BLEND);
      top.lerp(tmp.setHex(target.top), k);
      horizon.lerp(tmp.setHex(target.horizon), k);
      fog.color.copy(horizon);
      fog.far += (target.fogFar - fog.far) * k;
      sun.color.lerp(tmp.setHex(target.sun), k);
      sun.intensity += (target.sunPower - sun.intensity) * k;
      hemi.intensity += (target.hemi - hemi.intensity) * k;
    },
  };
}
