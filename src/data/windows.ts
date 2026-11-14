// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Browser-side loader: turns the saved snapshots into sim windows. These are SAVED data
// (see `fetchedAt` in each file), never live.

import { buildWindow } from '../sim/window.ts';
import type { WindowData } from '../sim/window.ts';
import donkiW1 from './donki-w1.json';
import donkiW2 from './donki-w2.json';
import donkiW3 from './donki-w3.json';
import radW1 from './rad-w1.json';
import radW2 from './rad-w2.json';
import radW3 from './rad-w3.json';

export const WINDOW_IDS = ['w1', 'w2', 'w3'] as const;
export type WindowId = (typeof WINDOW_IDS)[number];

const built: Record<WindowId, WindowData> = {
  w1: buildWindow('w1', radW1, donkiW1),
  w2: buildWindow('w2', radW2, donkiW2),
  w3: buildWindow('w3', radW3, donkiW3),
};

export function getWindow(id: string | null): WindowData {
  return built[WINDOW_IDS.find((w) => w === id) ?? 'w1'];
}
