// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Boot: create sim -> mount scene + UI. Flow: input -> action -> reducer -> state -> render.

import { BALANCE } from './config/balance.ts';
import { WINDOW_IDS, getWindow } from './data/windows.ts';
import { createGame } from './game.ts';
import type { Mission, Missions } from './game.ts';
import { decodeMission, encodeMission, maxCodeSeed } from './lib/missionCode.ts';
import { isDebug } from './lib/debug.ts';
import { createWorld } from './scene/world.ts';
import { setGauge, triggerDust, triggerMalfunction } from './sim/debugTools.ts';
import { mountDebugPanel } from './ui/debugPanel.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #scene or #ui element');

const params = new URLSearchParams(location.search);
const FIRST_SEED = 20240520;
const MAX_SEED = 999_999;
const PLAYED_KEY = 'seyir-defteri.played';

/** First game: always window 1 with the fixed seed. Later games: random seed, window from the
 * seed. `?seed=` / `?w=` pin both (debug and class codes). Math.random stays outside the sim. */
function nextMission(): Mission {
  if (params.has('seed') || params.has('w')) {
    const pinned = Math.abs(Math.floor(Number(params.get('seed')))) % (maxCodeSeed(WINDOW_IDS.length) + 1);
    return { seed: pinned || FIRST_SEED, win: getWindow(params.get('w')) };
  }
  let played = false;
  try {
    played = localStorage.getItem(PLAYED_KEY) === '1';
    localStorage.setItem(PLAYED_KEY, '1');
  } catch {
    // Storage blocked: every game is treated as the first one.
  }
  if (!played) return { seed: FIRST_SEED, win: getWindow('w1') };
  const seed = 1 + Math.floor(Math.random() * MAX_SEED);
  return { seed, win: getWindow(WINDOW_IDS[seed % WINDOW_IDS.length] ?? 'w1') };
}

const world = createWorld(canvas);
const first: Mission = { seed: Number(params.get('seed')) || FIRST_SEED, win: getWindow(params.get('w')) };
const windowIndex = (id: string): number => Math.max(0, WINDOW_IDS.findIndex((w) => w === id));
const missions: Missions = {
  next: nextMission,
  ofSave: (seed, windowId) => ({ seed, win: getWindow(windowId) }),
  fromCode: (code) => {
    const found = decodeMission(code, WINDOW_IDS.length);
    if (!found || found.seed < 1) return null;
    return { seed: found.seed, win: getWindow(WINDOW_IDS[found.windowIndex] ?? 'w1') };
  },
  codeOf: (seed, windowId) => encodeMission(seed, windowIndex(windowId), WINDOW_IDS.length),
};
const game = createGame(canvas, ui, world, first, missions);
/** Debug skip: tops up the life gauges first, so a skipped sol never ends the mission. */
const endSol = (): void => {
  let s = game.getState();
  for (const gauge of ['power', 'air', 'food'] as const) s = setGauge(s, gauge, BALANCE[gauge].max);
  game.setState(s);
  game.dispatch({ type: 'endSol', crewId: 0 }, true);
};

const debugPanel = isDebug
  ? mountDebugPanel(ui, () => game.getWindow(), {
      dispatch: (action) => game.dispatch(action, true),
      skipSols: (count) => {
        for (let i = 0; i < count; i++) endSol();
      },
      jumpToEvent: () => {
        const target = game.getWindow().radEventSols.find((sol) => sol > game.getState().sol);
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
