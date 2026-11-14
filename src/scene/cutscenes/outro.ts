// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Closing cutscenes (F5c). Success: dawn, the rescue ship lands, the camera circles the village
// the player built, Ada waves. Early evacuation: night, the base lights go out one by one and the
// capsule lifts off, calm and hopeful (kid-safe). Both end on the result screen.

import * as THREE from 'three';
import { GRID_HALF } from '../grid.ts';
import { CAMERA } from '../layout.ts';
import { beatClock } from './cutscene.ts';
import type { Beat, CutsceneOptions, Playing, Stage } from './cutscene.ts';
import { ease, makeBaseLights, makeBurst, makeRig, makeRocket, span } from './props.ts';

const WIN_BEATS: [number, Beat][] = [[0, 'bars'], [0.4, 'liftoff'], [4.6, 'land'], [10.4, 'tagline'], [14, 'fadeOut']];
const WIN_END = 14.6;
const LOSE_BEATS: [number, Beat][] = [[0, 'bars'], [1.6, 'lightsOut'], [5.6, 'liftoff'], [7, 'tagline'], [11.4, 'fadeOut']];
const LOSE_END = 12;
/** Village tour: radius and height of the circle, and how far round it goes (radians). */
const TOUR = { r: 30, h: 13, turn: Math.PI * 1.4 };

const center = (): THREE.Vector3 => new THREE.Vector3(CAMERA.target[0], 0, CAMERA.target[2]);

export function playWin(stage: Stage, opts: CutsceneOptions): Playing {
  const rig = makeRig();
  const ship = makeRocket();
  const dust = makeBurst(400);
  stage.scene.add(ship.group, dust.points);
  const c = center();
  const pad = new THREE.Vector3(c.x - 6, 0, c.z - GRID_HALF - 13);
  const [ax, az] = stage.habitatStand() ?? stage.landerStand;
  stage.ada.place(ax, az);
  stage.pusula.goTo(ax + 2.2, az + 1.2, true);
  const beat = beatClock(WIN_BEATS, opts.onBeat);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let t = 0;
  let ended = false;
  let landed = false;
  const cut: Playing = {
    camera: rig.camera,
    scene: null,
    sky: 'day',
    storm: 'none',
    day: 0,
    update(dt) {
      if (ended) return;
      t += dt;
      beat(t);
      ship.update(dt);
      dust.update(dt);
      // The ship slows down as it comes in (ease-out) and touches down at 4.6 s.
      const u = span(t, 0, 4.6);
      const down = 1 - (1 - u) * (1 - u);
      ship.group.position.set(pad.x, 50 * (1 - down), pad.z);
      ship.flame = u < 1 ? 1 : Math.max(0, 1 - (t - 4.6) * 2);
      if (u >= 1 && !landed) {
        landed = true;
        dust.fire(pad.x, pad.z);
      }
      if (t < 5) {
        rig.pose(pos.set(c.x + 6, 4, c.z + 8), look.copy(ship.group.position).setY(Math.max(4, ship.group.position.y)));
      } else if (t < 10.5) {
        const a = -TOUR.turn * (1 - ease(span(t, 5, 10.5)));
        rig.pose(pos.set(c.x + Math.sin(a) * TOUR.r, TOUR.h, c.z + Math.cos(a) * TOUR.r), look.set(c.x, 2, c.z));
        if (t > 6) stage.ada.wave(true);
        stage.ada.face(pos.x, pos.z);
      } else {
        const k = ease(span(t, 10.5, 13.5));
        const from = new THREE.Vector3(c.x, TOUR.h, c.z + TOUR.r);
        rig.pose(pos.lerpVectors(from, new THREE.Vector3(ax + 2, 2.8, az + 8), k), look.lerpVectors(c.clone().setY(2), new THREE.Vector3(ax, 1.8, az), k));
        stage.ada.face(pos.x, pos.z);
      }
      if (t >= WIN_END) {
        ended = true;
        opts.onEnd();
      }
    },
    dispose() {
      stage.scene.remove(ship.group, dust.points);
      stage.ada.wave(false);
    },
  };
  return cut;
}

export function playLose(stage: Stage, opts: CutsceneOptions): Playing {
  const rig = makeRig();
  const capsule = makeRocket();
  const spots = stage.spots();
  const lights = makeBaseLights(spots);
  stage.scene.add(capsule.group, lights.group);
  const lander = stage.lander.position;
  capsule.group.position.copy(lander);
  stage.lander.visible = false;
  stage.ada.group.visible = false;
  stage.pusula.group.visible = false;
  const total = Math.min(spots.length, 6);
  lights.set(total);
  const c = center();
  const beat = beatClock(LOSE_BEATS, opts.onBeat);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let t = 0;
  let ended = false;
  const cut: Playing = {
    camera: rig.camera,
    scene: null,
    sky: 'night',
    storm: 'none',
    day: null,
    update(dt) {
      if (ended) return;
      t += dt;
      beat(t);
      capsule.update(dt);
      // One light goes dark every 0.7 s from 1.6 s on.
      lights.set(Math.max(0, total - Math.floor(span(t, 1.6, 1.6 + total * 0.7) * total)));
      const rise = ease(span(t, 5.6, 11.4)) ** 1.6;
      capsule.group.position.set(lander.x, rise * 48, lander.z);
      capsule.flame = t > 5.4 ? 1 : 0;
      const k = ease(span(t, 0, 5.6));
      pos.set(c.x - 22 + 6 * k, 10 - 3 * k, c.z + 30 - 4 * k);
      const up = ease(span(t, 5.6, 10));
      look.lerpVectors(c.clone().setY(1), capsule.group.position, 0.25 + up * 0.75);
      rig.pose(pos, look);
      if (!opts.calm && t > 5.6 && t < 7.5) rig.shake(0.08, t);
      if (t >= LOSE_END) {
        ended = true;
        opts.onEnd();
      }
    },
    dispose() {
      stage.scene.remove(capsule.group, lights.group);
      stage.lander.visible = true;
      stage.ada.group.visible = true;
      stage.pusula.group.visible = true;
    },
  };
  return cut;
}
