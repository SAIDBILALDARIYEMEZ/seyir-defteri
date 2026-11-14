// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Placing a building: drag a store card onto the ground (mouse or touch, pointer events),
// or tap a card and then tap a spot. The ghost turns green on a valid cell, red with the
// sim's reason on an invalid one. R or the banner's turn button turns it 90 degrees (B4).
// Placing only calls back with (station, cell, facing): the game turns that into a sim action.

import { t } from '../i18n/i18n.ts';
import type { PlacedId, Cell, ReasonCode, Turn } from '../sim/actions.ts';
import { worldToCell } from '../scene/grid.ts';
import type { World } from '../scene/world.ts';
import { button, el } from '../ui/dom.ts';

const DRAG_SLOP_PX = 8;

export interface PlacementDeps {
  ui: HTMLElement;
  canvas: HTMLCanvasElement;
  world: World;
  /** False while the player cannot act (walking, a card is open, menu). */
  canAct(): boolean;
  /** The sim's reason why `id` cannot be built on `cell` right now, or null. */
  reasonFor(id: PlacedId, cell: Cell): ReasonCode | null;
  onPlace(id: PlacedId, cell: Cell, rot: Turn): void;
  /** True when `id` is already on the grid (the drop moves it). */
  moving(id: PlacedId): boolean;
  /** Current facing of `id` (0 when not placed yet). */
  facing(id: PlacedId): Turn;
  /** Selection changed: redraw the store. */
  onChange(): void;
}

export interface Placement {
  selected(): PlacedId | null;
  /** Pointer pressed on a store card. */
  press(id: PlacedId, e: PointerEvent): void;
  /** Tap mode without a pointer (keyboard, wrist-watch task). */
  select(id: PlacedId): void;
  cancel(): void;
  /** Pointer over the canvas while a card is selected. */
  hover(clientX: number, clientY: number): void;
  /** Tap on the canvas; true when placement used it. */
  tap(clientX: number, clientY: number): boolean;
  /** Turns the ghost a quarter turn (R key, turn button). */
  turn(): void;
}

export function createPlacement(d: PlacementDeps): Placement {
  let selected: PlacedId | null = null;
  let rot: Turn = 0;
  /** Last ghost position, so a turn redraws it in place. */
  let lastCell: Cell | null = null;
  let lastValid = false;
  const tip = el('div', 'ghost-tip');
  tip.hidden = true;
  const banner = el('div', 'place-banner');
  const bannerText = el('span');
  const cancelBtn = button('btn', '', () => cancel());
  const turnBtn = button('turn-btn', '', () => turn());
  banner.append(bannerText, turnBtn, cancelBtn);
  banner.hidden = true;
  d.ui.append(tip, banner);

  /** The scene is under the pointer (station name labels float over it and count too). */
  const overScene = (x: number, y: number): boolean => {
    const hit = document.elementFromPoint(x, y);
    return hit === d.canvas || (hit instanceof HTMLElement && hit.classList.contains('label'));
  };
  let dragging = false;
  const cellAt = (x: number, y: number): Cell | null => {
    const p = d.world.pickGround(x, y);
    return p ? worldToCell(p.x, p.z) : null;
  };
  const showTip = (x: number, y: number, text: string, bad: boolean): void => {
    tip.hidden = false;
    tip.textContent = text;
    tip.classList.toggle('bad', bad);
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -150%)`;
  };
  const refreshBanner = (): void => {
    banner.hidden = selected === null;
    if (!selected) return;
    const key = d.moving(selected) ? 'build.move' : 'build.place';
    bannerText.textContent = t(key, { station: t(`station.${selected}`) });
    cancelBtn.textContent = `✖ ${t('build.cancel')}`;
    turnBtn.textContent = `↻ ${t('build.turn')}`;
  };
  /** Ghost + tip at a screen point. Returns the cell and the reason (null = valid). */
  const preview = (x: number, y: number): { cell: Cell | null; reason: ReasonCode | null } => {
    if (!selected) return { cell: null, reason: null };
    const cell = cellAt(x, y);
    if (!cell) {
      ghostAt(null, false);
      tip.hidden = true;
      return { cell, reason: 'cellOutside' };
    }
    const reason = d.reasonFor(selected, cell);
    ghostAt(cell, reason === null);
    const move = d.moving(selected);
    const okKey = move ? (dragging ? 'build.moveGood' : 'build.moveSpot') : dragging ? 'build.goodSpot' : 'build.tapSpot';
    const ok = `✅ ${t(okKey)}`;
    showTip(x, y, reason ? t(`reason.${reason}`) : ok, reason !== null);
    return { cell, reason };
  };
  const attempt = (x: number, y: number): void => {
    const id = selected;
    const { cell, reason } = preview(x, y);
    if (!id || !cell || reason) return;
    const facing = rot;
    cancel();
    d.onPlace(id, cell, facing);
  };
  function ghostAt(cell: Cell | null, valid: boolean): void {
    lastCell = cell;
    lastValid = valid;
    d.world.setGhost(selected, cell, valid, rot);
  }
  function turn(): void {
    if (!selected) return;
    rot = ((rot + 1) % 4) as Turn;
    ghostAt(lastCell, lastValid);
  }
  function cancel(): void {
    selected = null;
    d.world.setGhost(null, null, false);
    tip.hidden = true;
    refreshBanner();
    d.onChange();
  }
  const begin = (id: PlacedId): void => {
    if (selected !== id) rot = d.facing(id);
    selected = id;
    ghostAt(null, false);
    refreshBanner();
    d.onChange();
  };

  return {
    selected: () => selected,
    press(id, e) {
      if (!d.canAct()) return;
      const wasSelected = selected === id;
      begin(id);
      const startX = e.clientX;
      const startY = e.clientY;
      let moved = false;
      const move = (ev: PointerEvent): void => {
        if (ev.pointerId !== e.pointerId) return;
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > DRAG_SLOP_PX) moved = true;
        if (!moved) return;
        dragging = true;
        if (overScene(ev.clientX, ev.clientY)) preview(ev.clientX, ev.clientY);
        else {
          ghostAt(null, false);
          tip.hidden = true;
        }
      };
      const up = (ev: PointerEvent): void => {
        if (ev.pointerId !== e.pointerId) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!moved) {
          // A tap on the card: tap mode (a second tap on the same card cancels).
          if (wasSelected) cancel();
          return;
        }
        dragging = false;
        if (ev.type === 'pointerup' && overScene(ev.clientX, ev.clientY)) {
          attempt(ev.clientX, ev.clientY);
        } else {
          ghostAt(null, false);
          tip.hidden = true;
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    },
    select(id) {
      if (d.canAct()) begin(id);
    },
    cancel,
    hover(x, y) {
      if (selected) preview(x, y);
    },
    tap(x, y) {
      if (!selected) return false;
      attempt(x, y);
      return true;
    },
    turn,
  };
}
