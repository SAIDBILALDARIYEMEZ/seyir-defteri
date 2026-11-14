// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Shelter mode (F5b): "Wait inside" walks Ada into the shelter and hides her. The game then
// waits one hour at a time (the sim's `shelterWait`), until PUSULA's advised hours are done,
// the storm warning is over, the daylight ends or the player taps "Go outside".

import { BALANCE } from '../config/balance.ts';
import type { Action } from '../sim/actions.ts';
import { check } from '../sim/rules.ts';
import { CREW_ID } from './context.ts';
import type { Ctx } from './context.ts';

/** Real time between two waited hours. */
const STEP_MS = 1400;

export interface Shelter {
  enter(): void;
  /** Ada steps out (button, or when the wait is over). */
  exit(): void;
  /** Hours still planned inside (0 when not sheltered). */
  hoursLeft(): number;
}

export function createShelter(ctx: Ctx): Shelter {
  const { s, world } = ctx;
  const step = BALANCE.actions.shelterWait.stepHours;
  const wait = (): Action => ({ type: 'shelterWait', crewId: CREW_ID, hours: step });
  let target = 0;
  let waited = 0;
  let timer = 0;

  const schedule = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(tick, STEP_MS);
  };

  function leave(placeOut: boolean): void {
    window.clearTimeout(timer);
    if (!s.sheltered) return;
    s.sheltered = false;
    world.setAdaVisible(true);
    if (placeOut) world.placeAda('shelter');
    ctx.render();
  }

  function tick(): void {
    if (!s.sheltered) return;
    // Paused, or a card is open: hold the clock.
    if (s.closePause || s.modals > 0) return schedule();
    if (check(s.state, wait(), s.win) !== null) return leave(true);
    const sol = s.state.sol;
    ctx.perform(wait());
    waited += step;
    // The daylight ran out: the night card takes over and the morning puts Ada outside.
    if (s.state.sol !== sol || s.state.phase !== 'playing') return leave(false);
    if (waited >= target) return leave(true);
    ctx.render();
    schedule();
  }

  return {
    enter() {
      if (!ctx.free() || check(s.state, wait(), s.win) !== null) return;
      ctx.menu.close();
      // PUSULA's advice (BALANCE.advisor.shelterHoursOnEvent), at least one hour.
      target = Math.max(step, BALANCE.advisor.shelterHoursOnEvent - s.state.today.shelterHours);
      waited = 0;
      s.walking = true;
      ctx.render();
      world.walkTo('shelter', () => {
        s.walking = false;
        s.sheltered = true;
        world.setAdaVisible(false);
        ctx.render();
        schedule();
      });
    },
    exit: () => leave(true),
    hoursLeft: () => (s.sheltered ? Math.max(0, Math.min(target - waited, s.state.hoursLeft)) : 0),
  };
}
