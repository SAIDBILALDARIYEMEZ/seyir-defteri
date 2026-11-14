// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Debug helpers. Active only with `?debug` in the URL. Never use console.log directly.

export const isDebug: boolean =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export function debug(...args: unknown[]): void {
  if (isDebug) console.debug('[debug]', ...args);
}
