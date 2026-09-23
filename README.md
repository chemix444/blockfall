# Blockfall 2.0

A browser-first, third-person arena survival game. Play the new version at
[chemix444.github.io/blockfall](https://chemix444.github.io/blockfall/).
The original game is preserved at
[chemix444.github.io/blockfall/legacy/](https://chemix444.github.io/blockfall/legacy/).

## Play

Choose a 10-wave Expedition or an Endless run. Each run starts with a Blaster.
Enemies drop experience; leveling up and clearing waves offer new weapons and
upgrades. Bosses appear every five waves. Earn shards during a run, then spend
them on permanent starting upgrades in the Forge. Hostile difficulty makes
enemies stronger and banks 50% more shards.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim |
| Left click | Fire |
| Space | Dash |
| E | Pulse, which damages nearby enemies and destroys their projectiles |
| 1, 2, 3 | Switch unlocked weapons |
| Esc | Pause / resume |

On touch screens, drag the left pad to move and the right pad to aim and fire.
The Dash and Pulse buttons sit above the right pad. Standard controllers use
the left stick to move, the right stick to aim, a trigger to fire, A to dash,
and B to pulse.

## Structure

- `index.html` and `styles.css`: Blockfall 2.0 UI, directly served by GitHub Pages.
- `src/game.js`: Three.js scene, combat, waves, enemy AI, pickups, and effects.
- `src/main.js`: menus, controls, HUD, and save integration.
- `src/data.js`: weapons, biomes, enemies, upgrades, and Forge costs.
- `src/audio.js`: music and sound synthesized locally with Web Audio.
- `src/save.js`: validated local save, export, and import.
- `vendor/`: pinned Three.js r160 module and its license.
- `fonts/`: locally served Barlow Condensed and DM Sans fonts with their licenses.
- `legacy/`: the original single-file Blockfall and its original version file.

No build step, backend, platform SDK, or external audio stream is required.
To run locally, serve the repository directory with a static HTTP server, for
example `python3 -m http.server 8000`, then open `http://localhost:8000`.
Browsers block JavaScript module imports when opening `index.html` directly
with a `file://` URL.

Blockfall 2.0 saves under `blockfall_2_save`; Legacy keeps its original
`blockfall_save_v1` save. Both games remain independently playable.
