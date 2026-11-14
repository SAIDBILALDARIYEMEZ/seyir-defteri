// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Fetches the real-data snapshots into src/data/. Run from a laptop: node tools/data/fetch.mjs
// One failing endpoint never stops the run: it is skipped and listed in the file's `skipped`.

import { readFileSync, writeFileSync } from 'node:fs';

const WINDOWS = [
  { id: 'w1', name: 'The Big Storm', start: '2024-05-03', end: '2024-06-01' },
  { id: 'w2', name: 'September 2017', start: '2017-09-01', end: '2017-09-30' },
  { id: 'w3', name: 'Hit Earth, not Mars', start: '2023-03-01', end: '2023-03-31' },
];
const LICENSE = 'NASA open data';
const RADLAB = 'https://visualization.osdr.nasa.gov/radlab/api/';
const DONKI = 'https://api.nasa.gov/DONKI';
const TIMEOUT_MS = 60_000;
const FASTEST_CME = 5;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const env = readFileSync(new URL('../../src/config/env.ts', import.meta.url), 'utf8');
const KEY = /NASA_API_KEY_PUBLIC = '([^']+)'/.exec(env)?.[1];
if (!KEY) throw new Error('NASA_API_KEY_PUBLIC not found in src/config/env.ts');

const out = (name) => new URL(`../../src/data/${name}`, import.meta.url);
const nextDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
const round = (v, digits = 2) => Math.round(v * 10 ** digits) / 10 ** digits;
const hideKey = (url) => url.replace(KEY, 'YOUR_KEY');

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function fetchRad(win, instrument) {
  const url =
    `${RADLAB}?instrument_id=${instrument}&absorbed_dose_rate` +
    `&timestamp>=${win.start}&timestamp<${nextDay(win.end)}&format=csv`;
  const rows = (await get(url))
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.replaceAll('"', '').split(','))
    .map(([time, , value]) => ({ time, ms: Date.parse(`${time}Z`), value: Number(value) }))
    .filter((r) => Number.isFinite(r.ms) && Number.isFinite(r.value));
  if (rows.length === 0) throw new Error('no rows');
  const startMs = Date.parse(`${win.start}T00:00:00Z`);
  const hours = Math.round((Date.parse(`${nextDay(win.end)}T00:00:00Z`) - startMs) / HOUR_MS);
  const sums = new Array(hours).fill(0);
  const counts = new Array(hours).fill(0);
  for (const r of rows) {
    const i = Math.floor((r.ms - startMs) / HOUR_MS);
    if (i >= 0 && i < hours) {
      sums[i] += r.value;
      counts[i] += 1;
    }
  }
  const peak = rows.reduce((a, b) => (b.value > a.value ? b : a));
  return {
    source: `NASA OSDR RadLab, ${instrument}, absorbed dose rate`,
    url,
    fetchedAt: new Date().toISOString(),
    license: LICENSE,
    windowId: win.id,
    windowName: win.name,
    startDate: win.start,
    endDate: win.end,
    unit: 'uGy/h',
    note: 'Hourly means of the raw readings from startDate 00:00 UTC; null = no reading that hour.',
    readings: rows.length,
    median: round(median(rows.map((r) => r.value))),
    peak: { value: round(peak.value), time: `${peak.time}Z` },
    hourly: sums.map((s, i) => (counts[i] ? round(s / counts[i]) : null)),
  };
}

async function fetchDonki(win) {
  const range = `startDate=${win.start}&endDate=${win.end}&api_key=${KEY}`;
  const urls = {
    sep: `${DONKI}/SEP?${range}`,
    gst: `${DONKI}/GST?${range}`,
    flr: `${DONKI}/notifications?${range}&type=FLR`,
    cme: `${DONKI}/CME?${range}`,
  };
  const skipped = [];
  const load = async (key, map) => {
    try {
      const text = await get(urls[key]);
      return map(text.trim() ? JSON.parse(text) : []);
    } catch (err) {
      skipped.push({ endpoint: key, error: String(err.message ?? err) });
      return map([]);
    }
  };
  const sep = await load('sep', (list) =>
    list.map((e) => ({
      id: e.sepID,
      time: e.eventTime,
      instruments: (e.instruments ?? []).map((i) => i.displayName),
    })),
  );
  const gst = await load('gst', (list) =>
    list.map((e) => ({
      id: e.gstID,
      time: e.startTime,
      kpMax: Math.max(0, ...(e.allKpIndex ?? []).map((k) => k.kpIndex)),
    })),
  );
  const flr = await load('flr', (list) =>
    list.map((e) => ({
      id: e.messageID,
      time: e.messageIssueTime,
      // The alert names the intensity threshold that was crossed, not the final flare class.
      threshold: /threshold of ([XMC]\d+(?:\.\d+)?)/.exec(e.messageBody ?? '')?.[1] ?? null,
    })),
  );
  const cme = await load('cme', (list) => {
    const withSpeed = list.map((e) => ({
      id: e.activityID,
      time: e.startTime,
      speed: Math.max(0, ...(e.cmeAnalyses ?? []).map((a) => a.speed ?? 0)),
    }));
    withSpeed.sort((a, b) => b.speed - a.speed);
    return { count: list.length, fastest: withSpeed.slice(0, FASTEST_CME) };
  });
  return {
    source: 'NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)',
    url: `${DONKI}/`,
    urls: Object.fromEntries(Object.entries(urls).map(([k, u]) => [k, hideKey(u)])),
    fetchedAt: new Date().toISOString(),
    license: LICENSE,
    windowId: win.id,
    windowName: win.name,
    startDate: win.start,
    endDate: win.end,
    note: 'DONKI events are observed near Earth, not at Mars. CME: count plus the 5 fastest only.',
    skipped,
    sep,
    gst,
    flr,
    cme,
  };
}

const report = [];

// `--latest`: only the "Today on the Sun" fallback snapshot (last 7 days of notifications).
if (process.argv.includes('--latest')) {
  const { summarize, sunRange, sunUrl } = await import('../../src/adapters/donkiSummary.ts');
  const range = sunRange(new Date());
  const rows = JSON.parse((await get(`${sunUrl('https://api.nasa.gov', range)}&api_key=${KEY}`)) || '[]');
  const summary = summarize(rows, range, new Date().toISOString());
  writeFileSync(out('donki-latest.json'), `${JSON.stringify(summary)}\n`);
  process.stdout.write(`ok    donki-latest.json: ${JSON.stringify(summary.counts)}\n`);
  process.exit(0);
}
const save = (name, data) => {
  writeFileSync(out(name), `${JSON.stringify(data)}\n`);
  report.push(`ok    ${name}`);
};

for (const win of WINDOWS) {
  try {
    const rad = await fetchRad(win, 'MSL-RAD-Surface');
    save(`rad-${win.id}.json`, rad);
    report.push(`      RAD ${win.id}: ${rad.readings} readings, median ${rad.median}, peak ${rad.peak.value} at ${rad.peak.time}`);
  } catch (err) {
    report.push(`SKIP  rad-${win.id}.json: ${err.message}`);
  }
  try {
    const donki = await fetchDonki(win);
    save(`donki-${win.id}.json`, donki);
    report.push(
      `      DONKI ${win.id}: SEP ${donki.sep.length}, GST ${donki.gst.length}, FLR ${donki.flr.length}, ` +
        `CME ${donki.cme.count}` + donki.skipped.map((s) => `, SKIPPED ${s.endpoint} (${s.error})`).join(''),
    );
  } catch (err) {
    report.push(`SKIP  donki-${win.id}.json: ${err.message}`);
  }
}
process.stdout.write(`${report.join('\n')}\n`);
