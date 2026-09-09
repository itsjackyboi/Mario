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
| `dry-run.js` | what would be submitted, and why — never submits |
| `submit.md` | the by-hand browser steps |
