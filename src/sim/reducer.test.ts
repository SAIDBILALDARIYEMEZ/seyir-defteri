// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../config/balance.ts';
import { reduce } from './reducer.ts';
import { createRng } from './rng.ts';
import { createInitialState } from './state.ts';

describe('placeholder sim', () => {
  it('advances a sol and wins after the last one', () => {
    const rng = createRng(1);
    let state = createInitialState(1);
    state = reduce(state, { type: 'endSol', crewId: 0 }, rng);
    expect(state.sol).toBe(2);
    for (let i = 0; i < BALANCE.totalSols; i++) {
      state = reduce(state, { type: 'endSol', crewId: 0 }, rng);
    }
    expect(state.phase).toBe('won');
    expect(state.sol).toBe(BALANCE.totalSols);
  });

  it('ends the sol automatically when daylight runs out', () => {
    const state = reduce(
      createInitialState(1),
      { type: 'wait', crewId: 0, hours: BALANCE.daylightHours },
      createRng(1),
    );
    expect(state.sol).toBe(2);
    expect(state.hoursLeft).toBe(BALANCE.daylightHours);
  });

  it('does not mutate the input state', () => {
    const before = createInitialState(7);
    const copy = structuredClone(before);
    reduce(before, { type: 'wait', crewId: 0, hours: 3 }, createRng(7));
    expect(before).toEqual(copy);
  });
});

describe('rng', () => {
  it('is deterministic for a seed and stays in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) {
      const v = a.next();
      expect(v).toBe(b.next());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(createRng(43).next()).not.toBe(createRng(42).next());
  });
});
