// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Debug helper: prints one bot game sol by sol. Usage: node tools/bot/trace.ts balanced w1 3
import { readFileSync } from 'node:fs';
import { reduce } from '../../src/sim/reducer.ts';
import { createRng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import { createInitialState } from '../../src/sim/state.ts';
import { buildWindow } from '../../src/sim/window.ts';
import { strategies } from './strategies.ts';

const [name = 'balanced', id = 'w1', seedArg = '1'] = process.argv.slice(2);
const read = (f: string) => JSON.parse(readFileSync(new URL(`../../src/data/${f}`, import.meta.url), 'utf8'));
const win = buildWindow(id, read(`rad-${id}.json`), read(`donki-${id}.json`));
const seed = Number(seedArg);
const rng = createRng(seed);
const botRng = createRng(seed ^ 0x9e3779b9);
const strategy = strategies[name];
if (!strategy) throw new Error(`unknown strategy ${name}`);
let state = createInitialState(seed, win);
let steps = 0;
while (state.phase === 'playing' && steps++ < 5000) {
  const action = strategy(state, win, botRng);
  state = reduce(state, check(state, action, win) === null ? action : { type: 'endSol', crewId: 0 }, rng, win);
}
for (const l of state.log) {
  const f = (n: number) => n.toFixed(0);
  process.stdout.write(
    `sol ${l.sol}: P${f(l.power)} A${f(l.air)} F${f(l.food)} D${f(l.dose)} | ${l.actions.join(',')} | ${l.flags.join(',')}\n`,
  );
}
process.stdout.write(`${state.phase} ${state.lossReason ?? state.result} broken=${state.broken}\n`);
