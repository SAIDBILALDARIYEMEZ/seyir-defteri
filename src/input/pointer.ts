// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pointer input on the canvas: tap a station = walk there and use it, tap the ground = walk
// there, drag = turn the camera (limited), wheel = zoom (limited). While a store card is
// selected, taps place the building instead. Mouse and touch both arrive as pointer events.

import type { Placement } from './placement.ts';
import type { PickId, World } from '../scene/world.ts';

const TAP_SLOP_PX = 8;

export interface PointerHandlers {
  onPick(id: PickId): void;
  onGround(x: number, z: number): void;
}

export function attachPointer(canvas: HTMLCanvasElement, world: World, placement: Placement, on: PointerHandlers): void {
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let dragging = false;
  let moved = false;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    downX = lastX = e.clientX;
    downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) {
      if (placement.selected()) {
        placement.hover(e.clientX, e.clientY);
        canvas.style.cursor = 'crosshair';
      } else canvas.style.cursor = world.pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP_PX) moved = true;
    if (moved) world.rotate(e.clientX - lastX);
    lastX = e.clientX;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved) return;
    if (placement.tap(e.clientX, e.clientY)) return;
    const id = world.pick(e.clientX, e.clientY);
    if (id) return on.onPick(id);
    const ground = world.pickGround(e.clientX, e.clientY);
    if (ground) on.onGround(ground.x, ground.z);
  });
  canvas.addEventListener('pointercancel', () => (dragging = false));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    world.zoom(e.deltaY);
  }, { passive: false });
}
