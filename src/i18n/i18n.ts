// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// All player-facing text comes from {lang}.json (Hard Rule 2).
// Default: English whatever the browser language is; Turkish is chosen in settings (D-010).

import en from './en.json';
import tr from './tr.json';

export type Lang = 'tr' | 'en';
export type TextKey = keyof typeof en;

const STORAGE_KEY = 'seyir-defteri.lang';
const tables: Record<Lang, Record<TextKey, string>> = { en, tr };
const listeners = new Set<() => void>();

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch {
    // Storage may be blocked (private mode); use the default.
  }
  return 'en';
}

let current: Lang = detectLang();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved; the choice still applies for this visit.
  }
  listeners.forEach((fn) => fn());
}

export function t(key: TextKey, params?: Record<string, string | number>): string {
  let text = tables[current][key];
  if (params) for (const [name, value] of Object.entries(params)) text = text.replace(`{${name}}`, String(value));
  return text;
}

/** Calls fn now and on every language change. Returns an unsubscribe function. */
export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  fn();
  return () => listeners.delete(fn);
}
