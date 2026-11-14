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
