// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { commsDelaySeconds, splitDelay } from './commsDelay.ts';
import { CODE_LENGTH, decodeMission, encodeMission, maxCodeSeed } from './missionCode.ts';

describe('comms delay', () => {
  it('matches the 2003 close approach (0.373 AU, about 186 s)', () => {
    expect(commsDelaySeconds('2003-08-27')).toBeGreaterThan(183);
    expect(commsDelaySeconds('2003-08-27')).toBeLessThan(189);
  });
  it('stays inside the real 3 to 22 minute range for the game windows', () => {
    for (const date of ['2024-05-20', '2017-09-10', '2023-03-01']) {
      const minutes = commsDelaySeconds(date) / 60;
      expect(minutes).toBeGreaterThan(3);
      expect(minutes).toBeLessThan(22.5);
    }
  });
  it('splits seconds into minutes and seconds', () => {
    expect(splitDelay(1032)).toEqual({ min: 17, s: 12 });
  });
});

describe('mission code', () => {
  it('round-trips seed and window in 6 characters', () => {
    for (const [seed, w] of [[20240520, 0], [1, 2], [999_999, 1], [maxCodeSeed(3), 2]] as const) {
      const code = encodeMission(seed, w, 3);
      expect(code).toHaveLength(CODE_LENGTH);
      expect(decodeMission(code.toLowerCase(), 3)).toEqual({ seed, windowIndex: w });
    }
  });
  it('rejects text that is not a code', () => {
    expect(decodeMission('ABC', 3)).toBeNull();
    expect(decodeMission('AB!DEF', 3)).toBeNull();
  });
});
