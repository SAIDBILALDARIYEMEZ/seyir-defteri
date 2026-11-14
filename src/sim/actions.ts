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
  | 'antennaRepair'
  | 'message'
  | 'beacon'
  | 'readCuriosity'
  | 'scanRock'
  | 'endSol'
  | 'replayYesterday';

export type Action =
  | { type: SimpleActionType; crewId: number }
  | { type: 'shelterWait'; crewId: number; hours: number }
  | { type: 'repair'; crewId: number; station: StationId };

export type ActionType = Action['type'];

/** Why an action is disabled. Texts live in i18n under `reason.<code>`. */
export type ReasonCode =
  | 'gameOver'
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
  | 'antennaDone'
  | 'needAntenna'
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
  antennaRepair: 'antenna',
  message: 'antenna',
  beacon: 'beacon',
  readCuriosity: 'curiosity',
  scanRock: 'science',
  repair: 'habitat',
  endSol: 'habitat',
  replayYesterday: 'habitat',
};
