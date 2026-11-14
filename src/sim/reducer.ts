// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Pure reducer: (state, action, rng, window) -> new state. No three.js, DOM, clock or Math.random.
// All random events are pre-rolled from the seed into state.schedule, so the reducer itself
// draws no random numbers; `rng` stays in the signature for the sim contract.

import { BALANCE } from '../config/balance.ts';
import type { Action } from './actions.ts';
import type { Rng } from './rng.ts';
import { check, costOf, replayTarget } from './rules.ts';
import type { GameState } from './state.ts';
import { addBonus, placeStarter, relocate, startBuilding } from './systems/build.ts';
import { endSol, lose } from './systems/night.ts';
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
      return { ...state, food: Math.min(BALANCE.food.max, state.food + gain), greenhouseIdleSols: 0 };
    }
    case 'shelterBuild':
      return { ...state, shelterLevel: state.shelterLevel + 1 };
    case 'build':
      return startBuilding(state, action.station, action.cell);
    case 'relocate':
      return relocate(state, action.station, action.cell);
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
  if (action.type === 'place') return { ...placeStarter(state, action.station, action.cell), rejection: null };
  if (action.type === 'bonus') return { ...addBonus(state, action.parts, action.science), rejection: null };

  const cost = costOf(state, action);
  let s = passDaylight({ ...state, rejection: null }, win, cost.walk, BALANCE.dose.habitatShield);
  s = {
    ...s,
    crew: s.crew.map((c) => (c.id === action.crewId ? { ...c, location: cost.station } : c)),
    power: s.power - cost.power,
  };
  s = applyEffect(s, action);
  const sheltering = action.type === 'shelterWait';
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
