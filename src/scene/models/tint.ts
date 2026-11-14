// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Shader tweaks for atlas-textured models, where one material covers the whole model and a
// plain colour would tint everything at once (F5a, adapted from the trial build).

import * as THREE from 'three';

function patch(material: THREE.MeshStandardMaterial, key: string, glsl: string, head = ''): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${head}\nvoid main() {`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${glsl}`);
  };
  material.customProgramCacheKey = () => key;
}

/** Recolours only the light, unsaturated texels (the grey suit fabric) with `color`. */
export function tintSuit(material: THREE.MeshStandardMaterial, color: number): void {
  const suit = { value: new THREE.Color(color) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.suitColor = suit;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec3 suitColor;\nvoid main() {').replace(
      '#include <map_fragment>',
      `#include <map_fragment>
      float hi = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);
      float lo = min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
      float suitMask = smoothstep(0.2, 0.32, hi) * (1.0 - smoothstep(0.06, 0.14, hi - lo));
      diffuseColor.rgb = mix(diffuseColor.rgb, suitColor * (0.45 + 0.6 * hi), suitMask);`,
    );
  };
  material.customProgramCacheKey = () => 'suit-tint';
}

/** Turns green-dominant texels blue (the robot model is green; PUSULA is blue). */
export function greenToBlue(material: THREE.MeshStandardMaterial): void {
  patch(material, 'green-to-blue', 'if (diffuseColor.g > diffuseColor.r && diffuseColor.g > diffuseColor.b) diffuseColor.rgb = diffuseColor.rbg;');
}

/** Makes the dark (glass) texels of a dome see-through and pale green, so the plants show. */
export function glassPanes(material: THREE.MeshStandardMaterial): void {
  material.transparent = true;
  patch(
    material,
    'glass-panes',
    'if (max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b) < 0.06) diffuseColor = vec4(0.55, 0.85, 0.75, 0.28 * diffuseColor.a);',
  );
}

/** Greys out strongly coloured texels (a tiny flag decal in the rover's atlas, Hard Rule 13). */
export function desaturateDecals(material: THREE.MeshStandardMaterial): void {
  patch(
    material,
    'no-decals',
    `float hi2 = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);
    float lo2 = min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);
    if (hi2 - lo2 > 0.25 && !(diffuseColor.r > 0.3 && diffuseColor.g > 0.2 && diffuseColor.b < 0.15)) diffuseColor.rgb = vec3((hi2 + lo2) * 0.5);`,
  );
}
