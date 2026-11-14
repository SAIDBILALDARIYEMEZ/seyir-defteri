# Browser Game Bootstrap Kit

> **Purpose:** Read by an AI coding agent (Claude Code etc.) at the start of a brand-new
> **browser game** project. The agent uses it to scaffold the repository: folder structure,
> `CLAUDE.md`, decision log, asset/data source logs, scripts, a headless playtest bot and
> baseline conventions.
>
> Sibling of `BOOTSTRAP.md` (SaaS kit). Same philosophy: **only generic engineering
> conventions** — no game design, story, names or content. Those live in the project's own
> `docs/prd.md`, written by the human.

---

## How To Use This Document (agent instructions)

1. **Read this document fully** before touching the filesystem.
2. **Ask the kickoff questions** (one round only). Do not scaffold before answers.
3. **Scaffold** the layout below.
4. **Generate the documents** from the templates, filling placeholders.
5. **Verify** with the checklist at the end.
6. **First commit = scaffold only.** No gameplay code in commit #1.

After day zero, the generated `CLAUDE.md` (not this kit) is the source of truth.

---

## Kickoff Questions

1. **Project name** and one-line description?
2. **Rendering:** 3D (three.js) or 2D (canvas/DOM)? Camera style (orbit / isometric /
   third-person)?
3. **UI languages:** default Turkish + English toggle? (Code is always English.)
4. **Hosting:** GitHub Pages (default), itch.io, own server? Base path?
5. **External data:** any live APIs? (Always paired with an embedded snapshot fallback.)
6. **Multiplayer later?** If yes, state is designed for N players from day one
   (no networking code now).
7. **Time profile:** hackathon (≤ 48 h) or long-term? Hackathon → apply the
   **Hackathon Profile** at the bottom.

"Not sure yet" → pick the simplest option, record it in `docs/decisions.md`, move on.

---

## Default Tech Stack

Do not deviate without a decision-log entry.

| Concern        | Choice                                   | Notes |
|----------------|------------------------------------------|-------|
| Build/dev      | Vite                                     | Static output in `dist/` |
| Language       | TypeScript (strict)                      | |
| 3D             | three.js (+ `GLTFLoader`, `OrbitControls` from `three/examples`) | GLB assets only |
| UI             | Plain DOM + CSS overlay on top of canvas | No React unless a decision entry justifies it |
| Audio          | Web Audio API (native)                   | SFX may be synthesized in code |
| Tests          | Vitest                                   | Simulation + bot run headless |
| Save           | `localStorage` (wrapped in try/catch)    | Versioned save schema |
| Deploy         | GitHub Pages (Actions) or `gh-pages`     | itch.io = zip of `dist/` |

**Not on day zero:** physics engines, ECS frameworks, state libraries, networking,
post-processing stacks. Add only with a decision entry.

---

## Hard Rules (go into every generated CLAUDE.md)

1. **500-line rule.** No source file over 500 lines; aim for 200–300. UI/scene modules
   max 300. Split by concern when exceeded.
2. **English code.** Names, comments, docs in English. **All player-facing text comes
   from `src/i18n/{lang}.json`** — never hardcoded in code.
3. **Simulation is pure.** `src/sim/` never imports three.js, DOM or `Math.random`
   directly. It takes `(state, action, rng) → newState`. This is what makes the
   headless bot, save/load and future multiplayer possible.
4. **Seeded randomness.** One seedable RNG passed into the sim. Same seed → same game.
5. **Balance numbers live in one file:** `src/config/balance.ts`. No magic numbers in
   sim or UI.
6. **Content is data.** Events, missions, dialogue, tutorial steps → JSON in
   `src/content/`. Code interprets content; it doesn't contain it.
7. **Data honesty.** Real-world data is stored as snapshots in `src/data/` with source
   URL and fetch date. Live fetches go through `src/adapters/` with timeout + fallback
   to the snapshot. **Never label snapshot data as live** in the UI.
8. **Every asset and data source is logged** in `docs/asset-sources.md` /
   `docs/data-sources.md` (name, URL, author, license). Prefer CC0. Shown in an
   in-game Credits screen.
9. **No secrets.** Any API key shipped to the browser is public by definition — put it
   in `src/config/env.ts`, mark it as public, use only free/limited keys.
10. **No new dependencies** without a `docs/decisions.md` entry.
11. **No `console.log` in commits.** Use `debug()` from `src/lib/debug.ts` (active only
    with `?debug` in the URL).
12. **Performance budget:** 60 fps on a mid laptop, playable on a tablet. Low-poly
    models, textures ≤ 1024 px, total `dist/` ≤ 40 MB.

---

## Architecture

```
src/
├── main.ts              # Boot: load assets → create sim → mount scene + UI
├── sim/                 # PURE game logic (no three.js, no DOM)
│   ├── state.ts         # GameState type + createInitialState(seed, players)
│   ├── actions.ts       # Action union type (every player intent is an action)
│   ├── reducer.ts       # (state, action, rng) → state
│   ├── systems/         # One file per system (resources, time, events, ...)
│   └── rng.ts           # Seedable RNG
├── scene/               # three.js: reads GameState, never mutates it
│   ├── world.ts         # Renderer, camera, lights, terrain
│   ├── entities/        # One file per visual entity type
│   ├── fx/              # Particles, weather, screen shake
│   └── cutscenes/       # Scripted camera sequences (skippable)
├── ui/                  # DOM overlay: HUD, dialogs, menus, settings, credits
├── input/               # Pointer/keyboard/touch → actions
├── adapters/            # External data (live fetch + snapshot fallback)
├── content/             # JSON content (events, missions, dialogue)
├── data/                # Real-world data snapshots (+ source + date)
├── i18n/                # tr.json, en.json, i18n.ts
├── config/              # balance.ts, env.ts
├── save/                # Versioned save/load
└── lib/                 # debug.ts, math, helpers
public/assets/{models,audio,textures,ui}/
tools/bot/               # Headless playtest bot
docs/                    # prd.md, decisions.md, asset-sources.md, data-sources.md
```

**Flow:** `input → action → sim reducer → new state → scene + UI render it`.

**Multiplayer-ready state (if kickoff Q6 = yes):** players/crew are an array in
`GameState`; every action carries a `playerId`; the reducer never assumes one player.
No networking code until a decision entry says so.

---

## AI Working Rules (root CLAUDE.md)

- `CLAUDE.md` is the primary source of truth. Read it before every task.
- `docs/prd.md` defines **what** to build; this structure defines **how**.
- Follow existing patterns; copy the nearest working example.
- **Read only what you need.** Don't explore the whole repo for small tasks.
- **Placeholders first:** build mechanics with primitive shapes (boxes, spheres), swap
  in real models after the mechanic works.
- **After every feature:** `npm run build` + `npm test` + `npm run bot` (if sim
  changed). Fix before moving on.
- **Visual check:** take a screenshot of the running game after visual changes and
  inspect it before claiming done.
- **Debug panel** (`?debug`): skip time, set resources, trigger any event, show FPS.
  Built early — it saves hours.
- Architecture choices → `docs/decisions.md`. Don't silently re-litigate.
- Maintain **Lessons Learned** at the bottom of `CLAUDE.md`; read every session.

---

## Headless Playtest Bot (`tools/bot/`)

Runs the pure sim without rendering, many times, with simple strategies.

- Strategies: `random`, `greedy` (always fixes the lowest resource), `balanced`.
- `npm run bot -- --games 200` → prints per strategy: win rate, average days survived,
  top 3 failure causes.
- Target bands are written in `docs/prd.md` (e.g. random loses most games, balanced
  wins most). Balance changes go in `balance.ts` only, then re-run the bot.
- Bot results never overwrite player records.

---

## Scripts (`package.json`)

```
npm run dev       # Vite dev server
npm run build     # Type-check + production build into dist/
npm run preview   # Serve dist/ locally
npm test          # Vitest (sim + adapters)
npm run bot       # Headless playtest bot
npm run deploy    # Publish dist/ to GitHub Pages
```

---

## Documents To Generate

### 1. Root `CLAUDE.md`

````markdown
# {project-name}

> {one-line description}
> Browser game: Vite + TypeScript + {three.js | canvas}. Static hosting on {host}.

## AI-First Development
(paste AI Working Rules above)

## Hard Rules
(paste Hard Rules above, adapted)

## Structure
(paste Architecture tree, trimmed to what exists)

## Commands
(paste Scripts)

## Lessons Learned
> AI agents MUST read this every session and add new entries.
- (empty)
````

### 2. `AGENTS.md` — mirror of `CLAUDE.md`, kept in sync.

### 3. `docs/decisions.md` (ADR-lite)

```markdown
# Decisions
> Append-only. Newest at the bottom.

## D-001 — {date} — Kickoff choices
**Decision:** ...  **Why:** ...  **Alternatives:** ...
```

### 4. `docs/asset-sources.md`

| Asset | File | Author | Source URL | License | Notes |
|-------|------|--------|------------|---------|-------|

### 5. `docs/data-sources.md`

| Dataset | Used for | Source URL | Snapshot date | Live? | Notes |
|---------|----------|------------|---------------|-------|-------|

### 6. `docs/prd.md` — empty template with headings: Goal, Audience, Core Loop,
Resources, Events, Win/Lose, Screens, Data Sources, Acceptance Criteria, Bot Target Bands.
**The human fills it. The agent never invents game design here.**

### 7. `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev)", "Bash(npm run build)", "Bash(npm test:*)",
      "Bash(npm run bot:*)", "Bash(npm run preview)", "Bash(npx tsc:*)"
    ]
  }
}
```

### 8. `README.md` — play link, short description, controls, credits pointer, license.

### 9. `LICENSE` — MIT (unless decided otherwise).

---

## Hackathon Profile (kickoff Q7 = hackathon)

- **Start clean:** create the repo and make the scaffold commit at the official start
  time. No code from before the event.
- **Public repo** from the first commit; MIT license.
- **Order of work:** core loop with placeholders → playable end-to-end → real data →
  real models → juice (sound, shake, particles) → tutorial → polish. A playable ugly
  game beats a beautiful unfinished one.
- **Deploy early:** first public build by the end of day 1; redeploy after every
  milestone.
- **Credits & data screen** in-game, generated from `docs/*-sources.md`.
- **Feature freeze** a few hours before the deadline: only fixes, demo video,
  submission text.

---

## Verification Checklist (before the first commit)

- [ ] `npm install && npm run dev` shows a placeholder scene with no console errors.
- [ ] `npm run build` succeeds; `dist/` stays out of git.
- [ ] `npm test` passes (one placeholder sim test is fine).
- [ ] `npm run bot -- --games 10` runs against the placeholder sim.
- [ ] `?debug` shows the debug panel.
- [ ] Language toggle switches a placeholder string TR ↔ EN.
- [ ] All docs generated and consistent; `.gitignore` covers `node_modules`, `dist`,
      `.env*`, `.claude/settings.local.json`.
- [ ] `git init`, first commit made.
