// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Learning-layer numbers (B3): XP, ranks, how often a concept capsule turns into a question.
// This is the player profile, not the mission: nothing here changes the simulation.

export const PROGRESSION = {
  /** XP per event. */
  xp: {
    buildDone: 25,
    partFound: 10,
    /** F6: an upgrade bought with rocket parts. */
    upgradeDone: 20,
    taskDone: 4,
    shelterInStorm: 15,
    quizCorrect: 20,
  },
  /** Rank floors in XP, lowest first. Names in i18n under `rank.<id>`. */
  ranks: [
    { id: 'cadet', xp: 0 },
    { id: 'rookie', xp: 150 },
    { id: 'specialist', xp: 500 },
    { id: 'commander', xp: 1200 },
    { id: 'legend', xp: 2500 },
  ],
  /** Every Nth showing of a concept is a recall question instead of the capsule. */
  quizEvery: 4,
  /** Capsules per sol for each natural moment (station tap, build wait, night). */
  capsulesPerMoment: 1,
  /** Wins needed before the storm (window) picker opens. */
  winsToPickStorm: 1,
  /** How long the "+XP" toast stays (ms). */
  toastMs: 1600,
} as const;

export type RankId = (typeof PROGRESSION.ranks)[number]['id'];
export type XpSource = keyof typeof PROGRESSION.xp;
