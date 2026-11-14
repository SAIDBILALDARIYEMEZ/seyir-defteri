// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { findPath } from './path.ts';
import type { Point } from './path.ts';

const hits = (a: Point, b: Point, c: Point, r: number): boolean => {
  for (let t = 0; t <= 1; t += 0.02) {
    if (Math.hypot(a[0] + (b[0] - a[0]) * t - c[0], a[1] + (b[1] - a[1]) * t - c[1]) < r - 0.05) return true;
  }
  return false;
};

describe('walking path', () => {
  it('goes straight when nothing is in the way', () => {
    expect(findPath([0, 0], [5, 5], [], 20)).toEqual([[5, 5]]);
  });

  it('walks around a building instead of through it', () => {
    const path = findPath([-8, 0], [8, 0], [{ x: 0, z: 0, r: 3 }], 20);
    expect(path.length).toBeGreaterThan(1);
    let at: Point = [-8, 0];
    for (const p of path) {
      expect(hits(at, p, [0, 0], 3)).toBe(false);
      at = p;
    }
    expect(path.at(-1)).toEqual([8, 0]);
  });
});
