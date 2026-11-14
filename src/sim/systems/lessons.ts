// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6 "Why did it happen?": spots wasted work and choices worth a second look from what the sim
// did today, as codes for PUSULA's note on the night card (text in i18n `lesson.<code>.*`).
// Pure; never changes the rules or the gauges. Thresholds in BALANCE.lessons.

import { BALANCE } from '../../config/balance.ts';
import type { Action } from '../actions.ts';
import type { GameState, Lesson, LessonCode } from '../state.ts';
import { isEventRate, rateAt } from '../window.ts';
import type { WindowData } from '../window.ts';
import { isReady } from './build.ts';
import { clockOf } from './time.ts';

const EPS = 1e-9;

/** Night note order: the most useful lesson first; at most `BALANCE.lessons.perNight` are shown. */
const PRIORITY: LessonCode[] = ['stormOutside', 'overdueAgain', 'endEarly', 'airFull', 'harvestFull'];

/** Hours with a radiation-event rate within [clock, clock + hours) of `sol`. */
export function eventHoursOver(win: WindowData, sol: number, clock: number, hours: number): number {
  let total = 0;
  let t = clock;
  let left = hours;
  while (left > EPS) {
    const h = Math.floor(t + EPS);
    const seg = Math.min(left, h + 1 - t);
    if (isEventRate(win, rateAt(win, sol, h % BALANCE.hoursPerSol))) total += seg;
    t += seg;
    left -= seg;
  }
  return total;
}

/** Adds (or grows) a lesson in today's list. */
function note(state: GameState, code: LessonCode, n: number): GameState {
  const list = state.today.lessons ?? [];
  const found = list.find((l) => l.code === code);
  const lessons = found
    ? list.map((l) => (l.code === code ? { ...l, n: l.n + n } : l))
    : [...list, { code, n }];
  return { ...state, today: { ...state.today, lessons } };
}

/**
 * Daylight spent outside the shelter during storm hours while a ready shelter stood empty.
 * `before`: state when the hours start; `hours`: hours about to pass; `sheltering`: in the shelter.
 */
export function noteStormHours(before: GameState, win: WindowData, hours: number, sheltering: boolean): GameState {
  if (sheltering || hours <= EPS || !isReady(before, 'shelter') || !before.buildings.shelter) return before;
  const outside = eventHoursOver(win, before.sol, clockOf(before), Math.min(hours, before.hoursLeft));
  return outside > EPS ? note(before, 'stormOutside', outside) : before;
}

/** Waste right after an action: oxygen or food that did not fit the tank / store. */
export function noteWaste(before: GameState, after: GameState, action: Action, foodMax: number): GameState {
  const a = BALANCE.actions;
  if (action.type === 'moxie') {
    const lost = before.air + a.moxie.air - BALANCE.air.max;
    if (lost >= BALANCE.lessons.minWaste) return note(after, 'airFull', lost);
  }
  if (action.type === 'greenhouse') {
    const gain = after.food - before.food;
    const full = a.greenhouse.food * (before.greenhouseIdleSols >= a.greenhouse.idleSolsToHalve ? a.greenhouse.idleFactor : 1);
    const lost = before.food + full > foodMax ? full - gain : 0;
    if (lost >= BALANCE.lessons.minWaste) return note(after, 'harvestFull', lost);
  }
  return after;
}

/** Ending the day early with useful work left that could be done now (hours left). */
export function noteEndEarly(state: GameState, workLeft: boolean): GameState {
  return workLeft && state.hoursLeft >= BALANCE.lessons.endEarlyHours ? note(state, 'endEarly', state.hoursLeft) : state;
}

/** Overdue tasks charged tonight (left undone again although they fitted the daylight). */
export function noteOverdue(state: GameState, charged: number): GameState {
  return charged > 0 ? note(state, 'overdueAgain', charged) : state;
}

/** Tonight's notes: the most useful first, at most BALANCE.lessons.perNight. */
export function pickLessons(lessons: Lesson[] | undefined): Lesson[] {
  return [...(lessons ?? [])]
    .sort((a, b) => PRIORITY.indexOf(a.code) - PRIORITY.indexOf(b.code))
    .slice(0, BALANCE.lessons.perNight);
}
