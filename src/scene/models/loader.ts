// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Loads the low-poly .glb models (F5a, adapted from the trial build). Never throws: a model that
// fails to load is simply missing, and the scene keeps its primitive shape.

import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { debug } from '../../lib/debug.ts';

/** Model id = "pack/name", file = public/assets/models/<id>.glb. */
export const modelUrl = (id: string): string => `${import.meta.env.BASE_URL}assets/models/${id}.glb`;

const cache = new Map<string, GLTF>();

/** Loads models in parallel. Resolves when every file loaded or failed. */
export async function loadModels(ids: readonly string[]): Promise<void> {
  const loader = new GLTFLoader();
  // The rover model is Draco-compressed; Vite bundles the decoder from the three package.
  const draco = new DRACOLoader();
  loader.setDRACOLoader(draco);
  await Promise.all(
    ids
      .filter((id) => !cache.has(id))
      .map(
        (id) =>
          new Promise<void>((resolve) => {
            loader.load(
              modelUrl(id),
              (gltf) => {
                cache.set(id, gltf);
                resolve();
              },
              undefined,
              (err) => {
                debug('model failed', id, err);
                resolve();
              },
            );
          }),
      ),
  );
  draco.dispose();
}

export const hasModel = (id: string): boolean => cache.has(id);
export const modelClips = (id: string): THREE.AnimationClip[] => cache.get(id)?.animations ?? [];

export interface ModelOptions {
  /** Scale so the largest horizontal side is this many world units. */
  width?: number;
  /** Scale so the model is this tall (wins over width). */
  height?: number;
  /** Own material copies (needed when one station fades or tints on its own). */
  ownMaterials?: boolean;
  shadows?: boolean;
}

/** A fresh copy resting on y = 0, centred on x/z, wrapped in a group. Null if not loaded. */
export function cloneModel(id: string, opts: ModelOptions = {}): THREE.Group | null {
  const gltf = cache.get(id);
  if (!gltf) return null;
  const inner = SkeletonUtils.clone(gltf.scene);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  let s = 1;
  if (opts.height) s = opts.height / Math.max(size.y, 1e-3);
  else if (opts.width) s = opts.width / Math.max(size.x, size.z, 1e-3);
  inner.scale.multiplyScalar(s);
  const center = box.getCenter(new THREE.Vector3());
  inner.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  inner.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = opts.shadows !== false;
    mesh.receiveShadow = true;
    if (opts.ownMaterials) {
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
    }
  });
  const wrap = new THREE.Group();
  wrap.name = id;
  wrap.add(inner);
  return wrap;
}

/** Merges a big static model into one mesh per material (the rover: 250+ parts to ~45 draws). */
export function bakeStatic(root: THREE.Object3D): THREE.Group {
  root.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material)) return;
    let g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    const count = g.getAttribute('position').count;
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const list = byMat.get(mesh.material) ?? [];
    list.push(g);
    byMat.set(mesh.material, list);
  });
  const out = new THREE.Group();
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    if (merged) out.add(new THREE.Mesh(merged, mat));
  }
  return out;
}
