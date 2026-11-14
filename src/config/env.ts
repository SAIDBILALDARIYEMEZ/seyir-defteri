// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Environment constants shipped to the browser.
//
// PUBLIC BY DESIGN: this is a browser game, so anything here is visible to everyone.
// Only free, rate-limited keys may live in this file. Never put a real secret here.

/** PUBLIC free api.nasa.gov key (limit: 1,000 requests/hour). Do NOT use DEMO_KEY. */
export const NASA_API_KEY_PUBLIC = 'Rd7GFHfqzTmttdGC7NnFLPrphBHWCrjBWkffFz9M';

export const NASA_API_BASE = 'https://api.nasa.gov';

/** Live fetches fall back to the embedded snapshot after this long. */
export const LIVE_FETCH_TIMEOUT_MS = 6000;

/** Live responses are cached this long to stay far below the rate limit. */
export const LIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
