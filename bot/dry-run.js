/* dry-run.js — what would be submitted, and why. It never submits anything.
 *
 * Nothing in this bot can post. The harness loads the game with the shared
 * board's endpoint blanked, so PL.Cloud is a no-op by the game's own rule, and
 * the only way a bot-found run reaches the board is a person doing it by hand
 * in a browser, following bot/submit.md.
 *
 * THE RULES THIS ENFORCES, in the order it checks them:
 *   1. One candidate per level: the single best genome the search found. Never
 *      a population, never a runner-up, never "a close attempt".
 *   2. The human record for the level must be KNOWN. Unknown counts as not
 *      beaten — there is no benefit of the doubt.
 *   3. The bot's time must be at or under that record. Slower is not a
 *      candidate in any circumstances; the right output there is silence.
 *   4. One submission per level, ever. A level already in submitted.json is
 *      only re-offered if the new genome beats what the bot itself posted.
 *   5. The genome is replayed here, now, and must reproduce the frame count it
 *      was saved with — a stale result from before a source change is not a
 *      candidate either.
 *
 *   node dry-run.js            check everything in results/
 *   node dry-run.js aleforge-3 check one level
 */
'use strict';

const fs = require('fs');
const path = require('path');
const R = require('./runner');
const records = require('./human-records.json');

const OUT = path.join(__dirname, 'results');
const LEDGER = path.join(__dirname, 'submitted.json');

function ledger() {
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch (e) { return {}; }
}

function main() {
  const want = process.argv.slice(2).filter((a) => a.indexOf('--') !== 0);
  const files = fs.existsSync(OUT)
    ? fs.readdirSync(OUT).filter((f) => f.endsWith('.json') && f[0] !== '_')
    : [];
  const posted = ledger();
  const candidates = [], rejected = [];
  const win = R.sharedWorld();

  for (const f of files) {
    const res = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    const id = res.level;
    if (want.length && want.indexOf(id) < 0) continue;

    const rec = records.levels[id];
    const recFrames = rec && rec.timeMs ? Math.round(rec.timeMs * 60 / 1000) : null;
    const say = (why) => rejected.push({ id, why });

    if (!res.finished || !res.genome) { say('the search never finished the level'); continue; }
    if (recFrames === null) { say('the human record is unknown — treated as not beaten'); continue; }
    if (res.frames > recFrames) {
      say('slower than the human record: ' + (res.frames / 60).toFixed(2) + 's vs ' +
          (recFrames / 60).toFixed(2) + 's, ' +
          ((res.frames - recFrames) / 60).toFixed(2) + 's short');
      continue;
    }
    if (posted[id] && res.frames >= posted[id].frames) {
      say('already submitted ' + posted[id].frames + ' frames for this level, and this ' +
          'is not faster'); continue;
    }

    // Replay it here, now, against the sources as they stand.
    const check = R.evaluate(id, res.genome, { win });
    if (!check.finished || check.frames !== res.frames) {
      say('the saved genome no longer reproduces: replayed to ' +
          (check.finished ? check.frames + ' frames' : 'not finishing') +
          ', saved as ' + res.frames); continue;
    }
    candidates.push({ id, res, recFrames, rec });
  }

  console.log('\n=================== DRY RUN — NOTHING HAS BEEN SUBMITTED ===================\n');
  if (!candidates.length) {
    console.log('No level qualifies. Nothing to submit, which is the correct outcome when');
    console.log('the bot has not beaten a human.\n');
  }
  for (const c of candidates) {
    const gain = (c.recFrames - c.res.frames) / 60;
    console.log('LEVEL           ' + c.id + '  (' + c.res.name + ')');
    console.log('bot time        ' + c.res.frames + ' frames = ' +
                (c.res.frames / 60).toFixed(3) + 's  (' + Math.round(c.res.frames * 1000 / 60) + ' ms)');
    console.log('human record    ' + c.recFrames + ' frames = ' +
                (c.recFrames / 60).toFixed(3) + 's  by ' + c.rec.player + ' on v' + c.rec.build);
    console.log('margin          ' + (gain === 0 ? 'TIED' : gain.toFixed(3) + 's faster'));
    console.log('genome          ' + c.res.genome.length + ' frames, replayed and reproduced just now');
    console.log('would post as   TAS board only (tas: true), separate from the human board');
    console.log('');
  }
  if (candidates.length) {
    console.log('---------------------------------------------------------------------------');
    console.log('These are candidates, not submissions. To actually post one, a person has to');
    console.log('do it by hand in a browser — see bot/submit.md — and only after saying so');
    console.log('explicitly. This script has no way to post and never will.');
  }
  if (rejected.length) {
    console.log('\nNot submitting, and why:');
    for (const r of rejected) console.log('  ' + (r.id + '                    ').slice(0, 22) + r.why);
  }
  console.log('');
}

main();
