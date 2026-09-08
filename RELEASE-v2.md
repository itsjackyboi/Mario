# Releasing v2

Everything here is built and sitting on the `v2` branch. **Nothing has been pushed and
nothing on the live site has changed** — `claude/pintland-isles-platformer-ye69kf` is still
v1.17.0 and still serving the pre-release game.

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

2. **Decide what the shared board points at.** v2 must not post into the pre-release sheet,
   or the two eras end up mixed on one board. Either:
   - **wipe the `runs` tab** of the existing sheet (keep the header row) and re-run
     `rebuildLeaderboard` from the Apps Script editor; or
   - **deploy the script against a new sheet** and paste that URL into `config.js`.

   Either way, redeploy `tools/leaderboard.gs` if you have not since v1.14 — it grows a
   `tas` column, an Any% row, and the TAS section.

3. **Merge and push.** `git checkout claude/pintland-isles-platformer-ye69kf && git merge v2`,
   then push. Pages serves the branch root, so the push *is* the release.

4. **Check the version corner.** The title screen should read `v2.0.0`. If it does not, the
   browser is on a cached copy.

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

## Playing it before you ship it

`dist/pintland-v2-preview.html` is the whole game as one file — every script inlined in load
order, the shared board switched off so a preview cannot post to a live sheet. Rebuild it
any time with:

```sh
node tools/bundle.js dist/pintland-v2-preview.html --title="Pintland Isles v2 Preview"
```

It is an output, not a source: nothing in the repo is generated from it.
