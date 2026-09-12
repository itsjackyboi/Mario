# Releasing v2

Everything here is on the **`v2` branch**, pushed and safe. **The live page has not
changed**: GitHub Pages serves `claude/pintland-isles-platformer-ye69kf`, which is still
v1.17.0 and still the pre-release game. Pushing a second branch cannot affect it — Pages
only ever builds the one branch it is pointed at.

Releasing is step 3 below, and it is one merge.

## What v2 changes

| | |
|---|---|
| **Records** | Every local record, time, unlock and split is wiped once, on first load, on every machine. The split board starts empty and fills in as runs are set. |
| **Grog and skins** | The Beer Bank balance, the lifetime banked total, everything bought and everything worn go with it. Nobody carries a preview advantage into launch. |
| **Pre-release board** | Kept, frozen, in `data/prerelease.js` — reachable from the book under the version number, or `H`. The sheet keeps its own copy on the `Pre Release Records` tab. |
| **Levels** | Seven levels gain an *additional* route each, and each route carries its own
hazards and its own item. Nothing else on those levels moved. |
| **Shards** | Moved, in every level except Shanty Town I and The Undertow, off the running
line and onto a spur you have to turn round for. The shard run and Any% are different runs now. |

The player's **name is kept** — it is an identity, not an advantage, and making everyone
re-sign the book to play a level they already know is friction for nothing. Say the word if
you would rather it went too; it is one line.

## The order to do it in

1. **The sheet is already split, and needs nothing on the day.** Two derived tabs, one per
   era: `Pre Release Records` is the era-1 board and `leaderboard` is the era-2 board. While
   v1 is what people are playing, every posted run rebuilds `Pre Release Records` and leaves
   `leaderboard` alone. **The moment the first `2.0.0` run is posted that reverses on its
   own** — `leaderboard` starts filling and `Pre Release Records` freezes exactly as it
   stands. No constant to bump, no function to run, nothing to redeploy.

   This works because the era is the build's major version, which every row has carried
   since the first one — `1.8` and `1.17.0` are era 1, `2.0.0` is era 2 — and the era being
   played is simply the highest anyone has posted. It only goes up, so somebody still on a
   cached v1 build after the release adds to the log and changes no board. The game filters
   the same way, so a v1 time never appears on a v2 board, in the sheet or in the game.

   `runs` keeps every row ever posted, throughout.

2. **Re-freeze the book, last thing before you merge.** `data/prerelease.js` is the
   PRE-RELEASE RECORDS book, and it is a snapshot — taken on 8 September, so it does not
   have anything set since. Records set between now and the release belong in it, so take it
   fresh: open the live game, let the board load, and in the console run

   ```js
   copy(PL.Archive.dump())
   ```

   Paste the result over the whole of `data/prerelease.js` and commit it to `v2`. It writes
   the same shape with every era-1 row in it — the same set of runs `Pre Release Records`
   is built from.

3. **Put v2 on the live branch.** From a clone of the repo:

   ```sh
   git fetch origin
   git checkout claude/pintland-isles-platformer-ye69kf
   git pull
   git merge origin/v2          # fast-forward: v2 is the live branch plus these commits
   git push origin claude/pintland-isles-platformer-ye69kf
   ```

   Pages serves that branch's root, so **the push is the release** — usually live within a
   minute or two. Nothing else to build or deploy.

   (Or, entirely in the GitHub web UI: open a pull request from `v2` into
   `claude/pintland-isles-platformer-ye69kf` and merge it. Same result, with a diff to read
   first.)

4. **Check the version corner.** Open the live page and read the number in the top-left of
   the title screen. It should say `v2.2.1`. If it still says `v1.17.0`, the browser is
   holding a cached copy of `index.html` — hard-refresh (Ctrl/Cmd-Shift-R). Every other file
   is cache-busted by the version, so once the index is fresh, everything is.

5. **Play one level.** The board should be empty and fill with your run; the book under the
   version number should still hold the pre-release records. In the sheet, that same run is
   the first row on `leaderboard`, and `Pre Release Records` has stopped changing — that is
   the era switch having happened by itself.

### If you need to undo it

The old build is one commit away and nothing about it was destroyed:

```sh
git checkout claude/pintland-isles-platformer-ye69kf
git revert --no-commit HEAD -m 1 && git commit -m "Roll back to v1.17.0"
git push
```

Local saves already wiped by the era bump stay wiped — that part is on players' machines,
not in the repo — but the pre-release board, the sheet and its log are all untouched by a
rollback.

## What a returning player sees

One line on the title screen, on the machine it happened to:

> v2: preview records, grog and skins have been cleared — the old board is under
> PRE-RELEASE RECORDS

It shows only where there was a save to clear, and only until they navigate away. An empty
Bank with no explanation reads as a bug; this is the explanation.

## The new routes

Each is an addition: no existing platform, hazard, pickup or spawn moved to make room for
one. The trial levels are otherwise untouched — the Rolling Boil's low line is the single
exception, and it opens a way past two gears rather than adding a route of its own.

| Level | The route | What is on it |
|---|---|---|
| **Shanty Town II — The Bone Stair** | A rigging line off the top of the stair, over the wretch water, dropping onto the far bank. Skips the loose-plank crossing. | Seven boards of the span are loose — stand still and they go. A rival paces the landing you drop onto. A Hollow Urn hangs over the worst of it. |
| **Aleforge I — Brewers Lane** | An upper gantry from the first brewery catwalk, over the first keg chute and its gap, back down to the roof beyond it. | A second chute at the far end, rolling kegs back down the gantry at you, and a rival on the middle span. A Lagerhorn past him. |
| **Aleforge II — Wolendi Wind Farm** | A high line that crosses the two-gust segment without entering either column. | A chute at the head of it, and the shear phase of both columns reaches across it. A Brewer's Bellows halfway. |
| **Aleforge III — The Rolling Boil** | A low line under the gear pit after the checkpoint: two short boards that let a runner take the first two gears **on the move** instead of standing on one and counting it round. | Nothing but the pit. The boards hang over it with no floor beneath them, and the take-off window is about six frames. |
| **Providence I — The Ordered Stair** | An upper gallery over the iron-in-threes segment. | Two Apostles marching it in strict time, and the iron is still under you if they walk you off. A Vial of Purity between them. |
| **Fenwick I — Brandywine Brush** | A canopy over the deep bog. Skips four vines. | The long span **is phantom footing** — it exists only while the spirit-light burns, and the light sits at the canopy's mouth. Seven seconds to cross or fall through it. |
| **Roto Kaiishi I — The Long Pier** | A rope line above the surf, over five floats and three wretches. | A rival on the line, open water under every tile of it, and a Tide-Reader's Glass mid-span. |
| **Roto Kaiishi II — Netmenders' Row** | Up onto the awnings and along, over the hooks. | Two netmenders working the awnings, hooks in the deck below. A Harbourman's Ballast between them. |

Each one was run in the engine end to end — held right, hopping, no route knowledge — and
each is crossable. None of them is free: every one carries a hazard of its town's own kind
and an item worth the risk, so the choice is a real one rather than a faster empty shelf.

Every route was checked against the real movement envelope, measured off the actual player:
**3.1 tiles of rise, 4.84 tiles across on a flat jump**, and 4.30 / 3.76 / 2.82 tiles across
while still one, two or three tiles above the take-off. No link on any of the seven asks for
more than that, and a reachability pass over each level confirms every new foothold connects
to the route and back — and that nothing that used to be reachable stopped being so.

They are options, not shortcuts: each costs a climb, each drops you back on the main line,
and each carries something worth the detour.

## The shard is a decision now

A shard used to sit on the top step of a plank staircase that was also the fastest way
through the segment, so a runner going for time collected it whether they meant to or not.
That made the shard run and the Any% run nearly the same run.

Every shard outside Shanty Town I and The Undertow — the two you asked to leave alone — now
sits on a **spur**: a short climb that goes *backward*, or up out of the line, and dead-ends.
You pass it, turn round, take it, and drop back. Measured on a weighted map of each level —
ground covered, plus what climbing costs, plus a charge per move — the detour went from
**+0 to +2** to **+7 to +15**, against routes that run 220-320. Roughly a second or two, not
a re-route.

The check that matters is the other one. A bot that holds right and hops, on twelve different
jump cadences, is run through each shard's segment; anything it still ends up carrying was on
the line:

| | before | after |
|---|---|---|
| Brewers Lane | 3 of 12 | 0 of 12 |
| The Ordered Stair | 3 of 12 | 0 of 12 |
| The Long Pier | 3 of 12 | 0 of 12 |
| The Bone Stair, Wolendi, Netmenders' Row, Brandywine, the Tavern | 1 of 12 each | 0 of 12 |
| **The Overturned Wood** | **8 of 12** | **0 of 12** |

The Overturned Wood was the worst of them: its shard sat on the ceiling walk, so walking the
ceiling *was* collecting it. It now hangs three tiles under the roof, and taking it means
jumping away from the ceiling and floating back — with the water not far under that.

Each moved shard was then taken in the engine from the foothold the design says you take it
from, so none of this made one unreachable. Shanty Town I and The Undertow are untouched.

**The Rolling Boil's low line is the one deliberately frame-tight thing in v2.** The gears
after the checkpoint turn on a 7.8-second cycle, and until now the crossing had to be waited
out: sampled across a whole turn of the gears, **no arrival at all** had a line that could be
taken without standing on a gear and counting it round. Two short boards under the pit change
that. Measured by holding right and jumping — a bot that cannot wait, so anything it finds is
a crossing taken on the move — there are now **36 complete no-stop crossings of the first two
gears, off a take-off window six frames wide**. Miss it and the pit has no floor.

The third gear is untouched and still a gate: the line puts you level with it, not past it.
Nothing about the intended route changed — ride the gears round, as before.

## Playing it before you ship it

`dist/pintland-v2-preview.html` is the whole game as one file — every script inlined in load
order, the shared board switched off so a preview cannot post to a live sheet. Rebuild it
any time with:

```sh
node tools/bundle.js dist/pintland-v2-preview.html --title="Pintland Isles v2 Preview"
```

It is an output, not a source: nothing in the repo is generated from it.
