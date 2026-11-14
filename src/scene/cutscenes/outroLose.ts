// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Early-evacuation closing (F5c): night; a light blinks high in the sky and a small emergency
// capsule comes down under a parachute; Ada and PUSULA climb in and it lifts off gently. The camera
// turns back to the half-built base and the crashed rocket (it never flies), the lights go out one
// by one and a light dust settles. Sad but safe: no explosion, no shaking, soft sounds only.

import * as THREE from 'three';
import { CAMERA } from '../layout.ts';
import { beatClock } from './cutscene.ts';
import type { CutsceneOptions, Playing, Stage } from './cutscene.ts';
import { ease, makeRig, pooled, span } from './props.ts';
import { makeBaseLights, makeBlinker, makeCapsule } from './rescueProps.ts';

/** Story times (s): the blink, the parachute descent, boarding and the gentle lift-off. */
const T = { blink: 0.5, drop: 3, touch: 8, walk: 8.6, aboard: 11, lift: 11.6, gone: 16, talk: 12, back: 14.5, lights: 15.5 };
const CARD_S = 4.5;
const DROP_H = 16;
const CENTER = new THREE.Vector3(CAMERA.target[0], 0, CAMERA.target[2]);

export function playLose(stage: Stage, opts: CutsceneOptions): Playing {
  const rig = makeRig();
  const capsule = pooled('capsule', makeCapsule);
  capsule.reset();
  const blinker = pooled('blinker', makeBlinker);
  const lights = pooled('lights', () => makeBaseLights());
  const total = lights.place(stage.spots());
  lights.set(total);
  const lander = stage.lander.position;
  const [ax, az] = stage.landerStand;
  // The capsule lands in front of Ada, on the camera's side, away from the wreck.
  const pad = new THREE.Vector3(ax - 5, 0, az + 5);
  stage.ada.place(ax, az);
  stage.ada.face(pad.x, pad.z);
  stage.pusula.goTo(ax + 2.2, az + 1.2, true);
  // High above the pad, a little behind it: in view from the opening camera.
  blinker.mesh.position.set(pad.x + 3, 20, pad.z - 8);
  stage.scene.add(capsule.group, blinker.mesh, lights.group);

  const finalAt = Math.max(17.5, T.talk + opts.talk + 0.4);
  const end = finalAt + CARD_S;
  const beat = beatClock(
    [[0, 'bars'], [T.walk, 'board'], [T.lift, 'liftoff'], [T.talk, 'talk'], [T.lights, 'lightsOut'], [finalAt, 'final'], [end - 0.6, 'fadeOut']],
    opts.onBeat,
  );
  const c = CENTER;
  const base = new THREE.Vector3((c.x + lander.x) / 2, 1.5, (c.z + lander.z) / 2);
  const wide = new THREE.Vector3(ax - 7, 4, az + 26);
  const mid = new THREE.Vector3((ax + pad.x) / 2, 1.8, (az + pad.z) / 2);
  const near = new THREE.Vector3(pad.x - 4, 3, pad.z + 9);
  const padGround = new THREE.Vector3(pad.x, 1.5, pad.z);
  const back = new THREE.Vector3(c.x - 18, 9, c.z + 30);
  const ada = new THREE.Vector3(ax, 2, az);
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let t = 0;
  let ended = false;
  let walked = false;
  let aboard = false;

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
      opts.onTick(t);
      capsule.update(dt);
      blinker.update(t, t > T.blink && t < T.touch);
      // Down under the parachute, a soft thruster puff just before touch-down.
      const fall = span(t, T.drop, T.touch);
      const lift = ease(span(t, T.lift, T.gone)) ** 1.5;
      capsule.group.position.set(pad.x, t < T.lift ? DROP_H * (1 - ease(fall)) : lift * 50, pad.z);
      capsule.group.visible = t >= T.drop - 0.2;
      capsule.chute.visible = t < T.touch;
      capsule.burn = (t > T.touch - 0.8 && t < T.touch + 0.2) || (t > T.lift && t < T.gone) ? 1 : 0;
      if (t >= T.walk && !walked) {
        walked = true;
        stage.ada.walkTo(pad.x - 1.6, pad.z + 0.6, 2.2, () => undefined);
        stage.pusula.goTo(pad.x + 1.6, pad.z + 0.8);
      }
      if (t >= T.aboard && !aboard) {
        aboard = true;
        stage.ada.group.visible = stage.pusula.group.visible = false;
      }
      // One light goes dark every 0.6 s, then a light dust drifts over the base.
      lights.set(Math.max(0, total - Math.floor(span(t, T.lights, T.lights + total * 0.6) * total)));
      cut.storm = t > T.lights + 1 ? 'dust' : 'none';
      if (t < T.walk) {
        // The base stays in the lower part of the frame; the view lifts a little to the blink
        // and then follows the parachute down.
        const sky = t < T.drop ? blinker.mesh.position : capsule.group.position;
        rig.pose(wide, look.lerpVectors(ada, sky, 0.5));
      } else if (t < T.lift) {
        const k = ease(span(t, T.walk, T.walk + 1.5));
        rig.pose(pos.lerpVectors(wide, near, k), look.lerpVectors(ada, mid, k));
      } else if (t < T.back) {
        // Follow the capsule up, but keep the ground (and the pad) in the frame.
        // Pull back to the wide view as it climbs; the ground and the base stay in the frame.
        const k = ease(span(t, T.lift, T.lift + 2));
        rig.pose(pos.lerpVectors(near, wide, k), look.lerpVectors(padGround, base, ease(span(t, T.lift, T.back))).lerp(capsule.group.position, 0.15));
      } else {
        const k = ease(span(t, T.back, T.back + 3));
        rig.pose(pos.lerpVectors(wide, back, k), look.copy(base).lerp(capsule.group.position, 0.15 * (1 - k)));
      }
      if (t >= end) {
        ended = true;
        opts.onEnd();
      }
    },
    dispose() {
      stage.scene.remove(capsule.group, blinker.mesh, lights.group);
      stage.ada.group.visible = true;
      stage.pusula.group.visible = true;
    },
  };
  return cut;
}
