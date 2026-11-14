// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// GameState: plain serializable data. No text, no functions, no window data.

import { BALANCE } from '../config/balance.ts';
import type { Action, Cell, PlacedId, ReasonCode, StationId, Turn, UpgradeId } from './actions.ts';
import { createRng } from './rng.ts';
import { rollSchedule } from './systems/schedule.ts';
import type { Schedule } from './systems/schedule.ts';
import type { WindowData } from './window.ts';

export interface CrewMember {
  id: number;
  awake: boolean;
  location: StationId;
}

/** A placed station. `solsLeft` 0 = ready; more = still being built (does not work). */
export interface Building {
  cell: Cell;
  solsLeft: number;
  /** Facing in quarter turns; missing = 0 (older saves). Cosmetic only. */
  rot?: Turn;
}

export type GamePhase = 'playing' | 'won' | 'lost';
export type LossReason = 'air' | 'dose' | 'food';
export type Result = 'legend' | 'success' | 'hardRescue' | 'evacuation';
export type ReplyKind = 'coords' | 'forecast' | 'advice';

/** Rescue chain: 0 none, 1 antenna repaired, 2 location sent, 3 coordinates received, 4 beacon set. */
export type RescueStage = 0 | 1 | 2 | 3 | 4;
export const RESCUE_DONE: RescueStage = 4;

/** A task from PUSULA's list. `overdue`: carried over from an earlier sol (F5a). */
export interface PlannedTask {
  action: Action;
  /** Reason code; text lives in i18n under `task.<why>`. */
  why: string;
  overdue?: boolean;
  /** Optional extra (offered only when power is spare): never carried over. */
  spare?: boolean;
  /** An urgent need (missions.json `urgent`): leads the list (F5b). */
  urgent?: boolean;
}

/** F6 "Why did it happen?": a lesson code for PUSULA's night note; `n` = hours / amount / tasks. */
export type LessonCode = 'harvestFull' | 'airFull' | 'endEarly' | 'stormOutside' | 'overdueAgain';
export interface Lesson {
  code: LessonCode;
  n: number;
}

/** F6: what the day brought, for the night card's itemized rows (power from the panels and spent on work, air and food made). */
export interface Tally {
  solar: number;
  work: number;
  air: number;
  food: number;
}
export const emptyTally = (): Tally => ({ solar: 0, work: 0, air: 0, food: 0 });

/** One line per sol for the Commander's Logbook (codes only; text comes from i18n). */
export interface SolLog {
  sol: number;
  actions: string[];
  urgent: string[];
  flags: string[];
  power: number;
  air: number;
  food: number;
  dose: number;
  doseGained: number;
  /** Gauges at the end of daylight, before the night costs (for the night summary). */
  dusk: { power: number; air: number; food: number; dose: number };
  science: number;
  /** Tasks of the morning list left undone (their `why` codes); missing in older saves. */
  missed?: string[];
  /** Overdue tasks charged tonight (F5b: undone although they still fitted the daylight). */
  charged?: string[];
  /** F6: PUSULA's notes for tonight (at most BALANCE.lessons.perNight); missing in older saves. */
  lessons?: Lesson[];
  /** F6: the day's itemized power / air / food; missing in older saves. */
  tally?: Tally;
}

export interface Today {
  actions: string[];
  urgent: string[];
  flags: string[];
  doseStart: number;
  shelterHours: number;
  readCuriosity: boolean;
  scannedRock: boolean;
  /** PUSULA's list as it stood in the morning (after the sol-1 setup on sol 1). */
  plan: PlannedTask[];
  /** F6: wasted work / choices spotted today (all of them; the night card shows the top ones). */
  lessons?: Lesson[];
  /** F6: the day's itemized gains and costs (night card). */
  tally?: Tally;
}

export interface GameState {
  seed: number;
  windowId: string;
  sol: number;
  hoursLeft: number;
  phase: GamePhase;
  lossReason: LossReason | null;
  result: Result | null;
  /** Array from day one: the data model supports up to BALANCE.maxCrew astronauts. */
  crew: CrewMember[];
  power: number;
  air: number;
  food: number;
  dose: number;
  science: number;
  panelEff: number;
  shelterLevel: number;
  /** Parts from the ship, spent on building stations. */
  parts: number;
  /** Placed stations (build mode, starters included). Missing = not placed yet. */
  buildings: Partial<Record<PlacedId, Building>>;
  rescueStage: RescueStage;
  messagePending: boolean;
  lastReply: ReplyKind | null;
  greenhouseIdleSols: number;
  foodEmptySols: number;
  broken: StationId[];
  /** Undone tasks carried from earlier sols, at most BALANCE.overdue.max (F5a). */
  overdue: PlannedTask[];
  /** F6: rocket debris collected (indices into BALANCE.debris.pieces). Missing in older saves. */
  debris?: number[];
  /** F6: upgrades bought with parts. Missing in older saves. */
  upgrades?: UpgradeId[];
  /** All random events are rolled once from the seed, so a replayed day sees the same events. */
  schedule: Schedule;
  today: Today;
  log: SolLog[];
  replaysLeft: number;
  /** Why the last action was refused, or null if it was applied. */
  rejection: ReasonCode | null;
  /** State at the last two sol mornings ("Replay yesterday"). */
  mornings: MorningSnapshot[];
}

export type MorningSnapshot = Omit<GameState, 'mornings'>;

export function freshToday(dose: number): Today {
  return {
    actions: [],
    urgent: [],
    flags: [],
    doseStart: dose,
    shelterHours: 0,
    readCuriosity: false,
    scannedRock: false,
    plan: [],
    lessons: [],
    tally: emptyTally(),
  };
}

export function snapshotOf(state: GameState): MorningSnapshot {
  const { mornings: _mornings, ...rest } = state;
  return structuredClone(rest);
}

export function createInitialState(seed: number, win: WindowData, crewCount = 1): GameState {
  const count = Math.max(1, Math.min(BALANCE.maxCrew, crewCount));
  const state: GameState = {
    seed,
    windowId: win.id,
    sol: 1,
    hoursLeft: BALANCE.daylightHours,
    phase: 'playing',
    lossReason: null,
    result: null,
    crew: Array.from({ length: count }, (_, id) => ({ id, awake: id === 0, location: 'habitat' })),
    power: BALANCE.power.start,
    air: BALANCE.air.start,
    food: BALANCE.food.start,
    dose: 0,
    science: 0,
    panelEff: BALANCE.panel.initial,
    shelterLevel: 0,
    parts: BALANCE.parts.start,
    buildings: {},
    rescueStage: 0,
    messagePending: false,
    lastReply: null,
    greenhouseIdleSols: 0,
    foodEmptySols: 0,
    broken: [],
    overdue: [],
    debris: [],
    upgrades: [],
    schedule: rollSchedule(createRng(seed)),
    today: freshToday(0),
    log: [],
    replaysLeft: BALANCE.replay.uses,
    rejection: null,
    mornings: [],
  };
  state.mornings = [snapshotOf(state)];
  return state;
}
