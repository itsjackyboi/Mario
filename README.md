# Pintland Isles: The Drunken Trials Tryout

A 2D side-scrolling platformer across the Pintland Isles. You play **Corb**, an unproven
pirate who rowed in for the Drunken Trials with no crew, no legend and no reputation — and
a great deal to say about the six Liquor Kings who already have all three.

Plain HTML/CSS/JS, Canvas 2D, **no build step and no backend**. Every sprite is drawn in
code, every sound is synthesised with WebAudio, and the only persistence is `localStorage`.

The build number is drawn faintly in the top-left of the title screen, and is readable from
the console as `PL.VERSION`. It is there because a stale cached script and a fresh pull look
identical otherwise — if the title says an older version than you expect, the browser is
serving you a cached copy, not the one you just pulled.

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
| Use item | `E` / `Shift` / `X` — spends the front of the carried queue |
| Buy from a Roto stall | `↓` while standing in it |
| Pause | `Esc` / `P` |
| Restart level | `R` |
| Mute | `M` |
| Read the letter (title screen) | click the envelope, or `L` |
| Open the Beer Bank (title screen) | click the keg, or `B` |
| Sign the book (your name) | click the name chip, or pick it from the title menu |
| Practice a level | `C` on the level-select, then `C` in-level to drop a marker |
| Menus | `↑` `↓` `←` `→`, `Enter` to confirm, `Esc` to back out |

There is no drop-item control. Carried items are a FIFO queue — `E` spends whichever is at
the front, and the HUD shows it plus a `+N` for whatever is stacked behind it.

## The Beer Bank

Reached from the **keg on the title screen** — bottom-left, mirroring the letter on the
other side, with your balance written under it. Or press `B`. It is an icon rather than a
menu row for the same reason the letter is: the menu is for the three ways to play plus
your name, and the two things on the shelf either side of it are objects you pick up.

Whatever Corb walks out of a level with goes into the Bank, and it stays there across
runs. It buys **pets, outfits and hats** — three slots, worn independently — and nothing
else. Nothing in the Bank changes a run: a cosmetic that did would put every time on the
shared board into a different category, and there is only one board.

**The pets are out of the compendium.** Every one but Jigglet is in Notable Animals, and
seven of the ten are the horses, mules and hornses the Six rode to Pintland on the Walk of
Shame — which is why the tiers read as a stable rather than a menagerie.

| Grog | | |
| --- | --- | --- |
| **1,000** | **Jigglet** — a chicken | **Skeet Budle** — a mule off the Walk of Shame |
| **3,000** | **Max Trans** — Pilsner's parrot | **Dick Wacker** — a horse |
| **5,000** | **Chi Ton Pissbulls** — a horse | **PegButt Jr.** — awfully large shoes to fill |
| **10,000** | **Farty McShits** — a hornse | **Slick Dickless** — a horse |
| **10,000** | **Prejac** — Quickety Cricket's mail horse | |
| **20,000** | **PegButt** — the horse Pilsner murdered | |

PegButt tops it because he has to: *"most trusted horse ridden by man… just like a father
to us all"*, killed by Jameson Pilsner. He is drawn as a ghost, because he is one. You are
not buying a horse; you are buying what is left of the one that mattered.

A pet follows by **walking a short trail of where you have recently been**, rather than
steering toward you. Steering makes an animal that cuts corners and walks through walls; a
trail makes one that goes where you went, takes the same jumps a moment later, and catches
up when you stop. Its name is drawn above it at all times.

Eight outfits and seven hats mix freely — Cutter Crimson under a Friar's Hood if you like.
The Liquor King's Crown is 20,000, which is the joke: nine pounds of nothing on a man's
head, and now it is yours.

## Practice mode

Press **C** on any *unlocked* level in the level-select to enter it in practice. Inside,
**C** drops a marker where you stand and every death puts you back on it, so one crossing
can be drilled without replaying the level to reach it. Press **C** on the marker again to
lift it.

**Nothing about a practice run is recorded** — no leaderboard row, no shared board, no grog
banked, no shard kept — and an empty purse is just another death rather than a game over.
That is what makes it safe to hand out: a mode that let you rehearse *and* score would make
every time on the board mean something different.

The marker refuses to plant in mid-air or upside down under a Fenwick veil gate, because a
marker you respawn onto and immediately fall off is a trap rather than a tool.

## The shared board

Records are local to your browser by default and the game makes no network calls at all.
Point it at a Google Sheet and everyone's runs land on one board, readable in-game.

**Setup — about ten minutes, no hosting of your own.**

1. Make a new Google Sheet. Anywhere in your Drive; the script creates the tab it needs.
2. **Extensions → Apps Script**. Delete the placeholder `myFunction`, paste the whole of
   [`tools/leaderboard.gs`](tools/leaderboard.gs), and save.
3. **Deploy → New deployment → Web app**, with:
   - *Execute as* — **Me**
   - *Who has access* — **Anyone**

   Google will ask you to authorise it. The "unverified app" warning is expected for a
   script you wrote yourself; take **Advanced → Go to (your project)**.
4. Copy the **Web app URL** — it ends in `/exec` — and paste it into `leaderboardUrl` in
   [`config.js`](config.js).
5. Commit and deploy the game (GitHub Pages is fine). Everyone plays *that* copy, so
   everyone posts to the same sheet.

**Three things that will bite you otherwise:**

- **It only works over http/https.** A `file://` page cannot make these requests, so a
  local file open shows local records and nothing else. The game does not break — it just
  has no shared board.
- **Changing the script needs a redeploy, and how you redeploy matters.** *Manage
  deployments → edit → New version* keeps the same URL. Creating a *new deployment* gives
  you a different URL and everyone's `config.js` goes stale.
- **The URL is public and is meant to be.** It is in the page source of anything you
  publish. Anyone who has it can add rows to your sheet, which is exactly what makes it
  work for a friend group and exactly why you should not point it at a sheet holding
  anything else.

**Two tabs, on purpose.**

- **`runs`** — every run ever posted, append-only, never sorted or trimmed:
  `date, player, town, level, timeMs, grog, deaths, shards, speedrun, version, time`.
  This is the record. The game reads it, your history lives in it, and nothing rewrites a
  row of it.
- **`leaderboard`** — the **top five per level** and for the whole-game speedrun, in play
  order, rebuilt from `runs` after every post. Derived and disposable: delete the tab and
  it comes straight back.

Sorting the log in place would have been less code, but then the sheet could not answer
"what did I actually run last Tuesday", and a bad row could not be found and removed by
hand. Deriving a second tab costs one cheap rewrite per post and keeps both.

The top five is five *runs*, not five players — the same thing the in-game board shows.
Having the sheet and the game disagree about who is top would be worse than one person
holding several places.

To fill the tab in immediately rather than waiting for the next run: open the Apps Script
editor, choose **`rebuildLeaderboard`** in the function dropdown, and press **Run**. Or hit
`…/exec?rebuild=1` in a browser tab.

**If you would rather not redeploy the script,** a formula does the same job for one level
at a time — put this in an empty tab and change the level id:

```
=QUERY(runs!A:K, "select K,B,J,F,G where D='shantytown-1' order by E asc limit 5", 0)
```

That is `time, player, version, grog, deaths` ordered by `timeMs`. It updates live and
needs no deployment, but it is one formula per level.

The time is there twice on purpose: `time` is written `00:41.20` so the sheet reads without
arithmetic, and `timeMs` is the raw number, which is what sorts and charts correctly and
what the game reads back. New columns are always **appended, never inserted**, so updating
the script never shifts the values in rows you already have; `sheet_()` extends the header
row on its own the next time it runs. `version` is on every row because the timer and damage rules
have changed between builds, and a board that silently mixed them would be wrong in a way
nobody could see.

**These times are honour-system.** Anything a browser submits can be forged from the
console in about ten seconds. The only real fix is replaying and verifying inputs
server-side, which is far more machinery than a board for friends is worth, so the game
does not pretend to check.

**Losing the network loses nothing.** A run is written to `localStorage` first and posted
second. If the post fails it waits in an outbox and goes out next time the game reaches the
sheet; the leaderboard header says how many of yours are still queued.

## Two ways to play

The title screen offers both:

- **Row ashore** — the normal game. Pick an area and a level; each level is timed on its
  own and logged to that level's top ten.
- **Drunken speedrun** — every level in the isles back to back on **one unbroken clock**,
  with no results card between them. Dying, respawning, restarting a level and sitting in
  a Trial all cost you real time. It runs all sixteen levels including the Owe Block bonus,
  ignoring the usual unlock, because a route that changed with your save state would not be
  comparable. **Your purse carries between levels**, because grog is the life pool and a run
  that started every level on nothing would end on the first death of each one.

  Whole-game times get their own leaderboard entry, and **each level's split is also logged
  on that level's own board**, tagged `SPEEDRUN` in the MODE column. A personal best is a
  personal best however you set it; the column is there because a split was set under
  different conditions — a carried purse, no chance to warm up — and the reader should be
  able to tell.

## The levels

Sixteen levels across six areas. The last level of each area is built on a mechanic that
appears nowhere else, and is a long way harder than the two before it.

| Area | # | Level | Trial | New mechanic |
| --- | --- | --- | --- | --- |
| **Shanty Town** | I | The Crash Cliffs | | |
| | II | The Bone Stair | | |
| | III | **The Drowning Tide** | The Plank Pour | the sea rises and falls |
| **Aleforge** | I | Brewers Lane | | |
| | II | Wolendi Wind Farm | | |
| | III | **The Rolling Boil** | The Golden Taps | a wall of steam that never stops |
| **Providence** | I | The Ordered Stair | | |
| | II | The Tithe Walk | | |
| | III | **The Half Beat** | The Order of Chimes | floor on every other chime |
| | ★ | **Owe Block** (bonus, brutal) | the gauntlet itself | |
| **Fenwick** | I | Brandywine Brush | | |
| | II | **The Overturned Wood** | The Lantern of Roots | gravity flips |
| **Roto Kaiishi** | I | The Long Pier | | |
| | II | Netmenders' Row | | |
| | III | **The Undertow** | The Haggle | a current that shoves and reverses |
| **Sackbeard's Tavern** | — | **Sackbeard's Tavern** (finale) | | bone spines on a heartbeat |

## Getting in: the shard chain

**The first level of every area is open from the start. Every level after it needs the
Red-Earth Shard out of the level before it.** Clearing a level is not enough — you have to
have found its shard. A level you cannot enter says which shard it wants, the intro card on
the way *in* names the level this one's shard opens (and stops saying it once that level is
open), and the results card says outright when the next level stays shut.

That makes each area a road rather than a menu, and it makes the shard the thing it always
should have been: not a completionist tick, but the key to the next door.

Two consequences worth knowing:

- **Owe Block** wants Providence III's shard. It is last in Providence's list, so the same
  chain covers it; `bonus: true` only decides that the level-select draws it as an indented
  branch in Crimson Cutter red rather than a step.
- **The finale** is the only level in its area, so the in-town chain has nothing to hang it
  on. It hangs off the previous area instead (`unlockAfter: 'roto-3'`), because a finale you
  can jump straight to would undo the point of the chain.

The **Drunken Speedrun** ignores all of it and runs every level in order, because a route
that changed with your save state would not be comparable.

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

### One mechanic per area

The last level of every area is built on a mechanic that appears nowhere else in the game.
They live together in `src/mechanics.js` rather than in the town files, because they are all
the same *kind* of thing — a rule about the whole level rather than an obstacle placed in it
— and because reading them side by side is the only way to be sure none of them repeat.

| Area | Level | What it does |
| --- | --- | --- |
| **Shanty Town** | The Drowning Tide | A moving waterline across the whole level. It rests below the boards, floods to row 12, holds, and goes back out on a fourteen-second cycle. Ground that was fine ten seconds ago is twelve feet under. The dashed line drawn while the tide is out is the mark it will reach. |
| **Aleforge** | The Rolling Boil | A wall of live steam moving right at a constant speed from before the spawn point. It does not slow down and there is nothing you can do to it — it scours the rival crews off the boards as it passes. It does stop for a Trial, because a Trial is a scene of its own. |
| **Providence** | The Half Beat | `(` is stone that exists on even chimes, `)` on odd ones. They write themselves into the tile grid, so they collide from every side like real terrain. A block flashes for the last third of a beat before it leaves; standing where one returns is a death. |
| **Fenwick** | The Overturned Wood | Walk through a veil gate (`%`) and down changes direction — gravity, your jump and the sprite all invert, and you land on the underside of the canopy. Walk through another and it turns back. |
| **Roto Kaiishi** | The Undertow | A tidal race that shoves you sideways every frame, holds, goes slack, then runs the other way. On the boards you can lean into it; in the air you cannot. Mossbound Boots are the only counter, and they are two towns back. |
| **Sackbeard's Tavern** | the finale | The beast has a heartbeat. Every `,` is a socket in the bone that a spine comes out of on the beat — the sockets are drawn all the time, so the map says where and the throb says when. |

Four of them (`tide`, `boil`, `current`, `pulse`) are written as a **field on the level def**
rather than placed as a glyph, because they apply to the whole level and there is nowhere
sensible to put a marker. `PL.Mechanics.SYSTEMS` lists them and `level.js` spawns one system
entity per field it finds; adding a fifth means adding its name to that array and nothing
else. The other two are placed: `(` `)` and `%`, plus `,` for a spine socket.

Only one of them needed anything from the engine: gravity inversion added `gsign` to the
player and four lines to `Physics.moveY`, so an inverted body grounds on ceilings. Nothing
else in the engine knows the mechanic exists.

### Items

Six of these are found everywhere. The other twenty-one are **local**: three per area,
pulled from that area's own lore, and they only ever appear in that area's levels. Each
area's third one answers that area's own hazard, which is why none of the effects overlap.

**Everywhere:**

| Item | Glyph | Effect |
| --- | --- | --- |
| Grog Barrel | `o` | The currency pickup **and the life pool**. Tracked in the HUD, banked into the area purse on completion; a death costs five of them, and dying with none is a game over. |
| Hollow Urn | `U` | **A spare life.** Carried, not timed, and nothing about you changes while you hold it. The next thing that would kill you — enemy, spike, water, pit, anything — takes the urn instead: it shatters, you are put back at your last safe footing with ~2s of invincibility, and the death is not counted. One hit, one urn. |
| ClockHeart Tonic | `T` | Timed. Big speed boost plus a screen-wide colour shift pulsing between day-order gold and night-revelry teal. |
| Wolendi Wind Pouch | `W` | Single use, carried. One extra mid-air jump, spent automatically when you jump with nothing under you. |
| Veilwalker Seed | `S` | Single use, carried. `E` grows a shelf of packed red earth just ahead and below you; it withers after ~5 seconds. |
| Red-Earth Shard | `R` | Pure collectible, one per level, sixteen in the game. Collecting every shard in an area lights that area's bonus indicator. |

**Local to one area:**

| Area | Item | Glyph | Effect |
| --- | --- | --- | --- |
| **Shanty Town** | Old Salty's Pipe | `P` | 10s. Enemies you touch go over instead of you — the old man's stare, bottled. |
| | Windsunk Colours | `A` | Carried. `E` plants your own flag: an extra checkpoint, wherever you are standing. |
| | Windsunk Whistle | `r` | 10s. The Council's own note. Rival crews within seven tiles turn and run, at double pace. |
| **Aleforge** | Lagerhorn | `N` | 9s. Higher jump and a heavier landing; the horn's note carries you. |
| | Bellows-Breath | `E` | Carried. `E` fires a flat, fast dash in the way you are facing. |
| | Coopers' Hoop | `&` | 10s. Kegs stave in against you instead of the other way round, and pay a barrel for it. |
| **Providence** | Fortunate Scarab | `K` | 8s. Every hazard in the level runs at 45% speed. You do not — and neither does the clock. |
| | Glyph of Purity | `Q` | 10s. Friars cannot fine you and contact cannot knock your grog loose. |
| | Cardinal's Indulgence | `+` | 8s. Signed, sealed, and the whole Order stops where it stands: Apostles mid-step, Friars mid-sweep. |
| **Fenwick** | Spiritweed | `w` | 10s. Gravity at 60%: longer, floatier arcs over the bog. |
| | Mossbound Boots | `M` | 12s. Nothing gives way under you — a vine will not curl back and a loose plank will not drop. |
| | Veilwalker's Draught | `*` | 10s. Phantom footing holds with no spirit-light burning. You see it the way they do. |
| **Roto Kaiishi** | Goldcoral Chit | `D` | 12s. Loose grog in the level is pulled to you. |
| | Albatross Ballast | `O` | 12s. Hold Jump on the way down and you barely fall at all. |
| | Tide-Reader's Glass | `^` | 12s. Read the swell right and the sea-wretches never surface. |
| **Owe Block** | Cutter's Shiv | `X` | 10s. Gang members die on contact instead of you. |
| | Circus Greasepaint | `J` | 12s. Both gangs read you as one of theirs, whatever bandana you are wearing. |
| | Crimson Firewater | `!` | 10s. An empty purse stops being a death sentence: a hit still knocks you about, you just do not go down for it. |
| **Sackbeard's Tavern** | The Pour Eternal | `q` | 7s. Nothing in the isles can touch you, water and pits included. |
| | Leviathan Marrow | `z` | 12s. Every grog barrel is worth double. |
| | Sackbeard's Own Cup | `$` | Carried. `E` drinks it for a Hollow Urn — one more life, on the house. |

The whole table is data in `src/items-town.js` — glyph, area, buff name, duration, HUD
label, one-line blurb and its own `draw`, which paints both the world sprite and the HUD
icon. Adding a twenty-second means adding a row there and, if it is a new kind of effect,
one branch in whichever file owns the thing it changes. `src/level.js` reads the glyph
table straight off `PL.TownItems`, so its marker map is never edited by hand for an item,
and the HUD builds its buff bars from `PL.TownItems.byBuff`, so it never is either.

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

**Corb's caption box is deliberately small.** At 420 wide it ate most of the bottom of the
screen, which is exactly where you look to read the ground you are about to land on. It is
292 now, with a smaller head and a size-down type, wrapping to three short lines instead of
two long ones — the same words in a third less screen. The buff descriptions moved with it:
they used to float 76px off the bottom, right in the same sightline, and now sit flush with
the floor on the other side. Neither can reach the middle of the screen. (`src/quips.js`,
`src/hud.js`)

**Corb gets two lines a level.** A level places five to seven trigger zones next to the
things worth mocking, and `QuipBudget` decides which two of them actually speak — weighted
by how many zones are left, so the budget is always spent by the end of the level and a
different couple speaks on every attempt. He was narrating, and the joke does not survive
that.

That is also what makes a hundred-line pool worth having: a level file can write `'@?ru'`
instead of naming a line, which draws a random one from that group and prefers ones this
session has not heard. Two runs at the same level are two different conversations.

**His one-liners live in a fixed caption box.** Bottom-left, out of the play area, with his
face on it — a speech bubble over the action was covering the jumps. The box grows to fit
its line and drops a type size before it would ever need a fourth row. (`src/quips.js`)

**A buff's countdown and its description are in different corners.** The timer chip stays
top-right under the item slots where the eye already is; what the buff actually *does* is
drawn bottom-right, in a panel with room to read it. They used to share one 170px chip,
which truncated every description to nothing. Both are clear of the quip caption's 420px
box on the other side. (`src/hud.js`)

**Grog is per level.** The counter resets at level start and is *kept* through deaths and
checkpoint respawns, so a run's grog total is a clean, comparable leaderboard stat. On
completion it is banked into a persistent per-area purse. (`src/items.js`)

**Taking a hit costs grog, not your life.** Enemy or spike contact with grog in your purse
knocks up to six barrels loose — they bounce and can be scooped back up for a few seconds —
and gives you ~1.5s of invincibility. The same contact with an empty purse is fatal. Water
and pits are always fatal. Providence's Friars are the exception: they take grog without
touching you, and cannot kill — Friars are flagged `harmful = false` for exactly that
reason, and the collision path only calls `hurt()` on an enemy that is actually harmful.
(`src/player.js`, `src/town-providence.js`, `src/scene-play.js`)

**Grog is the life pool, and running out is a game over.** A death you actually take costs
`DEATH_COST` (5) barrels out of the purse. Dying with an empty purse ends the attempt: on a
single level it starts over from nothing — including the clock, the one thing an ordinary
death does not cost you — and in a Drunken Speedrun the run is finished, because a run with
a reset clock in the middle of it is not a run. Nothing is banked from a game over, but the
shards you already picked up stay picked up, so the road you opened stays open. The purse
chip pulses red and reads `LAST` when there is nothing left in it.
(`src/player.js`, `src/scene-gameover.js`)

**A death never leaves a level unwinnable.** `World.respawn()` puts the level back the way
it was found on every respawn: spirit-lights come back, loose planks snap home, the tide
starts its cycle with the water out, and the Rolling Boil goes back to behind wherever you
have been put. Without it a death mid-crossing in Fenwick, or anywhere past the middle of
Aleforge III, was a dead run — which in a speedrun meant the whole run. Anything consumable
that a route depends on implements `onRespawn`; collected pickups deliberately do not come
back, since grog you already banked would otherwise be farmable. (`src/level.js`)

**The Hollow Urn is a spare life, not a power-up.** It was a timed
unkillable-but-slowed state, which was both a downgrade to hold and a thing you had to
watch a bar for. Now it works the way a mushroom does: you carry it, nothing changes, and
the next fatal thing spends it instead of you — including water and pits, which the old
version pointedly did not cover. (`Player.prototype.kill`, `src/player.js`)

**Difficulty is a per-level number, not a rewrite.** Every level def carries `diff`, and
every timed hazard in the game divides its period (or multiplies its speed) by it at
construction: patroller and Ganger pace, wretch and vine and gust cycles, keg-chute
interval, loose-plank shake and fall, gear and clock-arm rate, bobber sink, spirit-light
regrow. So the curve below is one number per file, and a new hazard joins the curve by
reading `(opts.def && opts.def.diff) || 1` in its constructor.

| Area | `diff` |
| --- | --- |
| Shanty Town | 0.95 → 1.15 |
| Aleforge | 1.10 → 1.30 |
| Providence | 1.25 → 1.45 |
| Fenwick | 1.30 → 1.50 |
| Roto Kaiishi | 1.40 → 1.60 |
| Owe Block (bonus) | 1.60 |
| Sackbeard's Tavern | 1.80 |

The geometry rises with it. Shanty Town gaps are two or three tiles with something to land
on; Providence onward the terraces break into pillars with four-tile drops and no floor
under them; Roto's last crossings are bobbing platforms with no fixed deck anywhere in
them. Nothing exceeds the jump budget — a level's every column is audited for footing —
but from Providence on, most of it is at the edge of it.

**The shard is a key, not a trophy.** Gating each level on the previous level's Red-Earth
Shard is one function — `Store.hasShardFrom`, a prefix test on the shard ids that were
already being stored — plus `Towns.gatedBehind`, which walks backwards past bonus levels so
a branch can never become a step. No new save field, so no migration. (`src/storage.js`,
`data/towns.js`)

**The letter is the reason he came.** A small envelope on the title screen (click it, or
press `L`) opens the letter from Corb's uncle that got him on the boat. It is a
non-opaque scene pushed over the title, so the title keeps drawing behind it. The icon and
its click target are defined once, together, in `PL.LetterIcon` so they cannot drift apart.
(`src/scene-letter.js`)

**Nothing mid-level ever winds the clock back.** A checkpoint respawn, a Trial and the
pause overlay all leave it running; only your position resets. The clock is kept in two
halves — `levelMs` is time spent in this scene, `baseMs` is everything banked before it —
and it starts at zero when, and only when, a scene is built with a `baseMs` of zero. That
is exactly the two cases that should do it:

| | Clock |
| --- | --- |
| Checkpoint respawn | keeps running |
| A Trial, or the pause overlay | keeps running |
| `R`, "Run it again", "Take it again" **on a single level** | back to zero |
| Purse empty → the attempt ends **on a single level** | back to zero on the retry |
| Checkpoint respawn **in a speedrun** | keeps running |
| `R` restart **in a speedrun** | keeps running — the new scene's base is the run clock as it stood |
| Purse empty **in a speedrun** | the run is over; a new run starts at zero |

So a discarded attempt inside a run costs you every second it took, which is the whole
point of a run — and the split for a restarted level is measured off the run clock rather
than the scene's own, so the splits always add up to the total.
(`src/scene-play.js`, `src/speedrun.js`)

**Roto's bobbers never sink far enough to drown you.** They settle a capped 20px, which is
pressure on your timing rather than a delayed death. (`src/town-roto.js`)

## File structure

```
index.html                     script order lives here; add new files to it
config.js                      the shared board's URL — the only file you edit
styles.css                     page chrome only — the game draws itself
README.md

src/
  util.js                      clamp/lerp, seeded RNG, time formatting, colour mixing
  palette.js                   the base colour set + low-level draw helpers
  themes.js                    per-area palette + tile-style overrides
  input.js                     keyboard + pointer → named actions, latched edges
  audio.js                     synthesised SFX (no asset files)
  storage.js                   localStorage leaderboard, progress, and aggregates
  cloud.js                     the shared board: submit, fetch, offline outbox
  game.js                      canvas setup, fixed-timestep loop, scene stack
  camera.js                    dead-zone follow, clamping, screen shake
  tiles.js                     tile ids, the glyph legend, per-style tile painting
  entities.js                  Entity base, type registry, tile collision (Physics)
  fx.js                        particles and floating labels
  items.js                     the six everywhere-pickups + knocked-loose grog
  items-town.js                the fourteen area-local items, as one table
  enemies.js                   Enemy base, rival crew, coral-eyed sea-wretch
  props.js                     loose planks, movers, checkpoint, tankard, trial gate, scenery
  bank.js                      the cosmetics catalogue — pets, outfits, hats
  pet.js                       the animal that walks your trail
  mechanics.js                 the six late-level mechanics, one per area
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
  scene-letter.js              the letter from Mr. BBL + its title-screen envelope
  scene-name.js                the one place in the game that takes typed text
  scene-bank.js                the Beer Bank's three shelves
  scene-title.js               title, premise, control legend, the envelope
  scene-levelselect.js         areas, levels, the Owe Block branch, shard indicators
  scene-leaderboard.js         standalone records view
  scene-play.js                the level runner (+ pause overlay)
  scene-complete.js            level-complete card + shared leaderboard table
  scene-ending.js              the finale's whole-tryout summary
  scene-gameover.js            an empty purse ends the attempt
  speedrun.js                  Drunken Speedrun run state + its results card

tools/
  leaderboard.gs               paste into Apps Script; the whole server side

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
  diff: 1.2,                     // hazard tempo; 1.0 is Shanty Town pace
  boil: { speed: 33 },           // optional — a level-wide mechanic (mechanics.js)
  trial: 'goldenTaps',           // optional — what the `G` glyph opens
  theme: 'oweblock',             // optional — use another area's palette/backdrop
  bonus: true,                   // optional — draws as a branch, needs unlocking
  unlockAfter: 'providence-3',   // optional — needs that level's shard first
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
| `P` `A` `r` | Old Salty's Pipe / Windsunk Colours / Windsunk Whistle | Shanty Town |
| `N` `E` `&` | Lagerhorn / Bellows-Breath / Coopers' Hoop | Aleforge |
| `K` `Q` `+` | Fortunate Scarab / Glyph of Purity / Cardinal's Indulgence | Providence |
| `X` `J` `!` | Cutter's Shiv / Circus Greasepaint / Crimson Firewater | Owe Block |
| `w` `M` `*` | Spiritweed / Mossbound Boots / Veilwalker's Draught | Fenwick |
| `D` `O` `^` | Goldcoral Chit / Albatross Ballast / Tide-Reader's Glass | Roto |
| `q` `z` `$` | The Pour Eternal / Leviathan Marrow / Sackbeard's Own Cup | Tavern |
| `(` `)` | phase block: stone on even / odd chimes | Providence III |
| `%` | veil gate: flips gravity | Fenwick II |
| `,` | bone socket: a spine erupts on the heartbeat | the finale |
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

`quips` maps a digit to one of three things, all resolved against the shared pool of ~100
lines in `src/quips.js`:

| Written as | Gives you |
| --- | --- |
| `'a literal line'` | exactly that |
| `'@pv3'` | that one line — for a zone placed next to the specific thing it mocks |
| `'@?ru'` | a random line from the `ru` group, preferring ones unheard this session |
| `'@?in,cr'` | the same, drawing across several groups |

The pool is grouped: one set per Liquor King, one per area, plus three area-neutral ones —
`ru*` (rumours he picked up on the crossing and has not verified), `in*` (what people have
said about *him*, which he has been rehearsing answers to) and `cr*` (what he makes of the
whole business). The `@?` form exists so those three actually get heard: he only says two
lines a level, so naming a fixed line in every zone would mean most of the pool never
surfaced.

Place the digit next to the thing being mocked — a keg stack, a bone shrine, a bell tower,
a gang tag, the beast's own ribs — so the line reads as a reaction rather than a random
barb. A zone arms once; whether it speaks is up to the budget.

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

### Reading the board in the game

The leaderboard is two pages. The first is the level list plus the **top five** for whatever
is selected — five is what fits without shrinking the type, and it is the part anyone
actually wants. `ENTER` opens the second page: that level's **full history**, scrolling,
with the columns the first page has no room for (grog, deaths, the build it was set on).
`←` `→` swap between the SHARED board and this browser's LOCAL one; with no endpoint
configured there is only LOCAL and the scene never touches the network.

### Striking a record off

Records live in this browser's `localStorage` and nothing in the game deletes them, but a
time set under a bug should not sit at the top of a board forever. From the browser console:

```js
PL.Store.dropRun('shantytown', 'shantytown-1', 1)   // the top row on that level

PL.Store.dropRuns('shantytown', 'shantytown-1',     // or anything matching
                  function (r) { return r.speedrun && r.timeMs < 20000; })
```

Both return how many rows went, and both recompute the level's best time and grog totals
from what is left, so the board stays consistent. Reload to see it.

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
