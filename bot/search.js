/* search.js — a genetic search over input logs, aimed at the human record.
 *
 * GENOMES ARE HOP BURSTS, NOT NOISE. Independent per-frame randomness almost
 * never produces a usable jump: the arc is cut short unless jump is HELD for
 * several consecutive frames (see JUMP_CUT in player.js), so a coin flip per
 * frame yields a stutter that barely leaves the ground. Generating runs of
 * "hold right a while, hold jump 4-13 frames, keep going" instead is the single
 * change that takes a search from crawling a fifth of the way through a level
 * to finishing it. Everything else here is tuning; this is not.
 *
 * THE TARGET IS THE RECORD, NOT THE POPULATION. Fitness knows the human record
 * for the level, so "finished" and "finished faster than a person has" are
 * different events, and the search says which one it just had. A run that never
 * beats the record is a legitimate outcome and gets reported as one — the point
 * is to find the optimal route, not to produce something submittable.
 */
'use strict';

const R = require('./runner');

// ------------------------------------------------------------------ randomness

/** Deterministic PRNG, so a search can be repeated exactly. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const frame = (r, j, l, d, i) => ({ l: l ? 1 : 0, r: r ? 1 : 0, u: 0, d: d ? 1 : 0, j: j ? 1 : 0, i: i ? 1 : 0 });
const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/**
 * One hop: run up, hold jump long enough for a real arc, then keep moving.
 *
 * `bias` shapes it without changing its shape: 'climb' hops sooner, holds
 * longer and dawdles less, which is what a level that floods under you wants.
 */
function hopBurst(rng, bias) {
  const out = [];
  const climb = bias === 'climb';
  const runUp = climb ? randInt(rng, 0, 6) : randInt(rng, 0, 22);
  const hold = climb ? randInt(rng, 8, 14) : randInt(rng, 4, 13);
  const after = climb ? randInt(rng, 4, 16) : randInt(rng, 10, 30);
  const back = !climb && rng() < 0.08;          // occasionally go the other way
  const useItem = rng() < 0.02;
  for (let f = 0; f < runUp; f++) out.push(frame(!back, 0, back, 0, useItem && f === 0));
  for (let f = 0; f < hold; f++) out.push(frame(!back, 1, back, 0, 0));
  for (let f = 0; f < after; f++) out.push(frame(!back, 0, back, 0, 0));
  return out;
}

function randomGenome(len, rng, bias) {
  const g = [];
  while (g.length < len) for (const f of hopBurst(rng, bias)) { if (g.length < len) g.push(f); }
  return g;
}

/** Keep the prefix that works; throw fresh hops at everything after it. */
function reseedTail(genome, fromFrame, rng, bias) {
  const head = genome.slice(0, Math.max(0, fromFrame));
  const tail = randomGenome(genome.length - head.length, rng, bias);
  return head.concat(tail);
}

// -------------------------------------------------------------------- mutation

/** Coarse: rewrite a stretch of the genome as fresh hops. */
function mutateRuns(genome, rng, bias) {
  const g = genome.slice();
  const n = randInt(rng, 1, 3);
  for (let k = 0; k < n; k++) {
    const at = randInt(rng, 0, g.length - 1);
    const burst = hopBurst(rng, bias);
    for (let f = 0; f < burst.length && at + f < g.length; f++) g[at + f] = burst[f];
  }
  return g;
}

/** Fine: shift a jump by a frame or two, which is where the last tenth lives. */
function mutateFrameNudge(genome, rng) {
  const g = genome.slice();
  const n = randInt(rng, 1, 6);
  for (let k = 0; k < n; k++) {
    const at = randInt(rng, 0, g.length - 1);
    const f = Object.assign({}, g[at]);
    const roll = rng();
    if (roll < 0.55) f.j = f.j ? 0 : 1;
    else if (roll < 0.8) { f.r = f.r ? 0 : 1; f.l = 0; }
    else if (roll < 0.9) f.d = f.d ? 0 : 1;
    else f.i = f.i ? 0 : 1;
    g[at] = f;
  }
  return g;
}

function mutate(genome, rng, bias) {
  return rng() < 0.5 ? mutateRuns(genome, rng, bias) : mutateFrameNudge(genome, rng);
}

function crossover(a, b, rng) {
  const at = randInt(rng, 1, Math.min(a.length, b.length) - 1);
  return a.slice(0, at).concat(b.slice(at));
}

// --------------------------------------------------------------------- fitness

/**
 * Finishers always beat non-finishers, and among finishers only the clock
 * matters. Among the rest, distance along the level dominates — squared, so a
 * genome that pushes the frontier is worth more than one that tidies up the
 * easy opening — with a small bonus for staying alive, capped so that standing
 * still somewhere safe never competes with actually going anywhere.
 */
function fitnessOf(res, width) {
  if (res.finished) return 1 + 100000 / res.frames;
  const reach = Math.min(1, res.bestX / width);
  const alive = Math.min(0.05, (res.deadAt < 0 ? res.frames : res.deadAt) / 20000);
  return reach * reach + alive;
}

// ---------------------------------------------------------------------- search

function run(levelId, opts) {
  opts = opts || {};
  const win = R.sharedWorld();
  const info = R.levelInfo(levelId, { win });
  const rng = mulberry32(opts.seed === undefined ? 12345 : opts.seed);

  const recordFrames = opts.recordFrames || null;   // the time to beat
  const pop = opts.pop || 120;
  const gens = opts.gens || 150;
  const genomeLen = opts.genomeLen ||
        Math.max(1200, Math.round(info.width * 0.35));
  const bias = opts.bias || null;
  const stagnationLimit = opts.stagnationLimit || 12;
  const extraAfterRecord = opts.extraAfterRecord === undefined ? 25 : opts.extraAfterRecord;
  const log = opts.log === false ? () => {} : (s) => console.log(s);

  let population = [];
  for (const seedGenome of (opts.seeds || [])) {
    population.push(seedGenome.slice(0, genomeLen));
    for (let k = 0; k < 4 && population.length < pop; k++) {
      population.push(mutate(seedGenome.slice(0, genomeLen), rng, bias));
    }
  }
  while (population.length < pop) population.push(randomGenome(genomeLen, rng, bias));

  let best = null, bestFit = -Infinity, stagnant = 0, beatAt = -1, evals = 0;

  for (let gen = 0; gen < gens; gen++) {
    const scored = population.map((g) => {
      const res = R.evaluate(levelId, g, { win });
      evals++;
      return { g, res, fit: fitnessOf(res, info.width) };
    });
    scored.sort((a, b) => b.fit - a.fit);
    const top = scored[0];

    if (top.fit > bestFit + 1e-9) {
      bestFit = top.fit;
      best = { genome: top.g.slice(0, top.res.finished ? top.res.frames : top.g.length), res: top.res };
      stagnant = 0;
      if (top.res.finished && recordFrames && top.res.frames < recordFrames && beatAt < 0) {
        beatAt = gen;
        log('  gen ' + gen + ': BEAT THE HUMAN RECORD — ' + top.res.frames +
            ' frames (' + (top.res.frames / 60).toFixed(2) + 's) vs record ' +
            recordFrames + ' (' + (recordFrames / 60).toFixed(2) + 's)');
      } else if (top.res.finished) {
        log('  gen ' + gen + ': finished in ' + top.res.frames + ' frames (' +
            (top.res.frames / 60).toFixed(2) + 's)' +
            (recordFrames ? '  — record is ' + recordFrames + ', still ' +
              ((top.res.frames - recordFrames) / 60).toFixed(2) + 's short' : ''));
      } else {
        log('  gen ' + gen + ': ' + (100 * top.res.bestX / info.width).toFixed(1) +
            '% through' + (top.res.deadAt >= 0 ? ', died frame ' + top.res.deadAt : ''));
      }
    } else stagnant++;

    // Stop a while after the record falls: the extra generations are for how
    // much further it can be pushed, not for whether to submit again.
    if (beatAt >= 0 && gen - beatAt >= extraAfterRecord) {
      log('  polished for ' + extraAfterRecord + ' generations past the record; stopping');
      break;
    }

    // --- next generation ---------------------------------------------------
    const elite = Math.max(2, Math.round(pop * 0.1));
    const next = scored.slice(0, elite).map((s) => s.g);

    // Stagnant: keep the prefix that reliably reaches the frontier and try a
    // different approach to the wall, branching well before it rather than
    // fiddling with the last jump.
    if (stagnant >= stagnationLimit && best) {
      const from = Math.max(0, (best.res.deadAt >= 0 ? best.res.deadAt : best.res.bestXFrame) - 300);
      while (next.length < pop / 2) next.push(reseedTail(best.genome, from, rng, bias));
      log('  gen ' + gen + ': stagnant, reseeding tails from frame ' + from);
      stagnant = 0;
    }

    while (next.length < pop) {
      const a = scored[randInt(rng, 0, elite * 2)] || scored[0];
      const b = scored[randInt(rng, 0, elite * 2)] || scored[0];
      let child = rng() < 0.6 ? crossover(a.g, b.g, rng) : a.g.slice();
      child = mutate(child, rng, bias);
      next.push(child);
    }
    population = next;
  }

  return {
    level: levelId, name: info.name, width: info.width,
    finished: best && best.res.finished,
    frames: best ? best.res.frames : null,
    timeMs: best && best.res.finished ? best.res.frames * 1000 / 60 : null,
    bestX: best ? best.res.bestX : 0,
    recordFrames: recordFrames,
    beatRecord: !!(best && best.res.finished && recordFrames && best.res.frames < recordFrames),
    tiedRecord: !!(best && best.res.finished && recordFrames && best.res.frames === recordFrames),
    genome: best ? best.genome : null,
    evals: evals
  };
}

module.exports = { run, mulberry32, randomGenome, hopBurst, fitnessOf, mutate };
