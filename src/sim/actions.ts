// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Every player intent is an action. Every action carries a crewId (multi-crew ready).

export type StationId =
  | 'habitat'
  | 'panels'
  | 'moxie'
  | 'greenhouse'
  | 'shelter'
  | 'antenna'
  | 'beacon'
  | 'curiosity'
  | 'science';

export type SimpleActionType =
  | 'clean'
  | 'moxie'
  | 'greenhouse'
  | 'shelterBuild'
  | 'message'
  | 'beacon'
  | 'readCuriosity'
  | 'scanRock'
  | 'endSol'
  | 'replayYesterday';

/** Stations that are placed and built in build mode (the others are ready from sol 1). */
export type BuildableId = 'moxie' | 'greenhouse' | 'shelter' | 'antenna' | 'beacon';

/** Stations that land in the depot and are placed for free on sol 1 (B3). */
export type StarterId = 'habitat' | 'panels';

/** Every station the player puts on the grid. */
export type PlacedId = StarterId | BuildableId;

/** A cell of the build grid (integers, 0-based). */
export interface Cell {
  x: number;
  y: number;
}

export type Action =
  | { type: SimpleActionType; crewId: number }
  | { type: 'build'; crewId: number; station: BuildableId; cell: Cell }
  /** Sol-1 setup: put a starter station on the grid (free, instant). */
  | { type: 'place'; crewId: number; station: StarterId; cell: Cell }
  /** Move a ready station to another cell (work hours, no parts). */
  | { type: 'relocate'; crewId: number; station: PlacedId; cell: Cell }
  /** Room for B3: bonus parts / science from crates found while exploring. */
  | { type: 'bonus'; crewId: number; parts: number; science: number }
  | { type: 'shelterWait'; crewId: number; hours: number }
  | { type: 'repair'; crewId: number; station: StationId };

export type ActionType = Action['type'];

/** Why an action is disabled. Texts live in i18n under `reason.<code>`. */
export type ReasonCode =
  | 'gameOver'
  | 'needSetup'
  | 'alreadyPlaced'
  | 'locked'
  | 'broken'
  | 'notBroken'
  | 'noTime'
  | 'noPower'
  | 'panelsClean'
  | 'airFull'
  | 'foodFull'
  | 'shelterMax'
  | 'noStormNow'
  | 'needAntenna'
  | 'needMoxie'
  | 'needGreenhouse'
  | 'needShelter'
  | 'needBeacon'
  | 'notBuilt'
  | 'underConstruction'
  | 'alreadyBuilt'
  | 'noParts'
  | 'cellOutside'
  | 'cellTaken'
  | 'tooClose'
  | 'nearCrater'
  | 'messagePending'
  | 'needCoords'
  | 'tooEarly'
  | 'beaconDone'
  | 'alreadyToday'
  | 'noReplaysLeft'
  | 'nothingToReplay';

export const STATION_OF: Record<ActionType, StationId> = {
  clean: 'panels',
  moxie: 'moxie',
  greenhouse: 'greenhouse',
  shelterBuild: 'shelter',
  shelterWait: 'shelter',
  message: 'antenna',
  beacon: 'beacon',
  readCuriosity: 'curiosity',
  scanRock: 'science',
  repair: 'habitat',
  build: 'habitat',
  place: 'habitat',
  relocate: 'habitat',
  bonus: 'habitat',
  endSol: 'habitat',
  replayYesterday: 'habitat',
};
