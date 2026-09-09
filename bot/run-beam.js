/* run-beam.js — search every level, and say plainly how it went.
 *
 * One level per child process, four at a time, because a beam search is one
 * long single-threaded loop and this machine has four cores doing nothing.
 * Each child writes bot/results/<level>.json and prints one line.
 *
 *   node bot/run-beam.js                        every level
 *   node bot/run-beam.js aleforge-3 tavern-1    just these
 *   node bot/run-beam.js --beam=200 --chunk=4   wider, finer
 *
 * A run is only reported once the game itself has replayed it. The search plays
 * under its own generator so that it can save and restore its place; the game
 * plays under the game's. Same arithmetic, same seed — but a run that has not
 * been replayed is a claim, and this file only reports measurements.
 */
'use strict';

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const HR = require('./human-records.json').levels;
const OUT = path.join(__dirname, 'results');

const args = process.argv.slice(2);
const opt = {};
const levels = [];
for (const a of args) {
  const m = /^--([a-z]+)=(.+)$/.exec(a);
  if (m) opt[m[1]] = isNaN(+m[2]) ? m[2] : +m[2];
  else levels.push(a);
}

// ------------------------------------------------------------------- a child

if (process.env.BEAM_CHILD) {
  const B = require('./beam');
  const R = require('./runner');
  const id = process.env.BEAM_CHILD;
  const o = JSON.parse(process.env.BEAM_OPTS || '{}');
  const t0 = Date.now();
  let res;
  try {
    res = B.search(id, Object.assign({ beam: 80, chunk: 6, maxFrames: 4200 }, o));
  } catch (err) {
    process.send({ id, error: err.message });
    process.exit(0);
  }
  const out = { id, secs: +((Date.now() - t0) / 1000).toFixed(1),
                expanded: res.expanded, died: res.died, offMap: res.offMap };
  if (res.ok) {
    /* Replayed in the game, not just claimed by the search. */
    const check = R.evaluate(id, res.log);
    out.frames = res.frames;
    out.timeMs = res.timeMs;
    out.reproduces = !!(check.finished && check.frames === res.frames);
    out.log = res.log.map(h => (h.l ? 1 : 0) | (h.r ? 2 : 0) | (h.u ? 4 : 0) |
                               (h.d ? 8 : 0) | (h.j ? 16 : 0) | (h.i ? 32 : 0));
  } else {
    out.why = res.why || 'no finish within the frame budget';
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify(out, null, 1));
  process.send(out);
  process.exit(0);
}

// ------------------------------------------------------------------ the pool

const ALL = ['shantytown-1', 'shantytown-2', 'shantytown-3', 'aleforge-1', 'aleforge-2',
             'aleforge-3', 'providence-1', 'providence-2', 'providence-3',
             'providence-oweblock', 'fenwick-1', 'fenwick-2', 'roto-1', 'roto-2',
             'roto-3', 'tavern-1'];
const queue = (levels.length ? levels : ALL).slice();
const done = [];
const WORKERS = Math.min(+opt.jobs || 4, queue.length);

console.log('searching ' + queue.length + ' levels, ' + WORKERS + ' at a time  ' +
            '(beam ' + (opt.beam || 80) + ', chunk ' + (opt.chunk || 6) + ')\n');

function line(r) {
  const rec = HR[r.id] && HR[r.id].timeMs;
  const id = (r.id + '                   ').slice(0, 21);
  if (r.error) return id + 'ERROR  ' + r.error;
  if (r.frames === undefined) return id + 'no finish   ' + (r.why || '') + '   (' + r.secs + 's)';
  const s = r.timeMs / 1000;
  const d = rec ? (s - rec / 1000) : null;
  const verdict = !r.reproduces ? 'DOES NOT REPLAY'
    : d === null ? 'no human record on file'
    : d < 0 ? 'BEATS the record by ' + (-d).toFixed(2) + 's'
    : d === 0 ? 'ties the record'
    : 'slower by ' + d.toFixed(2) + 's';
  return id + s.toFixed(2) + 's   human ' + (rec ? (rec / 1000).toFixed(2) + 's' : '   —   ') +
         '   ' + verdict + '   (' + r.secs + 's, ' + r.expanded + ' tried, ' + r.died + ' died)';
}

let running = 0;
function pump() {
  while (running < WORKERS && queue.length) {
    const id = queue.shift();
    running++;
    const child = fork(__filename, [], {
      env: Object.assign({}, process.env, { BEAM_CHILD: id, BEAM_OPTS: JSON.stringify(opt) })
    });
    let got = null;
    child.on('message', m => { got = m; });
    child.on('exit', () => {
      running--;
      const r = got || { id, error: 'the child died without reporting' };
      done.push(r);
      console.log(line(r));
      if (!queue.length && !running) finish();
      else pump();
    });
  }
}

function finish() {
  const beat = done.filter(r => r.reproduces && HR[r.id] && r.timeMs <= HR[r.id].timeMs);
  const finished = done.filter(r => r.frames !== undefined);
  console.log('\n' + finished.length + ' of ' + done.length + ' levels finished; ' +
              beat.length + ' at or under the human record.');
  if (beat.length) console.log('  ' + beat.map(r => r.id).join('  '));
  const miss = done.filter(r => r.frames === undefined);
  if (miss.length) console.log('  no finish yet: ' + miss.map(r => r.id).join('  '));
}

pump();
