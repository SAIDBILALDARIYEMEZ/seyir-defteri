// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// "No empty work" rule: check() says why an action is disabled (a code, never text).

import { BALANCE } from '../config/balance.ts';
import { STATION_OF } from './actions.ts';
import type { Action, ReasonCode, StationId } from './actions.ts';
import { RESCUE_DONE } from './state.ts';
import type { GameState, MorningSnapshot } from './state.ts';
import { isEventNow } from './systems/time.ts';
import { sepWarnedToday } from './systems/warnings.ts';
import type { WindowData } from './window.ts';

const EPS = 1e-9;

export interface Cost {
  station: StationId;
  walk: number;
  hours: number;
  power: number;
}

export function locationOf(state: GameState, crewId: number): StationId {
  return (state.crew.find((c) => c.id === crewId) ?? state.crew[0])?.location ?? 'habitat';
}

function walkHours(from: StationId, to: StationId): number {
  if (from === to) return 0;
  const far: readonly string[] = BALANCE.walk.farStations;
  return far.includes(from) || far.includes(to) ? BALANCE.walk.far : BALANCE.walk.near;
}

export function costOf(state: GameState, action: Action): Cost {
  const a = BALANCE.actions;
  if (action.type === 'endSol' || action.type === 'replayYesterday') {
    return { station: 'habitat', walk: 0, hours: 0, power: 0 };
  }
  const station = action.type === 'repair' ? action.station : STATION_OF[action.type];
  const walk = walkHours(locationOf(state, action.crewId), station);
  switch (action.type) {
    case 'shelterWait':
      return { station, walk, hours: Math.max(a.shelterWait.stepHours, action.hours), power: 0 };
    case 'moxie':
    case 'greenhouse':
    case 'message':
    case 'beacon':
      return { station, walk, hours: a[action.type].hours, power: a[action.type].power };
    default:
      return { station, walk, hours: a[action.type].hours, power: 0 };
  }
}

/** First sol a station can be used: the earliest unlock of the actions done there. */
export function stationUnlockSol(station: StationId): number {
  const unlocks = BALANCE.unlockSol;
  const sols = (Object.keys(unlocks) as (keyof typeof unlocks)[])
    .filter((type) => type !== 'repair' && STATION_OF[type] === station)
    .map((type) => unlocks[type]);
  return sols.length ? Math.min(...sols) : 1;
}

export function isStationLocked(state: GameState, station: StationId): boolean {
  return state.sol < stationUnlockSol(station);
}

/** The morning "Replay yesterday" would return to, or null. */
export function replayTarget(state: GameState): MorningSnapshot | null {
  const wanted = state.phase === 'lost' ? state.sol : state.sol - 1;
  return state.mornings.find((m) => m.sol === wanted) ?? null;
}

function specific(state: GameState, action: Action, win: WindowData): ReasonCode | null {
  const a = BALANCE.actions;
  switch (action.type) {
    case 'clean':
      return state.panelEff >= BALANCE.panel.cleanAt ? 'panelsClean' : null;
    case 'moxie':
      return state.air >= a.moxie.disabledAtAir ? 'airFull' : null;
    case 'greenhouse':
      return state.food >= BALANCE.food.max ? 'foodFull' : null;
    case 'shelterBuild':
      return state.shelterLevel >= a.shelterBuild.maxLevel ? 'shelterMax' : null;
    case 'shelterWait':
      return isEventNow(state, win) || sepWarnedToday(state, win) ? null : 'noStormNow';
    case 'antennaRepair':
      return state.rescueStage >= 1 ? 'antennaDone' : null;
    case 'message':
      if (state.rescueStage < 1) return 'needAntenna';
      return state.messagePending ? 'messagePending' : null;
    case 'beacon':
      if (state.rescueStage >= RESCUE_DONE) return 'beaconDone';
      if (state.rescueStage < 3) return 'needCoords';
      return state.sol <= a.beacon.afterSol ? 'tooEarly' : null;
    case 'readCuriosity':
      return state.today.readCuriosity ? 'alreadyToday' : null;
    case 'scanRock':
      return state.today.scannedRock ? 'alreadyToday' : null;
    case 'repair':
      return state.broken.includes(action.station) ? null : 'notBroken';
    default:
      return null;
  }
}

/** Returns null when the action can be done now, otherwise the reason code. */
export function check(state: GameState, action: Action, win: WindowData): ReasonCode | null {
  if (action.type === 'replayYesterday') {
    if (state.phase === 'won') return 'gameOver';
    if (state.replaysLeft <= 0) return 'noReplaysLeft';
    return replayTarget(state) ? null : 'nothingToReplay';
  }
  if (state.phase !== 'playing') return 'gameOver';
  if (action.type === 'endSol') return null;
  if (state.sol < BALANCE.unlockSol[action.type]) return 'locked';
  const cost = costOf(state, action);
  if (action.type !== 'repair' && state.broken.includes(cost.station)) return 'broken';
  const reason = specific(state, action, win);
  if (reason) return reason;
  if (state.power < cost.power) return 'noPower';
  return cost.walk + cost.hours > state.hoursLeft + EPS ? 'noTime' : null;
}
