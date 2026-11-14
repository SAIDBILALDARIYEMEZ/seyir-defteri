// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Success closing (F5c): dawn, a big rescue ship lands on the player's landing marker (or beside
// the village when there is none), the camera circles the finished village, Ada waves while
// PUSULA cheers, then the "Mission complete" card. The crashed rocket stays where it lies.

import * as THREE from 'three';
import { GRID_HALF } from '../grid.ts';
import { CAMERA } from '../layout.ts';
import { beatClock } from './cutscene.ts';
import type { CutsceneOptions, Playing, Stage } from './cutscene.ts';
import { ease, makeBurst, makeRig, pooled, rocketFor, span } from './props.ts';

/** Village tour: radius and height of the circle, and how far round it goes (radians). */
const TOUR = { r: 30, h: 13, turn: Math.PI * 1.4 };
const TOUCHDOWN = 4.6;
const SHIP_SCALE = 1.4;
/** The final card stays this long; the fade to black starts 0.6 s before the end. */
const CARD_S = 3.6;
const CENTER = new THREE.Vector3(CAMERA.target[0], 0, CAMERA.target[2]);

export function playWin(stage: Stage, opts: CutsceneOptions): Playing {
  const rig = makeRig();
  const ship = rocketFor('rescue');
  ship.group.scale.setScalar(SHIP_SCALE);
  const dust = pooled('dust', () => makeBurst(300));
  dust.hide();
  stage.scene.add(ship.group, dust.points);
  const c = CENTER;
  const marker = stage.spots().find((s) => s.id === 'beacon');
  const pad = marker ? new THREE.Vector3(marker.x, 0, marker.z) : new THREE.Vector3(c.x - 6, 0, c.z - GRID_HALF - 13);
  const [ax, az] = stage.habitatStand() ?? stage.landerStand;
  stage.ada.place(ax, az);
  stage.pusula.goTo(ax + 2.2, az + 1.2, true);
  const finalAt = Math.max(11, 1.0 + opts.talk + 0.4);
  const end = finalAt + CARD_S;
  const beat = beatClock(
    [[0, 'bars'], [0.4, 'liftoff'], [1.0, 'talk'], [TOUCHDOWN, 'land'], [finalAt, 'final'], [end - 0.6, 'fadeOut']],
    opts.onBeat,
  );
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tourEnd = new THREE.Vector3(c.x, TOUR.h, c.z + TOUR.r);
  // High enough to see Ada over the buildings in front of the habitat, whatever the layout.
  const close = new THREE.Vector3(ax + 2, 10, az + 6.5);
  /** The landing is filmed from well outside the village, towards the marker. */
  const watch = new THREE.Vector3(pad.x - 16, 5, pad.z + 22);
  const lookFrom = c.clone().setY(2);
  const lookTo = new THREE.Vector3(ax, 1.5, az);
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
      opts.onTick(t);
      ship.update(dt);
      dust.update(dt);
      // The ship slows down as it comes in (ease-out) and touches down on the marker.
      const u = span(t, 0, TOUCHDOWN);
      ship.group.position.set(pad.x, 50 * (1 - u) * (1 - u), pad.z);
      ship.flame = u < 1 ? 1 : Math.max(0, 1 - (t - TOUCHDOWN) * 2);
      if (u >= 1 && !landed) {
        landed = true;
        dust.fire(pad.x, pad.z);
      }
      if (t < 5) {
        rig.pose(watch, look.copy(ship.group.position).setY(Math.max(4, ship.group.position.y)));
      } else if (t < 10.5) {
        const a = -TOUR.turn * (1 - ease(span(t, 5, 10.5)));
        rig.pose(pos.set(c.x + Math.sin(a) * TOUR.r, TOUR.h, c.z + Math.cos(a) * TOUR.r), look.set(c.x, 2, c.z));
        if (t > 6) stage.ada.wave(true);
        stage.ada.face(pos.x, pos.z);
      } else {
        const k = ease(span(t, 10.5, 13.5));
        rig.pose(pos.lerpVectors(tourEnd, close, k), look.lerpVectors(lookFrom, lookTo, k));
        stage.ada.face(pos.x, pos.z);
      }
      if (t >= end) {
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
