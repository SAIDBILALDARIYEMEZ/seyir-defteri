// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Live "Today on the Sun" fetch (PRD §10.1, Hard Rule 7): DONKI notifications with a 6 s timeout;
// on any failure (offline, timeout, HTTP error, bad JSON) the embedded snapshot is used and the
// card says SAVED + its date. A live answer is cached for LIVE_CACHE_TTL_MS. Never throws.

import { LIVE_CACHE_TTL_MS, LIVE_FETCH_TIMEOUT_MS, NASA_API_BASE, NASA_API_KEY_PUBLIC } from '../config/env.ts';
import snapshot from '../data/donki-latest.json';
import { summarize, sunRange, sunUrl } from './donkiSummary.ts';
import type { SunSummary } from './donkiSummary.ts';

export type SunMode = 'live' | 'saved';
export interface SunData {
  mode: SunMode;
  summary: SunSummary;
}

const CACHE_KEY = 'seyir-defteri.sunCache';
type Fetcher = (url: string, init: { signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

function cached(now: number): SunSummary | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const value = raw ? (JSON.parse(raw) as SunSummary) : null;
    return value && now - Date.parse(value.fetchedAt) < LIVE_CACHE_TTL_MS ? value : null;
  } catch {
    return null;
  }
}

export const savedSun = (): SunData => ({ mode: 'saved', summary: snapshot as SunSummary });

/** Live summary, or the snapshot. `fetcher` / `now` are injectable for tests. */
export async function loadSun(fetcher: Fetcher = fetch, now: Date = new Date()): Promise<SunData> {
  const hit = cached(now.getTime());
  if (hit) return { mode: 'live', summary: hit };
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return savedSun();
    const range = sunRange(now);
    const res = await fetcher(`${sunUrl(NASA_API_BASE, range)}&api_key=${NASA_API_KEY_PUBLIC}`, {
      signal: AbortSignal.timeout(LIVE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return savedSun();
    const summary = summarize(await res.json(), range, now.toISOString());
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
    } catch {
      // No cache: the next visit fetches again.
    }
    return { mode: 'live', summary };
  } catch {
    return savedSun();
  }
}
