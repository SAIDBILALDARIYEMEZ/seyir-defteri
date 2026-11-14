// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// "Today on the Sun" (PRD §10.1): the last 7 days of NASA DONKI notifications, summarized as
// counts per event type. Shared by the live adapter and tools/data/fetch.mjs (the snapshot).

/** Event types the card shows, in order (DONKI messageType codes). */
export const SUN_TYPES = ['FLR', 'CME', 'SEP', 'GST'] as const;
export type SunType = (typeof SUN_TYPES)[number];

export interface SunSummary {
  source: string;
  url: string;
  /** When the data was fetched (ISO). */
  fetchedAt: string;
  license: string;
  startDate: string;
  endDate: string;
  counts: Record<SunType, number>;
  /** The newest shown notification, or null for a quiet week. */
  latest: { type: SunType; time: string } | null;
}

export const SUN_DAYS = 7;
const DAY_MS = 86_400_000;

/** Start and end dates (YYYY-MM-DD) of the last `SUN_DAYS` days up to `now`. */
export function sunRange(now: Date): { startDate: string; endDate: string } {
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - (SUN_DAYS - 1) * DAY_MS).toISOString().slice(0, 10);
  return { startDate, endDate };
}

/** DONKI notifications URL for the range (key appended by the caller). */
export function sunUrl(base: string, range: { startDate: string; endDate: string }): string {
  return `${base}/DONKI/notifications?startDate=${range.startDate}&endDate=${range.endDate}&type=all`;
}

const isType = (value: unknown): value is SunType => SUN_TYPES.includes(value as SunType);

/** Counts the notifications per type. Unknown rows are ignored; never throws on bad input. */
export function summarize(rows: unknown, range: { startDate: string; endDate: string }, fetchedAt: string): SunSummary {
  const counts: Record<SunType, number> = { FLR: 0, CME: 0, SEP: 0, GST: 0 };
  let latest: SunSummary['latest'] = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    const r = row as { messageType?: unknown; messageIssueTime?: unknown };
    if (!isType(r.messageType) || typeof r.messageIssueTime !== 'string') continue;
    counts[r.messageType] += 1;
    if (!latest || r.messageIssueTime > latest.time) latest = { type: r.messageType, time: r.messageIssueTime };
  }
  return {
    source: 'NASA DONKI notifications',
    url: 'https://api.nasa.gov/DONKI/',
    fetchedAt,
    license: 'NASA open data',
    ...range,
    counts,
    latest,
  };
}
