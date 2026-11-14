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
    /**
     * F6 shelter balance (D-022): daylight work happens outside in the suit (`outsideShield`);
     * the night and leftover daylight are spent inside the habitat (`habitatShield`); the
     * shelter shields most, more with every regolith level 0-3. Game simplification.
     */
    outsideShield: 0.05,
    habitatShield: 0.8,
    /** Shield while waiting in the shelter, by shelter level 0-3. */
    shelterShield: [0.92, 0.95, 0.97, 0.99],
    /** An hour counts as a radiation event when the rate is this many times the quiet rate. */
    eventRateFactor: 2,
    /** Legend needs less storm dose than this (sheltering through most of the big event). */
    legendMax: 20,
  },
  /** Tuned with the bot (D-009): curiosity + rock scan give up to 3 per sol. */
  science: { legendMin: 72 },

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
    readCuriosity: 1,
    scanRock: 1,
    repair: 1,
  },
  /**
   * Build mode (B1). Only the habitat and the panels are ready at landing. Placing a station
   * costs `placeHours` of work, its power and its parts; it is then built over `sols` nights
   * and does not work until ready. Unlock chain: `needs` ready + sol >= `minSol`.
   */
  build: {
    placeHours: 1,
    /** Moving a ready station (B3): work hours, no parts, no power. */
    relocateHours: 1,
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
  /**
   * F6 exploring: pieces of the crashed rocket lie around the landing site and the crater.
   * Ada walks over and collects one (`bonus` action): work hours, then parts (no science, so
   * Legend stays a science goal). `cell`: where it lies on the build grid (it blocks only that
   * cell until collected). Game rule, not NASA data.
   */
  debris: {
    hours: 1,
    /** One piece per sol: exploring stays a small daily extra (F6 bot: all 9 by sol 8 otherwise). */
    perSol: 1,
    pieces: [
      { x: 15, y: 13, parts: 2 },
      { x: 11, y: 13, parts: 2 },
      { x: 16, y: 10, parts: 1 },
      { x: 15, y: 16, parts: 2 },
      { x: 11, y: 16, parts: 3 },
      { x: 14, y: 17, parts: 1 },
      { x: 17, y: 13, parts: 2 },
      { x: 10, y: 15, parts: 2 },
      { x: 14, y: 9, parts: 1 },
    ],
  },
  /**
   * F6 upgrades bought with collected parts (once each). `station`: where Ada does the work
   * (it must be built and ready). foodStore: the food store holds `food` more. extraPanel:
   * the panels bring `incomeFactor` more power per daylight hour.
   */
  upgrades: {
    foodStore: { parts: 6, hours: 2, station: 'greenhouse', food: 10 },
    extraPanel: { parts: 10, hours: 2, station: 'panels', incomeFactor: 0.15 },
  },
  /**
   * Build grid (sim rule). Fixed stations, the lander and craters block cells; `minGap` is in
   * cells. B3: 18 x 18; the habitat and the panels are placed by the player on sol 1 (free).
   */
  grid: {
    cols: 18,
    rows: 18,
    minGap: 2,
    fixed: {
      curiosity: { x: 16, y: 2 },
      science: { x: 2, y: 16 },
    },
    /** The landing rocket: scenery that blocks its cell. */
    lander: { x: 13, y: 11 },
    craters: [
      { x: 13, y: 15, r: 1 },
      { x: 4, y: 4, r: 1 },
      { x: 15, y: 6, r: 1 },
    ],
    /** Suggested spots; the bot always uses these. */
    slots: {
      habitat: { x: 9, y: 9 },
      panels: { x: 6, y: 9 },
      moxie: { x: 11, y: 9 },
      greenhouse: { x: 9, y: 11 },
      shelter: { x: 9, y: 6 },
      antenna: { x: 12, y: 6 },
      beacon: { x: 6, y: 12 },
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
    /** F6: PUSULA advises the shelter for the whole storm (all event hours of the daylight). */
    shelterHoursOnEvent: 10,
    hardChoiceNeeds: 2,
  },

  /**
   * F6 "Why did it happen?" notes on the night card (game feedback, no rule effect).
   * `minWaste`: oxygen / food points lost to a full tank / store before it counts.
   * `endEarlyHours`: ending the day with useful work left and at least this many hours.
   */
  lessons: { perNight: 2, minWaste: 1, endEarlyHours: 2 },

  /**
   * Overdue tasks (F5a): a task on the morning list that is left undone is carried to the
   * next sol as "Overdue" and costs a little at night. Game rule, not NASA data.
   * F5b: from sol 1 (after the setup), so sol-1 tasks reach sol 2 and they pile up day by
   * day. `max`: carried tasks never pile up past this. `listMax`: tasks shown on the watch;
   * more overdue ones show as "+N overdue".
   * Night cost per overdue task left undone again (one sol of grace), by action; science =
   * stars. Other tasks (builds, shelter, messages) cost nothing extra: they stay on the list
   * and their own effect is the cost; the real storm dose is the cost of not sheltering.
   */
  overdue: {
    fromSol: 1,
    max: 8,
    listMax: 6,
    penalty: {
      clean: { panelEff: 0.05 },
      moxie: { air: 3 },
      greenhouse: { food: 1 },
      readCuriosity: { science: 1 },
      scanRock: { science: 1 },
      default: {},
    },
  },
} as const;

export type Balance = typeof BALANCE;
