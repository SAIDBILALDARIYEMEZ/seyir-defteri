// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Sky dome (gradient), fog, soft sun with shadows and a warm/cool hemisphere light. Blends
// smoothly between day, dust storm, radiation glow and night. F5a (from the trial build): the
// sun crosses the sky during the sol and dusk turns the horizon blue (Mars sunsets are blue).
// One shadow-casting light keeps it cheap.

import * as THREE from 'three';
import { COLORS } from './layout.ts';

export type SkyMode = 'day' | 'dust' | 'rad' | 'night';

export interface Lighting {
  setMode(mode: SkyMode): void;
  /** Share of the daylight already used: 0 = morning, 1 = dusk. Moves the sun. */
  setDayFraction(fraction: number): void;
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
  /** A soft violet glow while a particle storm hits (a visual cue, not data). */
  rad: { top: 0x7c4f78, horizon: 0xd49aa6, sun: 0xffe2f2, sunPower: 2, hemi: 1.25, fogFar: 170 },
  night: { top: 0x10132b, horizon: COLORS.skyNight, sun: 0x9fb0ff, sunPower: 0.5, hemi: 0.55, fogFar: 170 },
};

/** Blue Martian dusk near the sun's side, mixed in over the last part of the day. */
const DUSK = { horizon: 0x8fa8c8, top: 0x5a4a6a, from: 0.6, mix: 0.65, sunPower: 0.6 };
/** Sun path: rises low on the right, highest at midday, sets low on the left. */
const SUN = { dist: 42, height: 34, lift: 5, z: 14, edge: 0.3 };

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

  let mode: SkyMode = 'day';
  let target = PALETTES.day;
  let dayGoal = 0;
  let day = 0;
  const tmp = new THREE.Color();
  const dusk = new THREE.Color();
  return {
    setMode(next) {
      mode = next;
      target = PALETTES[next];
    },
    setDayFraction(fraction) {
      dayGoal = THREE.MathUtils.clamp(fraction, 0, 1);
    },
    update(dt) {
      const k = Math.min(1, dt * BLEND);
      day += (dayGoal - day) * Math.min(1, dt * 1.5);
      if (mode !== 'night') {
        const theta = THREE.MathUtils.lerp(SUN.edge, Math.PI - SUN.edge, day);
        sun.position.set(Math.cos(theta) * SUN.dist, Math.sin(theta) * SUN.height + SUN.lift, SUN.z);
      }
      const duskK = mode === 'night' ? 0 : THREE.MathUtils.smoothstep(day, DUSK.from, 1) * DUSK.mix;
      top.lerp(dusk.setHex(target.top).lerp(tmp.setHex(DUSK.top), duskK), k);
      horizon.lerp(dusk.setHex(target.horizon).lerp(tmp.setHex(DUSK.horizon), duskK), k);
      fog.color.copy(horizon);
      fog.far += (target.fogFar - fog.far) * k;
      sun.color.lerp(tmp.setHex(target.sun), k);
      const power = target.sunPower * (1 - duskK * (1 - DUSK.sunPower));
      sun.intensity += (power - sun.intensity) * k;
      hemi.intensity += (target.hemi - hemi.intensity) * k;
    },
  };
}
