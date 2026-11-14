// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Boot: create sim -> mount scene + UI. Flow: input -> action -> reducer -> state -> render.

import { getWindow } from './data/windows.ts';
import { debug, isDebug } from './lib/debug.ts';
import { createWorld } from './scene/world.ts';
import type { Action } from './sim/actions.ts';
import { setGauge, triggerDust, triggerMalfunction } from './sim/debugTools.ts';
import { reduce } from './sim/reducer.ts';
import { createRng } from './sim/rng.ts';
import { createInitialState } from './sim/state.ts';
import { mountComingSoon } from './ui/comingSoon.ts';
import { mountDebugPanel } from './ui/debugPanel.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #scene or #ui element');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 20240520;
const win = getWindow(params.get('w'));
const rng = createRng(seed);
let state = createInitialState(seed, win);

const dispatch = (action: Action): void => {
  state = reduce(state, action, rng, win);
  debug('action', action, state);
};
const endSol = (): void => dispatch({ type: 'endSol', crewId: 0 });

const world = createWorld(canvas);
mountComingSoon(ui);
const debugPanel = isDebug
  ? mountDebugPanel(ui, win, {
      dispatch,
      skipSols: (count) => {
        for (let i = 0; i < count; i++) endSol();
      },
      jumpToEvent: () => {
        const target = win.radEventSols.find((sol) => sol > state.sol);
        while (target && state.phase === 'playing' && state.sol < target) endSol();
      },
      setGauge: (gauge, value) => (state = setGauge(state, gauge, value)),
      triggerDust: () => (state = triggerDust(state)),
      triggerMalfunction: (station) => (state = triggerMalfunction(state, station)),
    })
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
