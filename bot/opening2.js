/* opening2.js — the opening of The Drowning Tide, searched with a vocabulary
 * that can actually climb.
 *
 * The diagnosis, in order:
 *   1. The tide reaches its high mark 3.2s in and holds for 2.4s. Feet more
 *      than 6px below row 12 die, so the only dry footing in the first stretch
 *      is columns 5-13 — the three-plank ladder over the spawn.
 *   2. Every genome the main search produces holds right for its whole length,
 *      because that is what a hop burst is. So it runs straight past the
 *      ladder and drowns at column 16, every time, whatever the mutation rate.
 *   3. So the missing move is not a better mutation — it is "stop and go up".
 *
 * The vocabulary here has that move in it, and the score is only "are you dry
 * when the water is at its highest", with no reward for distance at all. What
 * comes out is a seed for the real search, not a run.
 */
const fs = require('fs');
const R = require('./runner');
const S = require('./search');
const win = R.sharedWorld(), PL = win.PL;

const LEN = 400;              // through the first full flood
const SAFE = 12.19;           // feet row that survives the peak
const rng = S.mulberry32(2024);
const F = (r, l, j) => ({ l: l?1:0, r: r?1:0, u: 0, d: 0, j: j?1:0, i: 0 });
const ri = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/** Bursts that can go up without going anywhere. */
function burst() {
  const kind = rng();
  const out = [];
  if (kind < 0.35) {                       // climb in place
    for (let f = 0; f < ri(8, 14); f++) out.push(F(0, 0, 1));
    for (let f = 0; f < ri(2, 10); f++) out.push(F(0, 0, 0));
  } else if (kind < 0.55) {                // short hop left
    for (let f = 0; f < ri(0, 6); f++) out.push(F(0, 1, 0));
    for (let f = 0; f < ri(8, 14); f++) out.push(F(0, 1, 1));
    for (let f = 0; f < ri(2, 12); f++) out.push(F(0, 1, 0));
  } else if (kind < 0.9) {                 // short hop right
    for (let f = 0; f < ri(0, 8); f++) out.push(F(1, 0, 0));
    for (let f = 0; f < ri(8, 14); f++) out.push(F(1, 0, 1));
    for (let f = 0; f < ri(2, 12); f++) out.push(F(1, 0, 0));
  } else {                                 // stand still and wait
    for (let f = 0; f < ri(5, 25); f++) out.push(F(0, 0, 0));
  }
  return out;
}
function genome() {
  const g = [];
  while (g.length < LEN) for (const f of burst()) if (g.length < LEN) g.push(f);
  return g;
}
function mutate(g) {
  const out = g.slice();
  for (let k = 0, n = ri(1, 3); k < n; k++) {
    const at = ri(0, out.length - 1), b = burst();
    for (let f = 0; f < b.length && at + f < out.length; f++) out[at + f] = b[f];
  }
  return out;
}

/* Score: how many frames you are dry while the water is up. Nothing else. */
function score(g) {
  const sc = R.makeScene(PL, 'shantytown-3');
  const p = sc.player;
  let dryUnderFlood = 0, alive = 0, bestRow = 99;
  for (let f = 0; f < g.length; f++) {
    R.stepTop(PL, sc, g[f]);
    if (p.dead) break;
    alive = f;
    const row = (p.y + p.h) / 32;
    if (row < bestRow) bestRow = row;
    // the flood is up from about frame 150 to frame 340
    if (f > 150 && f < 340 && row <= SAFE && p.grounded) dryUnderFlood++;
  }
  PL.util.restoreRandom();
  return { fit: alive + dryUnderFlood * 20, alive, dryUnderFlood,
           bestRow: +bestRow.toFixed(2), survived: alive >= g.length - 2 };
}

let pop = []; for (let i = 0; i < 500; i++) pop.push(genome());
let best = null;
for (let gen = 0; gen < 70; gen++) {
  const sc = pop.map(g => ({ g, s: score(g) }));
  sc.sort((a, b) => b.s.fit - a.s.fit);
  if (!best || sc[0].s.fit > best.s.fit) {
    best = sc[0];
    console.log('gen ' + String(gen).padStart(2) + ': alive to f' + best.s.alive +
                (best.s.survived ? ' (SURVIVED the flood)' : '') +
                ', dry-and-grounded under the flood for ' + best.s.dryUnderFlood +
                ' frames, highest row ' + best.s.bestRow);
  }
  const next = sc.slice(0, 50).map(s => s.g);
  while (next.length < pop.length) next.push(mutate(sc[Math.floor(rng() * 100)].g));
  pop = next;
}
fs.writeFileSync('results/_opening2-shantytown-3.json',
  JSON.stringify({ score: best.s, genome: best.g }, null, 1));
console.log('\n' + (best.s.survived
  ? 'The opening is solvable: this genome is still alive after the first flood.'
  : 'Still drowning. The ladder is not being climbed even with a climb move.'));
