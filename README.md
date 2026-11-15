# Seyir Defteri: Son 30 Sol (Logbook: The Last 30 Sols)

**Real storms. Real choices.** Every particle storm in this game really happened.

A 3D browser game for ages 7-12, built for the NASA Space Apps Challenge 2026 challenge
"Build a Junior Astronaut Mission Trainer". Your rocket crash-lands near Gale Crater on Mars.
With PUSULA, a friendly robot, you build a small base and keep the crew safe for 30 sols until
the rescue ship lands. Every choice costs something: power, daylight hours or oxygen. Waiting in
the shelter keeps the radiation dose low but stops the work; a message to Earth takes minutes
each way, so in an emergency you decide.

**Play:** https://saidbilaldariyemez.github.io/seyir-defteri/ (no download, no account, EN / TR)

Team: **Seyir Defteri** (solo, Antalya).

## What the player learns

| Mission goal (challenge) | In the game |
|---|---|
| Life support | Oxygen machine (MOXIE-like) and food from the greenhouse; oxygen drops every night |
| Radiation shielding | Regolith shelter; storm dose comes from Curiosity's real RAD measurements |
| Energy budget | Solar panels, dust, night heating: power spent in the day is missing at night |
| Food | Greenhouse needs care; the food store has a limit |
| Communication delay | Message card shows the real one-way delay for the played date (about 3-22 min) and the round trip |

Three core resources sit big on the dashboard: **power, oxygen and storm dose**. Food, parts
and science are smaller. Text is one short sentence per card; details open with ℹ️.

## NASA data → what it does in the game

| Data | What it does in the game | Live / saved |
|---|---|---|
| **DONKI** (space weather events) | Storm warnings in each game come from the real month's solar events; the main menu's "Today on the Sun" card shows the last 7 days | Warnings: SAVED snapshot per month. Menu card: LIVE (6 s timeout), falls back to SAVED with its date |
| **Curiosity RAD via OSDR RadLab** | The hour-by-hour radiation rate on Mars drives the storm dose, the shelter decision, the storm radar and the "This storm was real" chart | SAVED snapshot (date shown on the cards) |
| **3 real months** | 3 May 2024 (the biggest storm Curiosity has measured, 20 May 2024), 1 Sep 2017, 1 Mar 2023 (storms hit Earth, Mars stayed calm) | SAVED snapshots, picked from the main menu after the first win |
| **Earth-Mars distance** | One-way radio delay on the played date | Computed (JPL approximate planet positions), labelled "about" |
| Mars Trek, NASA Image and Video Library | Researched as sources; **not used in this version** | — |

Game simplifications are labelled on the cards (for example the storm radar "can see ahead").
Sources, URLs, dates and licences: [docs/data-sources.md](docs/data-sources.md).

## No strategy wins for free

A headless bot plays the pure simulation 200 times per strategy per month (`npm run bot`).

| Window | Strategy | Win | Legend | Avg sols | Top loss reasons |
|---|---|---|---|---|---|
| w1 | random | 0.5% | 0.0% | 12.7 | air 61.5%, food 34.0% |
| w1 | greedy | 4.5% | 0.0% | 17.2 | air 84.0%, food 9.0% |
| w1 | balanced | 81.0% | 29.0% | 28.7 | air 19.0% |
| w1 | pusula (follows PUSULA) | 94.5% | 0.0% | 29.4 | air 5.5% |
| w1 | never-shelter | 0.0% | 0.0% | 17.0 | dose 99.5% |
| w1 | always-shelter | 17.5% | 0.0% | 20.7 | air 82.5% |
| w1 | no-antenna | 0.0% | 0.0% | 28.6 | noSignal 94.5% |
| w2 | balanced | 78.0% | 40.5% | 28.6 | air 22.0% |
| w2 | pusula | 98.0% | 0.0% | 29.7 | air 2.0% |
| w2 | never-shelter | 86.5% | 86.0% | 29.3 | air 13.5% |
| w3 | balanced | 87.0% | 44.0% | 29.4 | air 13.0% |
| w3 | pusula | 97.0% | 0.0% | 29.6 | air 3.0% |
| w3 | never-shelter | 86.5% | 78.0% | 29.3 | air 13.5% |

Never sheltering loses in the big-storm month (w1) and is fine in calm months, as in reality;
always sheltering runs out of oxygen; skipping the antenna means no rescue. Full table:
[docs/decisions.md](docs/decisions.md) (D-022, D-024).

## Run it

```
npm install
npm run dev       # dev server
npm run build     # type-check + build into dist/
npm test          # unit tests (sim, save, adapters)
npm run bot       # headless playtest bot
npm run deploy    # publish dist/ to GitHub Pages
```

Debug panel: add `?debug` to the URL. Architecture and rules: [CLAUDE.md](CLAUDE.md).
Design: [docs/PRD-final.md](docs/PRD-final.md) (Turkish), revisions in [docs/decisions.md](docs/decisions.md).

## Credits

3D models are **CC0** (KayKit, Quaternius); sounds are made in code. Full list:
[docs/asset-sources.md](docs/asset-sources.md) and the in-game "Info & Sources" screen.
No NASA logo, flag or mission patch is used. This project is not endorsed by or affiliated
with any space agency; agency names appear only as data sources.

## Use of AI

Concept, story and characters by the team; Claude used as a coding assistant, for data
research and proofreading. Every code file carries an SI-assistance note. No images, video or
audio were generated with AI.

## License

[MIT](LICENSE)
