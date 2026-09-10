/* run-all.js — search a level (or several) and judge the result against the
 * human record.
 *
 * NOTHING HERE SUBMITS ANYTHING. The most this can do is mark a result
 * "submission-ready", which means one thing only: the bot's single best genome
 * for that level finished at least as fast as the fastest time a person has
 * posted for it. Everything else — slower, unfinished, or a level whose record
 * cannot be determined — is reported and dropped. An unknown record counts as
 * not beaten.
 *
 *   node run-all.js                      every level, default budget
 *   node run-all.js aleforge-3 tavern-1  just these
 *   node run-all.js --pop=150 --gens=250 --seed=3
 */
'use strict';

const fs = require('fs');
const path = require('path');
const R = require('./runner');
const S = require('./search');
const records = require('./human-records.json');

const OUT = path.join(__dirname, 'results');

function arg(name, dflt) {
  const hit = process.argv.slice(2).find((a) => a.indexOf('--' + name + '=') === 0);
  return hit ? Number(hit.split('=')[1]) : dflt;
}

function recordFramesFor(levelId) {
  const rec = records.levels[levelId];
  if (!rec || !rec.timeMs) return null;              // unknown record: not beaten
  return Math.round(rec.timeMs * 60 / 1000);
}

function main() {
  const win = R.sharedWorld();
  const named = process.argv.slice(2).filter((a) => a.indexOf('--') !== 0);
  const levels = named.length ? named
    : win.PL.Towns.allLevels().map((l) => l.def.id);

  const pop = arg('pop', 120), gens = arg('gens', 150), seed = arg('seed', 12345);
  fs.mkdirSync(OUT, { recursive: true });
  const summary = [];

  for (const id of levels) {
    const info = R.levelInfo(id, { win });
    const recFrames = recordFramesFor(id);
    console.log('\n=== ' + id + '  (' + info.name + ')');
    console.log('    human record: ' + (recFrames
      ? recFrames + ' frames / ' + (recFrames / 60).toFixed(2) + 's'
      : 'UNKNOWN — this level can never be marked submission-ready'));

    const t0 = Date.now();
    const res = S.run(id, {
      pop, gens, seed, recordFrames: recFrames,
      bias: id === 'shantytown-3' ? 'climb' : null
    });
    const secs = ((Date.now() - t0) / 1000).toFixed(0);

    /* THE GATE. Tied or faster than the human record, and finished, and the
     * record is actually known. Anything else is not a candidate. */
    const ready = !!(res.finished && recFrames && res.frames <= recFrames);
    res.submissionReady = ready;
    res.searchSeconds = Number(secs);

    if (!res.finished) {
      console.log('    RESULT: never finished. Best reach ' +
                  (100 * res.bestX / res.width).toFixed(1) + '% of the level. Not a candidate.');
    } else if (!recFrames) {
      console.log('    RESULT: finished in ' + res.frames + ' frames, but the human record for ' +
                  'this level is unknown. Not a candidate.');
    } else if (ready) {
      console.log('    RESULT: SUBMISSION-READY — ' + res.frames + ' frames (' +
                  (res.frames / 60).toFixed(2) + 's) vs record ' + recFrames + ' (' +
                  (recFrames / 60).toFixed(2) + 's), ' +
                  ((recFrames - res.frames) / 60).toFixed(2) + 's faster.');
    } else {
      console.log('    RESULT: finished in ' + res.frames + ' frames (' +
                  (res.frames / 60).toFixed(2) + 's) but the record is ' + recFrames +
                  ' (' + (recFrames / 60).toFixed(2) + 's) — ' +
                  ((res.frames - recFrames) / 60).toFixed(2) + 's short. Not a candidate.');
    }
    console.log('    ' + res.evals + ' genomes in ' + secs + 's');

    fs.writeFileSync(path.join(OUT, id + '.json'), JSON.stringify(res, null, 1));
    summary.push({
      level: id, finished: res.finished, frames: res.frames,
      recordFrames: recFrames, submissionReady: ready,
      reachPct: +(100 * res.bestX / res.width).toFixed(1), seconds: res.searchSeconds
    });
    fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 1));
  }

  console.log('\n---- summary ----');
  for (const s of summary) {
    console.log((s.level + '        ').slice(0, 22) +
      (s.finished ? s.frames + ' frames' : s.reachPct + '% reached').padEnd(16) +
      (s.recordFrames ? 'record ' + s.recordFrames : 'record unknown').padEnd(18) +
      (s.submissionReady ? 'SUBMISSION-READY' : '—'));
  }
  const ready = summary.filter((s) => s.submissionReady);
  console.log('\n' + ready.length + ' level(s) beat or tied the human record.');
  if (ready.length) {
    console.log('Nothing has been submitted. Run bot/dry-run.js to see what a submission would say.');
  }
}

main();
