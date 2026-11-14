// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Player profile (B3 learning layer): XP, rank, concept counters, wins. Pure data + pure
// functions; storage lives in store.ts. Never imported by src/sim/.

import { PROGRESSION } from '../config/progression.ts';
import type { RankId, XpSource } from '../config/progression.ts';

export interface Profile {
  v: 1;
  xp: number;
  wins: number;
  /** How many times each concept was shown (capsule or question). */
  seen: Record<string, number>;
  /** XP and rank at the start of the current mission (for the result screen). */
  mission: { seed: number; startXp: number } | null;
}

export const emptyProfile = (): Profile => ({ v: 1, xp: 0, wins: 0, seen: {}, mission: null });

export interface Rank {
  id: RankId;
  index: number;
  floor: number;
  /** XP of the next rank, or null at the top. */
  next: number | null;
}

export function rankOf(xp: number): Rank {
  const ranks = PROGRESSION.ranks;
  let index = 0;
  ranks.forEach((r, i) => {
    if (xp >= r.xp) index = i;
  });
  const rank = ranks[index] ?? ranks[0];
  return { id: rank.id, index, floor: rank.xp, next: ranks[index + 1]?.xp ?? null };
}

/** Share of the way to the next rank (1 at the top). */
export function rankProgress(xp: number): number {
  const r = rankOf(xp);
  return r.next === null ? 1 : (xp - r.floor) / (r.next - r.floor);
}

export interface XpGain {
  profile: Profile;
  gained: number;
  /** The new rank when this gain crossed a rank floor. */
  rankUp: RankId | null;
}

export function addXp(profile: Profile, source: XpSource, times = 1): XpGain {
  const gained = PROGRESSION.xp[source] * Math.max(0, times);
  const xp = profile.xp + gained;
  const before = rankOf(profile.xp);
  const after = rankOf(xp);
  return { profile: { ...profile, xp }, gained, rankUp: after.index > before.index ? after.id : null };
}

export type ShowMode = 'capsule' | 'quiz';

/** Counts one showing of `id`: every `quizEvery`-th showing is a recall question. */
export function showConcept(profile: Profile, id: string): { profile: Profile; mode: ShowMode } {
  const count = (profile.seen[id] ?? 0) + 1;
  const mode: ShowMode = count % PROGRESSION.quizEvery === 0 ? 'quiz' : 'capsule';
  return { profile: { ...profile, seen: { ...profile.seen, [id]: count } }, mode };
}

/** The least-shown concept among `candidates` (first in list order on a tie). */
export function pickConcept(profile: Profile, candidates: readonly string[]): string | null {
  let best: string | null = null;
  for (const id of candidates) {
    if (best === null || (profile.seen[id] ?? 0) < (profile.seen[best] ?? 0)) best = id;
  }
  return best;
}

export const canPickStorm = (profile: Profile): boolean => profile.wins >= PROGRESSION.winsToPickStorm;

export function startMission(profile: Profile, seed: number): Profile {
  if (profile.mission?.seed === seed) return profile;
  return { ...profile, mission: { seed, startXp: profile.xp } };
}

export const recordWin = (profile: Profile): Profile => ({ ...profile, wins: profile.wins + 1 });

/** Accepts only a well-formed stored profile; anything else becomes a fresh one. */
export function parseProfile(raw: unknown): Profile {
  if (typeof raw !== 'object' || raw === null) return emptyProfile();
  const p = raw as Partial<Profile>;
  if (p.v !== 1 || typeof p.xp !== 'number' || typeof p.wins !== 'number' || typeof p.seen !== 'object') {
    return emptyProfile();
  }
  return {
    v: 1,
    xp: Math.max(0, p.xp),
    wins: Math.max(0, p.wins),
    seen: { ...(p.seen ?? {}) },
    mission: p.mission && typeof p.mission.seed === 'number' ? p.mission : null,
  };
}
