/* export-replay.js — a bot result, as an entry for data/tas-replays.js.
 *
 *   node export-replay.js <levelId>
 *
 * Prints the block to paste. It does not write to the game's data file itself:
 * a replay is something a person decides to publish, and the same run being
 * both watchable and submittable makes that decision worth making once, by
 * hand, rather than as a side effect of a search finishing.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./runner');

const id = process.argv[2];
if (!id) { console.error('usage: node export-replay.js <levelId>'); process.exit(1); }
const file = path.join(__dirname, 'results', id + '.json');
if (!fs.existsSync(file)) { console.error('no result for ' + id); process.exit(1); }
const res = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!res.genome) { console.error(id + ': that result has no genome'); process.exit(1); }

/* Replay it now, against the sources as they stand, so the entry cannot claim
 * a time the log no longer produces. */
const win = R.sharedWorld();
const check = R.evaluate(id, res.genome, { win });
if (!check.finished) {
  console.error(id + ': the saved genome does not finish the level any more — nothing to export.');
  process.exit(1);
}
if (check.frames !== res.frames) {
  console.error(id + ': the saved genome now finishes in ' + check.frames +
                ' frames, not ' + res.frames + '. Re-run the search before exporting.');
  process.exit(1);
}

const enc = win.PL.Replay.encode(res.genome.slice(0, check.frames));
const player = process.env.TAS_PLAYER || 'the bot';
console.log('  \'' + id + '\': {');
console.log('    player: ' + JSON.stringify(player) + ',');
console.log('    build: ' + JSON.stringify(win.PL.VERSION) + ',');
console.log('    timeMs: ' + Math.round(check.frames * 1000 / 60) + ',');
console.log('    seed: 20260904,');
console.log('    log: \'' + enc + '\'');
console.log('  },');
console.error('\n' + check.frames + ' frames (' + (check.frames/60).toFixed(2) +
              's), ' + enc.length + ' characters. Replayed and reproduced just now.');
