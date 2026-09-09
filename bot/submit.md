# Posting a bot-found run to the TAS board

Nothing in `bot/` can post. The harness loads the game with the shared board's
endpoint blanked, so `PL.Cloud` is a no-op by the game's own rule — "no
endpoint, no requests". Getting a run onto the board is a deliberate act by a
person, in a browser, and these are the steps.

**Do not do this for a level `dry-run.js` has not listed as a candidate.** The
gate is: the bot's single best genome finished at or under the fastest time a
*human* has posted for that level, the record is actually known, and the genome
still reproduces. Slower is not a candidate, and neither is "close".

## The steps

1. Run `node bot/dry-run.js <levelId>` and read what it prints. It names the
   time, the record, the margin, and the person whose record it is.
2. Get an explicit go-ahead for that specific level. One level, one submission.
3. Open the live game, pick the level, and start it in **practice mode**.
4. Press **T** for TAS mode.
5. In the browser console:

   ```js
   var genome = /* paste the "genome" array out of bot/results/<levelId>.json */;
   var scene  = PL.Game.top();          // the PlayScene
   scene.inputLog = genome;
   scene.tasRewind(genome.length);      // the same path a human's rewind takes
   ```

6. The run replays and lands on the tankard. `TasResultScene` appears with the
   time; choose **Post it to the TAS board**. That calls
   `PL.Cloud.submit({..., tas: true})` — the TAS board, never the human one.
7. Record it in `bot/submitted.json` so the bot will not offer that level again:

   ```json
   { "<levelId>": { "frames": 1234, "postedAt": "2026-09-09" } }
   ```

## One thing that is not yet proven

`tasRewind` replays by stepping the **PlayScene**, while the bot plays by
stepping whichever scene is on top of the stack. Those are the same thing until
a trial gate pushes a `TrialScene`. `replaycheck.js` confirms the two agree on
`shantytown-1` and on `aleforge-3` up to the point a genome had reached — but no
genome has yet crossed a trial gate, so replay across one is **untested**.

Five levels have trial gates: `shantytown-3`, `aleforge-3`, `providence-3`,
`roto-3`, `fenwick-2`. Before submitting on any of them, re-run
`node bot/replaycheck.js <levelId> <frames>` with a genome that actually
reaches the gate, and check it still says MATCH. If it says DIVERGED, the run
cannot be posted this way and the honest thing is not to post it.
