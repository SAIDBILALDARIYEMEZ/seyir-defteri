// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// A closed helmet for the skinned astronaut model (F5a, adapted from the trial build): white
// shell, gold visor that hides the face, a stripe in the suit colour. The source character has
// an animal head in the same skinned mesh: the Head bone is collapsed (its vertices shrink into
// the joint) and the helmet hangs on that bone with the inverse scale, so it follows the head.

import * as THREE from 'three';

const HELMET = { shell: 0xf4f1ec, visor: 0xe0a52c, visorGlow: 0x6b3d00, ring: 0x9aa3ad, fit: 0.95, headScale: 0.02 };

const SHELL_GEO = new THREE.SphereGeometry(1, 20, 14);
// Front cap of a slightly bigger sphere, centred on +z (the way the model faces).
const VISOR_GEO = new THREE.SphereGeometry(1.04, 20, 12, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.22, Math.PI * 0.5);
const STRIPE_GEO = new THREE.TorusGeometry(1.0, 0.07, 6, 28);
const RING_GEO = new THREE.CylinderGeometry(0.62, 0.7, 0.28, 18);
const SHELL_MAT = new THREE.MeshStandardMaterial({ color: HELMET.shell, roughness: 0.45 });
const VISOR_MAT = new THREE.MeshStandardMaterial({
  color: HELMET.visor,
  emissive: HELMET.visorGlow,
  emissiveIntensity: 0.55,
  metalness: 0.35,
  roughness: 0.18,
});
const RING_MAT = new THREE.MeshStandardMaterial({ color: HELMET.ring, roughness: 0.6, flatShading: true });

const v = new THREE.Vector3();

/** World-space box of the vertices skinned mostly to `boneIndex` (current pose). */
function boneVertexBox(mesh: THREE.SkinnedMesh, boneIndex: number): THREE.Box3 | null {
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  const box = new THREE.Box3();
  for (let i = 0; i < idx.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (idx.getComponent(i, k) === boneIndex) w += wgt.getComponent(i, k);
    if (w < 0.5) continue;
    mesh.getVertexPosition(i, v);
    mesh.applyBoneTransform(i, v);
    box.expandByPoint(v.applyMatrix4(mesh.matrixWorld));
  }
  return box.isEmpty() ? null : box;
}

export interface Helmet {
  /** Re-applies the head collapse after the animation mixer wrote the bone (every frame). */
  update(): void;
}

/** Puts a helmet on a skinned astronaut; null when the model has no Head bone. */
export function addHelmet(model: THREE.Object3D, stripeColor: number): Helmet | null {
  let skinned: THREE.SkinnedMesh | null = null;
  model.traverse((o) => {
    if (!skinned && (o as THREE.SkinnedMesh).isSkinnedMesh) skinned = o as THREE.SkinnedMesh;
  });
  const mesh = skinned as THREE.SkinnedMesh | null;
  const head = mesh?.skeleton.bones.find((b) => b.name === 'Head');
  if (!mesh || !head) return null;
  model.updateMatrixWorld(true);
  const box = boneVertexBox(mesh, mesh.skeleton.bones.indexOf(head));
  if (!box) return null;
  const size = box.getSize(new THREE.Vector3());
  const radius = (Math.max(size.x, size.y, size.z) / 2) * HELMET.fit;
  const helmet = new THREE.Group();
  const stripeMat = new THREE.MeshStandardMaterial({ color: stripeColor, emissive: stripeColor, emissiveIntensity: 0.35, roughness: 0.5 });
  const stripe = new THREE.Mesh(STRIPE_GEO, stripeMat);
  stripe.rotation.y = Math.PI / 2;
  const ring = new THREE.Mesh(RING_GEO, RING_MAT);
  ring.position.y = -0.92;
  helmet.add(new THREE.Mesh(SHELL_GEO, SHELL_MAT), new THREE.Mesh(VISOR_GEO, VISOR_MAT), stripe, ring);
  helmet.scale.setScalar(radius);
  helmet.position.copy(box.getCenter(new THREE.Vector3()));
  helmet.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  helmet.updateMatrixWorld(true);
  // attach() keeps the world transform: from now on the helmet turns with the head.
  head.attach(helmet);
  const k = HELMET.headScale;
  helmet.matrixAutoUpdate = false;
  helmet.matrix.premultiply(new THREE.Matrix4().makeScale(1 / k, 1 / k, 1 / k));
  const rest = head.scale.clone();
  const collapse = (): void => {
    head.scale.copy(rest).multiplyScalar(k);
  };
  collapse();
  return { update: collapse };
}
