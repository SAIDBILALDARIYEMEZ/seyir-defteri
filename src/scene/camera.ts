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
  update(dt: number): void;
}

/** Portrait phones: stop pulling the camera back here (fog would wash the valley out). */
const MAX_FIT = 1.9;
/** Ease rate (1/s) of the camera towards its goal. */
const EASE = 10;

export function createOrbitCamera(): OrbitCamera {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 600);
  const goal = { az: 0, el: CAMERA.elevation, r: CAMERA.radius as number };
  const now = { ...goal };
  const clampGoal = (): void => {
    goal.el = THREE.MathUtils.clamp(goal.el, CAMERA.minElevation, CAMERA.maxElevation);
    goal.r = THREE.MathUtils.clamp(goal.r, CAMERA.minRadius, CAMERA.maxRadius);
  };
  const place = (): void => {
    const [tx, ty, tz] = CAMERA.target;
    // Narrow (portrait-ish) screens need more distance to keep the whole valley in view.
    const fit = THREE.MathUtils.clamp(1.45 / camera.aspect, 1, MAX_FIT);
    const r = now.r * fit;
    const flatR = r * Math.cos(now.el);
    camera.position.set(tx + Math.sin(now.az) * flatR, ty + r * Math.sin(now.el), tz + Math.cos(now.az) * flatR);
    camera.lookAt(tx, ty, tz);
  };
  const snap = (): void => {
    clampGoal();
    Object.assign(now, goal);
    place();
  };
  place();

  return {
    camera,
    setAspect(aspect) {
      camera.aspect = aspect;
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
    update(dt) {
      const k = 1 - Math.exp(-EASE * dt);
      if (Math.abs(goal.az - now.az) + Math.abs(goal.el - now.el) + Math.abs(goal.r - now.r) < 1e-4) return;
      now.az += (goal.az - now.az) * k;
      now.el += (goal.el - now.el) * k;
      now.r += (goal.r - now.r) * k;
      place();
    },
  };
}
