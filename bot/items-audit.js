/* items-audit.js — is the search actually using what the level gives it?
 *
 * The two the levels lean on:
 *   Clockheart Tonic  picked up on touch, 1.45x speed for nine seconds
 *   Wind Pouch        picked up on touch, then SPENT as an extra jump in
 *                     mid-air — which needs a fresh jump PRESS while airborne
 *
 * That second one is the interesting case. A hop burst holds jump from the
 * ground and lets go, which is exactly one rising edge per burst, so a genome
 * made of hop bursts can carry a pouch the whole level and never spend it.
 * This counts what actually happens rather than assuming either way.
 */
const R = require('./runner');
const S = require('./search');
const win = R.sharedWorld(), PL = win.PL;

const MOBILITY = ['tonic', 'pouch', 'marrow', 'bellows', 'lagerhorn', 'ballast'];

function audit(levelId, genome) {
  const sc = R.makeScene(PL, levelId);
  const p = sc.player;
  let tonicFrames = 0, pouchPeak = 0, pouchSpent = 0, airJumps = 0, itemPresses = 0;
  let prevPouch = 0, prevAir = 0, prevGrounded = true;
  for (let f = 0; f < genome.length; f++) {
    const held = genome[f];
    const prev = genome[f - 1];
    if (held.i && (!prev || !prev.i)) itemPresses++;
    // a jump press while off the ground is the only thing that spends a pouch
    if (held.j && (!prev || !prev.j) && !prevGrounded) airJumps++;
    R.stepTop(PL, sc, held);
    if (p.tonic > 0) tonicFrames++;
    if (p.pouch > prevPouch) pouchPeak += (p.pouch - prevPouch);
    if (p.pouch < prevPouch) pouchSpent += (prevPouch - p.pouch);
    prevPouch = p.pouch;
    prevGrounded = !!p.grounded;
    if (sc.finished) break;
  }
  PL.util.restoreRandom();
  return { tonicFrames, pouchPicked: pouchPeak, pouchSpent, airJumpPresses: airJumps, itemPresses };
}

const rng = S.mulberry32(31);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('level', 22) + pad('mobility items on the map', 42) +
            'tonic s   pouches  spent  air-jump presses');
console.log('-'.repeat(108));
for (const entry of PL.Towns.allLevels()) {
  const id = entry.def.id;
  const w = PL.Level.build(entry.def);
  const present = {};
  for (const e of w.entities) if (MOBILITY.indexOf(e.type) >= 0) present[e.type] = (present[e.type]||0)+1;
  const names = Object.keys(present).map(k => present[k] + 'x' + k);
  if (!names.length) continue;
  // a representative hop-burst genome, the shape the search actually breeds
  const g = S.randomGenome(1600, rng, null);
  const a = audit(id, g);
  console.log(pad(id, 22) + pad(names.join(', '), 42) +
    pad((a.tonicFrames/60).toFixed(1), 10) + pad(a.pouchPicked, 9) +
    pad(a.pouchSpent, 7) + a.airJumpPresses);
}
