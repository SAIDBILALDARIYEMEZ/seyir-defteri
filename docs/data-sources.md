# Data Sources
> Every real-world dataset used by the game. Snapshots live in `src/data/` and each file
> carries `source`, `url`, `fetchedAt`, `license`. Shown in the in-game "Info & Sources" screen.
> Status on 2026-11-14 (F1): window snapshots saved by `node tools/data/fetch.mjs` as
> `src/data/rad-{w1,w2,w3}.json` (hourly means) and `src/data/donki-{w1,w2,w3}.json`.

| Dataset | Used for | Source URL | Snapshot date | Live? | Notes |
|---------|----------|------------|---------------|-------|-------|
| NASA DONKI notifications | "Today on the Sun" menu card; flare messages (`type=FLR`) for the windows | https://api.nasa.gov/DONKI/notifications | pending | Live + snapshot fallback (6 s timeout, 6 h cache) | CORS OK from the browser. Own free key, never `DEMO_KEY` |
| NASA DONKI SEP / GST / CME | Real Sun Calendar windows: warnings and story | https://api.nasa.gov/DONKI/SEP, `/GST`, `/CME` | 2026-11-14 | Snapshot | CME is large: keep the count and the 5 fastest. `/DONKI/FLR` returns 404: do not use |
| NASA OSDR RadLab, MSL-RAD-Surface (Curiosity RAD) | Mars surface dose: event curves and daily quiet dose per window | https://visualization.osdr.nasa.gov/radlab/api/ | 2026-11-14 | Snapshot only (no CORS) | Coverage 2015-01-01 to 2024-06-03, about one reading per 17 min; stored as hourly means |
| NASA OSDR RadLab, CRaTER-D1D2 (LRO) | "Moon mission, coming soon" preview | https://visualization.osdr.nasa.gov/radlab/api/ | pending | Snapshot only | Lunar orbit |
| NASA OSDR studies OSD-268, OSD-984 | Greenhouse and radiation info cards (topic + OSD number only) | https://osdr.nasa.gov/ | pending | Snapshot only (no CORS) | Never state invented results |
| NASA/JPL news on the 2024-05-20 event | Info card text in our own words (8,100 uGy statement) | https://www.jpl.nasa.gov/ (exact article URL to be recorded in F1) | n/a | No | Quoted as NASA's statement, never mixed into dose math |
| NASA Image and Video Library | Real Curiosity / Gale photo on the Curiosity card | https://images-api.nasa.gov/search | pending | Saved URL + credit | CORS OK |
| NASA Mars Trek tiles (Viking MDIM21 color mosaic) | Mars globe in the intro (backup scope B1) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/ | pending | Static tiles | CORS OK. Listed only if used |
| MOXIE facts (NASA/JPL, MIT) | Oxygen machine info card | https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/ | n/a | No | Up to 12 g of oxygen per hour; 122 g in total |
| Earth-Mars communication delay | Antenna: delay computed in code for the game date | computed (simple orbit approximation) | n/a | No | Card labels it as an approximation |
| CSA, Food production on the Moon | Greenhouse info cards | https://www.asc-csa.gc.ca/ | n/a | No | Space agency partner resource |

## Not used

| Source | Why |
|--------|-----|
| NASA Mars Rover Photos API | Archived |
| CCMC `kauai.ccmc.gsfc.nasa.gov` DONKI host | Times out from the browser |
| `DEMO_KEY` | Shared quota is exhausted (429) |

## Planned windows (Real Sun Calendar)

| Window | Dates | Mars RAD median / peak (uGy/h) | Story |
|--------|-------|-------------------------------|-------|
| 1. The Big Storm | 2024-05-03 to 2024-06-01 | 4.64 / 304 (May 20) | Largest event measured on Mars. Tutorial + demo; lands on Sol 18 |
| 2. September 2017 | 2017-09-01 to 2017-09-30 | 7.6 / 23 (Sep 11) | Classic big solar storm, felt on Mars too |
| 3. Hit Earth, not Mars | 2023-03-01 to 2023-03-31 | 5.67 / 8.8 | Nine particle storms at Earth, quiet Mars |
| Backup: The unseen storm | 2022-02 | 8.6 / 41 (Feb 16) | Only if its source is confirmed |
| Backup: quiet month | 2015-06 | 6.1 / 9 | Quiet month |
