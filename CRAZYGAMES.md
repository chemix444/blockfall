# Publishing Blockfall on CrazyGames

Blockfall integrates the [CrazyGames HTML5 SDK v3](https://docs.crazygames.com/sdk/intro/)
as of `v071026b`. The integration is fully self-gating: on any domain where the SDK
reports environment `"disabled"` (e.g. GitHub Pages), every SDK call is a no-op and the
game behaves exactly as it always has. Nothing about the GitHub Pages deployment changes.

## What's integrated

| SDK feature | Where it fires |
|---|---|
| `init()` + environment detection | `initCrazyGames()`, called at module load |
| `game.loadingStart()` / `loadingStop()` | Around the cloud-save load during init |
| `game.gameplayStart()` | Entering the game, starting any run, resuming from every menu (pause, level-up, NPC shops, difficulty/sandbox prompts, exit-confirm), returning to the lobby |
| `game.gameplayStop()` | Opening every menu listed above, plus death |
| `game.happytime()` | Full boss kills, Perfect Waves, new best score |
| `ad.requestAd('midgame')` | On the death screen, self-throttled to one request per 3 minutes; audio is muted in `adStarted` and restored in `adFinished`/`adError` |
| `data` module (cloud saves) | Every `persist()` mirrors the save; on init, an existing cloud save wins over the (empty, different-origin) localStorage |

Platform-specific behavior on CrazyGames:

- The **Lofi Girl YouTube music is disabled** (players get SFX only). Embedded
  third-party media is a QA risk there; the YouTube IFrame API is only injected when
  the game is NOT running on CrazyGames.
- The `version.txt` self-update check is harmless on their CDN: the file ships in the
  same bundle, so it always matches `BUNDLED` and never triggers a reload. Updates to
  the CrazyGames copy go through their developer portal, not GitHub Pages.

## How to submit

1. **Package the bundle.** Zip the two files at the repo root — `index.html` and
   `version.txt` — with `index.html` at the top level of the zip (no wrapping folder):
   ```
   zip blockfall.zip index.html version.txt
   ```
2. **Create a developer account** at https://developer.crazygames.com/ and add a new
   game (HTML5).
3. **Upload the zip** and fill in the store fields (name, description, category:
   `.io / Arena / Action`, controls, cover art per their
   [game cover requirements](https://docs.crazygames.com/requirements/game-cover/)).
4. **Test in their QA tool.** The dev portal preview runs the game on a CrazyGames
   domain, so the SDK goes live: verify gameplay start/stop events fire (their QA
   overlay shows them), a demo midgame ad plays after a death, and audio mutes during
   the ad. Local testing on `localhost` also works — the SDK reports `"local"` and
   serves demo ads.
5. **Submit for review.** CrazyGames launches new games in two stages:
   - **Basic Launch** — ~2 weeks of limited exposure, no monetization, engagement
     metrics collected (average playtime, conversion to gameplay, retention).
   - **Full Launch** — global release with ad revenue sharing, granted based on the
     Basic Launch metrics.

## Known review-risk items (and the plan if QA flags them)

- **three.js loads from cdnjs** (see the importmap in `index.html`). External CDN
  requests are usually tolerated, but if QA asks for a fully self-contained bundle,
  download `three.module.js` (r160) into the zip and change the importmap to
  `"three": "./three.module.js"`.
- **Pointer lock** is used for mouse aim. It works inside their iframe, but if their
  mobile app review flags it, the touch controls already provide the fallback.

## Updating the CrazyGames build

GitHub Pages updates flow automatically via `version.txt`. The CrazyGames copy does
not — after merging changes to `main`, re-zip and upload a new build in the developer
portal. Keep the version numbers in sync so player-reported issues can be traced.
