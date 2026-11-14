// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// ALL balance numbers live here (Hard Rule 5). No magic numbers in sim or UI.
// F0 placeholder: only what the placeholder sim needs. F1 fills this from the PRD.

export const BALANCE = {
  totalSols: 30,
  daylightHours: 10,
  maxCrew: 7,
} as const;

export type Balance = typeof BALANCE;
