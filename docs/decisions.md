# Decisions
> Append-only. Newest at the bottom.

## D-001 — 2026-11-14 — Kickoff choices
**Decision:** The kickoff questions of `GAME_BOOTSTRAP.md` are answered by the PRD, so no
question round was held.
- Name: "Seyir Defteri: Son 30 Sol". Repo `seyir-defteri`.
- Rendering: 3D, three.js. Camera slightly from above, limited rotate/zoom.
- UI languages: TR + EN. Default TR for a Turkish browser, otherwise EN.
- Hosting: GitHub Pages, project path `/seyir-defteri/`. Vite `base: './'` so the same build
  also works from a zip (itch.io).
- External data: NASA DONKI live card with snapshot fallback; everything else is snapshots.
- Multiplayer: not now. State is crew-array based and every action carries `crewId`.
- Time profile: hackathon. Hackathon Profile applies. License MIT, public repo.
**Why:** PRD §3, §7, §14-§17. **Alternatives:** none considered; these are the human's choices.

## D-002 — 2026-11-14 — PRD revisions from the real-data research (R1-R12)
**Decision:** These override `docs/PRD-final.md` wherever they disagree.

| # | PRD place | Change |
|---|---|---|
| R1 | §10 windows | Drop "October 2024" (no Mars RAD data after 2024-06-03). Window 2 = **September 2017**. Window 3 = **March 2023, "Hit Earth, not Mars"**. Backups: February 2022, June 2015 |
| R2 | §6.1 | Quiet dose rate is about **4 uGy/h** in 2024 (1 dose point is about 100 uGy); other windows use that month's real RAD median. Event curves come from RAD, one file per window: `src/data/rad-{window}.json`. The 64-point target for 2024-05-20 is re-normalized from the curve |
| R3 | §9 events | Mars dose comes **from RAD**, not DONKI. DONKI events drive warnings and story. After an event: an "at Earth / on Mars" two-line card |
| R4 | §10.1, §16 | DONKI `FLR` endpoint is broken (404): use `notifications?type=FLR`. Never use the CCMC `kauai` host. Own API key in `src/config/env.ts` |
| R5 | info cards | New card: "When the Sun is quiet, cosmic rays increase" (real RAD medians: 2019 9.1, 2015 6.1, 2023 5.7, 2024 about 4 uGy/h) |
| R6 | §14 intro | Real Mars globe from Mars Trek tiles zooming to Gale Crater. Only if time remains (part of B1) |
| R7 | Curiosity spot | "Read the measurement" card shows a real Curiosity/Gale photo from the NASA Image and Video Library (saved URL + credit). Mars Rover Photos API is archived: not used |
| R8 | info cards | Two OSDR-sourced cards: OSD-268 (lettuce grown on the ISS), OSD-984 (low-dose simulated cosmic radiation). State only the study topic + OSD number; never invent results |
| R9 | §17 SI statement | "The game concept, story and characters were created by the team. Anthropic's Claude was used as a coding assistant (writing and testing code), for researching NASA data sources and for proofreading English text. All code files carry an SI-assistance note." |
| R10 | Sources screen | "For teachers" box + CSA sources + a Turkish Space Agency source if a fitting one is found |
| R11 | README | "NASA Data & Why" table |
| R12 | §18 Coming soon | Moon preview uses real CRaTER (LRO) data: peak 3,152 uGy/h in May 2024, 22,969 uGy/h in September 2017 |

**Number caution:** the hourly RAD curve for 2024-05-20 sums to roughly 1,700 uGy above
background. The NASA/JPL news figure "8,100 uGy" is a different calculation. Dose math uses
only the RadLab curve; 8,100 appears only as a quoted NASA statement on its own card.
Roughly 40% of the event dose arrives in the first 4 hours and 60% in the first 8.
**Why:** every endpoint was tested from a browser on 2026-11-14; details in
`docs/data-sources.md`. **Unchanged:** single astronaut, 3 gauge groups, shelter trade-off,
tutorial, PUSULA, phase plan.

## D-003 — 2026-11-14 — Which planning docs are public
**Decision:** `docs/PRD-final.md` and `docs/GAME_BOOTSTRAP.md` are committed.
`docs/ARASTIRMA-veri.md` (research log) and `docs/RAKIP-ANALIZI.md` (notes on other teams)
stay local via `.gitignore` until the human decides otherwise. What the repo needs from them
is carried by D-002, D-004 and `docs/data-sources.md`.
**Why:** the repo is public from commit #1 and publishing cannot be undone; notes that name
other teams are not ours to publish by default. **Alternatives:** commit everything (one
line in `.gitignore` to change).
The PRD keeps its file name `PRD-final.md` (the kit's `docs/prd.md`) so existing references work.

## D-004 — 2026-11-14 — Scope additions from the competitor review
**Add (F3-F4):**
- A1 **Commander's Logbook**: the sim writes one line per sol; the result screen shows it as
  a logbook page, printable / downloadable as PNG.
- A2 **Message journey animation**: small solar-system map on the antenna message with that
  day's real Earth-Mars positions, a light dot travelling, and the delay counter.
- A3 **Mission code (class mode)**: 6-character code = seed + window; same code, same storms.
- A4 **Accessibility settings**: large text, sound off, color-blind friendly icons (color + shape).
- Tagline "Real storms. Real choices." / "Every storm in this game really happened." (menu
  subtitle, demo last frame, summary first line). No agency names in slogans.
- "Trace the data" button on event cards: source, date, original curve.
- README: bot table proving no strategy wins for free. "For teachers" box in Sources.

**Backup, in this order, only after the core is done:** B1 landing intro (~15 s, skippable;
static Mars globe + text if no time), B2 window 4 (February 2022, only if its source is
confirmed), B3 Moon preview screen (CRaTER data).

**Do not build:** launch/orbit mini-game, quizzes and badge hunts, terrain exploration or
rover driving, multiplayer and pod wake-up (stay "Coming soon"), many small tools/calculators.
**Why:** depth over breadth for a solo team; our edge is "decision -> consequence" on real data.

## D-005 — 2026-11-14 — Tooling choices in the scaffold
- **Bot runs with plain Node** (`node tools/bot/run.ts`, Node >= 22.18 type stripping). No
  extra runner dependency. Consequence: relative imports carry the `.ts` extension and only
  erasable TS syntax is used (`erasableSyntaxOnly`: no enums, no parameter properties).
- **Deploy = `tools/deploy.sh`** pushing `dist/` to the `gh-pages` branch. No `gh-pages`
  npm dependency, and no Actions workflow because the CLI token lacks the `workflow` scope.
- **Dependencies:** `three`; dev: `vite`, `typescript`, `vitest`, `@types/three`, `@types/node`.
- **SI note** is a two-line header in every code file; JSON files are covered by the README.
