// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Balance probe: final dose and science of winning games, per strategy and window.
// Usage: node tools/bot/probe.ts   (helps to pick the Legend limits in balance.ts)

import { readFileSync } from 'node:fs';
import { reduce } from '../../src/sim/reducer.ts';
import { createRng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import { createInitialState } from '../../src/sim/state.ts';
import { buildWindow } from '../../src/sim/window.ts';
import { strategies } from './strategies.ts';

const GAMES = 200;
const THRESHOLDS = [56, 58, 60, 61, 62, 63, 64, 66, 68];
const read = (name: string): never =>
  JSON.parse(readFileSync(new URL(`../../src/data/${name}`, import.meta.url), 'utf8')) as never;
const quantiles = (values: number[]): string => {
  const v = [...values].sort((a, b) => a - b);
  const at = (p: number): string => (v[Math.floor((v.length - 1) * p)] ?? 0).toFixed(0);
  return v.length ? `${at(0)}/${at(0.25)}/${at(0.5)}/${at(0.75)}/${at(1)}` : '-';
};

const lines = ['window strategy wins | dose min/q1/med/q3/max | science min/q1/med/q3/max | rescue done'];
for (const id of ['w1', 'w2', 'w3']) {
  const win = buildWindow(id, read(`rad-${id}.json`), read(`donki-${id}.json`));
  for (const [name, strategy] of Object.entries(strategies)) {
    const dose: number[] = [];
    const science: number[] = [];
    let rescued = 0;
    for (let seed = 1; seed <= GAMES; seed++) {
      const rng = createRng(seed);
      const botRng = createRng(seed ^ 0x9e3779b9);
      let state = createInitialState(seed, win);
      for (let i = 0; state.phase === 'playing' && i < 5000; i++) {
        const action = strategy(state, win, botRng);
        const ok = check(state, action, win) === null;
        state = reduce(state, ok ? action : { type: 'endSol', crewId: 0 }, rng, win);
      }
      if (state.phase !== 'won') continue;
      dose.push(state.dose);
      science.push(state.science);
      if (state.result !== 'hardRescue') rescued += 1;
    }
    lines.push(`${id} ${name} ${dose.length} | ${quantiles(dose)} | ${quantiles(science)} | ${rescued}`);
    const share = (t: number): string => ((science.filter((v) => v >= t).length / GAMES) * 100).toFixed(0);
    lines.push(`   wins with science >= ${THRESHOLDS.join('/')}: ${THRESHOLDS.map(share).join('/')} % of games`);
  }
}
process.stdout.write(`${lines.join('\n')}\n`);
