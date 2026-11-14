# Seyir Defteri: Son 30 Sol (Logbook: The Last 30 Sols)

**Real storms. Real choices.** Every storm in this game really happened.

A 3D browser game for ages 7-12. You wake up at a base near Gale Crater on Mars and must keep
it running for 30 sols until the rescue team arrives. Power is limited; air, food and
radiation protection all cost power and daylight hours. When a solar storm comes, waiting in
the shelter is safe but costs work time, and asking Earth for advice takes minutes each way.

**Play:** https://saidbilaldariyemez.github.io/seyir-defteri/ (no download, no account)

> Status: work in progress, built during NASA Space Apps Challenge 2026 (14-15 November) by
> the solo team **Seyir Defteri** (Antalya) for the challenge "Build a Junior Astronaut
> Mission Trainer". The link currently shows a "Coming soon" page.

## Controls

Click or tap a station to walk there and choose an action. `Esc` pauses. Turkish and English.

## NASA Data & Why

| Data | In the game | Why this data |
|------|-------------|---------------|
| DONKI (space weather events and notifications) | Each game replays a real month of the Sun; storm warnings; a live "Today on the Sun" card | Warnings in the game arrive the way real ones do: you know something happened on the Sun before you know what it means for you |
| RadLab, MSL-RAD (Curiosity's radiation detector on the Mars surface) | The radiation dose you receive, hour by hour, including the storm of 20 May 2024 | The dose is a measurement, not a made-up number, so the shelter decision has a real consequence |
| RadLab, CRaTER (Lunar Reconnaissance Orbiter) | Preview of the Moon mission | Shows how the same storm looks without a planet's protection |
| OSDR studies | Info cards on growing food and on radiation research | A real research finding behind each system |
| NASA Image and Video Library | Real photo from Gale Crater | Shows the real place the base stands in |

Live data is labeled LIVE; saved data is labeled SAVED with its date. Simplifications made
for the game are labeled on the cards. Full list: [docs/data-sources.md](docs/data-sources.md).

## No strategy wins for free

A headless bot plays the pure simulation hundreds of times per strategy (`npm run bot`).
The results table will be added here once the simulation is complete.

## Develop

```
npm install
npm run dev       # dev server
npm run build     # type-check + build into dist/
npm test          # unit tests
npm run bot       # headless playtest bot
npm run deploy    # publish dist/ to GitHub Pages
```

Debug panel: add `?debug` to the URL. Architecture and rules: [CLAUDE.md](CLAUDE.md).
Design: [docs/PRD-final.md](docs/PRD-final.md) (Turkish), revisions in [docs/decisions.md](docs/decisions.md).

## Credits

Models, sounds and data sources: [docs/asset-sources.md](docs/asset-sources.md),
[docs/data-sources.md](docs/data-sources.md), and the in-game "Info & Sources" screen.
This project is not endorsed by or affiliated with any space agency.

## Use of AI (SI)

The game concept, story and characters were created by the team. Anthropic's Claude was used
as a coding assistant (writing and testing code), for researching NASA data sources and for
proofreading English text. All code files carry an SI-assistance note. No images, video or
audio were generated with AI.

## License

[MIT](LICENSE)
