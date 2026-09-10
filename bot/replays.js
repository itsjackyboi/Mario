/* replays.js — turn the bot's results into the game's watchable replays.
 *
 *   node bot/replays.js            check, and print what would be written
 *   node bot/replays.js --write    write data/tas-replays.js
 *
 * A run gets in only if it clears all four of these, checked in this order:
 *
 *   1. It finishes the level.
 *   2. It is at or under the fastest time a PERSON has posted. A run slower
 *      than the record is not a replay worth putting in front of anybody —
 *      the point of the screen is to show a route that is better than what
 *      you are doing, and there is nothing to learn from a slower one.
 *   3. It replays, right now, against the sources as they stand — not against
 *      the sources it was found under. A level edited since the search ran is
 *      a log that no longer describes a run, and an entry claiming a time the
 *      game will not produce is worse than no entry.
 *   4. It reproduces the exact frame count it claims.
 *
 * THIS IS NOT THE LEADERBOARD. Writing here makes a run watchable inside the
 * game, from the level's own screen. Posting a time to the shared board that
 * other people read is a separate thing, done by a person, by hand, in a
 * browser — see submit.md. The harness has no way to post and is built so it
 * cannot acquire one.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const R = require('./runner');

const HR = require('./human-records.json').levels;
const RESULTS = path.join(__dirname, 'results');
const OUT = path.join(__dirname, '..', 'data', 'tas-replays.js');
const write = process.argv.includes('--write');
const PLAYER = process.env.TAS_PLAYER || 'the bot';

/** run-beam packs each frame's six buttons into one int. Unpack. */
function unpack(log) {
  return log.map(n => ({ l: n & 1 ? 1 : 0, r: n & 2 ? 1 : 0, u: n & 4 ? 1 : 0,
                         d: n & 8 ? 1 : 0, j: n & 16 ? 1 : 0, i: n & 32 ? 1 : 0 }));
}

const win = R.sharedWorld();
const PL = win.PL;

const kept = [], skipped = [];
for (const f of fs.readdirSync(RESULTS).sort()) {
  if (!f.endsWith('.json') || f.startsWith('_')) continue;
  const res = JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8'));
  const id = res.id;
  const rec = HR[id] && HR[id].timeMs;

  if (res.frames === undefined) { skipped.push([id, 'no finish']); continue; }
  if (!rec) { skipped.push([id, 'no human record on file — unknown counts as not beaten']); continue; }
  if (res.timeMs > rec) {
    skipped.push([id, 'slower than the record by ' + ((res.timeMs - rec) / 1000).toFixed(2) + 's']);
    continue;
  }

  const genome = unpack(res.log);
  const check = R.evaluate(id, genome, { win });
  if (!check.finished) { skipped.push([id, 'the log no longer finishes the level']); continue; }
  if (check.frames !== res.frames) {
    skipped.push([id, 'the log now finishes in ' + check.frames + ' frames, not ' + res.frames]);
    continue;
  }

  kept.push({
    id, player: PLAYER, build: PL.VERSION, timeMs: res.timeMs, seed: 20260904,
    log: PL.Replay.encode(genome.slice(0, check.frames)),
    human: rec, frames: check.frames
  });
}

const HEAD = `/* tas-replays.js — the input logs behind the TAS board, so a run can be watched.
 *
 * DATA ONLY. The screen that plays these is src/replay.js; this file holds
 * nothing but the logs and who set them, so it can be regenerated or hand-
 * edited without touching any behaviour.
 *
 * A log is one character per frame: the six buttons pack into six bits
 * (l, r, u, d, jump, item — in that order, bit 0 first) and six bits is one
 * character out of A-Z a-z 0-9 + /. So 'A' is nothing held, 'C' is left+right,
 * 'Q' is jump alone. Thirty seconds of play is about 1800 characters.
 *
 * To add one, play or find the run, then in the browser console:
 *
 *     PL.Replay.encode(PL.Game.top().inputLog)
 *
 * on a PlayScene whose TAS log holds the run — or run \`node bot/replays.js\`,
 * which rebuilds this whole file from the search results and refuses to write
 * a log that does not still reproduce its own time.
 *
 * \`seed\` must match the tasSeed the run was found under, or the world will not
 * be the same world and the replay will not reproduce it. 20260904 is the
 * default TAS seed and what the bot uses.
 */
window.PL = window.PL || {};
window.PL.TasReplays = {
`;

let body = '';
kept.forEach((k, i) => {
  body += "  '" + k.id + "': {\n" +
          '    player: ' + JSON.stringify(k.player) + ',\n' +
          '    build: ' + JSON.stringify(k.build) + ',\n' +
          '    timeMs: ' + k.timeMs + ',\n' +
          '    seed: ' + k.seed + ',\n' +
          '    log: ' + JSON.stringify(k.log) + '\n' +
          '  }' + (i < kept.length - 1 ? ',' : '') + '\n';
});

console.log(kept.length + ' replays would be written:');
for (const k of kept) {
  console.log('  ' + k.id.padEnd(22) +
    (k.timeMs / 1000).toFixed(2) + 's   against ' + (k.human / 1000).toFixed(2) + 's by hand   ' +
    k.frames + ' frames, ' + k.log.length + ' characters');
}
if (skipped.length) {
  console.log('\nnot written:');
  for (const [id, why] of skipped) console.log('  ' + id.padEnd(22) + why);
}

if (write) {
  fs.writeFileSync(OUT, HEAD + body + '};\n');
  console.log('\nwrote ' + OUT);
} else {
  console.log('\n(nothing written — pass --write)');
}
