// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Opening cutscene (F5c): (a) space, Mars comes closer; (b) the rocket enters a dust storm;
// (c) it comes down on its side, dust burst, debris, flash, black; (d) Ada wakes up, stands,
// PUSULA flies in and talks, and the camera glides into the game's view. The wake-up shot waits
// for the dialogue (`talk`). Props come from the pool; nothing is created per frame.

import * as THREE from 'three';
import { WRECK } from '../entities/wreck.ts';
import { beatClock } from './cutscene.ts';
import type { Beat, CutsceneOptions, Playing, Stage } from './cutscene.ts';
import { ease, makeBurst, makeDebris, makeMars, makeRig, makeStars, pooled, rocketFor, span } from './props.ts';

/** Shot times in seconds; the end depends on the dialogue length. */
const T = { space: 5, impact: 10.6, settle: 11.0, swap: 13.2, wake: 13.6, talk: 14.3, stand: 15.8 };
const BEATS: [number, Beat][] = [
  [0, 'bars'],
  [0.6, 'title'],
  [4.1, 'whoosh'],
  [4.5, 'fadeOut'],
  [5.0, 'fadeIn'],
  [5.2, 'storm'],
  [5.6, 'warn'],
  [T.impact, 'impact'],
  [12.4, 'flash'],
  [12.8, 'black'],
  [T.wake, 'wake'],
  [T.talk, 'talk'],
];
const UP = new THREE.Vector3(0, 1, 0);
const SPACE_FROM = new THREE.Vector3(6, 4, 34);
const SPACE_TO = new THREE.Vector3(1.5, 1.2, 12.5);
const SPACE_DIR = SPACE_TO.clone().sub(SPACE_FROM).normalize();

function spaceScene(): { scene: THREE.Scene; mars: THREE.Group } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);
  scene.add(makeStars());
  const mars = makeMars(10);
  scene.add(mars);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.position.set(-30, 12, 22);
  scene.add(sun, new THREE.AmbientLight(0x6070a0, 0.35));
  return { scene, mars };
}

export function playIntro(stage: Stage, opts: CutsceneOptions): Playing {
  const rig = makeRig();
  const space = pooled('space', spaceScene);
  const tiny = rocketFor('tiny');
  tiny.group.scale.setScalar(0.12);
  tiny.group.quaternion.setFromUnitVectors(UP, SPACE_DIR);
  tiny.flame = 1;
  space.scene.add(tiny.group);

  const lander = stage.lander;
  const [lx, lz] = [lander.position.x, lander.position.z];
  const [ax, az] = stage.landerStand;
  /** Where she wakes up: clear of the rocket, so the eye-level camera is never inside it. */
  const [bx, bz] = [ax - 2.5, az + 4.5];
  const ship = rocketFor('ship');
  const burst = pooled('burst', () => makeBurst());
  const debris = pooled('debris', () => makeDebris());
  burst.hide();
  debris.hide();
  stage.scene.add(ship.group, burst.points, debris.group);
  lander.visible = false;
  stage.ada.group.visible = false;
  stage.pusula.group.visible = false;
  stage.ada.place(bx, bz);

  const blendAt = Math.max(19.4, T.talk + opts.talk - 1.2);
  const end = blendAt + 2.2;
  const beat = beatClock(BEATS, opts.onBeat);
  const from = new THREE.Vector3(lx + 36, 55, lz - 40);
  const ground = new THREE.Vector3(lx, 0, lz);
  const eyes = new THREE.Vector3(bx, 1.4, bz - 3.5);
  const behind = new THREE.Vector3(bx - 7, 3.4, bz + 8);
  const sky = new THREE.Vector3(bx + 2, 8, bz + 6);
  const both = new THREE.Vector3((ax + bx) / 2 + 1, 1.6, (az + bz) / 2);
  /** While they talk the camera drifts slowly round Ada and PUSULA (no static shot). */
  const pair = new THREE.Vector3(ax + 1, 1.6, az + 0.6);
  const arcFrom = Math.atan2(behind.x - pair.x, behind.z - pair.z);
  const arcR = Math.hypot(behind.x - pair.x, behind.z - pair.z);
  const arcStart = T.stand + 1.4;
  const look = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let t = 0;
  let fired = false;
  let swapped = false;
  let pusulaSent = false;
  let walked = false;
  let ended = false;

  const spaceShot = (): void => {
    const u = ease(t / T.space);
    space.mars.rotation.y = t * 0.05;
    tiny.group.position.lerpVectors(SPACE_FROM, SPACE_TO, t / T.space);
    rig.pose(pos.set(14 - 10 * u, 3 - u, 52 - 28 * u), look.set(u, u, 10 * u));
  };

  const fallShot = (): void => {
    const u = span(t, T.space, T.impact);
    ship.group.position.lerpVectors(from, ground, u * (0.55 + 0.45 * u));
    ship.group.rotation.y = lander.rotation.y;
    ship.pivot.rotation.set(0, 0, -(0.2 + 0.25 * u + Math.sin(t * 5) * 0.06));
    ship.flame = 1;
    look.lerpVectors(ship.group.position, ground, 0.35).setY(Math.max(2, ship.group.position.y * 0.7));
    rig.pose(pos.set(lx - 26 + 8 * u, 4 - u, lz + 26 - 6 * u), look);
    if (!opts.calm) rig.shake(0.05 + 0.2 * u, t);
  };

  const crashShot = (): void => {
    const u = span(t, T.impact, T.swap);
    // It hits leaning hard, then rocks back into the wreck pose the game shows.
    const settle = ease(span(t, T.impact, T.settle));
    ship.group.position.copy(ground);
    ship.pivot.rotation.set(0, 0, THREE.MathUtils.lerp(-0.5, WRECK.tilt, settle));
    ship.pivot.position.y = -WRECK.sink * settle;
    ship.flame = Math.max(0, 1 - u * 6);
    rig.pose(pos.set(lx - 24 + 5 * u, 7 - 2 * u, lz + 24 - 5 * u), look.set(lx, 2.5, lz));
    if (!opts.calm) rig.shake(0.8 * Math.exp(-u * 4), t);
  };

  const wakeShot = (): void => {
    // Lying on her back, head towards -z: the camera starts at her eyes, looking at the sky.
    const getUp = ease(span(t, T.stand + 0.1, T.stand + 1.2));
    stage.ada.group.rotation.x = (-Math.PI / 2) * (1 - getUp);
    const k = ease(span(t, T.stand - 0.2, T.stand + 1.4));
    if (t < arcStart) {
      rig.pose(pos.lerpVectors(eyes, behind, k), look.lerpVectors(sky, both, k));
    } else {
      const a = arcFrom + (t - arcStart) * 0.035;
      const r = THREE.MathUtils.lerp(arcR, 9, ease(span(t, arcStart, arcStart + 5)));
      pos.set(pair.x + Math.sin(a) * r, THREE.MathUtils.lerp(3.4, 2.8, ease(span(t, arcStart, arcStart + 5))), pair.z + Math.cos(a) * r);
      rig.pose(pos, look.lerpVectors(both, pair, ease(span(t, arcStart, arcStart + 2))));
    }
    if (t >= T.stand && !pusulaSent) {
      pusulaSent = true;
      stage.pusula.group.visible = true;
      stage.pusula.goTo(ax + 14, az - 10, true);
      stage.pusula.group.position.y = 9;
      stage.pusula.goTo(ax + 2.2, az + 1.2);
    }
    // Up on her feet, she walks over to PUSULA (where the game starts her).
    if (t >= T.stand + 1.4 && !walked) {
      walked = true;
      stage.ada.walkTo(ax, az, 1.6, () => stage.ada.face(ax + 2.2, az + 1.2));
    }
    if (t >= blendAt) rig.blendTo(stage.gameCamera, span(t, blendAt, end));
  };

  const cut: Playing = {
    camera: rig.camera,
    scene: space.scene,
    sky: 'dust',
    storm: 'none',
    day: 0.45,
    update(dt) {
      if (ended) return;
      t += dt;
      beat(t);
      opts.onTick(t);
      tiny.update(dt);
      ship.update(dt);
      burst.update(dt);
      debris.update(dt);
      if (t < T.space) return spaceShot();
      cut.scene = null;
      cut.storm = t < T.swap ? 'dust' : 'none';
      if (t < T.impact) return fallShot();
      if (!fired) {
        fired = true;
        burst.fire(lx, lz);
        debris.fire(lx, 3, lz);
      }
      if (t < T.swap) return crashShot();
      if (!swapped) {
        // Under the black: the cutscene rocket gives way to the scenery wreck in the same pose.
        swapped = true;
        ship.group.visible = false;
        burst.hide();
        debris.hide();
        lander.visible = true;
        stage.ada.group.visible = true;
        cut.sky = 'day';
        cut.day = 0.1;
      }
      wakeShot();
      if (t >= end) {
        ended = true;
        opts.onEnd();
      }
    },
    dispose() {
      space.scene.remove(tiny.group);
      stage.scene.remove(ship.group, burst.points, debris.group);
      lander.visible = true;
      stage.ada.group.visible = true;
      stage.ada.group.rotation.x = 0;
      stage.pusula.group.visible = true;
    },
  };
  return cut;
}
