/* routes.js — is each way through the level actually a way through the level?
 *
 * A level built with three routes has three claims in it, and "I drew three
 * paths" is not one of them. Each route has to be provably crossable on its
 * own, and the three have to differ in time, or what looks like a choice is
 * one real route and two decorations.
 *
 * The trick is forcing the search down a route without editing the level. It
 * is done by lying to it about distance: the map's frames-to-the-cup is wrapped
 * so that anything outside the route's rows is infinitely far away, which the
 * beam already knows to drop. The level itself is untouched, so what gets
 * measured is the level as it will ship — no test-only walls that change what
 * the physics does.
 *
 * The two ends are exempt. Every route leaves the same spawn and reaches the
 * same cup, so the first and last stretch belong to all three.
 *
 *   node bot/routes.js <levelId> sky=2:8 land=9:13 tunnel=14:18 [join=24]
 *
 * Reports, per route: whether it goes through at all, and how long the best
 * line down it takes. Then the unrestricted search, to see which one the level
 * actually rewards — which is the only test of "the fast route is the fast
 * route" that means anything.
 */
'use strict';

const R = require('./runner');
const B = require('./beam');
const T = 32;

const args = process.argv.slice(2);
const id = args.shift();
if (!id) {
  console.error('usage: node bot/routes.js <levelId> sky=lo:hi land=lo:hi tunnel=lo:hi [join=24]');
  process.exit(1);
}

const bands = [];
let join = 24;
for (const a of args) {
  const m = /^([a-z]+)=(\d+):(\d+)$/.exec(a);
  if (m) { bands.push({ name: m[1], lo: +m[2], hi: +m[3] }); continue; }
  const j = /^join=(\d+)$/.exec(a);
  if (j) join = +j[1];
}

const win = R.sharedWorld(), PL = win.PL;
const map = B.mapFor(PL, id);
const beam = +(process.env.BEAM || 90);
const maxFrames = +(process.env.MAXFRAMES || 5400);

/** The same map, with everything outside `band` placed infinitely far away. */
function confined(band) {
  const lo = band.lo, hi = band.hi;
  const freeL = join * T, freeR = (map.cols - join) * T;
  const inner = Object.create(map);
  inner.costAt = function (x, y) {
    if (x > freeL && x < freeR) {
      const r = Math.floor((y + 14) / T);
      if (r < lo || r > hi) return Infinity;
    }
    return map.costAt(x, y);
  };
  return inner;
}

console.log(id + '  —  ' + map.cols + ' columns, beam ' + beam);
const times = [];
for (const band of bands) {
  const t0 = Date.now();
  const r = B.search(id, { beam, map: confined(band), maxFrames });
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (!r.ok) {
    console.log('  ' + band.name.padEnd(8) + 'rows ' + (band.lo + '-' + band.hi).padEnd(7) +
                'NO WAY THROUGH        (' + secs + 's, ' + r.expanded + ' tried, ' + r.died + ' died)');
    continue;
  }
  /* The search plays under its own generator; the game plays under the game's.
   * Only a run the game itself has replayed is a measurement. */
  const check = R.evaluate(id, r.log, { win });
  const ok = check.finished && check.frames === r.frames;
  times.push({ name: band.name, frames: r.frames });
  console.log('  ' + band.name.padEnd(8) + 'rows ' + (band.lo + '-' + band.hi).padEnd(7) +
              (r.frames / 60).toFixed(2) + 's   ' + String(r.frames).padStart(4) + ' frames' +
              (ok ? '' : '   DOES NOT REPLAY') +
              '   (' + secs + 's, ' + r.died + ' died)');
}

const t0 = Date.now();
const free = B.search(id, { beam, map, maxFrames });
console.log('  ' + 'free'.padEnd(8) + 'any route'.padEnd(12) +
            (free.ok ? (free.frames / 60).toFixed(2) + 's   ' + String(free.frames).padStart(4) + ' frames'
                     : 'NO WAY THROUGH') +
            '   (' + ((Date.now() - t0) / 1000).toFixed(0) + 's)');

if (times.length > 1) {
  times.sort((a, b) => a.frames - b.frames);
  const gap = times[times.length - 1].frames - times[0].frames;
  console.log('\n  fastest route: ' + times[0].name + ', by ' +
              ((times[1].frames - times[0].frames) / 60).toFixed(2) + 's over ' + times[1].name +
              '  (spread across all three: ' + (gap / 60).toFixed(2) + 's)');
}
