# Pintland Isles: The Drunken Trials Tryout

A 2D side-scrolling platformer set in **Shanty Town**, the pirate cliff settlement of the
Pintland Isles. You play an unnamed, unproven pirate who rowed in for the Drunken Trials
with no crew, no legend and no reputation — and a great deal to say about the six Liquor
Kings who already have all three.

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
| Pause | `Esc` / `P` |
| Restart level | `R` |
| Mute | `M` |
| Menus | `↑` `↓` `←` `→`, `Enter` to confirm, `Esc` to back out |

## What's in this build

Shanty Town, three levels, complete:

1. **The Crash Cliffs** — introduces movement, water, patrols and the surf.
2. **The Bone Stair** — verticality, rigging platforms, the wretch run.
3. **The Windsunk Steps** — the hardest gauntlet, then **the Trial**, then the tankard.

Every level: platforming gauntlet → Captain's Flag checkpoint → level end. Level 3 adds a
self-contained skill test (**The Plank Pour**) immediately before the level end.

### The recurring conventions

These two are deliberately generic — they are implemented once and every future town
reuses them without changes.

- **Level end — the tankard.** No flagpoles. Every level finishes by leaping into a giant
  tankard of beer (glyph `Z`). Touching it triggers a splash-into-foam wipe, then the
  level-complete card with time, grog and the local top ten.
- **Checkpoint — the Captain's Flag.** A small flag planted mid-level (glyph `F`).
  Touching it raises your colours and sets the respawn point. Die after it and you come
  back there with your grog intact.

### Items

| Item | Glyph | Effect |
| --- | --- | --- |
| Grog Barrel | `o` | The currency pickup. Tracked in the HUD, banked into the town purse on completion. |
| Hollow Urn | `U` | Timed. Unkillable by enemies and spikes, but **slowed and weakened**, with a drained, colourless tint. Water and pits still kill you. |
| ClockHeart Tonic | `T` | Timed. Big speed boost plus a screen-wide colour shift pulsing between day-order gold and night-revelry teal. |
| Wolendi Wind Pouch | `W` | Single use, carried. One extra mid-air jump, spent automatically when you jump with nothing under you. Shown in the HUD. |
| Veilwalker Seed | `S` | Single use, carried. `E` grows a shelf of packed red earth just ahead and below you; it withers after ~5 seconds. |
| Red-Earth Shard | `R` | Pure collectible, one per level. Collecting every shard in a town lights the bonus indicator on the level-select screen. |

### Enemies and hazards

| Thing | Glyph | Behaviour |
| --- | --- | --- |
| Rival crew | `p` | Patrols back and forth, turns at walls and ledges. Stompable. |
| Coral-eyed sea-wretch | `c` | Rises out of the surf on a timed cycle. Harmful when up, stompable at the top of its arc. |
| Loose plank | `L` | Shudders when stood on, tips, drops away, respawns a few seconds later. |
| Harpoon rack | `x` | Lethal spiked pit in the boards. |
| Water | `~` | Instant death, always — no powerup saves you. |
| Falling out of the level | — | Instant death. |

## Design decisions worth knowing

These are the calls the brief left open. They are also commented at the point of
implementation.

**Grog is per level.** The counter resets at level start and is *kept* through deaths and
checkpoint respawns, so a run's grog total is a clean, comparable leaderboard stat. On
completion it is banked into a persistent per-town purse shown on the level-select screen.
(`src/items.js`)

**Taking a hit costs grog, not your life.** Enemy or spike contact with grog in your purse
knocks up to six barrels loose — they bounce and can be scooped back up for a few seconds —
and gives you ~1.5s of invincibility. The same contact with an empty purse is fatal. Water
and pits are always fatal. (`src/player.js`)

**The Hollow Urn does not save you from drowning.** It ignores enemies and spikes only.
Otherwise you could park in the sea. (`src/player.js`)

**The clock never stops.** It runs from the moment control is handed over until you touch
the tankard, including through deaths, checkpoint respawns and the Trial. Only your
position resets. This rewards checkpoint efficiency rather than raw completion.
(`src/scene-play.js`, `src/trials.js`)

## File structure

```
index.html                     script order lives here; add new files to it
styles.css                     page chrome only — the game draws itself
README.md

src/
  util.js                      clamp/lerp, seeded RNG, time formatting, colour mixing
  palette.js                   THE colour set + low-level draw helpers
  input.js                     keyboard → named actions, latched edge detection
  audio.js                     synthesised SFX (no asset files)
  storage.js                   localStorage leaderboard + progress
  game.js                      canvas setup, fixed-timestep loop, scene stack
  camera.js                    dead-zone follow, clamping, screen shake
  tiles.js                     tile ids, the terrain glyph legend, tile rendering
  entities.js                  Entity base, type registry, tile collision (Physics)
  fx.js                        particles and floating labels
  items.js                     all six pickups + knocked-loose grog
  enemies.js                   rival crew, coral-eyed sea-wretch
  props.js                     loose planks, movers, checkpoint, tankard, trial gate, scenery
  player.js                    movement, powerups, damage, rendering
  quips.js                     the one-liner pool and the speech bubble
  backdrop.js                  per-town parallax scenery
  hud.js                       grog / clock / items / powerup bars
  trials.js                    trial framework + "The Plank Pour"
  level.js                     level definition → live World
  scene-title.js               title, premise, control legend
  scene-levelselect.js         towns + levels + shard bonus indicator
  scene-leaderboard.js         standalone records view
  scene-play.js                the level runner (+ pause overlay)
  scene-complete.js            level-complete card + shared leaderboard table

data/
  towns.js                     the town registry (all six towns, five sealed)
  shantytown/level-1.js
  shantytown/level-2.js
  shantytown/level-3.js
```

Every file attaches to a single global `PL` namespace. Load order matters and is defined by
the `<script>` tags in `index.html`: engine, then scenes, then `data/towns.js`, then level
files, then `src/main.js`.

## The level-data format

A level is plain data. It never contains logic.

```js
PL.Towns.addLevel('shantytown', {
  id: 'shantytown-1',            // unique, "<town>-<n>"
  name: 'The Crash Cliffs',
  blurb: 'Shown on the level-select screen.',
  trial: 'plankPour',            // optional — what the `G` glyph opens
  quips: { '1': '@bonehardy1', '2': 'literal spoken line' },
  segments: [ /* array of segments */ ]
});
```

### Segments

`segments` is an array of **segments**, each an array of equal-length strings, one string
per row, top row first. Segments are concatenated **left to right** to form the level.
Shanty Town uses 30 columns × 20 rows per segment, which is about 1.5 screens wide — narrow
enough to author and proof-read by hand.

Every segment must have the same number of rows, and every row in a segment must be the same
length; `level.js` throws a descriptive error otherwise, and `src/main.js` builds every
registered level once at boot so bad data fails immediately and loudly.

One tile is 32px. The viewport is 640×360, so 20 columns and 11¼ rows are on screen at once.

### Glyphs

**Terrain** (`src/tiles.js`, `PL.Tiles.LEGEND`):

| Glyph | Tile | Collision |
| --- | --- | --- |
| `.` or space | empty | — |
| `#` | salvaged hull planking | solid |
| `B` | beast rib block | solid |
| `C` | lashed cargo crate | solid |
| `I` | mast / piling | solid |
| `=` | plank platform | one-way (jump up through; `↓`+Jump to drop) |
| `~` | water | lethal |
| `x` | rusted harpoon rack | lethal |
| `:` | rigging rope | decorative |

**Entities** (`src/level.js`, `MARKERS`) — these are stripped out of the grid and spawned as
objects:

| Glyph | Entity |
| --- | --- |
| `@` | player spawn |
| `o` `U` `T` `W` `S` `R` | grog, urn, tonic, wind pouch, seed, shard |
| `p` | rival crew patroller |
| `c` | coral-eyed sea-wretch |
| `L` | loose plank |
| `H` `V` | horizontal / vertical moving platform |
| `F` | Captain's Flag checkpoint |
| `Z` | the tankard (level end) |
| `G` | trial gate |
| `l` `d` | lantern, dock post (decoration) |
| `1`–`9` | quip trigger zone, text looked up in the level's `quips` map |

**Placement rules that will save you time:**

- Things that stand on the ground (`@ p F Z G C l d`) go on the **air row directly above**
  the ground row, not on the ground row itself.
- `Z` needs 3 free columns and 4 free rows; `G` needs 2 columns and 4 rows; `F` needs
  2 rows.
- `c` goes on the **air row directly above the water surface** — it rises from the tile
  below the marker.
- A patroller that should walk a plank goes **one row above** that plank row.
- A pickup floats in the middle of its own tile.

### Quips

`quips` maps a digit to either a literal string or `'@key'`, which resolves against the
shared pool in `src/quips.js`. Place the digit next to the thing being mocked — a keg stack,
a bone shrine, a wreck's rigging, a lit tavern door — so the line reads as a reaction rather
than a random barb. Each zone fires once per run.

## Adding a new town

1. Add an entry to `list` in `data/towns.js` — or fill in one of the five that are already
   there (Aleforge, Providence, Roto Kaiishi, Fenwick, Owe Block). A town with no levels
   renders as a sealed entry on the level-select screen automatically.
2. Create `data/<town>/level-1.js` and call `PL.Towns.addLevel('<town>', { ... })`.
3. Add the `<script>` tags to `index.html`, after `data/towns.js`.
4. Optionally register a backdrop: `PL.Backdrops.register('<town>', function (world) {
   return { draw: function (ctx, cam, time) { ... } }; });`. Without one the Shanty Town
   backdrop is used.
5. Optionally register a trial: `PL.Trials.register('<id>', { title, subtitle, prompt,
   winLine, loseLine, create: function (scene) { ... } })`, then set `trial: '<id>'` on the
   level that carries the `G` glyph.

Nothing in `src/` needs to change for any of that. New tile types, entity types, items and
enemies each register themselves in one place (`PL.Tiles.LEGEND`, `PL.Entities.define`) and
are then addressable from level data by glyph.

## Leaderboard and save data

Local only. No network calls anywhere in the codebase.

Two namespaced keys:

- `pintland-drunken-trials:leaderboard`
- `pintland-drunken-trials:progress`

Both are versioned and keyed **town → level**, so adding the remaining five towns is purely
additive and needs no migration.

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
    }
  }
}

// pintland-drunken-trials:progress
{
  "version": 1,
  "towns": {
    "shantytown": { "completed": ["shantytown-1"], "shards": ["shantytown-1:0"], "purse": 180 }
  }
}
```

`runs` keeps the ten fastest per level, sorted ascending. Shards are stored as
`"<levelId>:<index>"` so they stay unique and permanently collected across runs. **Wipe
local records** on the title screen clears both keys. If `localStorage` is unavailable
(private browsing, blocked site data) the game says so on the title screen and stays fully
playable — scores just aren't kept.

## Credits and canon

Setting, characters and item lore are drawn from the Pintland Isles canon: the Master Lore
Compendium and the Hoegaarden Hall of Records. Shanty Town, the Windsunk Council, the
Coral-eyed, the Hollow Urn, ClockHeart Tonic, the Wolendi wind farms, the Veilwalkers and
the six Liquor Kings are all theirs; the level design, the Plank Pour and the protagonist's
opinions are this build's.
