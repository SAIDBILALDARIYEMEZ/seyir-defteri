// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Boot: create sim -> mount scene + UI. Flow: input -> action -> reducer -> state -> render.

import { debug, isDebug } from './lib/debug.ts';
import { createWorld } from './scene/world.ts';
import type { Action } from './sim/actions.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { createInitialState } from './sim/state.ts';
import { mountComingSoon } from './ui/comingSoon.ts';
import { mountDebugPanel } from './ui/debugPanel.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #scene or #ui element');

const seed = 20240520;
const rng = createRng(seed);
let state = createInitialState(seed);

const dispatch = (action: Action): void => {
  state = reduce(state, action, rng);
  debug('action', action, state);
};

const world = createWorld(canvas);
mountComingSoon(ui);
const debugPanel = isDebug
  ? mountDebugPanel(ui, () => dispatch({ type: 'endSol', crewId: 0 }))
  : null;

let last = performance.now();
const frame = (now: number): void => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  world.update(dt);
  debugPanel?.update(dt, state);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
