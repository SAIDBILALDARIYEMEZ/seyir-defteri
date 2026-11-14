// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Real low-poly models for the stations, the rocket, PUSULA and the rover decor (F5a, adapted
// from the trial build). Each builder returns null when one of its files failed to load: the
// caller then keeps the primitive shape. Licenses: docs/asset-sources.md.

import * as THREE from 'three';
import type { StationId } from '../../sim/actions.ts';
import { bakeStatic, cloneModel, hasModel } from '../models/loader.ts';
import type { ModelOptions } from '../models/loader.ts';
import { desaturateDecals, glassPanes } from '../models/tint.ts';

export interface StationModel {
  group: THREE.Group;
  /** Solar panel materials, tinted from clean to dusty. */
  panelMats?: THREE.MeshStandardMaterial[];
  /** Regolith piles around the shelter: one more shows per shelter level. */
  piles?: THREE.Object3D[];
}

export const PANEL_CLEAN = 0xffffff;
export const PANEL_DUSTY = 0xc07a48;

const part = (id: string, opts: ModelOptions, x = 0, z = 0, yaw = 0): THREE.Group => {
  const m = cloneModel(id, { ownMaterials: true, ...opts }) as THREE.Group;
  m.position.set(x, 0, z);
  m.rotation.y = yaw;
  return m;
};

const standardMats = (root: THREE.Object3D): THREE.MeshStandardMaterial[] => {
  const out: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material;
    if (mat instanceof THREE.MeshStandardMaterial && !out.includes(mat)) out.push(mat);
  });
  return out;
};

type Builder = { models: string[]; build: () => StationModel };

/** The habitat's base module is about 2.2 units wide: this makes it about 6.4 like the dome. */
const HABITAT_SCALE = 2.9;

const BUILDERS: Partial<Record<StationId, Builder>> = {
  habitat: {
    models: ['kaykit/basemodule_B', 'kaykit/roofmodule_base'],
    build: () => {
      // KayKit modules stack: the roof sits one module height (1 unit) on the base.
      const inner = new THREE.Group();
      const roof = cloneModel('kaykit/roofmodule_base', { ownMaterials: true }) as THREE.Group;
      roof.position.y = 1;
      inner.add(cloneModel('kaykit/basemodule_B', { ownMaterials: true }) as THREE.Group, roof);
      inner.scale.setScalar(HABITAT_SCALE);
      const g = new THREE.Group();
      g.add(inner);
      return { group: g };
    },
  },
  panels: {
    models: ['kaykit/solarpanel'],
    build: () => {
      const g = new THREE.Group();
      for (const x of [-2.4, 0, 2.4]) g.add(part('kaykit/solarpanel', { width: 2.3 }, x, 0));
      return { group: g, panelMats: standardMats(g) };
    },
  },
  moxie: {
    models: ['quaternius/House_Cylinder', 'kaykit/containers_B'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('quaternius/House_Cylinder', { height: 3 }, 0.3, -0.2));
      g.add(part('kaykit/containers_B', { width: 1.6 }, -1.5, 0.7, 0.5));
      return { group: g };
    },
  },
  greenhouse: {
    models: ['quaternius/GeodesicDome', 'quaternius/Plant_1', 'quaternius/Plant_3'],
    build: () => {
      const g = new THREE.Group();
      const dome = part('quaternius/GeodesicDome', { width: 4.6 });
      dome.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
          glassPanes(mesh.material);
          mesh.castShadow = false;
        }
      });
      g.add(dome);
      g.add(part('quaternius/Plant_1', { height: 1.6 }, -0.8, 0.2));
      g.add(part('quaternius/Plant_3', { height: 1.8 }, 0.7, -0.3));
      g.add(part('quaternius/Plant_1', { height: 1.2 }, 0.2, 0.9, 1.2));
      return { group: g };
    },
  },
  shelter: {
    models: ['kaykit/basemodule_E', 'kaykit/rocks_A'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('kaykit/basemodule_E', { width: 3.8 }));
      const piles = [
        part('kaykit/rocks_A', { width: 1.8 }, -2.3, -0.6, 0.3),
        part('kaykit/rocks_A', { width: 1.7 }, 2.2, -0.8, 2.1),
        part('kaykit/rocks_A', { width: 2 }, 0, -2.2, 1.2),
      ];
      g.add(...piles);
      return { group: g, piles };
    },
  },
  antenna: {
    models: ['quaternius/Roof_Radar'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('quaternius/Roof_Radar', { height: 5 }, 0, 0, Math.PI));
      return { group: g };
    },
  },
  beacon: {
    models: ['kaykit/landingpad_small'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('kaykit/landingpad_small', { width: 3.6 }));
      const light = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 8), new THREE.MeshLambertMaterial({ color: 0xf28c28, emissive: 0x6a2a00 }));
      light.position.set(0, 0.9, 0);
      g.add(light);
      return { group: g };
    },
  },
  curiosity: {
    models: ['quaternius/Rover_1'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('quaternius/Rover_1', { width: 3.4 }, 0, 0, Math.PI / 2));
      return { group: g };
    },
  },
  science: {
    models: ['kaykit/drill_structure', 'kaykit/rocks_B'],
    build: () => {
      const g = new THREE.Group();
      g.add(part('kaykit/drill_structure', { height: 3.2 }));
      g.add(part('kaykit/rocks_B', { width: 1.6 }, 1.8, 0.5, 1));
      return { group: g };
    },
  },
};

/** The station from real models, or null to keep the primitive shape. */
export function buildStationModel(id: StationId): StationModel | null {
  const b = BUILDERS[id];
  return b && b.models.every(hasModel) ? b.build() : null;
}

export const LANDER_MODEL = 'kaykit/lander_A';
export const PUSULA_MODEL = 'quaternius/Enemy_ExtraSmall';
export const ROVER_DECOR_MODEL = 'nasa/perseverance';

/** The landing rocket, or null. */
export function buildLander(): THREE.Group | null {
  return hasModel(LANDER_MODEL) ? part(LANDER_MODEL, { height: 8 }) : null;
}

/**
 * The rover model as scenery at the valley edge: the logo decal sheet is removed and a tiny flag
 * in the atlas is greyed out (Hard Rule 13). Merged per material, no shadows (about 200k
 * triangles), so it stays cheap.
 */
export function buildRoverDecor(): THREE.Group | null {
  const m = cloneModel(ROVER_DECOR_MODEL, { width: 3.6, shadows: false });
  if (!m) return null;
  const drop: THREE.Object3D[] = [];
  m.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (mats.some((mat) => /arm_graphics/i.test(mat.name))) drop.push(mesh);
    for (const mat of mats) if (mat instanceof THREE.MeshStandardMaterial && /mars_2020_05/i.test(mat.name)) desaturateDecals(mat);
  });
  for (const o of drop) o.removeFromParent();
  const baked = bakeStatic(m);
  baked.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.receiveShadow = true;
  });
  return baked;
}

/** Every model the scene loads (Ada and the robot come from their own modules). */
export const SCENE_MODELS = [
  ...new Set([...Object.values(BUILDERS).flatMap((b) => b?.models ?? []), LANDER_MODEL, PUSULA_MODEL]),
];
