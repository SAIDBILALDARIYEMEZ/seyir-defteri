// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Headless playtest bot. Usage: npm run bot -- --games 200
// Runs the pure sim with no rendering, every strategy on every window. Never touches saves.

import { existsSync, readFileSync } from 'node:fs';
import { BALANCE } from '../../src/config/balance.ts';
import { builtinWindow } from '../../src/data/builtinWindow.ts';
import { reduce } from '../../src/sim/reducer.ts';
import { createRng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import { createInitialState } from '../../src/sim/state.ts';
import { buildWindow } from '../../src/sim/window.ts';
import type { DonkiSnapshot, RadSnapshot, WindowData } from '../../src/sim/window.ts';
import { strategies } from './strategies.ts';

const MAX_STEPS = 5_000;
const WINDOW_IDS = ['w1', 'w2', 'w3'];
const dataUrl = (name: string): URL => new URL(`../../src/data/${name}`, import.meta.url);

function readJson<T>(name: string): T | null {
  const url = dataUrl(name);
  return existsSync(url) ? (JSON.parse(readFileSync(url, 'utf8')) as T) : null;
}

function loadWindows(): { windows: WindowData[]; note: string } {
  const windows: WindowData[] = [];
  for (const id of WINDOW_IDS) {
    const rad = readJson<RadSnapshot>(`rad-${id}.json`);
    if (rad) windows.push(buildWindow(id, rad, readJson<DonkiSnapshot>(`donki-${id}.json`)));
  }
  if (windows.length > 0) return { windows, note: 'snapshots in src/data' };
  return { windows: [builtinWindow()], note: 'built-in 2024-05-20 table (no snapshots yet)' };
}

function readGames(argv: string[]): number {
  const i = argv.indexOf('--games');
  const n = i >= 0 ? Number(argv[i + 1]) : 200;
  return Number.isInteger(n) && n > 0 ? n : 200;
}

const pct = (n: number, of: number): string => `${((n / of) * 100).toFixed(1)}%`;
const games = readGames(process.argv.slice(2));
const { windows, note } = loadWindows();
const lines = [
  `Bot report: ${games} games per strategy per window, data: ${note}`,
  '',
  '| Window | Strategy | Win | Legend | Avg sols | Top loss reasons | Hard-choice days |',
  '|---|---|---|---|---|---|---|',
];

for (const win of windows) {
  for (const [name, strategy] of Object.entries(strategies)) {
    let wins = 0;
    let legends = 0;
    let sols = 0;
    let hardDays = 0;
    const causes = new Map<string, number>();
    for (let seed = 1; seed <= games; seed++) {
      const rng = createRng(seed);
      const botRng = createRng(seed ^ 0x9e3779b9);
      let state = createInitialState(seed, win);
      let steps = 0;
      while (state.phase === 'playing' && steps++ < MAX_STEPS) {
        const action = strategy(state, win, botRng);
        const valid = check(state, action, win) === null;
        state = reduce(state, valid ? action : { type: 'endSol', crewId: 0 }, rng, win);
      }
      if (state.phase === 'won') wins += 1;
      if (state.result === 'legend') legends += 1;
      const cause = state.phase === 'lost' ? (state.lossReason ?? 'lost') : 'stuck';
      if (state.phase !== 'won') causes.set(cause, (causes.get(cause) ?? 0) + 1);
      // Sols survived = sols fully completed (a lost sol does not count).
      sols += state.phase === 'won' ? state.sol : state.sol - 1;
      hardDays += state.log.filter((l) => l.urgent.length >= BALANCE.advisor.hardChoiceNeeds).length;
    }
    const top = [...causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const failures = top.length ? top.map(([c, n]) => `${c} ${pct(n, games)}`).join(', ') : 'none';
    lines.push(
      `| ${win.id} | ${name} | ${pct(wins, games)} | ${pct(legends, games)} | ` +
        `${(sols / games).toFixed(1)} | ${failures} | ${(hardDays / games).toFixed(1)} |`,
    );
  }
}

lines.push('', 'Hard-choice day = a sol that starts with two or more urgent needs at once.');
process.stdout.write(`${lines.join('\n')}\n`);
