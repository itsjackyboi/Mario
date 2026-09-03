# Pintland Isles: The Drunken Trials Tryout

A 2D side-scrolling platformer across the Pintland Isles. You play **Corb**, an unproven
pirate who rowed in for the Drunken Trials with no crew, no legend and no reputation — and
a great deal to say about the six Liquor Kings who already have all three.

Plain HTML/CSS/JS, Canvas 2D, **no build step and no backend**. Every sprite is drawn in
code, every sound is synthesised with WebAudio, and the only persistence is `localStorage`.

## Running it

- **Locally:** open `index.html` in a browser. That's it. (Scripts are classic `<script>`
  tags, not ES modules, precisely so `file://` works.)
- **Served:** any static server — `python3 -m http.server`, `npx serve`, etc.
- **GitHub Pages:** push the repo and point Pages at the branch root. No configuration.

Nothing is fetched at runtime, so it works offline.

## Controls

| Action | Keys |
| --- | --- |
| Move | `←` `→` or `A` `D` |
| Jump | `Space` / `Z` / `K` — hold for height |
| Drop through a plank | `↓` + Jump |
| Use Veilwalker Seed | `E` / `Shift` / `X` |
| Buy from a Roto stall | `↓` while standing in it |
| Pause | `Esc` / `P` |
| Restart level | `R` |
| Mute | `M` |
| Menus | `↑` `↓` `←` `→`, `Enter` to confirm, `Esc` to back out |

## Two ways to play

The title screen offers both:

- **Row ashore** — the normal game. Pick an area and a level; each level is timed on its
  own and logged to that level's top ten.
- **Drunken speedrun** — every level in the isles back to back on **one unbroken clock**,
  with no results card between them. Dying, respawning, restarting a level and sitting in
  a Trial all cost you real time. It runs all sixteen levels including the Owe Block bonus,
  ignoring the usual unlock, because a route that changed with your save state would not be
  comparable. Whole-game times get their own leaderboard entry, separate from the per-level
  boards, and splits are shown at the end.

## The levels

Sixteen levels across six areas. Everything is selectable from the start except Owe Block.

| Area | # | Level | Trial |
| --- | --- | --- | --- |
| **Shanty Town** | I | The Crash Cliffs | |
| | II | The Bone Stair | |
| | III | The Windsunk Steps | The Plank Pour |
| **Aleforge** | I | Brewers Lane | |
| | II | Wolendi Wind Farm | |
| | III | CockPowers Clock Tower | The Golden Taps |
| **Providence** | I | The Ordered Stair | |
| | II | The Tithe Walk | |
| | III | The Chime Vault | The Order of Chimes |
| | ★ | **Owe Block** (bonus, brutal) | the gauntlet itself |
| **Fenwick** | I | Brandywine Brush | |
| | II | The Root Lantern | The Lantern of Roots |
| **Roto Kaiishi** | I | The Long Pier | |
| | II | Netmenders' Row | |
| | III | Under the Boards | The Haggle |
| **Sackbeard's Tavern** | — | Sackbeard's Tavern (finale) | |

**Owe Block unlocks when Providence III — The Chime Vault — is cleared.** That is the
documented rule, chosen over "collect every Providence shard" because a missed collectible
should not be able to lock a player out of the hardest level in the game. It is drawn on
the level-select screen as an indented branch off Providence, in Crimson Cutter red.

The finale is always selectable, but the ending screen totals every level's best time, so
it reads as a summary of the whole tryout rather than one run.

### Recurring conventions

Implemented once, reused by every area without modification:

- **Level end — the tankard.** No flagpoles. Every level finishes by leaping into a giant
  tankard of beer (glyph `Z`). Touching it triggers a splash-into-foam wipe, then the
  level-complete card with time, grog and the local top ten. `tankardScale` on a level def
  makes the cup bigger — the finale's is 1.7×.
- **Checkpoint — the Captain's Flag.** A flag planted mid-level (glyph `F`). Owe Block
  dresses its checkpoint as the Stank Tank (glyph `Y`) instead; any entity that sets
  `isCheckpoint` joins the respawn set.
- **Trials.** A gate (glyph `G`) opens the trial named by `trial:` on the level def. The
  level clock keeps running through it. Pass and the gate opens; fail and you die and
  respawn at the checkpoint.

### Items

| Item | Glyph | Effect |
| --- | --- | --- |
| Grog Barrel | `o` | The currency pickup. Tracked in the HUD, banked into the area purse on completion. |
| Hollow Urn | `U` | Timed. Unkillable by enemies and spikes, but **slowed and weakened**, with a drained, colourless tint. Water and pits still kill you. |
| ClockHeart Tonic | `T` | Timed. Big speed boost plus a screen-wide colour shift pulsing between day-order gold and night-revelry teal. |
| Wolendi Wind Pouch | `W` | Single use, carried. One extra mid-air jump, spent automatically when you jump with nothing under you. |
| Veilwalker Seed | `S` | Single use, carried. `E` grows a shelf of packed red earth just ahead and below you; it withers after ~5 seconds. |
| Red-Earth Shard | `R` | Pure collectible, one per level, sixteen in the game. Collecting every shard in an area lights that area's bonus indicator. |

### Hazards by area

| Area | What it throws at you |
| --- | --- |
| **Shanty Town** | Rival crew patrols, coral-eyed sea-wretches rising from the surf, loose planks that drop when stood on, harpoon pits, water. |
| **Aleforge** | Keg chutes rolling barrels downhill at you, Wolendi gust columns (a rising phase then a lateral shear), gear platforms on circular tracks, sweeping clock hands, burner jets. |
| **Providence** | Apostles marching exactly one tile per chime and turning every fourth, Friars whose lamp beams fine you grog on sight, iron palings. Everything runs on one clock derived from `world.time`. |
| **Owe Block** | Crimson Cutters and Seaside Circus fighting *each other*, bandana pickups that pick your side, mine-shaft voids, rooftop ambushes. |
| **Fenwick** | No enemies at all. Living vines that extend and retract on a cycle, phantom footing that only exists in spirit-light, bramble, bog. |
| **Roto Kaiishi** | Stilt platforms that drift with the swell and sink under your weight, cargo hooks, sea-wretches, merchant stalls that sell you a way out for 10 grog. |
| **Sackbeard's Tavern** | All of the above, at once. |

### The bandana rule (Owe Block)

Wearing a colour makes that gang read you as one of theirs — they ignore you completely —
and makes the other gang hostile **on sight**, charging across the alley instead of
patrolling. Wearing nothing means everyone is hostile but nobody hunts you. Gang members
who lose a brawl with a rival drop their purse, so letting the war happen pays better than
joining it. Bandanas are not consumed: you can go back and switch sides.

## Design decisions worth knowing

**Releasing the keys stops Corb dead.** On the ground there is no friction slide at all —
the old deceleration carried you off ledges after you had already let go, which reads as the
game killing you rather than you missing. Air momentum is deliberately untouched: killing
that too would make every jump uncontrollable. (`src/player.js`)

**Corb's one-liners live in a fixed caption box.** Bottom-left, out of the play area, with
his face on it — a speech bubble over the action was covering the jumps. The box grows to
fit its line and drops a type size before it would ever need a fourth row. (`src/quips.js`)

**Grog is per level.** The counter resets at level start and is *kept* through deaths and
checkpoint respawns, so a run's grog total is a clean, comparable leaderboard stat. On
completion it is banked into a persistent per-area purse. (`src/items.js`)

**Taking a hit costs grog, not your life.** Enemy or spike contact with grog in your purse
knocks up to six barrels loose — they bounce and can be scooped back up for a few seconds —
and gives you ~1.5s of invincibility. The same contact with an empty purse is fatal. Water
and pits are always fatal. Providence's Friars are the exception: they take grog without
touching you, and cannot kill. (`src/player.js`, `src/town-providence.js`)

**The Hollow Urn does not save you from drowning.** It ignores enemies and spikes only.

**The clock never stops.** It runs from the moment control is handed over until you touch
the tankard, including through deaths, checkpoint respawns and Trials. Only your position
resets. (`src/scene-play.js`, `src/trials.js`)

**Roto's bobbers never sink far enough to drown you.** They settle a capped 20px, which is
pressure on your timing rather than a delayed death. (`src/town-roto.js`)

## File structure

```
index.html                     script order lives here; add new files to it
styles.css                     page chrome only — the game draws itself
README.md

src/
  util.js                      clamp/lerp, seeded RNG, time formatting, colour mixing
  palette.js                   the base colour set + low-level draw helpers
  themes.js                    per-area palette + tile-style overrides
  input.js                     keyboard → named actions, latched edge detection
  audio.js                     synthesised SFX (no asset files)
  storage.js                   localStorage leaderboard, progress, and aggregates
  game.js                      canvas setup, fixed-timestep loop, scene stack
  camera.js                    dead-zone follow, clamping, screen shake
  tiles.js                     tile ids, the glyph legend, per-style tile painting
  entities.js                  Entity base, type registry, tile collision (Physics)
  fx.js                        particles and floating labels
  items.js                     the six pickups + knocked-loose grog
  enemies.js                   Enemy base, rival crew, coral-eyed sea-wretch
  props.js                     loose planks, movers, checkpoint, tankard, trial gate, scenery
  player.js                    movement, powerups, damage, rendering
  quips.js                     the one-liner pool and the speech bubble
  backdrop.js                  backdrop registry + Shanty Town's parallax
  hud.js                       grog / clock / items / powerups / worn colours
  trials.js                    trial framework + The Plank Pour
  level.js                     level definition → live World
  town-aleforge.js             \
  town-providence.js            |  one file per area: its entities,
  town-oweblock.js              |  its backdrop, and its trial
  town-fenwick.js               |
  town-roto.js                  |
  town-tavern.js               /   (the finale reuses everyone else's entities)
  scene-title.js               title, premise, control legend
  scene-levelselect.js         areas, levels, the Owe Block branch, shard indicators
  scene-leaderboard.js         standalone records view
  scene-play.js                the level runner (+ pause overlay)
  scene-complete.js            level-complete card + shared leaderboard table
  scene-ending.js              the finale's whole-tryout summary
  speedrun.js                  Drunken Speedrun run state + its results card

data/
  towns.js                     the area registry and unlock rules
  shantytown/level-1..3.js
  aleforge/level-1..3.js
  providence/level-1..3.js, oweblock.js
  fenwick/level-1..2.js
  roto/level-1..3.js
  tavern/level-1.js
```

Every file attaches to a single global `PL` namespace. Load order matters and is defined by
the `<script>` tags in `index.html`: engine, then area content, then scenes, then
`data/towns.js`, then level files, then `src/main.js`.

## The level-data format

**It scaled across all six areas without a single change to how a level is written** —
every area's levels are the same glyph grid; what differs is which glyphs they use, which
is a data question, not a format one. The one addition since Shanty Town was a pure
convenience (bottom-aligned segments), and the original 20-row Shanty Town files still
parse unmodified.

A level is plain data. It never contains logic.

```js
PL.Towns.addLevel('aleforge', {
  id: 'aleforge-1',              // unique, "<area>-<n>"
  name: 'Brewers Lane',
  blurb: 'Shown on the level-select screen.',
  height: 20,                    // rows per segment (default 20)
  segWidth: 30,                  // columns per segment (default 30)
  trial: 'goldenTaps',           // optional — what the `G` glyph opens
  theme: 'oweblock',             // optional — use another area's palette/backdrop
  bonus: true,                   // optional — draws as a branch, needs unlocking
  unlockAfter: 'providence-3',   // required with `bonus`
  unlockNote: 'Clear ... first.',
  ending: true,                  // optional — finishes to the ending screen
  tankardScale: 1.7,             // optional — a bigger cup
  quips: { '1': '@af1', '2': 'literal spoken line' },
  segments: [ /* array of segments */ ]
});
```

### Segments

`segments` is an array of **segments**, each an array of strings, one string per row.
Segments are concatenated **left to right** to form the level.

Segments are **bottom-aligned and right-padded**: a segment with fewer than `height` rows
gets empty sky added above it, and a row shorter than `segWidth` gets empty space added
after it. Level content sits at the bottom of the frame, so a flat stretch of ground is
four rows of text rather than twenty. A segment that is *too tall*, or a row that is *too
long*, throws — those are always mistakes, never intent. `src/main.js` builds every
registered level once at boot, so bad data fails immediately and loudly.

One tile is 32px. The viewport is 640×360, so 20 columns and 11¼ rows are on screen.

### Glyphs

**Terrain** (`src/tiles.js`, `PL.Tiles.LEGEND`) — painted per area by the active theme's
tile style, so `#` is salvaged hull in Shanty Town, brick in Aleforge, ashlar in
Providence, cracked concrete in Owe Block, loam in Fenwick, decking in Roto, and the
beast's own plating in the Tavern:

| Glyph | Tile | Collision |
| --- | --- | --- |
| `.` or space | empty | — |
| `#` | the area's main ground | solid |
| `B` | bone / dressed block | solid |
| `C` | crate | solid |
| `I` | mast / piling / pipe | solid |
| `=` | platform | one-way (jump up through; `↓`+Jump to drop) |
| `~` | water | lethal |
| `x` | the area's spikes | lethal |
| `:` | rope | decorative |

**Entities** (`src/level.js`, `MARKERS`) — stripped out of the grid and spawned as objects:

| Glyph | Entity | Area |
| --- | --- | --- |
| `@` | player spawn | any |
| `o` `U` `T` `W` `S` `R` | grog, urn, tonic, wind pouch, seed, shard | any |
| `p` | rival crew patroller | any |
| `c` | coral-eyed sea-wretch | any (needs water below) |
| `L` | loose plank | any |
| `H` `V` | horizontal / vertical moving platform | any |
| `F` | Captain's Flag checkpoint | any |
| `Z` | the tankard (level end) | any |
| `G` | trial gate | any |
| `l` `d` | lantern, dock post (decoration) | any |
| `k` | keg chute | Aleforge |
| `g` | wind gust column | Aleforge |
| `e` | gear platform | Aleforge |
| `n` | sweeping clock hand | Aleforge |
| `a` | Apostle | Providence |
| `f` | Friar | Providence |
| `b` | bell (scenery + the visible beat) | Providence |
| `m` `j` | Crimson Cutter / Seaside Circus | Owe Block |
| `y` `v` | red / blue bandana | Owe Block |
| `Y` | Stank Tank safe house (checkpoint) | Owe Block |
| `t` | living vine | Fenwick |
| `i` | spirit light | Fenwick |
| `h` | phantom footing | Fenwick |
| `s` | bobbing stilt platform | Roto |
| `u` | merchant stall | Roto |
| `1`–`9` | quip trigger zone, text from the level's `quips` map | any |

**Placement rules that will save you time:**

- Things that stand on the ground (`@ p a f m j F Z G Y C l d u`) go on the **air row
  directly above** the ground row, not on the ground row itself.
- `Z` needs 3 free columns and 4 free rows (more if `tankardScale` is set); `G` needs 2×4;
  `F` needs 2 rows; `Y` needs 3×3.
- `c` goes on the **air row directly above the water surface** — it rises from the tile
  below the marker.
- `g` marks the **top** of its column; the column runs 2 wide and 7 tall downward. Give
  every gust column a perch plank at the bottom so the cycle can be waited out.
- `e` and `n` need ~3 tiles of clearance all round — they sweep a circle.
- `t` goes on the **first empty tile out from a bank**; the vine works out which way to
  grow from the nearest ground beneath it.
- A patroller that should walk a platform goes **one row above** that platform row.

### Quips

`quips` maps a digit to either a literal string or `'@key'`, resolved against the shared
pool in `src/quips.js` (which now carries a set per area). Place the digit next to the
thing being mocked — a keg stack, a bone shrine, a bell tower, a gang tag, the beast's own
ribs — so the line reads as a reaction rather than a random barb. Each zone fires once.

## Adding a new area

1. Add an entry to `list` in `data/towns.js`.
2. Register a theme in `src/themes.js`: a palette override plus which tile styles to use.
   Add a new style function to `src/tiles.js` only if none of the seven suits.
3. Create `src/town-<area>.js` and register that area's entities
   (`PL.Entities.define`), its backdrop (`PL.Backdrops.register`), and its trial
   (`PL.Trials.register`).
4. Create `data/<area>/level-1.js` calling `PL.Towns.addLevel('<area>', { ... })`.
5. Add the `<script>` tags to `index.html`.

Nothing in `src/` outside your own area file needs to change. Tiles, entities, items,
trials, backdrops and themes each register themselves in one place and are then addressable
from level data by glyph or by name.

## Leaderboard and save data

Local only. No network calls anywhere in the codebase.

Two namespaced keys:

- `pintland-drunken-trials:leaderboard`
- `pintland-drunken-trials:progress`

Both are versioned and keyed **area → level**, which is why adding thirteen levels across
five new areas needed **no migration and did not disturb existing Shanty Town scores** —
new areas are simply new keys under `towns`.

```jsonc
// pintland-drunken-trials:leaderboard
{
  "version": 1,
  "towns": {
    "shantytown": {
      "levels": {
        "shantytown-1": {
          "runs": [ { "timeMs": 61230, "grog": 34, "shards": 1, "deaths": 0, "date": "2026-09-03" } ],
          "plays": 7, "bestTimeMs": 61230, "bestGrog": 34, "totalGrog": 180
        }
      }
    },
    "providence": { "levels": { "providence-oweblock": { "runs": [ ... ] } } }
  }
}

// pintland-drunken-trials:progress
{
  "version": 1,
  "towns": {
    "providence": {
      "completed": ["providence-1", "providence-3"],
      "shards": ["providence-1:0"],
      "purse": 240
    }
  }
}
```

`runs` keeps the ten fastest per level, sorted ascending. Shards are stored as
`"<levelId>:<index>"`. Owe Block banks into `providence` (it is a Providence sublevel) while
being themed separately. Whole-game speedruns use a synthetic area/level pair —
`towns._speedrun.levels['full-game']` — which needed no schema change and keeps run times
out of the per-level boards. `PL.Store.grandTotals()` rolls the per-level records up for the
ending screen and the level-select header.

If `localStorage` is unavailable the game says so on the title screen and stays fully
playable — scores just aren't kept. There is no in-game wipe; clearing site data for the
page removes both keys.

The records view lists all sixteen levels plus the speedrun in one scrolling panel: only a
window of rows is drawn and it follows the selection, with a scrollbar and a position
counter.

## Credits and canon

Setting, characters and item lore are drawn from the Pintland Isles canon: the Master Lore
Compendium and the Hoegaarden Hall of Records. Shanty Town, Aleforge and the Drunken
Trials, Providence and its Apostles, Owe Block and the Crimson Cutters / Seaside Circus
gang war, Fenwick and the Veilwalkers, Roto Kaiishi, Sackbeard and the Shelled Tavern, the
Hollow Urn, ClockHeart Tonic, the Wolendi wind farms and the six Liquor Kings are all
theirs. The level design, the five Trials and the protagonist's opinions are this build's.
