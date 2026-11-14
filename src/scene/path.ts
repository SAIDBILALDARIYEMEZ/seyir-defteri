// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Simple walking path around buildings (B3): A* on a 1-unit grid over the valley floor, then
// the corners are cut where the straight line stays clear. Visual only, never touches the sim.

export interface Blocker {
  x: number;
  z: number;
  r: number;
}

export type Point = [number, number];

const STEP = 1;
const DIRS: Point[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const blockedAt = (x: number, z: number, blockers: Blocker[]): boolean =>
  blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r);

/** True when the straight segment a -> b stays outside every blocker. */
function clear(a: Point, b: Point, blockers: Blocker[]): boolean {
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (STEP / 2));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (blockedAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, blockers)) return false;
  }
  return true;
}

/**
 * Waypoints from `from` to `to` (the target itself last). `limit` is the half-size of the
 * walkable square. Falls back to the straight line when no path exists.
 */
export function findPath(from: Point, to: Point, blockers: Blocker[], limit: number): Point[] {
  // Ignore blockers the walker already stands in (it must be able to step out).
  const live = blockers.filter((b) => Math.hypot(from[0] - b.x, from[1] - b.z) >= b.r);
  if (clear(from, to, live)) return [to];
  const size = Math.floor((limit * 2) / STEP) + 1;
  const idx = (p: Point): number => {
    const cx = Math.round((p[0] + limit) / STEP);
    const cz = Math.round((p[1] + limit) / STEP);
    return Math.max(0, Math.min(size - 1, cz)) * size + Math.max(0, Math.min(size - 1, cx));
  };
  const pos = (i: number): Point => [(i % size) * STEP - limit, Math.floor(i / size) * STEP - limit];
  const start = idx(from);
  const goal = idx(to);
  const g = new Float64Array(size * size).fill(Infinity);
  const prev = new Int32Array(size * size).fill(-1);
  const h = (i: number): number => Math.hypot(pos(i)[0] - pos(goal)[0], pos(i)[1] - pos(goal)[1]);
  const open: { i: number; f: number }[] = [{ i: start, f: h(start) }];
  g[start] = 0;
  while (open.length > 0) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if ((open[k]?.f ?? 0) < (open[best]?.f ?? 0)) best = k;
    const cur = open.splice(best, 1)[0]?.i ?? goal;
    if (cur === goal) break;
    const [px, pz] = pos(cur);
    for (const [dx, dz] of DIRS) {
      const nx = px + dx * STEP;
      const nz = pz + dz * STEP;
      if (Math.abs(nx) > limit || Math.abs(nz) > limit) continue;
      const ni = idx([nx, nz]);
      if (ni !== goal && blockedAt(nx, nz, live)) continue;
      const cost = (g[cur] ?? 0) + Math.hypot(dx, dz) * STEP;
      if (cost >= (g[ni] ?? Infinity)) continue;
      g[ni] = cost;
      prev[ni] = cur;
      open.push({ i: ni, f: cost + h(ni) });
    }
  }
  if (prev[goal] === -1) return [to];
  const cells: Point[] = [];
  for (let i = prev[goal] ?? -1; i !== -1 && i !== start; i = prev[i] ?? -1) cells.unshift(pos(i));
  // Cut corners: keep a waypoint only when the next one is not in straight sight.
  const out: Point[] = [];
  let anchor: Point = from;
  const all = [...cells, to];
  for (let k = 0; k < all.length; k++) {
    const next = all[k + 1];
    const here = all[k] as Point;
    if (next && clear(anchor, next, live)) continue;
    out.push(here);
    anchor = here;
  }
  return out;
}

/** Simple collision: keeps (x, z) inside the square `limit` and outside every blocker. */
export function pushOut(x: number, z: number, blockers: Blocker[], limit: number): Point {
  let px = Math.min(limit, Math.max(-limit, x));
  let pz = Math.min(limit, Math.max(-limit, z));
  for (const b of blockers) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const d = Math.hypot(dx, dz);
    if (d >= b.r) continue;
    const k = d < 1e-3 ? 0 : b.r / d;
    px = d < 1e-3 ? b.x : b.x + dx * k;
    pz = d < 1e-3 ? b.z + b.r : b.z + dz * k;
  }
  return [px, pz];
}
