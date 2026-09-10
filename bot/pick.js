/* pick.js — given a free run of the level, which route did it take?
 *
 * A level with three routes makes two claims: that all three go through, and
 * that the one built to be fastest is the one a perfect run chooses.
 * bot/reach.js settles the first. This settles the second, and it settles it
 * the only way that means anything — by searching the level with nothing
 * confined, then replaying the answer and counting which rows it spent its
 * frames in.
 *
 *   node bot/pick.js <levelId> sky=0:6 land=7:11 tunnel=14:17
 */
'use strict';
const R = require('./runner');
const B = require('./beam');
const T = 32;

const args = process.argv.slice(2);
const id = args.shift();
const bands = [];
for (const a of args) {
  const m = /^([a-z]+)=(\d+):(\d+)$/.exec(a);
  if (m) bands.push({ name: m[1], lo: +m[2], hi: +m[3] });
}

const win = R.sharedWorld(), PL = win.PL;
const t0 = Date.now();
const r = B.search(id, { beam: +(process.env.BEAM || 70), maxFrames: 5400 });
const secs = ((Date.now() - t0) / 1000).toFixed(0);
if (!r.ok) {
  console.log(id + ': NO RUN FOUND in ' + secs + 's  (' + r.expanded + ' tried, ' + r.died + ' died)');
  process.exit(0);
}
const tr = R.trace(id, r.log, { win });
const count = {}, unknown = [];
for (const p of tr.path) {
  const row = Math.floor((p.y + 14) / T);
  const b = bands.find(bb => row >= bb.lo && row <= bb.hi);
  if (b) count[b.name] = (count[b.name] || 0) + 1;
  else unknown.push(row);
}
const check = R.evaluate(id, r.log, { win });
console.log(id + '  ' + (r.frames / 60).toFixed(2) + 's  (' + r.frames + ' frames)  ' +
  (check.finished && check.frames === r.frames ? 'replays' : 'DOES NOT REPLAY') +
  '   [' + secs + 's, ' + r.died + ' died]');
const total = tr.path.length;
for (const b of bands) {
  const n = count[b.name] || 0;
  console.log('    ' + b.name.padEnd(9) + String(Math.round(n * 100 / total)).padStart(3) + '% of the run');
}
if (unknown.length) console.log('    (' + Math.round(unknown.length * 100 / total) + '% between lanes — in the air, or at the ends)');
