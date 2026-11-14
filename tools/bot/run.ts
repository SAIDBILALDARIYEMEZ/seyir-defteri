// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// Headless playtest bot. Usage: npm run bot -- --games 200
// Runs the pure sim with no rendering. Never touches player saves.

import { reduce } from '../../src/sim/reducer.ts';
import { createRng } from '../../src/sim/rng.ts';
import { createInitialState } from '../../src/sim/state.ts';
import { strategies } from './strategies.ts';

const MAX_STEPS = 10_000;

function readGames(argv: string[]): number {
  const i = argv.indexOf('--games');
  const n = i >= 0 ? Number(argv[i + 1]) : 200;
  return Number.isInteger(n) && n > 0 ? n : 200;
}

const games = readGames(process.argv.slice(2));
const rows: string[] = [];

for (const [name, strategy] of Object.entries(strategies)) {
  let wins = 0;
  let solsTotal = 0;
  const causes = new Map<string, number>();
  for (let seed = 1; seed <= games; seed++) {
    const rng = createRng(seed);
    const botRng = createRng(seed ^ 0x9e3779b9);
    let state = createInitialState(seed);
    let steps = 0;
    while (state.phase === 'playing' && steps++ < MAX_STEPS) {
      state = reduce(state, strategy(state, botRng), rng);
    }
    if (state.phase === 'won') wins += 1;
    else {
      const cause = state.phase === 'lost' ? 'lost' : 'stuck';
      causes.set(cause, (causes.get(cause) ?? 0) + 1);
    }
    solsTotal += state.sol;
  }
  const top = [...causes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const failures = top.length ? top.map(([c, n]) => `${c} x${n}`).join(', ') : 'none';
  rows.push(
    `${name.padEnd(16)} win ${((wins / games) * 100).toFixed(1).padStart(5)}%  ` +
      `avg sols ${(solsTotal / games).toFixed(1).padStart(4)}  top failures: ${failures}`,
  );
}

process.stdout.write(`Bot report (${games} games per strategy, placeholder sim)\n${rows.join('\n')}\n`);
