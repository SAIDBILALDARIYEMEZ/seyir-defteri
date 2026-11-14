// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Which morning tasks does a strategy leave undone? Usage: node tools/bot/missed.ts balanced w1
import { readFileSync } from 'node:fs';
import { reduce } from '../../src/sim/reducer.ts';
import { createRng } from '../../src/sim/rng.ts';
import { check } from '../../src/sim/rules.ts';
import { createInitialState } from '../../src/sim/state.ts';
import { buildWindow } from '../../src/sim/window.ts';
import { strategies } from './strategies.ts';

const [name = 'balanced', id = 'w1'] = process.argv.slice(2);
const read = (f: string): unknown => JSON.parse(readFileSync(new URL(`../../src/data/${f}`, import.meta.url), 'utf8'));
const win = buildWindow(id, read(`rad-${id}.json`) as never, read(`donki-${id}.json`) as never);
const strategy = strategies[name as keyof typeof strategies];
if (!strategy) throw new Error(`unknown strategy ${name}`);
const missed = new Map<string, number>();
for (let seed = 1; seed <= 200; seed++) {
  const rng = createRng(seed);
  const botRng = createRng(seed ^ 0x9e3779b9);
  let s = createInitialState(seed, win);
  for (let i = 0; i < 2000 && s.phase === 'playing'; i++) {
    const a = strategy(s, win, botRng);
    s = reduce(s, check(s, a, win) === null ? a : { type: 'endSol', crewId: 0 }, rng, win);
  }
  for (const l of s.log) for (const w of l.missed ?? []) missed.set(w, (missed.get(w) ?? 0) + 1);
}
process.stdout.write(`${name} ${id}: missed tasks over 200 games (per game)\n`);
for (const [w, n] of [...missed].sort((a, b) => b[1] - a[1])) process.stdout.write(`  ${w}: ${(n / 200).toFixed(2)}\n`);
