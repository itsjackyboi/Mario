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
| **Pre-release board** | Kept, frozen, in `data/prerelease.js` — reachable from the book under the version number, or `H`. |
| **Levels** | Seven levels gain an *additional* route each. Nothing existing moved. |

The player's **name is kept** — it is an identity, not an advantage, and making everyone
re-sign the book to play a level they already know is friction for nothing. Say the word if
you would rather it went too; it is one line.

## The order to do it in

1. **Freeze the full board first, if you want the whole history.**
   `data/prerelease.js` currently holds the top five per level, transcribed from the sheet's
   `leaderboard` tab. If you would rather keep every run ever posted, do this *before* the
   sheet is touched: open the live game, let the board load, and in the console run

   ```js
   copy(PL.Archive.dump())
   ```

   Paste the result over the whole of `data/prerelease.js`. It writes the same shape with
   every row in it.

2. **Split the sheet into two boards.** Same sheet, same URL, same log — one more tab.

   Paste the current `tools/leaderboard.gs` into the Apps Script editor and save. Then, from
   the function dropdown, run **`splitEras`** once. It:

   - renames the existing `leaderboard` tab to **`Pre Release Records`**, exactly as it
     stands, and never writes to it again;
   - builds a fresh `leaderboard` from this era's runs — empty on release day, filling as
     people play.

   Then **Deploy → Manage deployments → edit → Version: New version** so the live URL runs
   the new script. The URL does not change and `config.js` needs no edit.

   Nothing is deleted. `runs` keeps every pre-release row where it has always been.

   **How the two boards know which is which:** the era is the build's major version, which
   every row has carried since the first one. `1.8` and `1.16.0` are era 1; `2.0.0` is era 2.
   No new column, nothing to migrate, and the game filters the same way — a v1 time never
   appears on a v2 board, in the sheet or in the game.

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
   the title screen. It should say `v2.0.0`. If it still says `v1.17.0`, the browser is
   holding a cached copy of `index.html` — hard-refresh (Ctrl/Cmd-Shift-R). Every other file
   is cache-busted by the version, so once the index is fresh, everything is.

5. **Play one level.** The board should be empty and fill with your run; the book under the
   version number should still hold the pre-release records.

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

Each is an addition. No existing platform, hazard, pickup or spawn moved, and the trial
levels are untouched.

| Level | The route |
|---|---|
| **Shanty Town II — The Bone Stair** | A rigging line off the top of the stair, three long planks over the wretch water, dropping onto the far bank. Skips the loose-plank crossing. |
| **Aleforge I — Brewers Lane** | An upper gantry from the first brewery catwalk, over the first keg chute and its gap, back down to the roof beyond it. |
| **Aleforge II — Wolendi Wind Farm** | A step off the right-hand roof onto a high line that crosses the two-gust segment without entering either column. Skips two gust cycles — and the tonic and Lagerhorn under them. |
| **Aleforge II — the low line** | One loose board across the alley at each of the first two columns, so a runner can go *under* the wind instead of standing on the perch and counting the cycle out. |
| **Providence I — The Ordered Stair** | An upper gallery, entered by two steps off the flat before it, running over the iron-in-threes segment. |
| **Fenwick I — Brandywine Brush** | A canopy branch off the last bank, over the deep bog. Skips four vines with no light and no phantom footing. |
| **Roto Kaiishi I — The Long Pier** | A rope line above the surf, over five floats and three wretches, landing on the far deck. |
| **Roto Kaiishi II — Netmenders' Row** | Up onto the awnings and along, over the hooks and the netmenders working between them. |

Every route was checked against the real movement envelope, measured off the actual player:
**3.1 tiles of rise, 4.84 tiles across on a flat jump**, and 4.30 / 3.76 / 2.82 tiles across
while still one, two or three tiles above the take-off. No link on any of the seven asks for
more than that, and a reachability pass over each level confirms every new foothold connects
to the route and back — and that nothing that used to be reachable stopped being so.

They are options, not shortcuts: each costs a climb, each drops you back on the main line,
and each carries grog so it reads as a route rather than scenery.

**The Wolendi low line is the one deliberately frame-tight thing in v2.** The board sits 4.5
tiles out and a flat jump carries 4.84, so the take-off window measures about **four frames**;
short of it is the pit and the pit has no floor. The flight also crosses the column, so the
line only exists while that column is quiet — measured, it is open on **7 of 24 arrival
timings** sampled across the wind cycle. Arrive on a lift and it puts you back on the perch;
arrive on a shear and it throws you out of the alley. The intended route is untouched: perch,
wait for the lift, ride it to the plank above.

## Playing it before you ship it

`dist/pintland-v2-preview.html` is the whole game as one file — every script inlined in load
order, the shared board switched off so a preview cannot post to a live sheet. Rebuild it
any time with:

```sh
node tools/bundle.js dist/pintland-v2-preview.html --title="Pintland Isles v2 Preview"
```

It is an output, not a source: nothing in the repo is generated from it.
