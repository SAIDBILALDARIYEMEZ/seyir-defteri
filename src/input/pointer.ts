// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pointer input on the canvas: tap = pick a station, drag = turn the camera (limited),
// wheel = zoom (limited). Mouse and touch both arrive as pointer events.

import type { PickId, World } from '../scene/world.ts';

const TAP_SLOP_PX = 8;

export function attachPointer(canvas: HTMLCanvasElement, world: World, onPick: (id: PickId) => void): void {
  let downX = 0;
  let lastX = 0;
  let dragging = false;
  let moved = false;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    downX = lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) {
      canvas.style.cursor = world.pick(e.clientX, e.clientY) ? 'pointer' : 'grab';
      return;
    }
    if (Math.abs(e.clientX - downX) > TAP_SLOP_PX) moved = true;
    if (moved) world.rotate(e.clientX - lastX);
    lastX = e.clientX;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved) return;
    const id = world.pick(e.clientX, e.clientY);
    if (id) onPick(id);
  });
  canvas.addEventListener('pointercancel', () => (dragging = false));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    world.zoom(e.deltaY);
  }, { passive: false });
}
