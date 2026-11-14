// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { PROGRESSION } from '../config/progression.ts';
import concepts from '../content/concepts.json';
import { addXp, canPickStorm, emptyProfile, parseProfile, pickConcept, rankOf, recordWin, showConcept, startMission } from './profile.ts';

describe('profile: concept counters', () => {
  it('the 4th showing of a concept is a question, the others capsules', () => {
    let p = emptyProfile();
    const modes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const r = showConcept(p, 'moxie');
      p = r.profile;
      modes.push(r.mode);
    }
    expect(modes).toEqual(['capsule', 'capsule', 'capsule', 'quiz', 'capsule', 'capsule', 'capsule', 'quiz']);
    expect(p.seen.moxie).toBe(8);
    expect(p.seen.sol).toBeUndefined();
  });

  it('picks the least-shown concept', () => {
    const p = { ...emptyProfile(), seen: { sol: 2, moxie: 1 } };
    expect(pickConcept(p, ['sol', 'moxie'])).toBe('moxie');
    expect(pickConcept(p, ['sol', 'moxie', 'rad'])).toBe('rad');
    expect(pickConcept(p, [])).toBeNull();
  });

  it('every concept has 3 options and a valid answer', () => {
    expect(concepts.length).toBe(8);
    for (const c of concepts) expect([0, 1, 2]).toContain(c.answer);
  });
});

describe('profile: XP and ranks', () => {
  it('adds XP from the progression table and reports a rank up', () => {
    const p = emptyProfile();
    const a = addXp(p, 'buildDone');
    expect(a.gained).toBe(PROGRESSION.xp.buildDone);
    expect(a.rankUp).toBeNull();
    const near = { ...p, xp: PROGRESSION.ranks[1].xp - 1 };
    const b = addXp(near, 'quizCorrect');
    expect(b.rankUp).toBe('rookie');
    expect(rankOf(0).id).toBe('cadet');
    expect(rankOf(99_999)).toMatchObject({ id: 'legend', next: null });
  });

  it('remembers the XP at mission start once per seed', () => {
    const p = startMission({ ...emptyProfile(), xp: 40 }, 7);
    expect(p.mission).toEqual({ seed: 7, startXp: 40 });
    expect(startMission({ ...p, xp: 90 }, 7).mission?.startXp).toBe(40);
  });
});

describe('profile: storm picker lock', () => {
  it('opens after the first win', () => {
    const p = emptyProfile();
    expect(canPickStorm(p)).toBe(false);
    expect(canPickStorm(recordWin(p))).toBe(true);
  });

  it('a broken stored profile becomes a fresh one', () => {
    expect(parseProfile('nope')).toEqual(emptyProfile());
    expect(parseProfile({ v: 2, xp: 5 })).toEqual(emptyProfile());
    expect(parseProfile({ v: 1, xp: 30, wins: 1, seen: { sol: 1 }, mission: null }).xp).toBe(30);
  });
});
