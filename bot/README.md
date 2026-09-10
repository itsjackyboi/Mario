# bot — a tool-assisted route finder

Finds input logs for levels of *Pintland Isles* by playing the real game
headless, and judges what it finds against the fastest time a **person** has
posted for that level.

It cannot post anything. See "Submission" below — that is the point, not a
limitation.

## How it runs the game

The game is plain `<script>` tags on a global `PL`, with a fixed 1/60s step
decoupled from the render loop, and it already ships a TAS engine: `PL.Input.force`
injects buttons, `PlayScene.tasStep` advances exactly one frame, and
`PL.util.seedRandom` makes everything — including trial minigames — deterministic.

So there is no browser to drive. `env.js` runs the same files in the same order
`index.html` does, inside jsdom, and `runner.js` steps the result as fast as the
machine will go. About **20ms per 2000-frame genome**, and byte-identical across
runs.

Two things in `runner.js` are load-bearing:

- **One window, many runs.** Per-run state lives on the PlayScene/World/Player,
  not on `PL`, so a single loaded game evaluates genome after genome. Rebuilding
  it each time costs 260ms instead of 1ms.
- **Step the top of the stack.** A trial gate calls `PL.Game.push(new TrialScene)`
  and freezes the player. Code that keeps stepping the PlayScene from there is
  stepping a scene that is no longer in charge — the trial never advances and the
  level looks impossible when it is only unattended.

## Look before searching: `slack.js`

Corb's ground speed is a constant 4.3px a frame, and a jump adds no horizontal
speed — it keeps whatever you had. So the fastest a level *could* be run is its
spawn-to-cup distance divided by that, and no input sequence beats it. That is
the floor. A human record sitting on the floor means there is nothing to find.

```
node bot/slack.js
```

Run it first. On this game it says most levels are already within a second of
their floor, and three are not. That one table is worth more than a day of
tuning.

## Searching: `search.js`, `run-all.js`

Genomes are arrays of `{l,r,u,d,j,i}` — the same shape `PlayScene.inputLog`
keeps, so a genome IS a replayable TAS log with no translation.

**Genomes are hop bursts, not noise.** Independent per-frame randomness almost
never produces a usable jump: the arc is cut short unless jump is held for
several consecutive frames. Generating "run up, hold jump 4-13 frames, keep
going" instead is the difference between crawling a fifth of the way through a
level and finishing it. Everything else is tuning; this is not.

Fitness knows the human record, so "finished" and "finished faster than a
person has" are different events and the log says which just happened. A search
that never beats the record is a legitimate result and is reported as one.

```
node bot/run-all.js                          every level
node bot/run-all.js aleforge-3 tavern-1      just these
node bot/run-all.js --pop=150 --gens=250 --seed=3
```

## Items, and a claim I had to withdraw

The two the levels lean on are pickups, not buttons: the **Clockheart Tonic**
(1.45x speed for nine seconds) and the **Wind Pouch**. Walking into them is
enough. What the pouch then needs is a *second* jump press in mid-air — holding
jump from the ground is one rising edge and buys nothing extra — so
`hopBurst` now emits a release-and-press-again, and the item button too, for the
Bellows dash. `runner.js` reports tonic frames, pouch spends and dashes on every
evaluation, so item use is visible rather than assumed.

I also added a fitness bonus priced off what each item is worth in seconds, on
the strength of an audit showing **zero tonic seconds on every level**. That
audit was wrong: it ran on *random* genomes, not the ones a search breeds. Run
properly — same level, seed and budget, only the bonus differing — an evolved
genome routes through the tonic either way, and on The Tithe Walk it held it
*longer without* the bonus (8.93s against 6.15s). So the bonus is **off by
default**; `itemBonus: true` turns it on for a level where the detour really
does cost more than it pays, and `items-ab.js` is how to check.

The lesson worth keeping: measure the thing the search actually produces, not a
sample of the space it starts from.

## When a level walls the search

Do not reach for the mutation rate. `shantytown-3` is the worked example:

1. Every genome died at frame ~115, six percent in, whatever the budget.
2. `tidemap.js` printed the tide's own timeline and the highest standable row
   per column: the water peaks at row 12 after 3.2s and holds for 2.4s, and the
   only dry footing in the opening is the ladder at columns 5-13.
3. `diag-st3.js` traced a run against `world.tideY` and confirmed the deaths
   were drownings on the beach, at the frame the model predicted.
4. The genomes were running straight past the ladder, because a hop burst holds
   right for its whole length. **The missing thing was a move, not a
   parameter** — "stop and climb" did not exist in the vocabulary.
5. `opening2.js` searches just the first 400 frames with a vocabulary that can
   climb in place, scored only on being dry when the water is up. It solves the
   opening. `seeded-st3.js` then hands that to the main search as generation
   zero, which took the level from 6% to 26% reached.

The general shape: measure what is killing it, look for the move the vocabulary
lacks, and seed rather than tune.

## Submission

**The harness has no way to post.** `env.js` blanks the shared board's endpoint
the moment `config.js` has run, which makes every `PL.Cloud` call a no-op by the
game's own rule, and stubs `fetch` to reject. A search evaluating tens of
thousands of genomes must not be one stray call away from writing to a board
other people read.

`dry-run.js` decides what *would* be a candidate and prints it. The rules, in
the order it checks them:

1. One candidate per level — the single best genome. Never a population, never
   a runner-up, never a close attempt.
2. The human record must be **known**. Unknown counts as not beaten.
3. The bot's time must be at or under it. Slower is not a candidate in any
   circumstances; silence is the correct output.
4. One submission per level, ever (`submitted.json`), unless the bot beats what
   the bot itself posted.
5. The genome is replayed then and there and must reproduce its saved frame
   count — a stale result from before a source change is not a candidate.

Posting is then a person, by hand, in a browser, after saying so explicitly:
`submit.md` has the steps. Note the caveat there about trial gates, which is
untested.

`human-records.json` holds the records, read from the sheet's `runs` log, with
the date and provenance in the file. Refresh it before trusting a comparison.

## Building levels with it

The v2 second levels were cut against measurements from this harness rather
than by eye, and four tools did that work:

- **`envelope.js`** flies the jump arc in the real game and reads the reach off
  it. Everything else takes its numbers from here. It found that the table the
  map had been using was wrong by a whole row.
- **`reach.js`** asks, in about a fifth of a second, whether a route goes
  through at all — and when it does not, which two columns it breaks between.
  Fast enough to keep in the loop while a level is being drawn.
- **`pick.js`** searches a level with nothing confined and reports which route a
  perfect run actually takes, as a percentage of frames spent in each band. This
  is the only honest test of "the fast route is the fast route", and it
  contradicted the design twice.
- **`tightness.js`** takes a finishing run, moves each press one frame earlier
  and one frame later, and counts the ones where neither works. Chains of those
  — with no forgiving press in between to correct on — are what "frame perfect"
  means in a form that can be checked.

`routes.js` times each route with the others walled off, using the same
map-confining trick as `reach.js`. It is thorough and slow; use `reach.js`
while drawing and `routes.js` once.

## What the search cannot do: trials

**The beam cannot cross a trial gate.** A gate pushes a minigame scene that is
played with up, down and confirm, and the search's whole vocabulary is left,
right, down, jump and item — there is no up in it. So a level with a trial in
the middle stalls at the gate and reports no run.

That is the explanation for the four levels the first full pass never finished:
shantytown-3, aleforge-3, providence-3 and roto-3 are exactly the four trial
levels. It is not that they are hard. It is that the bot cannot play the trial.

To check a trial level end to end, take the gate out of a copy of the level and
search that — which is how fenwick-3 was verified (32.47s, replays frame for
frame, with the gate removed).

## Files

| | |
|---|---|
| `env.js` | loads the game into jsdom, with the board switched off |
| `runner.js` | `evaluate` / `trace` / `levelInfo` — plays a genome |
| `search.js` | the genetic search, aimed at the human record |
| `run-all.js` | driver; writes `results/<level>.json` |
| `slack.js` | the floor-vs-record table — run this first |
| `tidemap.js`, `diag-st3.js` | diagnosis for The Drowning Tide |
| `opening2.js`, `seeded-st3.js` | solve the opening, then seed the search |
| `replaycheck.js` | does the game's own rewind reproduce a genome? |
| `items-audit.js`, `items-ab.js` | is the search using the tonic, the pouch, the dash? |
| `export-replay.js` | a bot result, as an entry for `data/tas-replays.js` |
| `reach.js` | does each route go through? and if not, where does it break |
| `pick.js` | which route does a perfect run actually take |
| `tightness.js` | how many presses have exactly one frame that works |
| `routes.js` | time each route with the others walled off |
| `envelope.js` | fly the jump arc and read the reach off it |
| `dry-run.js` | what would be submitted, and why — never submits |
| `submit.md` | the by-hand browser steps |
