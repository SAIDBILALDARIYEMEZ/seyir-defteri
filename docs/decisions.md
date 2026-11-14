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

## D-006 — 2026-11-14 — F1 simulation choices (first pass, not balance-tuned)
- **Dose math is the RadLab curve only:** dose points = uGy / 100 (R2). Result with the real
  snapshots: 2024-05-20 is about **16 points unshielded** (11 behind the habitat shield, 6 with
  4 h in a level-3 shelter), not 64. A whole month unshielded is 49 (w1), 58 (w2), 41 (w3)
  points, so the 100-point budget cannot be reached. **Open, needs the human:** see D-007.
- **Clock:** one sol = one UTC calendar day of the window; work is 05:00-15:00 UTC (10 h), the
  other 14 h are spent in the habitat (habitat shield). Labeled as a game simplification.
  March 2023 uses its first 30 days.
- **Warnings = DONKI SEP days plus days RAD itself measured an event at Mars.** DONKI has no
  SEP entry on 2024-05-19..21 (its SEP days in window 1 are May 9, 10, 11, 13), so a
  DONKI-only rule would leave the real Mars event without a warning. Lead time stays 1 sol /
  3 sols with the antenna. The warning lead itself is a game simplification.
- **Radiation event hour** = RAD hourly mean >= 2 x the month median (`eventRateFactor`).
  "Wait in shelter" is enabled on warned days and during event hours.
- **Random events are rolled once from the seed** into `state.schedule` (1-2 dust storms,
  2 malfunctions), so "Replay yesterday" sees the same events. The reducer is
  `reduce(state, action, rng, window)`: window data is passed in, not stored in the state.
- **Small rules the PRD leaves open:** Curiosity reading and rock scan once per sol; walking
  0.5 h (1 h to or from the Curiosity / science spots), crew starts each sol at the habitat;
  broken panels give no power; a neglected greenhouse gives 1.5 food; only the first antenna
  message advances the rescue chain, later replies are `forecast` / `advice` codes.
- **Hard-choice day (bot metric)** = a sol that starts with two or more urgent needs
  (thresholds in `BALANCE.advisor`).
- **RAD gaps** (12 h in w2, some in w3) are filled with the month median when a window is built.
- **DONKI flare notifications** carry the alert threshold that was crossed (for example M5.0),
  not the final flare class; the snapshot field is named `threshold` for that reason.
- No endpoint failed on 2026-11-14; all six snapshot files were written.

## D-007 — 2026-11-14 — OPEN: radiation is not yet a real threat (human decision needed)
First bot report (200 games x 7 strategies x 3 windows, no tuning): no game is ever lost to
dose, every win is a "Legend" win, `never-shelter` wins 91.5%, `always-shelter` loses only
through air. The PRD §13 targets for the shelter strategies cannot be met by tuning other
gauges. Options, all inside `balance.ts`: (a) lower `uGyPerPoint` so the same real curve fills
more of the budget, described honestly as "mission dose budget" (for example 25 uGy per point);
(b) lower the budget and the Legend limit; (c) keep the honest scale and make the trade-off
about the Legend limit only. Not decided here: game design belongs to the human.

## D-008 — 2026-11-14 — Radiation scale (resolves D-007; human decisions)
- **Approved as written:** D-006, including warnings = DONKI SEP days plus RAD-measured Mars
  event days.
- **D-007 answer: shrink the scale, keep the real curve.** One linear scale cannot give both
  "2024-05-20 is about 60 points" and "a quiet month stays small": in the real data the event
  sol is 1,582 uGy while a quiet month is 3,341 uGy (5,501 in September 2017). The human chose:
  **the dose budget counts storm dose only**, i.e. the part of the RAD hourly rate above that
  month's RAD median. The curve itself is not reshaped; one constant converts it:
  **1 dose point = 24.5 uGy of storm dose** (`BALANCE.dose.uGyPerPoint`).
  Result: 2024-05-20 (05:00 to 05:00) is 60 points unshielded; the rest of window 1 adds about
  7 points, all of window 2 about 17, all of window 3 about 4.
- **Label duty (Hard Rule 7):** UI must call this the "storm dose budget" and say the everyday
  cosmic-ray background is not counted. The background stays visible as real data (Curiosity
  reading card, R5 info card).
- **Budget lowered from 100 to 45** (`BALANCE.dose.budget`), also the human's choice: with the
  event at 60 points and a 30% habitat shield, a crew that never shelters ends window 1 at
  about 47 points, so a 100-point budget could never be reached. The HUD can show the gauge as
  a share of the budget.
**Why:** data honesty (real curve, one constant) plus a shelter choice that matters.
**Alternatives:** count 25% of the background (two constants, no real basis); keep 100 uGy per
point (event only 15 points, shelter irrelevant); budget 100 with the event at 130 points.

## D-009 — 2026-11-14 — F1b bot tuning result (3 of 6 rounds used, balance.ts only)
Changed: `dose.uGyPerPoint` 100 -> 24.5, `dose.budget` 100 -> 45, `dose.legendMax` 50 -> 20,
`science.legendMin` 8 -> 62 (science is up to 3 per sol, so 8 was met by every win).
Met: never-shelter wins 0% in window 1; balanced wins 82.5 / 86.5 / 91.5%; always-shelter
Legend 0 / 0 / 9.5%; random <= 1%; balanced Legend 26% in window 1.
**Still off target:**
- balanced Legend is 80.5% (w2) and 91.5% (w3): one science limit cannot fit all windows,
  because median science of a balanced win is 60 / 66 / 71 (fewer shelter days = more science)
  and the storm dose in w2 / w3 is far below any limit.
- no-antenna wins more than balanced (95 / 97 / 98.5%). The DONKI warnings on sols 7-11 give
  every strategy time to max the shelter (9 work hours in total) long before sol 18, so the
  longer warning lead changes nothing, while the antenna chain costs 6 work hours.
- greedy is 0% in window 1 (it never shelters), 5% elsewhere; never-shelter still wins 91.5%
  in w2 / w3 (target was only for window 1).
- pusula untouched by request (0% Legend, 53-66% wins) until F3.
These need rule or content changes (not numbers), so they wait for the human.

## D-010 — 2026-11-14 — F2 choices (3D valley, click-to-walk, HUD)
Human decisions:
- **Default language is English** whatever the browser language is; Turkish is chosen in the
  main menu or the pause card (saved in localStorage). Replaces the old "tr browser -> TR" rule.
- **No "Coming soon" buttons or texts**: the main menu has no Moon / Crew buttons; capsules and
  the ship are passive scenery (not clickable). The tagline is the subtitle of the main menu.
- **Landing marker (`beacon`) is a station in the valley** (the sim's rescue chain needs it).
- **Wrist watch tasks** come from the sim's `advise()` and are shown as action names; the
  PUSULA text field is a fixed hint until F3.
- **Walking time is charged with the action**, as the sim does: walking to a station and
  closing the menu costs no time. The menu shows walk + work hours as one number.
- The date badge shows the window's real start date (window 1 starts on 3 May 2024).
Build choices:
- Picking raycasts the stations' own meshes (nearest hit wins); name labels are also buttons,
  so small stations stay easy to tap. Invisible hit cylinders overlapped and were removed.
- Walk animation length = sim walk hours (near 0.5 h / far 1 h) x 2.4 s; layout and camera
  numbers are visual only and live in `src/scene/layout.ts`, not in `balance.ts`.
- Floating numbers show the action's own cost and effect (hours, power, air, food, science,
  shelter level); solar income during the work hours only shows in the HUD.
- Night summary lines use the `balance.ts` night costs plus the sol's log flags; the storm dose
  line is the sol's gain as a share of the budget (label duty from D-008).
- Morning cards (one text + OK): unlocks on sol 3 / 4, new malfunction, dust storm start,
  particle-storm warning, Earth's reply. Result screen is a placeholder card until F4.
- Station -> action lists live in `src/content/stations.json`.
**Known gaps (not built in F2):** opening scene, sound, real models, save / Continue, "end the
day?" confirmation, Replay yesterday button, Info & Sources screen. While the night card is
open the HUD already shows the next morning's numbers.

## D-011 — 2026-11-14 — F3a choices (tutorial, missions, PUSULA, unlocks, event cards)
Human decisions:
- **Night card:** while the night summary is open the HUD keeps the end-of-day values (sol N,
  0 h left, gauges before the night costs); it moves to the morning when the card closes. The
  sim stores those values in the log line (`SolLog.dusk`).
- **New Mission:** the first game on a device is always window 1 with the fixed seed; later
  games use a random seed. `?seed=` / `?w=` still pin both.
Build choices (the first three were confirmed by the human on 2026-11-14):
- **Later games also change the window**: window = seed mod 3. The request only fixed the
  first game; one line in `src/main.ts` if later games should stay on window 1.
- **Panels start dusty** (`BALANCE.panel.initial` = 0.7). The PRD tutorial starts with
  "clean the panel", but with panels at 100% the sim refused it until sol 3. This is the only
  balance value touched in F3a; bot effect is within 2 points for every strategy but pusula.
- **Mission generator** = `src/content/missions.json` (rule order = priority) + named
  conditions in `sim/systems/advisor.ts`; thresholds stay in `balance.ts`. Rules marked
  `spare` (top up air, greenhouse care, message, beacon) are only offered when tonight's
  heating stays paid, and the greenhouse is no longer suggested when the store is almost
  full. The wrist watch, the PUSULA robot and the bot's `pusula` strategy read the same list.
  Result: pusula wins 88.5 / 89.0 / 98.5% (was 53.5 / 60.5 / 66.0%), target >= 80% met.
- **Gradual unlock:** locked stations are faded, not pickable, label shows a lock. Food gauge
  appears on sol 3; storm dose and science on sol 4. One PUSULA sentence per unlock.
- **Tutorial** (sols 1-3) is data in `src/content/tutorial.json`; a step that cannot be done
  right now is skipped, so the arrow never points at a refused action.
- **"Where does this number come from?"** opens on the night card of a storm sol, on the
  next morning's storm report card and from the storm dose info card (curve so far). It is
  not on the warning card itself, because the curve of that sol is not measured yet.
- **Solar flares** (DONKI) are a line on the PUSULA card, not a modal: May 2024 has alerts on
  most days and a card every morning would be noise.
- Debug sol-skip now tops up power, air and food, so a jump reaches the storm sol.
**Not built in F3a:** Replay yesterday button, result screen, save, sound, Sources screen.

## D-012 — 2026-11-14 — F4a choices (rescue chain UI, replay, result, logbook, code, save)
Build choices (not yet confirmed by the human):
- **Radio delay is computed, not fetched** (`src/lib/commsDelay.ts`): Keplerian mean elements
  of Earth and Mars (JPL "Approximate Positions of the Planets") give the distance at noon UTC
  of the sol's real date; delay = distance / speed of light. May 2024 is about 16 minutes. The
  card labels it "computed, approximation". The A2 message-journey map is not built.
- **Coordinates card** shows 4.6° S, 137.4° E (Curiosity's real landing area in Gale Crater)
  and says the rescue landing itself is made up. Value lives in `content/events.json`.
- **Replay yesterday** is offered on the night card and on the result screen (lost games only:
  the sim refuses it after a win). After a loss it returns to the morning of the lost sol, as
  the sim already did; from the night card it returns to the morning of the sol just played.
- **Result screen** reads everything from the sim's log codes: the "choice that made the
  difference" is the sol with the largest storm dose (with the no-shelter comparison), a cold
  night, or how often oxygen / plants were handled; plus the rescue chain line.
- **Logbook lines** are built from `SolLog` codes with i18n text; the PNG is drawn on a 1200 px
  canvas (no library). The logbook also opens from the pause card during a mission.
- **Mission code**: 6 characters, base 32 without 0/O/1/I, value = seed x 3 + window index.
  `?seed=` values are folded into the code range. A code starts a mission directly and does
  not count as the device's "first game".
- **Save**: one slot in localStorage (`saveVersion` 1): autosave every morning, at mission
  start and after a replay; "Save and exit" also stores the running day; "Exit without saving"
  keeps the morning autosave. A finished mission clears the save. "New Mission" asks before
  replacing a save. Debug sol-skips autosave too and show the result screen when they end the
  mission.
- The wrist watch is hidden while the result screen is open.
**Not built in F4a:** sound, real models, live DONKI, opening scene, Sources screen, A2 map,
A4 accessibility settings. `src/game.ts` is 470 lines (limit 500): split before adding more.

## D-013 — 2026-11-14 — B1 build mode (sim + bot only, no UI)
Human decision (Said + mentor): the game moves to a base-building mode. Ready at landing: the
habitat (end the day) and the solar panels. MOXIE, greenhouse, shelter, antenna and landing
marker are placed and built. Curiosity and the science spot stay in the world, ready.
Build choices (not yet confirmed by the human):
- **Status** `locked -> available -> building -> ready` comes from `sim/systems/build.ts`.
  A station's own actions are refused with `notBuilt` / `underConstruction` until it is ready.
  Placing costs `build.placeHours` (1 h) of work + walk, the station's power and parts; it is
  then built over `sols` nights (MOXIE 1, greenhouse 3, shelter 3, antenna 3, marker 2).
- **Unlock chain** (sim rule, codes for i18n): MOXIE from sol 1; greenhouse needs MOXIE ready
  (`needMoxie`); shelter sol >= 4 (`tooEarly`); antenna needs the shelter ready
  (`needShelter`); marker needs the antenna ready (`needAntenna`) and sol >= 15.
- **"Repair the antenna" is gone**: the finished antenna is rescue step 1 (longer warnings,
  messages open). Shelter regolith levels stay a 3 h action with no parts.
- **Grid**: 12 x 12 cells; fixed cells for habitat / panels / Curiosity / science; two craters
  (radius 1); `minGap` 2 cells (Chebyshev). Codes: `cellOutside`, `cellTaken`, `tooClose`,
  `nearCrater`. Positions live in `state.buildings`; `grid.slots` are suggested spots and the
  bot always uses them. All numbers in `balance.ts`.
- **Parts**: one resource, start 18 = the sum of all build costs (3/4/4/4/3), so exploring is
  never required. `bonus` action (+parts, +science, no time) is the hook for B3 crates.
- Malfunctions skip stations that are not built yet.
- **Replay yesterday after a loss** now goes to the morning *before* the lost sol (a loss on
  sol 1 restarts sol 1). From the night card it is unchanged. Tests added.
- `saveVersion` 2: older saves are ignored.
- PUSULA (`missions.json`) and the bot planners build in the order MOXIE, shelter, greenhouse,
  antenna, marker. `never-shelter` still **builds** the shelter (the antenna needs it) but never
  stacks regolith or waits inside. `greedy` builds MOXIE / greenhouse only when that gauge is
  its lowest.
- Curiosity / science keep their sol-4 unlock (HUD shows science from sol 4); open question
  whether "walk there and use it" should mean sol 1.
Bot tuning (4 of 6 rounds): build power 5 each -> balanced 48-56% (air spirals after the
two-day shelter wait); 0 -> 81-89%; 2 -> 64-80%; **1 (kept)** -> 78-87%. Parts and sols were
not the lever; start resources unchanged (MOXIE is ready on sol 2, air 70 lasts 6 sols).
**Still off target** (same as D-009, need rule changes, not numbers):
- `no-antenna` wins more than `balanced` (94.5 / 90.5 / 98.5% vs 81 / 78 / 87%): the radio
  chain costs time and power and its longer warning changes little.
- `greedy` 0 / 6.5 / 6.5% (target 30-60%).
- `balanced` Legend 76 / 86.5% in w2 / w3 (target 25-50%); `always-shelter` Legend 21.5% in w3.
- `never-shelter` wins 86.5% in w2 / w3 (target is only for w1, where it is 0%).
**Human confirmation (2026-11-14, start of B2):** antenna is built (no repair action);
never-shelter builds the shelter; grid and slots approved; Curiosity and the science spot are
open from sol 1 (`unlockSol.readCuriosity` / `scanRock` = 1). Science then earns 3 more sols,
so balanced Legend jumped to 81 / 78 / 87%; `science.legendMin` 62 -> 72 (probe: w1 balanced
median science 71). Bot after both: balanced 81 / 78 / 87% wins, Legend 29 / 69.5 / 86.5%;
pusula 88.5 / 92 / 93%; always-shelter Legend 0 / 0 / 13.5%; other rows unchanged.
**Not built in B1:** any UI (placement view, build menu, status labels, parts counter): B2.
Until B2 the deployed game is unchanged; the `main` branch game cannot build yet.

## D-014 — 2026-11-14 — B2 build-mode UI (store, placement, construction, free walk)
Build choices (not yet confirmed by the human):
- **Grid in the valley:** the sim grid is centered on the origin, one cell = 3 world units
  (`scene/grid.ts`). Fixed stations (habitat, panels, Curiosity, science) and the craters come
  from `BALANCE.grid`, so the 3D layout follows the approved grid; the old hand-placed
  `STATION_POS` is gone. Capsules and the ship moved behind the grid (scenery only).
- **Store** (`ui/buildMenu.ts`) on the right above the wrist watch; it scrolls when both do
  not fit, ready cards shrink to one line. On screens <= 900 px it moves bottom-left, on
  phones (<= 600 px) it becomes a horizontal strip.
- **Placing** (`input/placement.ts`): drag a card onto the ground, or tap a card and then a
  cell; the wrist-watch build task does the same. Ghost model + cell tile, green / red, the
  tip shows the sim's reason (`check()` of the real `build` action, so also noTime / noPower).
  An invalid drop keeps the card selected so the next tap can retry; Esc, the banner's Cancel
  or a second tap on the card cancels. Ada walks to the site, then the `build` action runs.
- **Construction look:** a station being built is see-through inside an orange scaffold with
  "🏗️ N sol" on its label; it cannot be picked. Unplaced stations are hidden (no label).
- **Free walk:** tapping the ground walks Ada there (straight line, stops outside building
  footprints). It is visual only: the sim still charges walking with the next action (D-010).
  Walk animation length now follows the distance (7 units/s), not the sim's walk hours.
- **Tutorial:** sol 1 build MOXIE, clean, end; sol 2 make oxygen, build greenhouse, end;
  sol 3 Curiosity, clean, end; then a build chain (shelter, antenna) that leads PUSULA on any
  sol where the next one can be placed. Build steps pulse the store card instead of the arrow.
- **Morning cards:** "{station} is ready" per finished build, "New in the store: X" when a
  card unlocks overnight; the old greenhouse / unlock-all texts were reduced to food / dose.
- **Mission code** asks before replacing a saved mission (same card as New Mission).
- **game.ts split:** `game.ts` (wiring, render, perform) + `game/context.ts`, `game/flow.ts`
  (screens), `game/guide.ts` (PUSULA target), `game/stationUi.ts` (stations, walking, placing).
- **Look:** gradient sky dome, one shadow-casting sun (1024 px PCF map), ACES tone mapping,
  vertex-shaded dunes and hills outside the flat build floor, crater rims. Pixel ratio capped
  at 1.75. 60 fps in the browser pane at 1280 x 800.
- Sim fix found while playing: `costOf(endSol)` returned the crew's location (B1 change), so
  PUSULA's arrow pointed at the last station instead of the habitat. Now always the habitat
  (test added). Bot report unchanged.
**Not built in B2:** path-finding around buildings (Ada walks straight), moving or removing a
placed building, real models, sound.

## D-015 — 2026-11-14 — B3 part A: village layout (setup, move, path-finding)
Human answers to D-014: free walk costs no time (kept); build area grows to 18 x 18; Legend
science limit 72 confirmed.
- **Grid 18 x 18**, centered as before (`scene/grid.ts`). Fixed: Curiosity (16,2), science
  (2,16); a third crater; the landing rocket blocks `grid.lander` (13,11). Bot slots moved
  with the grid (habitat 9,9 / panels 6,9 / MOXIE 11,9 / greenhouse 9,11 / shelter 9,6 /
  antenna 12,6 / marker 6,12). Camera pulled back (radius 62).
- **Sol-1 setup:** only the rocket stands at landing. The habitat and the panels wait in the
  store ("waiting to be set up", free). Sim action `place` (free, instant, no walk) on any
  valid cell; until both are placed every other action (end the day too) is refused with
  `needSetup`. The sol-1 morning snapshot is updated, so a replay keeps the placement.
  Tutorial sol 1 starts with the two placing steps; PUSULA's tasks are the same. The bot
  places both on their slots first. **Bot report unchanged** (balanced 81 / 78 / 87%,
  pusula 88.5 / 92 / 93%).
- **Move:** a ready station's menu has "Move": same ghost and green / red rules (its own cell
  does not block), sim action `relocate` = walk + `build.relocateHours` (1 h), no parts, no
  power; refused with `underConstruction` / `notBuilt`. Starters can be moved too.
- PUSULA suggests the slot if free, else the nearest valid cell (`suggestCell`).
- **Collision:** Ada walks around buildings and the rocket: A* on a 1-unit grid plus corner
  cutting (`scene/path.ts`, visual only).
- `saveVersion` 3.

## D-016 — 2026-11-14 — B3 part B: learning layer (profile, capsules, recall question, XP)
Human request (B3). The sim is untouched: everything lives in a separate profile layer.
- **Profile** (`src/profile/`): XP, wins, per-concept counters, XP at mission start; one
  localStorage key, every access in try/catch, a broken value becomes a fresh profile.
  Numbers in `src/config/progression.ts` (XP: build done 25, part found 10, PUSULA task 4,
  shelter during a storm 15 once per sol, correct answer 20; ranks Cadet 0 / Rookie 150 /
  Specialist 500 / Commander 1200 / Mission Legend 2500).
- **Hard Rule 13 ("No quizzes") revised by the human:** an optional recall question on
  every 4th showing of a concept: fill-the-gap sentence, 3 big buttons, no timer, no
  keyboard, "Skip", no penalty (a wrong answer shows the right one and the explanation).
- **Concepts** (`src/content/concepts.json` = ids, answer, linked stations; texts in i18n
  under `concept.<id>.*`, Hard Rule 2): sol, MOXIE, regolith, flare / CME, RAD, Gale Crater,
  message delay, Curiosity. Checked facts: sol 24 h 39 min; MOXIE 2021-2023, 122 g O2;
  Gale ~154 km; Curiosity landed August 2012, nuclear powered. **Delay is "3 to 22 minutes"
  one way, not 4-24** (light time at closest / farthest distance).
- **Natural moments:** at most one capsule per moment per sol: a station menu opens (concept
  of that station), a build starts (its station), the morning queue after the night card.
  The least-shown concept is picked.
- **5 hazards** (NASA HRP): shelter = radiation, antenna = isolation, MOXIE / greenhouse /
  marker = distance from Earth, habitat / panels = hostile closed environment, gravity =
  whole mission. One line on store cards; table on every gauge info card.
- **"This storm was real"** opens on top of the result: the window's highest hourly RAD
  reading (w1 20 May 2024, w2 11 Sep 2017, w3 15 Mar 2023 "Earth hit, Mars quiet"), SVG line
  of the RAD curve sol ±3, the player's dose that sol, habitat-only and full-shelter
  what-ifs, source line (RAD + DONKI with SAVED dates). No logo.
- **Storm picker:** after the first win "New Mission" opens "Pick a storm" (3 months, date
  + one sentence, random seed). Locked = old behaviour.
- **HUD:** rank badge + XP bar top-left, "+XP" toast, big toast on rank up; result shows XP
  this mission and the rank. Pause has a confirmed "Reset progress".
- Smart board: capsule / question / picker / storm cards use >= 64 px buttons, 18-24 px text.

## D-017 — 2026-11-14 — B4: 360° camera, building facing, scene clean-up
Human request (B4). Build choices (not yet confirmed by the human):
- **Camera** (`scene/camera.ts`): unlimited turn around the village; tilt limited to
  0.18-1.45 rad (never under the ground, up to a near top-down view); zoom 36-84 as before.
  Inputs set a goal and the camera eases to it. Mouse: left drag turns (as before), right or
  middle drag turns + tilts, wheel zooms. Touch: one finger as before (tap = walk / place,
  drag = turn); two fingers twist or slide sideways = turn, slide up / down = tilt, pinch =
  zoom; a two-finger gesture never counts as a tap. Screen buttons ↺ ⌂ ↻ (64 px) on the left
  middle (right side under 900 px): 45° per press, ⌂ resets. Picking (ghost cells, labels,
  stations) already raycasts through the live camera, so it works from every angle.
- **Hills** are a full ring at r 112-136 (they were only behind the base and inside the
  camera's path from the back).
- **Facing:** `Building.rot` (0-3 quarter turns, optional: saves without it read as 0, so
  `saveVersion` stays 3). `build` / `place` / `relocate` take an optional `rot`; new sim
  action `rotate` (free, instant, not counted in today's actions, refused with `notBuilt`).
  Cosmetic only: placement rules and costs ignore it; the bot never sends it (**bot report
  unchanged**: balanced 81 / 78 / 87%, pusula 88.5 / 92 / 93%). The turn button sits in the
  placement banner ("↻ Turn (R)") instead of floating next to the ghost: a button that
  follows the ghost runs away from the pointer. R turns too. Ready station menus have
  "↻ Turn" (the menu stays open for more turns). Ada's stand point and PUSULA follow the door.
- **Clean-up:** the six grey-white "sleep capsules" in a row behind the grid (near the
  Curiosity spot) were F2 scenery from the fixed layout, with no station or action: removed.
- Ada turns to face the building (or building site) she walked to.

## D-018 — 2026-11-14 — F5a: station info card, overdue tasks, port from the trial build
Human request (F5a). The human picked each port in an old-vs-new survey (answers below).

**Station info card** (`ui/infoCard.ts`, text `sinfo.*`, icons + hazard in
`content/stationInfo.json`): opens when Ada arrives at a station, and on a tap on a station
that cannot be used yet (locked / under construction / not placed) or on the landing rocket
(now tagged `lander` for picking; it has no actions). What it does, a real mission / technology
fact, the hazard it teaches (one of the five hazards) and its actions. A side panel, not a
modal: it never blocks the action menu (its own action list is left out while the menu is
open), ✕ closes it, a new walk / the night hides it. Big text (17 px) for a classroom board.

**Overdue tasks** (sim rule, `sim/systems/overdue.ts`, numbers in `BALANCE.overdue`):
- From sol 4 (after the tutorial sols) the morning list is kept in `today.plan`.
- At night, undone tasks of that list are "missed" (`log.missed`, flag `overdue`); the ones
  that still make sense the next morning move to `state.overdue` (at most 3, no duplicates)
  and show first-class on the watch with a "⏰ Overdue" tag.
- **One sol of grace:** only a task that was already overdue and is left undone again costs
  at night: clean → +5% dust on the panels, moxie → −3 air, greenhouse → −1 food,
  curiosity / rock → −1 science ⭐. Builds, shelter, messages cost nothing extra (they stay on
  the list; their own effect is the cost). Waiting in the shelter is never carried and never
  charged (the real storm dose is its cost; no invented dose). Optional extras ("spare" rules)
  are never carried.
- Why the grace and the narrow list: the first try (every missed task pays, default −1 ⭐)
  dropped `balanced` from 81/78/87% to 57/59/73% and Legend to ~0. With the grace + narrow
  costs + no carrying of spare tasks the report is back to baseline (table below).
- PUSULA warns before the day ends ("N tasks not done, cost tonight …, they move to tomorrow")
  with "End the day anyway" / "Back to work". The night card shows the charged cost or a
  "moved to tomorrow" note. The watch feed reminds "N overdue tasks from yesterday".
- Saves without the new fields load with empty lists (`withOverdue` in `save.ts`, version
  unchanged).

**Survey (old trial build vs this game) and what was done:**
| Topic | Human's pick | Done |
|---|---|---|
| Character / walking | take old | Animated astronaut model (Idle/Run cross-fade, helmet, suit tint), smooth turning; primitive fallback also got arm swing + low-gravity bounce |
| Camera | old angle + keep 360° | fov 50, radius 44 (16-84), elevation 0.4; soft follow of Ada (look-at drifts 70% towards her); 360° turn, tilt, buttons unchanged |
| Guidance | 3D arrow + ring, speech bubble, compass | 3D turning arrow + pulsing ground ring replace the DOM arrow; PUSULA's bubble shows each new sentence for 6 s, then the icon; compass dial above the camera buttons (tap = face north) |
| Sound | all | Web Audio synth (no files): Mars wind, storm wind loop, click, task chime, build tune, warn, night swoosh, morning alarm, win / evacuation; on/off in the pause menu (`seyir-defteri.sound`) |
| Day / night | take old | Sun crosses the sky with the hours left; blue dusk mixed in over the last 40% of the day; violet glow during a radiation-event hour |
| Effects | all four | Floating numbers also under each gauge; storm particles follow the view; watch message feed (alerts, PUSULA reminder, one real fact per sol); task row tap = walk there (already existed) |
| Models | port now, Ada too, fallback, no perf loss | CC0 KayKit + Quaternius models for every station, the rocket, Ada and PUSULA; Perseverance (NASA) as decor with its logo sheet removed; see asset-sources.md |

Model loading: the game is playable with primitives from the first frame; models load in the
background (`world.useModels`) and replace the primitives (removed, not hidden, because the
raycaster also hits invisible meshes). A failed file keeps its primitive. The rover decor loads
last, merged per material, without shadows. No new npm dependency (GLTFLoader, DRACOLoader,
SkeletonUtils come with `three`).

**Skipped (and why):**
- Placement ghost still uses the primitive shapes (green / red tint reads clearly; models
  would need per-mesh material swaps for every atlas model). Later, if wanted.
- Valley rocks from the trial (instanced Quaternius rocks): not in the survey; the terrain
  rocks stay primitive.
- Crew of 4-7 astronauts, crashed ship, sleep pods, workshop from the trial: different game
  design (solo crew, build mode) — not ported.
- The trial's loading screen: not needed, the base is playable before the models arrive.

**CLAUDE.md:** the "placeholders first / models wait" rule is updated: models are now in the
repo; every model must keep a primitive fallback.

**Bot report after F5a** (200 games per strategy per window): balanced 81.5 / 78.0 / 87.0%
(Legend 28.5 / 64.5 / 85.0%), pusula 88.5 / 92.0 / 93.0%. Before F5a: balanced 81 / 78 / 87%
(Legend 29 / 69.5 / 86.5%), pusula 88.5 / 92 / 93%. Wins unchanged; Legend a little lower
(skipped science tasks now cost a star); always-shelter w3 Legend 13.5% -> 1%. Other rows
unchanged. `node tools/bot/missed.ts <strategy> <window>` lists which morning tasks a
strategy leaves undone.

## D-019 — 2026-11-14 — F5b: play flow and clarity (second player test, ages 10-14)
Human request (F5b): nine fixes from a second player's test. What was built and the choices
made where the request left room:

1. **Walk retarget.** A tap on the ground or another station while Ada walks cancels the old
   walk at once (its callback never runs) and turns her to the new target (`ctx.canWalk()`;
   `world.walk` drops stale legs, `astronaut.stop()`).
2. **Saving.** Autosave 0.6 s after every action that lands, on `visibilitychange` (hidden) and
   `pagehide`, and when Ada reaches the habitat. Pause menu "Save" with a "Saved ✓" toast.
   "Main menu" asks: Save and exit / Don't save (the save goes back to this morning's
   snapshot) / Cancel. **Saved games list:** one save per mission (`seed-window`), at most 6,
   newest first; Continue loads the newest; load / delete (asks first) in "Saved games". The
   old single-slot save is moved into the list once. Save version unchanged (3).
3. **Overdue tasks pile up from sol 2** (`BALANCE.overdue.fromSol` 4 -> 1): the sol-1 list is
   made once the habitat and the panels are placed, so sol-1 tasks reach sol 2, and sol 1 + 2
   tasks reach sol 3. The watch shows "Today" and "Overdue" groups, at most 6 rows
   (`overdue.listMax`); more overdue ones show as "+N overdue". The sim keeps up to 8
   (`overdue.max`, was 3). Grace and costs unchanged.
4. **Daylight fit.** The morning list (`planDay`) and the live list (`liveDay`) keep only what
   fits the daylight left when done in order, walking included (`fitDaylight`); the rest is
   "Moves to tomorrow (no cost)". Order: urgent rules (`urgent` in missions.json: radiation
   now, broken, low air / power / food), then overdue tasks, then the other rules. The live
   list = urgent needs that came up + this morning's tasks still undone; empty list -> the
   watch shows a big "End the day" and one sentence on the night (`nightNote`). Ending the
   day always asks first (`endDaySpec`). A greyed button with no time says "Needs X h, Y h
   left: moves to tomorrow".
   - **Choice (cost rule kept, made consistent with "no cost"):** an overdue task is charged
     at night only when it was left undone although it still fitted the daylight when the day
     ended (`chargedTasks`, logged as `SolLog.charged`). One that ran out of time moves on
     free, as the watch promised. Skipped work still pays exactly as before.
   - **Choice (morning battery):** the morning plan judges power with what the panels bring
     by dusk (the morning is the battery's low point) and puts tasks that can be paid now
     first; a planned task still waiting for power stays listed ("needs more power"). Without
     this the pusula bot fell to 58-74% (MOXIE dropped from every low-power morning).
   - The pusula bot now does the live list top to bottom (`nextTask`) and ends the day when
     it is empty (was: at most 3 tasks).
5. **Shelter.** "Wait in the shelter" walks Ada in and hides her; the game then waits one hour
   at a time (1.4 s real time per hour) until PUSULA's advised hours
   (`advisor.shelterHoursOnEvent`) are done, waiting is no longer allowed, the daylight ends or
   "Go outside" is tapped. Band: "You are in the shelter: safe from the storm dose. X h left"
   (X = advised hours still to wait, never more than the daylight). Dose gauge: 🛡️ "In the
   shelter: shielded". No future of the RAD curve is used for X.
6. **Greenhouse and costs.** Food gauge shows x/20; the greenhouse button shows "store x/20";
   a full store greys harvest out and says why with the numbers. Every action button shows
   time (walking included) and power, also when 0; store cards show 🔩 parts, ⏱ work hours,
   ⚡ power and build sols.
7. **Text.** Cards lead with at most two sentences; the rest folds under "More ▾"
   (`ui/overlays.ts`, automatic; lists, results, charts and the quiz show everything). The
   watch shows PUSULA's first two sentences. Long tutorial texts were cut to two sentences.
   **Glossary** (`content/glossary.json`, text `gloss.*`): sol, RAD, regolith, CME / particle
   storm, dose, MOXIE, Curiosity, Gale Crater get a dotted underline in cards, the watch and
   the station info card (first time per text); a tap shows one sentence.
8. **Menus.** Pause: one column — Continue, Save, Logbook, Sound, Language, Main menu, then
   Reset progress apart. Main menu as in the trial build: Continue, New mission, Saved games,
   Info & Sources, Settings (language, sound, reset); the class mission code stays as a small
   link. No "coming soon" buttons. **Info & Sources** is now built (`content/credits.json`).
9. **Labels.** Station labels never overlap each other or the HUD / camera buttons / watch /
   store / cards: nearest first, a clashing label moves up or down one step or slides a short
   way (at most its own width) clear of a panel, else hides. The rank badge now sits in the
   HUD's left column under the chips, so the hours chip can never slide under it.

**Bot report after F5b** (200 games per strategy per window): balanced 81.0 / 78.0 / 87.0%
(Legend 29.0 / 69.5 / 86.5%), pusula 86.0 / 90.5 / 89.5%, never-shelter w1 0%, random 0%.
Before F5b: balanced 81.5 / 78 / 87%, pusula 88.5 / 92 / 93%. All targets met
(balanced >= 70%, pusula >= 80%, never-shelter w1 <= 30%, random <= 20%).

## D-020 — 2026-11-15 — F5c: opening and closing cutscenes, menu backdrop, store card layout
Human request (F5c). Everything runs in the game engine with the existing CC0 models, three.js,
particles, light and Web Audio: no image, video or audio files, no AI-generated media. The sim is
untouched (bot report identical to F5b).

**Architecture.** `scene/cutscenes/` holds the 3D side: a cutscene owns a camera (and may bring its
own scene, the space shot), sets the sky / storm / sun while it runs and reports named *beats*; it
never touches GameState or the DOM. `game/cinema.ts` maps beats to the overlay (`ui/cinema.ts`:
letterbox bars, subtitle, PUSULA bubble, red alarm glow, white flash, black fade, eyelids, canvas
blur, Skip) and to sounds. `world.play(cutscene)` hands camera, sky and storm to it; `world.stage()`
gives it Ada, PUSULA, the lander and the game camera. The World interface moved to
`scene/worldApi.ts` (world.ts stays under 300 lines). Session mode `'cine'` hides the HUD and
blocks input; the cutscene CSS lives in `src/cinema.css` (styles.css hit 500 lines).

**Opening (about 21.6 s, every new mission, Skip / Esc / Enter / Space at any time, "🎬 Watch the
intro" in the main menu replays it over an empty valley):**
- (a) Space: bars, stars, a low-poly Mars made in code comes closer, a tiny lander flies in.
  Subtitle "{month year}. The Sun is waking up." — the month and year come from the played
  window's `startDate` (May 2024 / September 2017 / March 2023), formatted per language.
- (b) Storm: dust sky + storm particles, the rocket comes down tail-first with its flame on and
  tilts more and more, rising camera shake, pulsing red edge glow, PUSULA's warning bubble, alarm,
  storm wind + rumble.
- (c) Crash: it lands on its side at the lander's spot, dust burst, six panel pieces fly out and
  bounce, impact boom, white flash, black. Under the black the cutscene rocket is swapped for the
  real (upright) lander scenery.
- (d) Wake-up: eyelids blink open while the blur clears; Ada lies a few steps from the rocket
  (choice: not at the rocket's stand, where the eye-level camera was inside the model), gets up,
  walks to her start spot; PUSULA flies in: "Are you OK? Rescue is 30 sols away." The camera blends
  (position, rotation, fov) into the orbit camera, the bars slide away, then the welcome card and
  Sol 1 setup.

**Closings (played after the last night card, before the result screen):**
- Success (14.6 s): dawn light, the rescue ship lands outside the village (choice: outside the tour
  circle, it got in the camera's way), the camera circles the village the player built, Ada waves
  (the model's `Wave` clip; the primitive Ada raises an arm), "30 sols. Real storms. Your choices.",
  push-in on Ada and PUSULA, fade.
- Early evacuation (12 s): night, warm lights over the base go out one by one, the capsule lifts
  off from the lander's spot, calm melody, "Every commander learns this way.", fade. No people are
  shown in danger (kid-safe).
- Debug skips that end a mission also play the closing (handy for testing).

**Reduce motion** (Settings, `seyir-defteri.motion`; default = the system's
prefers-reduced-motion): no camera shake, the white flash becomes a fade, the alarm glow stays
steady, the eyelids open without the blink, and the menu backdrop stops turning.

**Main menu backdrop:** the newest saved village (2+ buildings), else a sample village on the
suggested slots (`game/backdrop.ts`, scene-only), turning slowly. On wide screens (> 900 px) the
menu card sits on the left and the camera's view is shifted right (`setViewOffset`, the orbit is
unchanged) so the village is not hidden behind the card.

**Store cards:** four full-width, left-aligned rows: name + icon, costs (🔩 · ⏱ · ⚡ · sol) on one
line, status text ("It is too early for this.", "Build the shelter first.", "Being built: N sol
left"), "🎓 Teaches: …". Locked cards: grey icons, lighter background, text kept readable (no 55%
fade). Checked in EN and TR at 1024 x 768.

**Performance / first frame:** the cutscene builds its props on the spot (one lander clone, ~2,700
points, a 5-subdivision icosahedron); if the models are not loaded yet the primitive rocket, Ada and
PUSULA play it. No new dependency.

**Not done / limits:** no real per-frame lip-sync or voice; the crashed rocket is upright again in
the game (the flash hides the swap; tilting the scenery lander would change picking and the walk
blockers). Bot report after F5c: unchanged from F5b (balanced 81.0 / 78.0 / 87.0%, pusula 86.0 /
90.5 / 89.5%).

## D-021 — 2026-11-15 — F5c fix: smooth cutscenes, story dialogue, crashed rocket
Human requests (two messages; the second replaced the dialogue and the closings of the first).
The sim is untouched (bot report identical).

**Stutter: cause and fix.** Measured in a real Chrome tab (rAF frame times, M-series Mac):
- The evacuation scene switched 6 real `PointLight`s off one by one. Every change in the number
  of lights makes three.js recompile every shader: a ~290 ms freeze each 0.7-0.9 s (the "plays
  1 s, freezes" pattern). On slower GPUs (Windows / ANGLE, tablets) these stalls last seconds.
- First use of a material (space scene, storm particles, dust burst, debris, flame) compiled its
  shader mid-scene (317 ms at the start of the intro, 84 ms at the storm), and meshes coming into
  view for the first time uploaded buffers and textures (stalls while the camera toured the
  village).
- Fixes: base lights are unlit glows (bulb + ground glow, no real light, ever). Before a cutscene
  `scene/warm.ts` shows every hidden object, compiles all shaders with `compileAsync`
  (parallel, non-blocking), draws once with frustum culling off (uploads every buffer / texture,
  builds shadow programs), and restores visibility; a "Preparing…" cover hides it and frames
  pause meanwhile. Props come from a small pool (`pooled`, built once, reset on reuse); no
  geometry, material or vector is created per frame; the dust burst has 450 / 300 points. The
  noise buffer for whoosh / rumble / impact is made once when audio starts. The overlay has no
  timers: eyelids and blur are set each frame from the cutscene clock; subtitles are timed on the
  same clock; the DOM is written only when a value changes. dt stays capped at 0.1 s, so after a
  stall the clock goes on without skipping a shot or a line.
- Debug panel: `cine:intro` / `cine:win` / `cine:lose` play a cutscene now (sample village), and
  `window.cineT` holds the cutscene clock with `?debug`, for frame-time traces.

| Scene (fresh page) | Before: frames > 50 ms / longest | After: frames > 50 ms / longest |
|---|---|---|
| Opening | 3 / 317 ms | 5 / 83 ms (none > 100 ms) |
| Evacuation | 18 / 483 ms (five ~290 ms freezes) | 3 / 133 ms (one frame, at a random moment: GC) |
| Success | 5 / 133 ms | 6 / 151 ms (first run after the texture fix; 14 / 249 ms before it) |

**Dialogue (EN/TR, subtitles with the speaker's name).** Storm: PUSULA "Dust storm! We're drifting
off course. Hold on!". Wake-up: PUSULA / Ada / PUSULA / PUSULA / Ada / PUSULA (six lines, from
"Ada? Ada, can you hear me?" to "…do the science we came here for."). Success: "Signal received!
Rescue is landing. We did it!". Evacuation: "We're safe, Ada. But we didn't reach our real goal:
the science." Each line stays 1.2 s + 0.34 s per word (1.8-7.5 s), back to back, no gaps, each
once. The wake-up shot waits for the dialogue and the camera drifts slowly round Ada and PUSULA
while they talk, so the opening is now about 36 s (Skip / Esc work at any time).
**Goal card** after the opening (before PUSULA's welcome): "Your mission: 🛟 Survive 30 sols ·
📡 Reach Earth · ⭐ Collect science · 🚀 Land the rescue ship".

**Closings.** Success: dawn, the big rescue ship (lander model x1.4) lands on the player's landing
marker (beside the village if none), village tour, Ada waves, PUSULA's line, then the card
"Mission complete. ⭐ N science results reached Earth." (N = `state.science`). Evacuation: night, a
light blinks in the sky, a small emergency capsule (made in code) comes down under an orange
parachute in front of Ada, Ada and PUSULA board, it lifts off gently (soft whoosh, no shake, no
rumble); the camera pulls back to the half-built base and the wreck, the lights go out one by
one, light dust drifts in, then "Mission called off. Most of the science never reached Earth.
Every commander learns this way." The old taglines were replaced.

**Crashed rocket.** The landing rocket in the game leans (`WRECK.tilt` −0.24 rad, away from Ada's
start spot) and sits 0.35 sunk, with a scorch mark and four broken panels on the ground
(`scene/entities/wreck.ts`). Only an inner "wreck" pivot tilts: the rocket group keeps its pick tag,
position and walk blocker; the details are outside the group, so they are not pickable. The opening
crash rocks back into exactly this pose before the swap, and it never flies in either closing.

## D-022 — 2026-11-15 — F6: exploring, learning from mistakes, night card, shelter balance
Human request (F6), done unattended overnight: where the request left room the most reasonable
choice was made and is written here (marked **Choice**).

**1. Rocket debris and upgrades** (`sim/systems/explore.ts`, numbers in `BALANCE.debris` /
`BALANCE.upgrades`, scene `scene/entities/debris.ts`).
- Nine pieces of the crashed rocket lie around the landing site and the crater (cells in
  `BALANCE.debris.pieces`; same pale panel metal as the pieces thrown out in the opening crash,
  simple metal shapes made in code, no files, nothing to log in asset-sources). Each has a soft
  unlit glint (no real light, D-021) and is drawn 1.6x so a child can spot and tap it.
- Tap -> Ada walks there -> "Collect" (1 h + the walk, 0 power) -> +1..3 🔩 parts and
  +10 XP (`partFound`, the profile layer). The sim's old placeholder `bonus` action now carries the
  piece index (`{ type: 'bonus', debris }`); the parts come from balance.ts, never from the action.
  No science: Legend stays a science goal. A piece blocks only its own grid cell until collected.
- **Choice: one piece per sol** (`debris.perSol`). Without it the pusula bot collected all nine by
  sol 8 and bought the extra panel on sol 4 (win 89 -> 100%, hard-choice days 7 -> 2.3).
- Upgrades, once each, at their station (it must be built): **bigger food store** (6 🔩, 2 h,
  greenhouse: store 20 -> 30) and **extra solar panel** (10 🔩, 2 h, panels: +15% power per
  daylight hour). Shown in the station menu with their parts cost; in 3D a crate stack next to the
  greenhouse and a tilted panel next to the panels. +20 XP (`upgradeDone`).
- PUSULA: when the day's list is empty it suggests an upgrade (only with **spare** parts: parts
  left after every station not placed yet is paid for, so PUSULA never spends build parts) or the
  next rocket piece ("Something is shining at the crater rim…"). The suggestion is a watch row that
  walks Ada there; it is never part of the plan (never overdue, never charged); "End the day" stays.
- Bots: `pusula` follows the suggestion (`nextTask ?? exploreTask ?? end`); `balanced` takes it
  only when its own list is empty (rare). Other strategies never explore.
- Saves without the new fields read as empty lists (`debris` / `upgrades` are optional).

**2. "Why did it happen?" — PUSULA's note** (`sim/systems/lessons.ts`, numbers in `BALANCE.lessons`).
The sim notes five codes in `today.lessons` while the day runs and copies the top ones to the
log line (`SolLog.lessons`); they never change a gauge or a rule, so the bot report is unchanged.
- `airFull`: MOXIE run whose oxygen did not fit the tank (amount lost >= 1).
- `harvestFull`: harvest whose food did not fit the store. **Choice:** a harvest into a *full*
  store is already refused by the "no empty work" rule, so the note catches the part that is lost.
- `endEarly`: the day was ended with a doable task on PUSULA's live list and >= 2 h of daylight.
- `stormOutside`: daylight hours at a radiation-event rate spent outside a *ready* shelter (walks,
  work, and the leftover daylight when the day ends). No note before the shelter exists.
- `overdueAgain`: overdue tasks charged tonight (left undone again although they fitted).
At most two a night, in this order: storm, overdue, ended early, oxygen, harvest. Text: three short
lines each (What happened -> Why -> Next time), EN/TR, plain and never blaming (`lesson.*`).

**3. Night card** (`ui/nightCard.ts`, `src/night.css`, as in the trial build's night summary).
"☀️ Today" rows (panels made, work used, oxygen made, harvest, science, parts found; only rows
that are not zero) from a new per-day tally in the sim (`today.tally`: panel power actually stored,
power spent on work, air and food actually added), then "🌙 Tonight" rows (heating, breathing,
cold night, dinner, overdue line, panel dust, storm dose: all kept from before), the "why" lines and
the "What if?" box (kept), then **"Now we have"**: six boxes (power, air, food, storm dose %,
science, parts) with the value at the next morning and the change since this morning (green up,
red down; for the dose up is red), then PUSULA's note. The card scrolls on small screens and its
buttons stick to the bottom. **Choice:** no separate "morning consumption" row: in this game every
cost happens at night (the request listed it as an example).

**4. Shelter balance** (balance.ts only, plus which shield an hour uses).
Target asked: on w1 sol 18, 4 h in the shelter without regolith keeps the storm under ~20% of the
dose bar, with regolith under ~10%, while a player who stays outside goes far over the budget.
- **Finding:** with the real RAD curve this cannot hold for *4 hours*. Sol 18 + 19 carry ~64 dose
  points unshielded; the first 4 storm hours only 29. Whatever the shields, the outside dose is at
  most 1.84x the 4-hour-shelter dose (64 / 34.7), so "4 h ≈ 20%" and "outside > 100%" exclude each
  other. Probe: `outside 100%, 4 h no regolith 86%, regolith 56%` before F6.
- **Choice (closest honest fit):** (a) **PUSULA advises the shelter for the whole storm** (all
  storm hours of the daylight: `advisor.shelterHoursOnEvent` 4 -> 10; the shelter loop and the
  watch follow it; the "What if?" box uses the storm hours of that day); (b) daylight work is done
  **outside in the suit** (`dose.outsideShield` 0.05, new) while the night and leftover daylight are
  spent **inside the habitat** (`habitatShield` 0.3 -> 0.8); (c) the shelter shields most
  (`shelterShield` [0.5, 0.7, 0.85, 0.95] -> [0.92, 0.95, 0.97, 0.99]). The storm dose stays the
  real RAD curve; only the shields are game simplifications.
- Result in the real sim (w1 sol 18 + 19, `src/sim/shelter.test.ts` checks the shape):
  whole storm in the shelter **19%** without regolith, **12%** with 3 levels; staying outside
  -> Early Evacuation on sol 18 (~112% if the mission went on). 4 h only: 42% / 38%.
- Side effect: ending the day early in a storm (going inside the habitat) also shields well, but
  costs the day's work; working outside in a storm is now what hurts.
- Bot report after part 4 (100 games): balanced 84 / 80 / 87%, pusula 94 / 98 / 96%,
  never-shelter w1 0%, random <= 1% — all targets kept.

**5. Remaining balance (2 of the 4 allowed rounds used).**
- **no-antenna (rule, not numbers):** at the end of sol 30 a base whose location never reached
  Earth (`rescueStage < 2`: no antenna, or antenna but no message) cannot be found: Early
  Evacuation with the new loss reason `noSignal` (result text, key decision and "what we learned"
  point to antenna -> message). Location sent but no marker stays "Tough Rescue". no-antenna:
  96 / 91 / 99% -> **0 / 0 / 0%**.
- **greedy:** it never built the antenna, so the rule above would lock it at 0%. Its definition
  now taps the store and the radio when no gauge needs it (shelter, antenna, marker, message, set
  the marker): still no plan, but it can complete the chain. It dies of cold nights (it spends the
  power the night heating needs), 4.5% in every window.
  - Round 1 (reverted): `air.coldPenalty` 15 -> 8 gave greedy only +2 points but balanced jumped to
    97 / 99 / 100% (it also has cold nights). **Remaining deviation:** greedy 4.5% vs target
    30-60%. The gap is the strategy's missing power plan; closing it with numbers would flatten the
    game for everyone. Left for the human.
- **Legend in w2 / w3** (round 2, kept): calmer months leave more time for science, so the top
  grade asks for more there: `science.legendMinByWindow` w2 75, w3 80 (w1 stays 72). Balanced
  Legend 29 / 69.5 / 86.5% -> **29 / 40.5 / 44%** (target 25-50%). never-shelter Legend in w2 / w3
  stays high (86 / 78%): in a calm month it plays like balanced; its target is w1 only (0%).

**6. Settings and checks.**
- **Text size** (Settings, `seyir-defteri.textSize`, `lib/textSize.ts`): normal / large. Large zooms
  the reading panels (cards x1.2, station menu, info card, watch x1.15, cutscene subtitles and cards
  x1.15; a little less on phones). The HUD gauges, the store and the 3D view keep their size.
- **"Today on the Sun"** was never built before (D-012 listed live DONKI as not built), so F6 built
  it as PRD §10.1 asks: `adapters/donki.ts` + `adapters/donkiSummary.ts`, a card at the bottom of
  the main menu (last 7 days: flares, CMEs, particle storms, magnetic storms; newest report; source
  "NASA DONKI, measured near Earth"). It shows the snapshot at once and swaps in the live answer;
  offline (`navigator.onLine`), a 6 s timeout, an HTTP error or bad JSON keep **SAVED + date**; a
  live answer is cached 6 h and labelled LIVE. Unit tests cover live / offline / HTTP / bad JSON.
  Checked live in the browser pane (CORS works).
- **Phone portrait** (`src/phone.css`, 375 x 812): the HUD chips in one row, gauges in two rows
  (power + life, then the dose bar), the date badge and the XP line hidden, camera buttons 48 px on
  the left above the store, the watch above the store on the right (30% of the height), the night
  card fully opaque and scrollable with its buttons always visible; the main menu card scrolls.
- **Turkish cutscene subtitles:** a layout bug cut every subtitle and closing card to half the
  screen width (`left: 50%` shrink-to-fit): the longest wake-up line was 8 lines in a 188 px column
  on a phone. Fixed (`width: max-content` + max-width): 4 lines, 330 px. Wording tightened (storm,
  crash, wake-up, win, evacuation lines); checked on screen at 375 x 812 in TR.
- Debug-only handles for test scripts: `window.sdGame` / `window.sdWorld` with `?debug`.
