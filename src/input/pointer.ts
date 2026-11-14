// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pointer input on the canvas: tap a station = walk there and use it, tap the ground = walk
// there. Camera (B4): one-finger / left drag turns the view around (as before), right or
// middle drag turns and tilts it, the wheel zooms; two fingers twist / slide to turn and tilt
// and pinch to zoom. While a store card is selected, taps place the building instead.

import type { Placement } from './placement.ts';
import type { PickId, World } from '../scene/world.ts';

const TAP_SLOP_PX = 8;

export interface PointerHandlers {
  onPick(id: PickId): void;
  onGround(x: number, z: number): void;
}

interface Touch {
  x: number;
  y: number;
}

/** Wraps an angle difference into (-PI, PI]. */
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export function attachPointer(canvas: HTMLCanvasElement, world: World, placement: Placement, on: PointerHandlers): void {
  const down = new Map<number, Touch>();
  let downX = 0;
  let downY = 0;
  let last: Touch = { x: 0, y: 0 };
  /** Right / middle mouse button: free orbit (turn + tilt). */
  let orbitButton = false;
  let moved = false;
  /** A second finger touched: this gesture is never a tap. */
  let multi = false;

  const pair = (): { mid: Touch; dist: number; angle: number } | null => {
    const [a, b] = [...down.values()];
    if (!a || !b) return null;
    return {
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    };
  };
  let lastPair = pair();

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    down.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (down.size === 1) {
      moved = false;
      multi = false;
      orbitButton = e.pointerType === 'mouse' && (e.button === 1 || e.button === 2);
      downX = e.clientX;
      downY = e.clientY;
      last = { x: e.clientX, y: e.clientY };
    } else {
      multi = true;
      lastPair = pair();
    }
    if (e.button === 1) e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-lifted pointers cannot be captured; the gesture still works.
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = down.get(e.pointerId);
    if (!p) {
      if (placement.selected()) {
        placement.hover(e.clientX, e.clientY);
        canvas.style.cursor = 'crosshair';
      } else canvas.style.cursor = world.pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;
    if (down.size >= 2) {
      const now = pair();
      if (now && lastPair) {
        // Twist and side slide turn the view, an up / down slide tilts it, a pinch zooms.
        world.view.turnBy(-wrap(now.angle - lastPair.angle));
        world.view.drag(now.mid.x - lastPair.mid.x, now.mid.y - lastPair.mid.y);
        if (now.dist > 1 && lastPair.dist > 1) world.view.zoomBy(lastPair.dist / now.dist);
      }
      lastPair = now;
      return;
    }
    if (multi) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) moved = true;
    if (moved) world.view.drag(e.clientX - last.x, orbitButton ? e.clientY - last.y : 0);
    last = { x: e.clientX, y: e.clientY };
  });
  const lift = (e: PointerEvent): boolean => {
    if (!down.delete(e.pointerId)) return false;
    lastPair = pair();
    // Back to one finger after a two-finger gesture: continue from where it rests.
    const [rest] = [...down.values()];
    if (down.size === 1 && rest) last = { ...rest };
    return down.size === 0;
  };
  canvas.addEventListener('pointerup', (e) => {
    if (!lift(e)) return;
    if (moved || multi || orbitButton) return;
    if (placement.tap(e.clientX, e.clientY)) return;
    const id = world.pick(e.clientX, e.clientY);
    if (id) return on.onPick(id);
    const ground = world.pickGround(e.clientX, e.clientY);
    if (ground) on.onGround(ground.x, ground.z);
  });
  canvas.addEventListener('pointercancel', (e) => {
    lift(e);
    multi = true;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    world.view.zoom(e.deltaY);
  }, { passive: false });
}
