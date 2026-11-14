# Asset Sources
> Every model, texture, sound and font used in the game. Prefer CC0. Shown in the in-game
> "Info & Sources" screen.

**Status on 2026-11-14 (F5a):** low-poly models are in the repo (below). Every model has a
primitive fallback made in code, used until (or if never) the file loads. Sounds are
synthesized with the Web Audio API (`src/audio/sound.ts`, no audio files). Fonts: system fonts
only. No AI-generated images, video or audio. The in-game "Info & Sources" screen (main menu,
F5b, D-019) lists these packs from `src/content/credits.json`; keep both in step.

## In the repo

| Pack | Author | Source URL | License | Files |
|------|--------|------------|---------|-------|
| KayKit Space Base Bits 1.0 (FREE) | Kay Lousberg (kaylousberg.com) | https://kaylousberg.itch.io/space-base-bits | CC0 1.0 (`public/assets/models/kaykit/LICENSE.txt`) | `public/assets/models/kaykit/*.glb` (10 files) |
| Ultimate Space Kit | Quaternius (quaternius.com) | https://quaternius.com/packs/ultimatespacekit.html | CC0 1.0 (`public/assets/models/quaternius/LICENSE.txt`) | `public/assets/models/quaternius/*.glb` (8 files) |
| Mars 2020 Perseverance Rover | NASA/JPL-Caltech | https://github.com/nasa/NASA-3D-Resources (also https://science.nasa.gov/3d-resources/) | NASA media usage guidelines: generally not copyrighted in the US; no endorsement implied (`public/assets/models/nasa/README.txt`) | `public/assets/models/nasa/perseverance.glb` (Draco-compressed) |

Copied from `~/Projects/hackathon-assets/` (collected for the trial build, same sources and
licenses; `asset-sources.md` there).

## Where each model is used

| In the game | Model(s) | Notes |
|-------------|----------|-------|
| Ada | quaternius/Astronaut_FinnTheFrog | Suit tinted white in the shader; the pistol node is hidden; the animal head is collapsed under a helmet made in code (`scene/models/helmet.ts`). Idle / Run clips. |
| PUSULA | quaternius/Enemy_ExtraSmall | Green texels turned blue; Flying_Idle clip; the antenna light is a primitive. |
| Habitat | kaykit/basemodule_B + kaykit/roofmodule_base | Stacked, scaled x2.9. |
| Solar panels | kaykit/solarpanel x3 | Tinted dusty orange to clean by `panelEff`. |
| Oxygen machine (MOXIE) | quaternius/House_Cylinder + kaykit/containers_B | |
| Greenhouse | quaternius/GeodesicDome + Plant_1, Plant_3 | Dark panes made see-through. |
| Shelter | kaykit/basemodule_E + kaykit/rocks_A x3 | One regolith pile shows per shelter level. |
| Antenna | quaternius/Roof_Radar | |
| Landing marker | kaykit/landingpad_small | Plus a primitive orange light. |
| Curiosity spot | quaternius/Rover_1 | A stylised rover, not the real Curiosity model. |
| Science spot | kaykit/drill_structure + kaykit/rocks_B | |
| Landing rocket | kaykit/lander_A | |
| Cutscene ships (F5c): crashing rocket, rescue ship | kaykit/lander_A (pooled clones) | Primitive rocket fallback; the flame, stars, Mars globe, dust burst, debris, base lights, the emergency capsule and its parachute, the wreck's scorch mark and panels are made in code (no files). |
| Rover decor at the valley edge | nasa/perseverance | Logo decal sheet (`arm_graphics`: NASA / JPL / mission name) removed; a tiny flag texel area greyed out in the shader (Hard Rule 13). Merged per material, no shadows. |

## Software files shipped as assets

| File | Author | Source | License |
|------|--------|--------|---------|
| Draco decoder (`draco_decoder.wasm`, `draco_wasm_wrapper.js`, bundled by Vite into `dist/assets/`) | Google (Draco) | part of the `three` npm package (`examples/jsm/libs/draco/`), loaded by `DRACOLoader` | Apache 2.0 |
