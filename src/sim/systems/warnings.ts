// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Warnings the crew can see today. Lead time grows once the antenna is repaired.

import { BALANCE } from '../../config/balance.ts';
import type { GameState } from '../state.ts';
import type { WindowData } from '../window.ts';

export interface Warning {
  kind: 'sep' | 'dust';
  /** Sol the event is expected on (>= today). */
  sol: number;
  /** For 'sep': true when the report is a DONKI (near-Earth) one. */
  earthReport: boolean;
}

export function hasAntenna(state: GameState): boolean {
  return state.rescueStage >= 1;
}

/** Sols with a particle-storm warning: DONKI reports plus events RAD measured at Mars. */
export function warnedSepSols(win: WindowData): number[] {
  return [...new Set([...win.sepSols, ...win.radEventSols])].sort((a, b) => a - b);
}

export function visibleWarnings(state: GameState, win: WindowData): Warning[] {
  const w = BALANCE.warnings;
  const sepLead = hasAntenna(state) ? w.sepLeadAntenna : w.sepLead;
  const dustLead = hasAntenna(state) ? w.dustLeadAntenna : w.dustLead;
  const out: Warning[] = [];
  for (const sol of warnedSepSols(win)) {
    if (sol >= state.sol && sol <= state.sol + sepLead) {
      out.push({ kind: 'sep', sol, earthReport: win.sepSols.includes(sol) });
    }
  }
  for (const d of state.schedule.dust) {
    if (d.start > state.sol && d.start <= state.sol + dustLead) {
      out.push({ kind: 'dust', sol: d.start, earthReport: false });
    }
  }
  return out.sort((a, b) => a.sol - b.sol);
}

export function sepWarnedToday(state: GameState, win: WindowData): boolean {
  return warnedSepSols(win).includes(state.sol);
}
