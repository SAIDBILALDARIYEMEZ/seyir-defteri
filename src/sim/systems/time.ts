// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Passing time: radiation dose from the real hourly curve + solar panel income.

import { BALANCE } from '../../config/balance.ts';
import { emptyTally } from '../state.ts';
import type { GameState } from '../state.ts';
import { isEventRate, rateAt } from '../window.ts';
import type { WindowData } from '../window.ts';
import { incomeFactor } from './explore.ts';
import { isDustSol } from './schedule.ts';

const EPS = 1e-9;

/** UTC clock hour (may be fractional) at the crew's current moment of the sol. */
export function clockOf(state: GameState): number {
  return BALANCE.dayStartHour + (BALANCE.daylightHours - state.hoursLeft);
}

/** Storm dose points received over `hours` starting at `clock` on `sol`, behind `shield` (0-1). */
export function doseOver(
  win: WindowData,
  sol: number,
  clock: number,
  hours: number,
  shield: number,
): number {
  let uGy = 0;
  let t = clock;
  let left = hours;
  while (left > EPS) {
    const h = Math.floor(t + EPS);
    const seg = Math.min(left, h + 1 - t);
    const daysOver = Math.floor(h / BALANCE.hoursPerSol);
    // D-008: the budget counts storm dose only, i.e. the part above the month's quiet rate.
    const rate = rateAt(win, sol + daysOver, h % BALANCE.hoursPerSol);
    uGy += Math.max(0, rate - win.quietRate) * seg;
    t += seg;
    left -= seg;
  }
  return (uGy / BALANCE.dose.uGyPerPoint) * (1 - shield);
}

export function currentRate(state: GameState, win: WindowData): number {
  return rateAt(win, state.sol, Math.floor(clockOf(state) + EPS) % BALANCE.hoursPerSol);
}

export function isEventNow(state: GameState, win: WindowData): boolean {
  return isEventRate(win, currentRate(state, win));
}

export function incomePerHour(state: GameState): number {
  if (state.broken.includes('panels')) return 0;
  const dust = isDustSol(state.schedule, state.sol) ? BALANCE.power.dustIncomeFactor : 1;
  return (BALANCE.power.dayIncome / BALANCE.daylightHours) * state.panelEff * dust * incomeFactor(state);
}

/** Spends daylight hours: adds dose and panel income. Does not end the sol. */
export function passDaylight(
  state: GameState,
  win: WindowData,
  hours: number,
  shield: number,
): GameState {
  const h = Math.max(0, Math.min(hours, state.hoursLeft));
  if (h <= 0) return state;
  const power = Math.min(BALANCE.power.max, state.power + incomePerHour(state) * h);
  const tally = state.today.tally ?? emptyTally();
  return {
    ...state,
    dose: state.dose + doseOver(win, state.sol, clockOf(state), h, shield),
    power,
    hoursLeft: Math.max(0, state.hoursLeft - h),
    today: { ...state.today, tally: { ...tally, solar: tally.solar + Math.max(0, power - state.power) } },
  };
}

export function shelterShield(level: number): number {
  const shields = BALANCE.dose.shelterShield;
  return shields[Math.max(0, Math.min(level, shields.length - 1))] ?? BALANCE.dose.habitatShield;
}

/**
 * "What if?" box: dose of one whole sol if the first `shelterHours` of daylight were spent
 * in the shelter, the rest of the daylight working outside and the night in the habitat.
 */
export function whatIfSolDose(
  win: WindowData,
  sol: number,
  shelterLevel: number,
  shelterHours: number,
): number {
  const inShelter = Math.max(0, Math.min(shelterHours, BALANCE.daylightHours));
  const start = BALANCE.dayStartHour;
  return (
    doseOver(win, sol, start, inShelter, shelterShield(shelterLevel)) +
    doseOver(win, sol, start + inShelter, BALANCE.daylightHours - inShelter, BALANCE.dose.outsideShield) +
    doseOver(win, sol, start + BALANCE.daylightHours, BALANCE.hoursPerSol - BALANCE.daylightHours, BALANCE.dose.habitatShield)
  );
}
