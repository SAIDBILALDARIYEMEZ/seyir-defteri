// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// F6 "Text size" setting: normal or large. Large zooms the reading panels (cards, the station
// menu, the wrist watch, the station info card, cutscene subtitles) through a class on <html>.

const STORAGE_KEY = 'seyir-defteri.textSize';

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'large';
  } catch {
    return false;
  }
}

let large = read();

export const largeText = (): boolean => large;

export function setLargeText(on: boolean): void {
  large = on;
  document.documentElement.classList.toggle('text-large', on);
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'large' : 'normal');
  } catch {
    // The choice lasts for this visit only.
  }
  window.dispatchEvent(new Event('resize'));
}

document.documentElement.classList.toggle('text-large', large);
