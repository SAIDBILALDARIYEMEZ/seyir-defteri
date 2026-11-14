// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Orbit camera around the village (B4): full 360 degree turn, limited tilt (never under the
// ground, up to a top-down view), limited zoom. Inputs set goals; the camera eases to them.

import * as THREE from 'three';
import { CAMERA } from './layout.ts';

export interface OrbitCamera {
  camera: THREE.PerspectiveCamera;
  setAspect(aspect: number): void;
  /** Drag: turn by pixels (x = around, y = tilt). Applied at once. */
  drag(dxPixels: number, dyPixels: number): void;
  /** Turn around by an angle in radians (two-finger twist). */
  turnBy(radians: number): void;
  zoom(delta: number): void;
  /** Multiplies the distance (pinch). */
  zoomBy(factor: number): void;
  /** Eased eighth of a turn for the on-screen buttons. */
  step(direction: 1 | -1): void;
  reset(): void;
  /** Soft follow (F5a): the look-at point drifts towards (x, z). */
  follow(x: number, z: number): void;
  /** Turn around the village in radians (0 = looking north, for the compass). */
  azimuth(): number;
  /** The current look-at point. */
  focus(): THREE.Vector3;
  /** Moves the picture sideways by a share of the screen width (main-menu backdrop, F5c). */
  setShift(fraction: number): void;
  update(dt: number): void;
}

/** Portrait phones: stop pulling the camera back here (fog would wash the valley out). */
const MAX_FIT = 1.9;
/** Ease rate (1/s) of the camera towards its goal. */
const EASE = 10;
/** Slower ease for the soft follow, so the view glides behind Ada. */
const FOLLOW_EASE = 2.2;

export function createOrbitCamera(): OrbitCamera {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 600);
  const goal = { az: 0, el: CAMERA.elevation, r: CAMERA.radius as number, fx: 0, fz: 0 };
  const now = { ...goal };
  const look = new THREE.Vector3();
  const clampGoal = (): void => {
    goal.el = THREE.MathUtils.clamp(goal.el, CAMERA.minElevation, CAMERA.maxElevation);
    goal.r = THREE.MathUtils.clamp(goal.r, CAMERA.minRadius, CAMERA.maxRadius);
  };
  const place = (): void => {
    const tx = CAMERA.target[0] + now.fx;
    const ty = CAMERA.target[1];
    const tz = CAMERA.target[2] + now.fz;
    // Narrow (portrait-ish) screens need more distance to keep the whole valley in view.
    const fit = THREE.MathUtils.clamp(1.45 / camera.aspect, 1, MAX_FIT);
    const r = now.r * fit;
    const flatR = r * Math.cos(now.el);
    camera.position.set(tx + Math.sin(now.az) * flatR, ty + r * Math.sin(now.el), tz + Math.cos(now.az) * flatR);
    camera.lookAt(tx, ty, tz);
  };
  let shift = 0;
  /** Off-center projection: the scene moves right by `shift` of the width; the orbit is unchanged. */
  const applyShift = (): void => {
    if (shift === 0) return camera.clearViewOffset();
    const h = 1000;
    const w = h * camera.aspect;
    camera.setViewOffset(w, h, -shift * w, 0, w, h);
  };
  const snap = (): void => {
    clampGoal();
    Object.assign(now, { az: goal.az, el: goal.el, r: goal.r });
    place();
  };
  place();

  return {
    camera,
    setAspect(aspect) {
      camera.aspect = aspect;
      applyShift();
      camera.updateProjectionMatrix();
      place();
    },
    drag(dx, dy) {
      goal.az -= dx * CAMERA.rotateSpeed;
      goal.el += dy * CAMERA.rotateSpeed;
      snap();
    },
    turnBy(radians) {
      goal.az += radians;
      snap();
    },
    zoom(delta) {
      goal.r += delta * CAMERA.zoomSpeed;
      clampGoal();
    },
    zoomBy(factor) {
      goal.r *= factor;
      snap();
    },
    step(direction) {
      goal.az += direction * CAMERA.stepAngle;
    },
    reset() {
      // Turn back the short way round.
      const full = Math.PI * 2;
      const back = Math.round(goal.az / full) * full;
      goal.az -= back;
      now.az -= back;
      goal.el = CAMERA.elevation;
      goal.r = CAMERA.radius;
      goal.az = 0;
    },
    follow(x, z) {
      goal.fx = (x - CAMERA.target[0]) * CAMERA.follow;
      goal.fz = (z - CAMERA.target[2]) * CAMERA.follow;
    },
    setShift(fraction) {
      if (fraction === shift) return;
      shift = fraction;
      applyShift();
      camera.updateProjectionMatrix();
    },
    azimuth: () => now.az,
    focus: () => look.set(CAMERA.target[0] + now.fx, CAMERA.target[1], CAMERA.target[2] + now.fz),
    update(dt) {
      const k = 1 - Math.exp(-EASE * dt);
      const kf = 1 - Math.exp(-FOLLOW_EASE * dt);
      const moved = Math.abs(goal.az - now.az) + Math.abs(goal.el - now.el) + Math.abs(goal.r - now.r);
      const drift = Math.abs(goal.fx - now.fx) + Math.abs(goal.fz - now.fz);
      if (moved + drift < 1e-4) return;
      now.az += (goal.az - now.az) * k;
      now.el += (goal.el - now.el) * k;
      now.r += (goal.r - now.r) * k;
      now.fx += (goal.fx - now.fx) * kf;
      now.fz += (goal.fz - now.fz) * kf;
      place();
    },
  };
}
