// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Boot: create sim -> mount scene + UI. Flow: input -> action -> reducer -> state -> render.

import { getWindow } from './data/windows.ts';
import { createGame } from './game.ts';
import { isDebug } from './lib/debug.ts';
import { createWorld } from './scene/world.ts';
import { setGauge, triggerDust, triggerMalfunction } from './sim/debugTools.ts';
import { mountDebugPanel } from './ui/debugPanel.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #scene or #ui element');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 20240520;
const win = getWindow(params.get('w'));

const world = createWorld(canvas);
const game = createGame(canvas, ui, world, win, seed);
const endSol = (): void => game.dispatch({ type: 'endSol', crewId: 0 }, true);

const debugPanel = isDebug
  ? mountDebugPanel(ui, win, {
      dispatch: (action) => game.dispatch(action, true),
      skipSols: (count) => {
        for (let i = 0; i < count; i++) endSol();
      },
      jumpToEvent: () => {
        const target = win.radEventSols.find((sol) => sol > game.getState().sol);
        while (target && game.getState().phase === 'playing' && game.getState().sol < target) endSol();
      },
      setGauge: (gauge, value) => game.setState(setGauge(game.getState(), gauge, value)),
      triggerDust: () => game.setState(triggerDust(game.getState())),
      triggerMalfunction: (station) => game.setState(triggerMalfunction(game.getState(), station)),
    })
  : null;

let last = performance.now();
const frame = (now: number): void => {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  game.frame(dt);
  debugPanel?.update(dt, game.getState());
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
