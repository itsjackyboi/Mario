/* reach.js — can each route be walked at all, and how long is it?
 *
 * routes.js answers this by searching, which takes a quarter of an hour per
 * level and is the wrong tool for the question "did I leave a hole in it".
 * This answers it off the map instead, in about a fifth of a second, which is
 * fast enough to keep in the loop while a level is being drawn.
 *
 * The map is the level's own frames-to-the-cup over the ground Corb can stand
 * on. Confining a route means striking out every standing place outside its
 * rows and asking whether the cup is still reachable from the spawn — and,
 * because the field is in frames, what the route would cost at best.
 *
 * WHAT IT CANNOT TELL YOU. Timing: a gear that is only sometimes under you
 * counts as ground here, so a route this says is walkable can still be one the
 * simulation cannot get through. It is a way of catching a hole in a level in
 * seconds, not a substitute for routes.js. Green here means run the search.
 *
 *   node bot/reach.js <levelId> sky=0:8 land=9:11 tunnel=14:17 [join=30]
 */
'use strict';

const R = require('./runner');
const M = require('./map');
const T = 32;

const args = process.argv.slice(2);
const id = args.shift();
const bands = [];
let join = 30;
for (const a of args) {
  const m = /^([a-z]+)=(\d+):(\d+)$/.exec(a);
  if (m) { bands.push({ name: m[1], lo: +m[2], hi: +m[3] }); continue; }
  const j = /^join=(\d+)$/.exec(a);
  if (j) join = +j[1];
}

const win = R.sharedWorld(), PL = win.PL;
const scene = R.makeScene(PL, id, 20260904);
const world = scene.world;
const swept = M.sweep(PL, scene.def, 900);
let inverts = false;
for (const e of world.entities) if (e.type === 'veilGate') inverts = true;

const cup = world.tankard;
const spawn = world.spawn;

function run(band) {
  const m = M.build(world, swept, { inverts });
  m.assistFrom = undefined;
  for (const e of world.entities) {
    if (e.type === 'pouch' || e.type === 'lagerhorn') {
      const c = Math.floor(e.x / T);
      if (m.assistFrom === undefined || c < m.assistFrom) m.assistFrom = c;
    }
  }
  if (band) {
    for (let r = 0; r < m.rows; r++) {
      if (r >= band.lo && r <= band.hi) continue;
      for (let c = join; c < m.cols - join; c++) m.stand[r * m.cols + c] = 0;
    }
  }
  const goals = [];
  const gc0 = Math.floor(cup.x / T), gc1 = Math.floor((cup.x + cup.w - 1) / T);
  const gr0 = Math.floor(cup.y / T), gr1 = Math.floor((cup.y + cup.h - 1) / T);
  for (let r = gr0; r <= gr1; r++)
    for (let cc = gc0; cc <= gc1; cc++)
      if (cc >= 0 && cc < m.cols && r >= 0 && r < m.rows && m.stand[r * m.cols + cc])
        goals.push(r * m.cols + cc);
  const dist = M.field(m, goals);
  const sc = Math.floor((spawn.x + 10) / T), sr = Math.floor((spawn.y + 14) / T);
  let best = Infinity;
  for (let dr = -2; dr <= 4; dr++) {
    for (let dc = -1; dc <= 2; dc++) {
      const rr = sr + dr, cc = sc + dc;
      if (rr < 0 || rr >= m.rows || cc < 0 || cc >= m.cols) continue;
      const d = dist[rr * m.cols + cc];
      if (d < best) best = d;
    }
  }

  /* When it does not go through, say WHERE. The field is grown backwards from
   * the cup, so the lowest column it reaches is the near side of the break and
   * the highest standable column below that is the far side of it — which is
   * the gap that is too wide, or the climb that is too tall. */
  let lo = Infinity;
  for (let r = 0; r < m.rows; r++)
    for (let cc = 0; cc < m.cols; cc++) {
      const i = r * m.cols + cc;
      if (m.stand[i] && isFinite(dist[i]) && cc < lo) lo = cc;
    }
  let out = -1;
  for (let cc = lo - 1; cc >= 0; cc--) {
    let any = false;
    for (let r = 0; r < m.rows; r++) if (m.stand[r * m.cols + cc]) any = true;
    if (any) { out = cc; break; }
  }
  const near = [], far = [];
  for (let r = 0; r < m.rows; r++) {
    if (isFinite(lo) && m.stand[r * m.cols + lo]) near.push(r);
    if (out >= 0 && m.stand[r * m.cols + out]) far.push(r);
  }
  return { best, lo, out, near, far };
}

console.log(id + '  —  the map\'s read of each route (a floor, not a time)');
const free = run(null).best;
const got = [];
for (const band of bands) {
  const r = run(band);
  const ok = isFinite(r.best);
  if (ok) got.push({ name: band.name, f: r.best });
  console.log('  ' + band.name.padEnd(8) + 'rows ' + (band.lo + '-' + band.hi).padEnd(7) +
    (ok ? (r.best / 60).toFixed(2) + 's floor   ' + Math.round(r.best) + ' frames'
        : 'BREAKS between column ' + r.out + ' (body rows ' + r.far.join(',') + ') and ' +
          r.lo + ' (body rows ' + r.near.join(',') + ')'));
}
console.log('  ' + 'free'.padEnd(8) + 'any route'.padEnd(12) +
  (isFinite(free) ? (free / 60).toFixed(2) + 's floor' : 'NO WAY THROUGH AT ALL'));
if (got.length > 1) {
  got.sort((a, b) => a.f - b.f);
  console.log('\n  on the map alone the order is: ' +
    got.map(g => g.name + ' ' + (g.f / 60).toFixed(2) + 's').join('  <  '));
}
