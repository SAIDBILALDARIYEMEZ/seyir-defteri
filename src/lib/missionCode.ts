// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Mission code (class mode, D-004 A3): 6 characters = seed + window. Same code, same storms.

/** No 0/O, 1/I: easy to read aloud in a classroom. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
const BASE = ALPHABET.length;

/** Largest seed a 6-character code can carry with `windowCount` windows. */
export function maxCodeSeed(windowCount: number): number {
  return Math.floor(BASE ** CODE_LENGTH / windowCount) - 1;
}

export function encodeMission(seed: number, windowIndex: number, windowCount: number): string {
  let value = (Math.abs(Math.floor(seed)) % (maxCodeSeed(windowCount) + 1)) * windowCount + windowIndex;
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code = ALPHABET[value % BASE] + code;
    value = Math.floor(value / BASE);
  }
  return code;
}

/** Returns null when the text is not a valid code. */
export function decodeMission(text: string, windowCount: number): { seed: number; windowIndex: number } | null {
  const code = text.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  let value = 0;
  for (const ch of code) {
    const digit = ALPHABET.indexOf(ch);
    if (digit < 0) return null;
    value = value * BASE + digit;
  }
  return { seed: Math.floor(value / windowCount), windowIndex: value % windowCount };
}
