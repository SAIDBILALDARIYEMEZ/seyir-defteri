// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// ALL balance numbers live here (Hard Rule 5). No magic numbers in sim or UI.
// Starting values come from PRD §6-§9 with the D-002 revisions. Change only here, then run the bot.

export const BALANCE = {
  totalSols: 30,
  daylightHours: 10,
  hoursPerSol: 24,
  /** Game simplification: a sol is one UTC calendar day and work starts at 05:00 UTC. */
  dayStartHour: 5,
  maxCrew: 7,

  power: { start: 50, max: 100, dayIncome: 30, dustIncomeFactor: 0.4, nightHeating: 15 },
  air: { start: 70, max: 100, perSol: 10, coldPenalty: 15 },
  food: { start: 8, max: 20, perSol: 1, unlockSol: 3, emptySolsToLose: 2 },
  /** `initial`: the panels arrive dusty from the landing, so sol 1 can teach cleaning (D-011). */
  panel: { start: 1, initial: 0.7, decayPerSol: 0.1, dustDecayPerSol: 0.25, cleanAt: 0.9 },

  dose: {
    /** Mission storm-dose budget (D-008). Reaching it means Early Evacuation. */
    budget: 45,
    /**
     * D-008: one dose point = 24.5 uGy of storm dose (dose above the month's quiet RAD median).
     * The real 2024-05-20 curve is then about 60 points unshielded. Single scale constant.
     */
    uGyPerPoint: 24.5,
    habitatShield: 0.3,
    /** Shield while waiting in the shelter, by shelter level 0-3. */
    shelterShield: [0.5, 0.7, 0.85, 0.95],
    /** An hour counts as a radiation event when the rate is this many times the quiet rate. */
    eventRateFactor: 2,
    /** Legend needs less storm dose than this (sheltering through most of the big event). */
    legendMax: 20,
  },
  /** Tuned with the bot (D-009): curiosity + rock scan give up to 3 per sol. */
  science: { legendMin: 62 },

  actions: {
    clean: { hours: 2 },
    moxie: { hours: 1, power: 15, air: 20, disabledAtAir: 95 },
    greenhouse: { hours: 2, power: 5, food: 3, idleSolsToHalve: 2, idleFactor: 0.5 },
    shelterBuild: { hours: 3, maxLevel: 3 },
    shelterWait: { stepHours: 1 },
    message: { hours: 1, power: 5 },
    beacon: { hours: 2, power: 10, afterSol: 15 },
    readCuriosity: { hours: 2, science: 2 },
    scanRock: { hours: 2, science: 1 },
    repair: { hours: 2 },
  },
  unlockSol: {
    clean: 1,
    moxie: 1,
    greenhouse: 3,
    shelterBuild: 4,
    shelterWait: 4,
    message: 4,
    beacon: 4,
    readCuriosity: 4,
    scanRock: 4,
    repair: 1,
  },
  /**
   * Build mode (B1). Only the habitat and the panels are ready at landing. Placing a station
   * costs `placeHours` of work, its power and its parts; it is then built over `sols` nights
   * and does not work until ready. Unlock chain: `needs` ready + sol >= `minSol`.
   */
  build: {
    placeHours: 1,
    stations: {
      moxie: { sols: 1, parts: 3, power: 1, needs: null, minSol: 1 },
      greenhouse: { sols: 3, parts: 4, power: 1, needs: 'moxie', minSol: 1 },
      shelter: { sols: 3, parts: 4, power: 1, needs: null, minSol: 4 },
      antenna: { sols: 3, parts: 4, power: 1, needs: 'shelter', minSol: 1 },
      beacon: { sols: 2, parts: 3, power: 1, needs: 'antenna', minSol: 15 },
    },
  },
  /** Parts from the ship. The start stock covers every build (exploring is a bonus, B3). */
  parts: { start: 18 },
  /** Build grid (sim rule). Fixed stations and craters block cells; `minGap` is in cells. */
  grid: {
    cols: 12,
    rows: 12,
    minGap: 2,
    fixed: {
      habitat: { x: 6, y: 6 },
      panels: { x: 3, y: 6 },
      curiosity: { x: 11, y: 1 },
      science: { x: 1, y: 11 },
    },
    craters: [
      { x: 9, y: 9, r: 1 },
      { x: 2, y: 2, r: 1 },
    ],
    /** Suggested spots; the bot always uses these. */
    slots: {
      moxie: { x: 8, y: 6 },
      greenhouse: { x: 6, y: 8 },
      shelter: { x: 6, y: 3 },
      antenna: { x: 9, y: 4 },
      beacon: { x: 3, y: 9 },
    },
  },
  walk: { near: 0.5, far: 1, farStations: ['curiosity', 'science'] },

  warnings: { sepLead: 1, sepLeadAntenna: 3, dustLead: 1, dustLeadAntenna: 2 },
  dust: { minStorms: 1, maxStorms: 2, minLen: 2, maxLen: 3, earliestSol: 5 },
  malfunction: { count: 2, earliestSol: 5, stations: ['panels', 'moxie', 'greenhouse'] },
  replay: { uses: 3 },

  /** PUSULA advisor and "urgent need" thresholds (also used for the hard-choice-day metric). */
  advisor: {
    maxTasks: 3,
    airLow: 40,
    airComfort: 60,
    powerLow: 20,
    foodLow: 2,
    foodComfort: 5,
    panelDirty: 0.5,
    panelCleanAt: 0.7,
    shelterHoursOnEvent: 4,
    hardChoiceNeeds: 2,
  },
} as const;

export type Balance = typeof BALANCE;
