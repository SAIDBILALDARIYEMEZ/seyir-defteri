// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Opening cutscene (F5c, about 21 s): (a) space, Mars comes closer; (b) the rocket enters a dust
// storm; (c) it comes down on its side, dust burst, debris, flash, black; (d) Ada wakes up,
// stands, PUSULA flies in, and the camera glides into the game's view. Existing models only.

import * as THREE from 'three';
import { beatClock } from './cutscene.ts';
import type { Beat, CutsceneOptions, Playing, Stage } from './cutscene.ts';
import { ease, makeBurst, makeDebris, makeMars, makeRig, makeRocket, makeStars, span } from './props.ts';

/** Shot times in seconds. */
const T = { space: 5, impact: 10.6, swap: 13.2, wake: 13.6, stand: 15.8, blend: 19.4, end: 21.6 };
const BEATS: [number, Beat][] = [
  [0, 'bars'],
  [0.6, 'title'],
  [4.1, 'whoosh'],
  [4.5, 'fadeOut'],
  [5.0, 'fadeIn'],
  [5.2, 'storm'],
  [5.8, 'warn'],
  [T.impact, 'impact'],
  [12.4, 'flash'],
  [12.8, 'black'],
  [T.wake, 'wake'],
  [17.6, 'pusula'],
  [20.4, 'clear'],
];
const UP = new THREE.Vector3(0, 1, 0);

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
  const space = spaceScene();
  const shipInSpace = makeRocket();
  shipInSpace.group.scale.setScalar(0.12);
  shipInSpace.flame = 1;
  space.scene.add(shipInSpace.group);

  const [lx, lz] = [stage.lander.position.x, stage.lander.position.z];
  const [ax, az] = stage.landerStand;
  const ship = makeRocket();
  const burst = makeBurst();
  const debris = makeDebris();
  stage.scene.add(ship.group, burst.points, debris.group);
  stage.lander.visible = false;
  stage.ada.group.visible = false;
  stage.pusula.group.visible = false;
  stage.ada.place(ax - 2.5, az + 4.5);

  const beat = beatClock(BEATS, opts.onBeat);
  const from = new THREE.Vector3(lx + 36, 55, lz - 40);
  const ground = new THREE.Vector3(lx, 0, lz);
  const v = new THREE.Vector3();
  const look = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let t = 0;
  let swapped = false;
  let pusulaSent = false;
  let ended = false;

  const spaceShot = (): void => {
    const u = ease(t / T.space);
    space.mars.rotation.y = t * 0.05;
    const a = new THREE.Vector3(6, 4, 34);
    const b = new THREE.Vector3(1.5, 1.2, 12.5);
    shipInSpace.group.position.lerpVectors(a, b, t / T.space);
    shipInSpace.group.quaternion.setFromUnitVectors(UP, v.subVectors(b, a).normalize());
    rig.pose(pos.set(14 - 10 * u, 3 - u, 52 - 28 * u), look.set(u, u, 10 * u));
  };

  const fallShot = (): void => {
    const u = span(t, T.space, T.impact);
    ship.group.position.lerpVectors(from, ground, u * (0.55 + 0.45 * u));
    ship.group.rotation.set(0, 0, 0.2 + 0.3 * u + Math.sin(t * 5) * 0.06);
    ship.flame = 1;
    look.lerpVectors(ship.group.position, ground, 0.35).setY(Math.max(2, ship.group.position.y * 0.7));
    rig.pose(pos.set(lx - 26 + 8 * u, 4 - u, lz + 26 - 6 * u), look);
    if (!opts.calm) rig.shake(0.05 + 0.2 * u, t);
  };

  const crashShot = (): void => {
    const u = span(t, T.impact, T.swap);
    ship.group.position.copy(ground);
    ship.group.rotation.set(0, 0, 0.5);
    ship.flame = Math.max(0, 1 - u * 6);
    rig.pose(pos.set(lx - 24 + 5 * u, 7 - 2 * u, lz + 24 - 5 * u), look.set(lx, 2.5, lz));
    if (!opts.calm) rig.shake(0.8 * Math.exp(-u * 4), t);
  };

  /** Where she wakes up: clear of the rocket, so the eye-level camera is never inside it. */
  const [bx, bz] = [ax - 2.5, az + 4.5];
  let walked = false;
  const wakeShot = (): void => {
    // Lying on her back, head towards -z: the camera starts at her eyes, looking at the sky.
    const getUp = ease(span(t, T.stand + 0.1, T.stand + 1.2));
    stage.ada.group.rotation.x = (-Math.PI / 2) * (1 - getUp);
    const k = ease(span(t, T.stand - 0.2, T.stand + 1.4));
    pos.lerpVectors(v.set(bx, 1.4, bz - 3.5), look.set(bx - 7, 3.4, bz + 8), k);
    const sky = new THREE.Vector3(bx + 2, 8, bz + 6);
    rig.pose(pos, look.lerpVectors(sky, new THREE.Vector3((ax + bx) / 2 + 1, 1.6, (az + bz) / 2), k));
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
    if (t >= T.blend) rig.blendTo(stage.gameCamera, span(t, T.blend, T.end));
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
      shipInSpace.update(dt);
      ship.update(dt);
      burst.update(dt);
      debris.update(dt);
      if (t < T.space) return spaceShot();
      cut.scene = null;
      cut.storm = t < T.swap ? 'dust' : 'none';
      if (t < T.impact) return fallShot();
      if (!burst.points.userData.fired) {
        burst.points.userData.fired = true;
        burst.fire(lx, lz);
        debris.fire(lx, 3, lz);
      }
      if (t < T.swap) return crashShot();
      if (!swapped) {
        swapped = true;
        ship.group.visible = burst.points.visible = debris.group.visible = false;
        stage.lander.visible = true;
        stage.ada.group.visible = true;
        cut.sky = 'day';
        cut.day = 0.1;
      }
      wakeShot();
      if (t >= T.end) {
        ended = true;
        opts.onEnd();
      }
    },
    dispose() {
      stage.scene.remove(ship.group, burst.points, debris.group);
      stage.lander.visible = true;
      stage.ada.group.visible = true;
      stage.ada.group.rotation.x = 0;
      stage.pusula.group.visible = true;
      space.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    },
  };
  return cut;
}
