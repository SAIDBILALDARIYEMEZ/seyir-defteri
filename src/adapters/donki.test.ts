// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
import { describe, expect, it } from 'vitest';
import { loadSun } from './donki.ts';
import { summarize, sunRange } from './donkiSummary.ts';

const now = new Date('2026-11-15T12:00:00Z');
const rows = [
  { messageType: 'FLR', messageIssueTime: '2026-11-10T01:00Z' },
  { messageType: 'CME', messageIssueTime: '2026-11-14T03:00Z' },
  { messageType: 'CME', messageIssueTime: '2026-11-12T03:00Z' },
  { messageType: 'Report', messageIssueTime: '2026-11-15T03:00Z' },
  { nonsense: true },
];

describe('Today on the Sun (DONKI adapter)', () => {
  it('summarizes the last 7 days per type and finds the newest shown report', () => {
    const s = summarize(rows, sunRange(now), now.toISOString());
    expect(s.startDate).toBe('2026-11-09');
    expect(s.endDate).toBe('2026-11-15');
    expect(s.counts).toEqual({ FLR: 1, CME: 2, SEP: 0, GST: 0 });
    expect(s.latest).toEqual({ type: 'CME', time: '2026-11-14T03:00Z' });
    expect(summarize('not a list', sunRange(now), now.toISOString()).latest).toBeNull();
  });

  it('is LIVE when the fetch answers', async () => {
    const data = await loadSun(async () => ({ ok: true, json: async () => rows }), now);
    expect(data.mode).toBe('live');
    expect(data.summary.counts.CME).toBe(2);
  });

  it('falls back to the SAVED snapshot when offline, on HTTP errors and on bad JSON', async () => {
    const offline = await loadSun(async () => {
      throw new TypeError('Failed to fetch');
    }, now);
    expect(offline.mode).toBe('saved');
    expect((await loadSun(async () => ({ ok: false, json: async () => [] }), now)).mode).toBe('saved');
    const bad = await loadSun(async () => ({ ok: true, json: async () => { throw new SyntaxError('bad'); } }), now);
    expect(bad.mode).toBe('saved');
    expect(offline.summary.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
