// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Every player intent is an action. Every action carries a crewId (multi-crew ready).

export interface WaitAction {
  type: 'wait';
  crewId: number;
  hours: number;
}

export interface EndSolAction {
  type: 'endSol';
  crewId: number;
}

export type Action = WaitAction | EndSolAction;
