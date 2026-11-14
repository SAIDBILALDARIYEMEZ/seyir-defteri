// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pure reducer: (state, action, rng, window) -> new state. No three.js, DOM, clock or Math.random.
// All random events are pre-rolled from the seed into state.schedule, so the reducer itself
// draws no random numbers; `rng` stays in the signature for the sim contract.

import { BALANCE } from '../config/balance.ts';
import type { Action } from './actions.ts';
import type { Rng } from './rng.ts';
import { check, costOf, replayTarget } from './rules.ts';
import { emptyTally } from './state.ts';
import type { GameState } from './state.ts';
import { placeStarter, relocate, rotateBuilding, setupDone, startBuilding } from './systems/build.ts';
import { buyUpgrade, collect, foodMax } from './systems/explore.ts';
import { noteStormHours, noteWaste } from './systems/lessons.ts';
import { endSol, lose, morningPlan } from './systems/night.ts';
import { passDaylight, shelterShield } from './systems/time.ts';
import type { WindowData } from './window.ts';

const EPS = 1e-9;

function applyEffect(state: GameState, action: Action): GameState {
  const a = BALANCE.actions;
  switch (action.type) {
    case 'clean':
      return { ...state, panelEff: BALANCE.panel.start };
    case 'moxie':
      return { ...state, air: Math.min(BALANCE.air.max, state.air + a.moxie.air) };
    case 'greenhouse': {
      const idle = state.greenhouseIdleSols >= a.greenhouse.idleSolsToHalve;
      const gain = a.greenhouse.food * (idle ? a.greenhouse.idleFactor : 1);
      return { ...state, food: Math.min(foodMax(state), state.food + gain), greenhouseIdleSols: 0 };
    }
    case 'shelterBuild':
      return { ...state, shelterLevel: state.shelterLevel + 1 };
    case 'build':
      return startBuilding(state, action.station, action.cell, action.rot);
    case 'relocate':
      return relocate(state, action.station, action.cell, action.rot);
    case 'message':
      return { ...state, messagePending: true, rescueStage: state.rescueStage === 1 ? 2 : state.rescueStage };
    case 'beacon':
      return { ...state, rescueStage: 4 };
    case 'readCuriosity':
      return {
        ...state,
        science: state.science + a.readCuriosity.science,
        today: { ...state.today, readCuriosity: true },
      };
    case 'scanRock':
      return {
        ...state,
        science: state.science + a.scanRock.science,
        today: { ...state.today, scannedRock: true },
      };
    case 'repair':
      return { ...state, broken: state.broken.filter((s) => s !== action.station) };
    case 'bonus':
      return collect(state, action.debris);
    case 'upgrade':
      return buyUpgrade(state, action.upgrade);
    default:
      return state;
  }
}

export function reduce(state: GameState, action: Action, _rng: Rng, win: WindowData): GameState {
  const reason = check(state, action, win);
  if (reason) return { ...state, rejection: reason };

  if (action.type === 'replayYesterday') {
    const target = replayTarget(state);
    if (!target) return { ...state, rejection: 'nothingToReplay' };
    return {
      ...structuredClone(target),
      replaysLeft: state.replaysLeft - 1,
      mornings: state.mornings.filter((m) => m.sol <= target.sol),
    };
  }
  if (action.type === 'endSol') return endSol(state, win);
  if (action.type === 'place') {
    const placed = { ...placeStarter(state, action.station, action.cell, action.rot), rejection: null };
    // Sol 1: the day's list is made once the base is set up (F5b), so sol-1 tasks can carry.
    if (!setupDone(placed) || placed.today.plan.length > 0) return placed;
    return { ...placed, today: { ...placed.today, plan: morningPlan(placed, win) } };
  }
  if (action.type === 'rotate') return { ...rotateBuilding(state, action.station), rejection: null };

  const cost = costOf(state, action);
  const sheltering = action.type === 'shelterWait';
  // F6: storm hours spent outside a ready shelter (walk + work) become PUSULA's night note.
  let s = noteStormHours(noteStormHours({ ...state, rejection: null }, win, cost.walk, false), win, cost.hours, sheltering);
  s = passDaylight(s, win, cost.walk, BALANCE.dose.habitatShield);
  s = {
    ...s,
    crew: s.crew.map((c) => (c.id === action.crewId ? { ...c, location: cost.station } : c)),
    power: s.power - cost.power,
  };
  const paid = s;
  s = noteWaste(paid, applyEffect(paid, action), action, foodMax(paid));
  const tally = s.today.tally ?? emptyTally();
  s = {
    ...s,
    today: {
      ...s.today,
      tally: {
        ...tally,
        work: tally.work + cost.power,
        air: tally.air + Math.max(0, s.air - paid.air),
        food: tally.food + Math.max(0, s.food - paid.food),
      },
    },
  };
  const shield = sheltering ? shelterShield(s.shelterLevel) : BALANCE.dose.habitatShield;
  s = passDaylight(s, win, cost.hours, shield);
  s = {
    ...s,
    today: {
      ...s.today,
      actions: [...s.today.actions, action.type],
      shelterHours: s.today.shelterHours + (sheltering ? cost.hours : 0),
    },
  };
  if (s.dose >= BALANCE.dose.budget) return lose(s, 'dose');
  return s.hoursLeft <= EPS ? endSol(s, win) : s;
}
