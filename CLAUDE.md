# Seyir Defteri: Son 30 Sol

> A browser game for ages 7-12: keep a Mars base alive for 30 sols while making real mission
> trade-offs (power, life support, radiation shelter, food, comms delay), driven by real NASA data.
> Browser game: Vite + TypeScript (strict) + three.js. Static hosting on GitHub Pages.
> NASA Space Apps 2026, solo team "Seyir Defteri", challenge "Build a Junior Astronaut Mission Trainer".

Play: https://saidbilaldariyemez.github.io/seyir-defteri/

## Read order (source of truth)

1. This file: **how** we build. Read before every task.
2. `docs/PRD-final.md`: **what** we build. All numbers there are starting values for `balance.ts`.
3. `docs/decisions.md`: D-002 lists the PRD revisions R1-R12 (real-data findings). **Where the
   PRD and the revisions disagree, the revisions win.** D-004 lists scope additions A1-A4 /
   backups B1-B3 / do-not-build list.
4. `docs/ARASTIRMA-veri.md` and `docs/RAKIP-ANALIZI.md` are local-only working notes
   (gitignored, D-003). Read them if present; the decisions log carries what the repo needs.

Do not change game design (story, rules, screens). If a change is needed, write it in
`docs/decisions.md` and ask the human. Work phase by phase (PRD §20); never start the next
phase without the human's approval.

## AI-First Development

- Follow existing patterns; copy the nearest working example.
- **Read only what you need.** Don't explore the whole repo for small tasks.
- **Placeholders first:** build mechanics with primitive shapes, swap in real models after the
  mechanic works. Models wait in `~/Projects/hackathon-assets/`; do not copy until told.
- **After every feature:** `npm run build` + `npm test` + `npm run bot` (if sim changed). Fix
  before moving on.
- **Visual check:** screenshot the running game (without `?debug`) after visual changes and
  inspect it before claiming done.
- **Debug panel** (`?debug`): skip time, set resources, trigger any event, show FPS.
- Architecture choices go to `docs/decisions.md`. Don't silently re-litigate.
- After every phase: build + test + bot + screenshot + commit + `npm run deploy`.
- Maintain **Lessons Learned** at the bottom of this file; read it every session.
- Keep `AGENTS.md` identical to this file.

## Hard Rules

1. **500-line rule.** No source file over 500 lines; aim for 200-300. UI/scene modules max 300.
2. **English code.** Names, comments, docs in English. **All player-facing text comes from
   `src/i18n/{tr,en}.json`**, never hardcoded. Default language: EN (any browser); TR is chosen in settings (D-010).
3. **Simulation is pure.** `src/sim/` never imports three.js, DOM or `Math.random`. It is
   `(state, action, rng) -> newState`. Relative imports use the `.ts` extension so the bot
   runs under plain Node.
4. **Seeded randomness.** One seedable RNG passed into the sim. Same seed -> same game.
5. **Balance numbers live in one file:** `src/config/balance.ts`. No magic numbers elsewhere.
   Balance changes only there, then re-run the bot.
6. **Content is data.** Events, missions, dialogue, tutorial steps -> JSON in `src/content/`.
7. **Data honesty.** Real-world data is stored as snapshots in `src/data/` with `source`,
   `url`, `fetchedAt`, `license`. Live fetches go through `src/adapters/` with a 6 s timeout
   and snapshot fallback. Badge is LIVE or SAVED + date; **never label a snapshot as live**.
   Mars dose comes only from the RAD curve; game simplifications are labeled as such. No
   invented number is ever shown as NASA data.
8. **Every asset and data source is logged** in `docs/asset-sources.md` /
   `docs/data-sources.md` (name, URL, author, license). Prefer CC0. Shown in in-game Credits.
9. **No secrets.** Browser keys are public: `src/config/env.ts`, marked public, free keys only.
   Never use `DEMO_KEY`.
10. **No new dependencies** without a `docs/decisions.md` entry.
11. **No `console.log` in commits.** Use `debug()` from `src/lib/debug.ts` (`?debug` only).
12. **Performance budget:** 60 fps on a mid laptop, playable on a ~1024 px tablet. Low-poly
    models, textures <= 1024 px, total `dist/` <= 40 MB. Link to playable in ~3 seconds.
13. **Space Apps rules.** Every code file starts with the SI-assistance note (copy from any
    existing file). No AI-generated images, video or audio. No NASA logo, flag or mission
    patch anywhere. Agency names appear only as data sources, never in slogans. No quizzes.
14. **Kid-safe.** Plain language, no death, blood or fear. Failure is "Early Evacuation".

## Structure

```
src/
├── main.ts              # Boot: create sim -> mount scene + UI
├── sim/                 # PURE game logic (state, actions, reducer, rng, systems/)
├── scene/               # three.js: reads GameState, never mutates it (world, entities/, fx/, cutscenes/)
├── ui/                  # DOM overlay: HUD, dialogs, menus, debug panel
├── input/               # Pointer/keyboard/touch -> actions
├── adapters/            # External data (live fetch + snapshot fallback)
├── content/             # JSON content (events, missions, dialogue)
├── data/                # Real-world data snapshots (+ source + date)
├── i18n/                # tr.json, en.json, i18n.ts
├── config/              # balance.ts, env.ts
├── save/                # Versioned save/load
└── lib/                 # debug.ts, helpers
public/assets/{models,audio,textures,ui}/
tools/bot/               # Headless playtest bot (run.ts, strategies.ts)
tools/deploy.sh          # dist/ -> gh-pages branch
docs/                    # PRD-final.md, decisions.md, asset-sources.md, data-sources.md
```

**Flow:** `input -> action -> sim reducer -> new state -> scene + UI render it`.
Crew is an array in `GameState`; every action carries a `crewId` (model ready for 7 crew).

## Commands

```
npm run dev       # Vite dev server
npm run build     # Type-check + production build into dist/
npm run preview   # Serve dist/ locally
npm test          # Vitest (sim + adapters)
npm run bot       # Headless playtest bot (-- --games 200)
node tools/data/fetch.mjs   # Refresh the real-data snapshots in src/data/
npm run deploy    # Build, then publish dist/ to the gh-pages branch
```

## Lessons Learned

> AI agents MUST read this every session and add new entries.

- The `gh` token has no `workflow` scope, so GitHub Actions files cannot be pushed. Deploy
  is `npm run deploy` (pushes `dist/` to `gh-pages`), not an Actions workflow.
- Pages can serve a cached build for a minute or two after deploy: hard-reload (Cmd+Shift+R)
  and test with a fresh game.
- The sim takes the window data as a 4th argument: `reduce(state, action, rng, window)`.
  Tests use `builtinWindow()` (stable numbers); the bot and the game use the snapshots.
- DONKI lists no SEP on 2024-05-20: the big Mars event is only in the RAD curve. Warnings
  therefore use DONKI SEP days plus RAD-measured event days (D-006).
- DONKI `notifications?type=FLR` gives the alert threshold crossed, not the flare class.
- The dose gauge is **storm dose**: only the RAD rate above the month's median counts, at
  24.5 uGy per point, budget 45 (D-008). Never describe it to players as total radiation.
- `node tools/bot/probe.ts` prints dose / science spreads of winning games: use it before
  touching the Legend limits.
- Browser-pane clicks use the screenshot's coordinate frame (800x600 for a 1024x768 viewport),
  not CSS pixels: take a full screenshot first and click what you see there.
- Station picking raycasts real meshes only. Do not add invisible hit volumes: they overlapped
  and sent Ada to the wrong station (D-010).
- The base starts with dusty panels (`panel.initial` 0.7): with clean panels the sim refuses
  "clean" until sol 3 and the sol-1 tutorial step is impossible (D-011).
- The daily tasks come from `src/content/missions.json` in priority order; the watch, the
  PUSULA robot and the bot's `pusula` strategy share them. After any edit: `npm run bot`
  and read the pusula rows (target >= 80% wins).
- Sim files import JSON with `with { type: 'json' }` so the bot runs under plain Node.
- The browser pane pauses `requestAnimationFrame` while a script awaits: drive walks with
  real waits between calls, not with one long script.
- After the first "New Mission" the pane's localStorage marks the device as played and later
  games get a random seed and window: test with `?seed=20240520` for a repeatable game.
