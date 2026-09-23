# Blockfall — Development Guidelines

These are the standing rules and preferences for developing Blockfall. Follow them on
every task unless the user overrides them.

## Project

- **Repo:** `chemix444/blockfall`
- **Structure:** single-file Three.js game — `index.html` (all code inline) + `version.txt`.
- **Hosting:** GitHub Pages at `https://chemix444.github.io/blockfall/`.

> Environment note: the current working directory is `/home/user/blockfall`. Some legacy
> rules below reference `/home/z/my-project/...` paths from a previous environment — map
> those to the current working directory / repo when they apply.

## GitHub Workflow

- **Auto-merge PRs:** after pushing a branch, open a PR and merge it automatically
  (merge-commit style). Don't ask for confirmation — just do it.
- **After merging:** pull `main` locally, delete the feature branch (local + remote).
- **Git credentials:** token stored via
  `git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/chemix444/blockfall.git"`.

## Version Number Formula

- Format: `v` + `MMDDYY` + letter suffix (e.g. `v061926a`).
- `a` = first update of the day, `b` = second, `c` = third, etc.
- **Always check the actual current date** before setting the version — don't assume.
- Three sync points must all be updated together each release:
  1. `BUNDLED` constant in the cache-bust `<script>` at the top of `<head>`
  2. `VERSION` constant in the main game script
  3. The contents of `version.txt`

## Changelog Rules

- New entry at the **top** of the changelog panel.
- All previous entries dimmed to a uniform **60% opacity** (not 40%).
- Changelog **Back button at the top** of the panel (not bottom).
- Each entry: version number + title + date in parentheses, then a `<ul>` of bullet points.

## Gameplay / Design Rules

- **No hit-stop** on enemy hits or kills (makes the game choppy). Hit-stop is only OK on
  charged-shot release (a deliberate player action).
- **Cumulative damage numbers:** hits on the same enemy stack into one number. Color/style
  reflects the latest hit (normal/crit/special). Reset the fade timer on each stack.
- **Bullet trails** instead of muzzle-flash particles. Trail = fading particles behind the
  projectile, tinted to match the projectile color.
- **XP orb speed must NOT scale with pickup range.** Range only affects WHEN pulling starts,
  not how fast orbs move. Speed is capped to prevent orbiting.
- **Homing missiles:** fire out of the player's BACK, fly backward briefly, turn around, then
  home toward the enemy with prop avoidance. Have 2x attack range.
- **Endless mode:** no "Press E to end run" hint. Players use the pause menu's End Run button.
- **End Run button:** shows a confirmation dialog before ending the run.
- **Difficulty is a per-run prompt**, not a settings toggle. Appears when stepping into
  either portal.
- **Weapon panel** (left side of arena HUD): show only weapons the player has unlocked, with
  names, as list rows matching the upgrade-list style.
- **Colorblind mode:** apply a CSS filter on the canvas element — do NOT swap/overwrite the
  player's color settings.
- **Colors customization:** in a separate "Colors" submenu within Settings (not inline).
  Include customizable colors for everything reasonable (sky, player parts, trails, bullets,
  enemies, arena, portals, UI, etc.).
- **Sandbox mode:** green portal in lobby. Setup screen (map size, biome, props, HP, level).
  In-game press Q for a Gmod-like spawn menu (spawn enemies, give weapons, apply upgrades,
  adjust all stats via sliders, quick actions).

## UI / UX Rules

- **Mode + difficulty display** at the top of the screen: "WAVE · NORMAL", "ENDLESS · HARD",
  "SANDBOX", "LOBBY".
- **NPCs:** each NPC must properly exit pointer lock, pause the game, and disable touch
  controls when opening its menu. Reverse on close. Check for other overlays being open
  before re-locking pointer.
- **Menu stacking prevention:** `escapePressed()` must check all menus. `anyOverlayOpen()`
  must include all menus. Escape closes the topmost open menu.
- **Tab buttons** (e.g. Classes/Mastery tabs): use `addEventListener('click')`, NOT `onTap()`
  (onTap's touch detection eats desktop clicks).
- **Charge shot:** hold Shift (desktop) or CHARGE button (mobile). Charge meter GUI at
  bottom-center showing 0–100%.
- **Hats:** sit on the avatar head at y≈1.92. Persisted in `settings.hat`.
- **Streak counter:** must reset on arena exit AND death (don't leave it frozen on screen).
- **NPC marker colors:** Class NPC = cyan, Cosmetics NPC = pink, XP Range NPC = green.
  Sandbox portal = green.

## Technical Rules

- **Cache-busting:** `version.txt` self-update check (fetch with cache-bust timestamp,
  compare to `BUNDLED`, reload on mismatch) + HTTP cache-control meta tags.
- **YouTube livestream:** race-condition fix — after defining
  `window.onYouTubeIframeAPIReady`, check if `window.YT && window.YT.Player` already exist
  and call init directly.
- **Object pooling:** projectiles use a pool (`obtainProjMesh` / `releaseProjMesh`). The
  particle system searches for dead slots instead of blindly overwriting.
- **Save persistence:** localStorage with key `blockfall_save_v1`. Stats, shards, classes,
  settings, mastery, and XP pickup level all persisted. Export/import via base64 code string.
- **Script persistence:** always save the generation script to `scripts/` (legacy:
  `/home/z/my-project/scripts/`) before executing. On failure, edit in place and re-run.
- **Syntax check:** before committing, run `node --check` on all inline `<script>` blocks
  (extract via Python regex, skip the importmap JSON block).

## File Output

- Deliverables (documents) go to `download/` (legacy: `/home/z/my-project/download/`) or stay
  in the repo working directory.
- Worklog at `worklog.md` (legacy: `/home/z/my-project/worklog.md`) — append after each task.

## Content Standards

- Paragraphs: minimum 3–5 sentences.
- Sections: minimum 150–200 words.
- No artificial ending markers ("------End of Report------").
- Match the user's language (English).
