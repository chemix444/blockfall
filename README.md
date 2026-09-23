# Blockfall 2.0

A browser-first, third-person arena survival game. Play the new version at
[chemix444.github.io/blockfall](https://chemix444.github.io/blockfall/).
The original game is preserved at
[chemix444.github.io/blockfall/legacy/](https://chemix444.github.io/blockfall/legacy/).

## Play

Choose a 10-wave Expedition or an Endless run. Each run starts with a Blaster.
Your character always faces and fires at the closest enemy. Enemies drop
experience; leveling up and clearing waves offer new weapons and upgrades.
Uncollected pickups are swept up when a wave ends. Bosses appear every five
waves. Earn shards during a run, then spend them on permanent starting upgrades
in the Forge, including pickup range. Hostile difficulty makes enemies stronger
and banks 50% more shards. Enemies navigate around arena blocks when pursuing
you. Upgrade screens offer a random pick button, or Settings can automatically
pick one of the three offered cards and show the selection on screen.

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Automatic | Face and fire at the closest enemy |
| Space | Dash |
| E | Pulse, which damages nearby enemies and destroys their projectiles |
| 1, 2, 3 | Switch unlocked weapons, or choose an upgrade card |
| R | Choose a random offered upgrade |
| Esc | Pause / resume |

On touch screens, drag the left pad to move and tap Dash or Pulse. Standard
controllers use the left stick to move, A to dash, and B to pulse. Weapons
automatically aim and fire on every device.

## Structure

- `index.html` and `styles.css`: Blockfall 2.0 UI, directly served by GitHub Pages.
- `src/game.js`: Three.js scene, combat, waves, enemy AI, pickups, and effects.
- `src/navigation.js`: shared enemy routes around arena obstacles.
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
