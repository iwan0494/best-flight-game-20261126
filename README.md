[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/iwan0494/best-flight-game-20261126/rank.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/iwan0494/best-flight-game-20261126/reward.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)

# Langit Nusantara — Island Courier

A complete, original 3D flight game that runs offline in a desktop browser from static files. Fly the little courier plane **Cendrawasih LNU** (PK-LNU) between tropical islands: thread the target rings, watch your fuel, and land gently on the home runway.

## How to play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and open http://localhost:8080). No network needed — every file the game loads sits under `game/`.

- **W / S** — throttle up / down
- **↑ / ↓** — pitch (climb / descend)
- **← / →** — bank to turn
- **A / D** — rudder
- **Drag mouse** — steer smoothly
- **Space** — airbrake
- **C** — chase / cockpit camera
- **P** — pause, **R** — restart, **M** — mute

Take off: hold **W** until about 34 knots, then press **↑** to rotate.

## The three contracts

1. **Latihan Ring** — fly 5 rings on the way to Pulau A.
2. **Kargo Kilat** — deliver cargo to Pulau B against the clock, on a tight fuel budget.
3. **Badai Senja** — a crosswind return leg and a gentle landing on the home runway.

Rings pay 100 points each, a good landing pays a bonus, and a hard touchdown — or the sea — ends the sortie. Fuel, stall warnings, wind drift, and landing quality all turn each flight into decisions.

## What is inside

- `game/index.html` — the page and the lit-instrument HUD (altitude, speed, heading, attitude, throttle, fuel, compass tape)
- `game/src/config.js` — tuning, colours, mission data
- `game/src/terrain.js` — procedural archipelago, sea, sky, clouds, runway, palms, village, lighthouse
- `game/src/plane.js` — the courier aircraft, built from primitives
- `game/src/physics.js` — arcade flight model, collisions, landings
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesised WebAudio sound (engine, wind, chimes)
- `game/src/hud.js` — instruments and banners
- `game/src/missions.js` — contracts, ring courses, scoring
- `game/src/shots.js` — deterministic `?shot=` staging for screenshots
- `game/src/main.js` — renderer, cameras, game loop
- `game/vendor/three.min.js` — Three.js r149 (vendored library)
- `main.ts` — the hand-in program (Node 22, standard library only)
- `screenshots/` — four real renders of this game in a browser

All art, sounds, names and code are original. Three.js is the only third-party library, vendored unchanged under `game/vendor/`.
