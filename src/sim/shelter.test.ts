// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6 shelter balance (D-022): waiting in the shelter through a particle storm clearly works.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { builtinWindow } from '../data/builtinWindow.ts';
import type { Action, PlacedId } from './actions.ts';
import { reduce } from './reducer.ts';
import { check } from './rules.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';
import type { GameState } from './state.ts';

const win = builtinWindow();
const rng = createRng(1);
const ready = (...ids: PlacedId[]): GameState['buildings'] =>
  Object.fromEntries(['habitat', 'panels', ...ids].map((id) => [id, { cell: BALANCE.grid.slots[id as PlacedId], solsLeft: 0 }]));
const WAIT: Action = { type: 'shelterWait', crewId: 0, hours: 1 };
const WORK: Action[] = [
  { type: 'readCuriosity', crewId: 0 },
  { type: 'scanRock', crewId: 0 },
  { type: 'clean', crewId: 0 },
];

/** Plays the storm sol and the next one; `shelter`: wait whenever a storm hour allows it. */
function storm(shelter: boolean, level: number): GameState {
  const sol = win.radEventSols[0] ?? 1;
  let s: GameState = {
    ...createInitialState(1, win),
    sol,
    schedule: { dust: [], malfunctions: [] },
    buildings: ready('moxie', 'shelter'),
    shelterLevel: level,
    power: 100,
    air: 100,
    panelEff: 0.5,
  };
  while (s.phase === 'playing' && s.sol < sol + 2) {
    const work = WORK.find((a) => check(s, a, win) === null);
    const action = shelter && check(s, WAIT, win) === null ? WAIT : (work ?? { type: 'endSol', crewId: 0 });
    s = reduce(s, action, rng, win);
  }
  return s;
}

describe('F6 shelter balance', () => {
  it('waiting out the storm keeps the dose low, regolith lower still; outside goes over the budget', () => {
    const share = (s: GameState): number => s.dose / BALANCE.dose.budget;
    const bare = storm(true, 0);
    const piled = storm(true, BALANCE.actions.shelterBuild.maxLevel);
    const outside = storm(false, 0);
    expect(share(bare)).toBeLessThan(0.3);
    expect(share(piled)).toBeLessThan(share(bare));
    expect(outside.phase === 'lost' || share(outside) > 0.9).toBe(true);
  });
});
