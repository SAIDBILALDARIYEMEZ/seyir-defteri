// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// "No empty work" rule: check() says why an action is disabled (a code, never text).

import { BALANCE } from '../config/balance.ts';
import { STATION_OF } from './actions.ts';
import type { Action, ReasonCode, StationId } from './actions.ts';
import { RESCUE_DONE } from './state.ts';
import type { GameState, MorningSnapshot } from './state.ts';
import { buildReason, isBuildable, notReadyReason, placeReason, relocateReason, setupDone } from './systems/build.ts';
import { collectReason, foodMax, upgradeReason, upgradeStation } from './systems/explore.ts';
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

export function walkHours(from: StationId, to: StationId): number {
  if (from === to) return 0;
  const far: readonly string[] = BALANCE.walk.farStations;
  return far.includes(from) || far.includes(to) ? BALANCE.walk.far : BALANCE.walk.near;
}

export function costOf(state: GameState, action: Action): Cost {
  const a = BALANCE.actions;
  if (action.type === 'endSol' || action.type === 'replayYesterday') {
    return { station: 'habitat', walk: 0, hours: 0, power: 0 };
  }
  if (action.type === 'place' || action.type === 'rotate') {
    return { station: locationOf(state, action.crewId), walk: 0, hours: 0, power: 0 };
  }
  if (action.type === 'bonus') {
    // F6: the debris lies around the landing site: a walk from Ada's spot, she ends at the habitat side.
    const from = locationOf(state, action.crewId);
    const walk = (BALANCE.walk.farStations as readonly string[]).includes(from) ? BALANCE.walk.far : BALANCE.walk.near;
    return { station: 'habitat', walk, hours: BALANCE.debris.hours, power: 0 };
  }
  if (action.type === 'upgrade') {
    const station = upgradeStation(action.upgrade);
    return { station, walk: walkHours(locationOf(state, action.crewId), station), hours: BALANCE.upgrades[action.upgrade].hours, power: 0 };
  }
  const station =
    action.type === 'repair' || action.type === 'build' || action.type === 'relocate'
      ? action.station
      : STATION_OF[action.type];
  const walk = walkHours(locationOf(state, action.crewId), station);
  switch (action.type) {
    case 'build':
      return {
        station,
        walk,
        hours: BALANCE.build.placeHours,
        power: BALANCE.build.stations[action.station].power,
      };
    case 'relocate':
      return { station, walk, hours: BALANCE.build.relocateHours, power: 0 };
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
  if (isBuildable(station)) return BALANCE.build.stations[station].minSol;
  const sols = (Object.keys(unlocks) as (keyof typeof unlocks)[])
    .filter((type) => type !== 'repair' && STATION_OF[type] === station)
    .map((type) => unlocks[type]);
  return sols.length ? Math.min(...sols) : 1;
}

/** True when the station cannot be used now (not unlocked yet, or not built / still building). */
export function isStationLocked(state: GameState, station: StationId): boolean {
  return state.sol < stationUnlockSol(station) || notReadyReason(state, station) !== null;
}

/**
 * The morning "Replay yesterday" would return to, or null. Always the morning before the
 * current sol: after a loss on sol N that is sol N-1 (a loss on sol 1 restarts sol 1).
 */
export function replayTarget(state: GameState): MorningSnapshot | null {
  const exact = state.mornings.find((m) => m.sol === state.sol - 1);
  if (exact) return exact;
  return state.phase === 'lost' ? (state.mornings[0] ?? null) : null;
}

function specific(state: GameState, action: Action, win: WindowData): ReasonCode | null {
  const a = BALANCE.actions;
  switch (action.type) {
    case 'clean':
      return state.panelEff >= BALANCE.panel.cleanAt ? 'panelsClean' : null;
    case 'moxie':
      return state.air >= a.moxie.disabledAtAir ? 'airFull' : null;
    case 'greenhouse':
      return state.food >= foodMax(state) ? 'foodFull' : null;
    case 'shelterBuild':
      return state.shelterLevel >= a.shelterBuild.maxLevel ? 'shelterMax' : null;
    case 'shelterWait':
      return isEventNow(state, win) || sepWarnedToday(state, win) ? null : 'noStormNow';
    case 'build':
      return buildReason(state, action.station, action.cell);
    case 'place':
      return placeReason(state, action.station, action.cell);
    case 'relocate':
      return relocateReason(state, action.station, action.cell);
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
    case 'bonus':
      return collectReason(state, action.debris);
    case 'upgrade':
      return upgradeReason(state, action.upgrade);
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
  if (action.type === 'rotate') return state.buildings[action.station] ? null : 'notBuilt';
  if (action.type === 'place') return specific(state, action, win);
  if (!setupDone(state)) return 'needSetup';
  if (action.type === 'endSol') return null;
  const placing = action.type === 'build' || action.type === 'relocate';
  const extra = action.type === 'bonus' || action.type === 'upgrade';
  if (!placing && !extra && state.sol < BALANCE.unlockSol[action.type]) return 'locked';
  const cost = costOf(state, action);
  if (!placing) {
    const notReady = notReadyReason(state, cost.station);
    if (notReady) return notReady;
  }
  if (action.type !== 'repair' && !placing && state.broken.includes(cost.station)) {
    return 'broken';
  }
  const reason = specific(state, action, win);
  if (reason) return reason;
  if (state.power < cost.power) return 'noPower';
  return cost.walk + cost.hours > state.hoursLeft + EPS ? 'noTime' : null;
}
