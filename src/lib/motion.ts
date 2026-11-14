// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// "Reduce motion" setting (F5c): no camera shake, no white flash, no menu spin. Defaults to the
// system's prefers-reduced-motion until the player picks a value in Settings.

const STORAGE_KEY = 'seyir-defteri.motion';

function systemPrefers(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function read(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'reduce') return true;
    if (saved === 'full') return false;
  } catch {
    // Storage blocked: follow the system setting.
  }
  return systemPrefers();
}

let reduced = read();

export const reduceMotion = (): boolean => reduced;

export function setReduceMotion(on: boolean): void {
  reduced = on;
  document.documentElement.classList.toggle('reduce-motion', on);
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'reduce' : 'full');
  } catch {
    // The choice lasts for this visit only.
  }
}

document.documentElement.classList.toggle('reduce-motion', reduced);
