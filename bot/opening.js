/* opening.js — solve just the first few seconds of a level, on its own terms.
 *
 * A monolithic search optimises for distance, and on The Drowning Tide
 * distance is a trap: the tide reaches its high mark in about eighty frames,
 * so every genome that runs right along the beach dies in the same place, and
 * mutating the tail of a genome that dies at frame 115 only ever produces
 * another genome that dies at frame 115.
 *
 * The opening is a different problem — "be above the water line, and still
 * moving" — and it is small enough to search directly. What comes out is a
 * seed for the real search rather than an answer to it.
 *
 *   node opening.js <levelId> <frames> <safeRow>
 */
const R = require('./runner');
const S = require('./search');
const win = R.sharedWorld(), PL = win.PL;

const levelId = process.argv[2] || 'shantytown-3';
const LEN = Number(process.argv[3] || 240);
const SAFE_ROW = Number(process.argv[4] || 11);   // rows above this are dry

const rng = S.mulberry32(99);

/* Score: staying alive first, then height above the water line, then distance.
 * Ordered that way on purpose — on this level a genome that is further right
 * and drowned is worth less than one that is behind and dry. */
function score(levelId, genome) {
  const scene = R.makeScene(PL, levelId);
  const p = scene.player;
  let minRow = 99, bestX = 0, aliveFor = 0, safeFrames = 0;
  for (let f = 0; f < genome.length; f++) {
    R.stepTop(PL, scene, genome[f]);
    if (p.dead) break;
    aliveFor = f;
    const row = (p.y + p.h) / 32;
    if (row < minRow) minRow = row;
    if (row <= SAFE_ROW) safeFrames++;
    if (p.x > bestX) bestX = p.x;
  }
  PL.util.restoreRandom();
  const survived = aliveFor >= genome.length - 2;
  return {
    fit: (survived ? 1000 : 0) + safeFrames * 2 + (20 - minRow) * 30 + bestX / 100,
    survived, minRow: +minRow.toFixed(2), bestX: +bestX.toFixed(0),
    aliveFor, safeFrames
  };
}

let pop = [];
for (let i = 0; i < 400; i++) pop.push(S.randomGenome(LEN, rng, 'climb'));
let best = null;
for (let gen = 0; gen < 60; gen++) {
  const scored = pop.map(g => ({ g, s: score(levelId, g) }));
  scored.sort((a, b) => b.s.fit - a.s.fit);
  if (!best || scored[0].s.fit > best.s.fit) {
    best = scored[0];
    console.log('gen ' + String(gen).padStart(2) + ': ' +
      (best.s.survived ? 'survived ' : 'died f' + best.s.aliveFor + ' ') +
      ' highest row ' + best.s.minRow + '  dry for ' + best.s.safeFrames +
      ' frames  reached x=' + best.s.bestX);
  }
  const next = scored.slice(0, 40).map(s => s.g);
  while (next.length < pop.length) {
    const a = scored[Math.floor(rng() * 80)].g;
    next.push(S.mutate(a.slice(), rng, 'climb'));
  }
  pop = next;
}
require('fs').writeFileSync('results/_opening-' + levelId + '.json',
  JSON.stringify({ level: levelId, frames: LEN, score: best.s, genome: best.g }, null, 1));
console.log('\nbest opening saved. survived=' + best.s.survived +
            ' highest row=' + best.s.minRow + ' (safe is <= ' + SAFE_ROW + ')');
