/* beam.js — search the level forwards, not the space of button-mashes.
 *
 * WHAT WAS WRONG BEFORE. The old search bred random input strings and scored
 * them on how far right they got. It knew nothing about the level: not where
 * the ground ended, not that the water kills, not that the tonic is worth a
 * detour. Every one of those had to be rediscovered by dying, on every level,
 * from scratch, and the search never finished because there was nothing in it
 * that could finish — a genome is 2000 independent choices and evolution over
 * that space is a lottery with no way to bank a partial answer.
 *
 * WHAT THIS DOES INSTEAD. It plays forward from the start, a few frames at a
 * time, keeping the most promising positions and throwing the rest away. That
 * is the whole idea: a route is built by extending good positions, so progress
 * is kept rather than re-rolled, and the cost is linear in the length of a run
 * rather than exponential in the number of buttons.
 *
 * Three things make it work, and none of them is a tuning parameter.
 *
 *   THE SNAPSHOT (state.js). Branching means trying several futures from one
 *   moment, which means being able to return to that moment. Without it every
 *   branch replays the level from frame zero.
 *
 *   THE MAP (map.js). Every position is scored by the level's own answer to
 *   "how many frames from here to the cup", computed over the ground Corb can
 *   actually stand on. This is what makes it aware of obstacles: a position
 *   past a wall with no way on scores infinitely badly and is dropped, without
 *   the search having to walk into the wall to find out.
 *
 *   THE ITEMS. The estimate is divided by how fast Corb is currently moving, so
 *   a run holding the Clockheart Tonic is honestly credited with being nearer
 *   the end than one that is not. The detour to the bottle pays for itself in
 *   the score, which is why the search takes it. Nothing is hardcoded about
 *   which items matter — the sum is just frames, and a faster Corb needs fewer.
 *
 * HAZARDS ARE NOT MODELLED, THEY ARE PLAYED. There is no list of what kills.
 * Every position in the beam is a real position in the real game, reached by
 * real frames of real physics, so a route that drowns is a node that died and
 * a route that mistimes a gear is a node that fell. The map says which way is
 * worth trying; the game says whether it works.
 */
'use strict';

const R = require('./runner');
const S = require('./state');
const M = require('./map');

const T = 32;

/* The moves. Three directions crossed with jump-or-not, plus the two things
 * that are neither: dropping through a plank, and the item button.
 *
 * A move is HELD for several frames rather than set for one. Holding is not a
 * simplification — the jump arc is cut short unless jump stays down, so a
 * vocabulary of single frames cannot express a full-height jump at all without
 * stringing several identical choices together, which is precisely the lottery
 * the old search was losing. Releasing between two held jumps is what gives a
 * second press in mid-air, which is how a wind pouch is spent.
 *
 * But it cannot be held for a FIXED number of frames, and that mistake cost a
 * whole search. At six frames a move, Corb can only leave the ground every 26
 * pixels — most of a tile — and a jump across four tiles of water has a
 * take-off window far narrower than that. On The Salt Road the beam sat on a
 * two-tile plank for four hundred moves, never once able to start its jump in
 * the right place, and reported the level impossible. So a move carries its own
 * length.
 *
 * The three lengths do different jobs and all three are needed. Two frames
 * shifts the phase of what follows, so a take-off can land anywhere rather than
 * every 26 pixels. Six is the ordinary step. Sixteen is a jump held to its full
 * height in ONE decision — and that is why it is here: a full jump is 26 frames
 * of held button, which as six-frame moves is four consecutive choices that
 * must each survive selection with nothing to show for themselves yet, because
 * a run halfway up a climb is behind a run that stayed on the flat. Chaining
 * four of those is a lottery of the kind this search exists to avoid.
 */
const DURATIONS = [2, 6, 16];
const ACTIONS = [
  { l: 0, r: 1, u: 0, d: 0, j: 0, i: 0 },   // run on
  { l: 0, r: 1, u: 0, d: 0, j: 1, i: 0 },   // run and jump
  { l: 0, r: 0, u: 0, d: 0, j: 0, i: 0 },   // stand still — for timing a gear
  { l: 0, r: 0, u: 0, d: 0, j: 1, i: 0 },   // jump straight up
  { l: 1, r: 0, u: 0, d: 0, j: 0, i: 0 },   // back off
  { l: 1, r: 0, u: 0, d: 0, j: 1, i: 0 },   // back off jumping
  { l: 0, r: 1, u: 0, d: 1, j: 1, i: 0 },   // down through a plank
  { l: 0, r: 1, u: 0, d: 0, j: 0, i: 1 }    // the item button: the bellows dash
];

/** How much faster than a bare Corb this one is, right now. */
function speedNow(p) {
  let m = 1;
  if (p.tonic > 0) m *= 1.45;
  if (p.has && p.has('marrow')) m *= 1.22;
  return m;
}

/**
 * Build the level's map, without disturbing anything.
 *
 * The sweep inside `analyse` runs a throwaway copy of the level on the scene
 * stack, so it has to happen before the run scene exists rather than around it.
 */
function mapFor(PL, levelId) {
  const def = R.makeScene(PL, levelId, 20260904);
  const map = M.analyse(def, PL);
  PL.util.restoreRandom();
  return map;
}

/**
 * A scene to search in, with a generator whose position can be read.
 *
 * The order is the game's own: build, enter, then toggleTas — because toggleTas
 * is what seeds the generator, and anything drawing a random number between the
 * seeding and the first frame puts the world one draw out of step with the run
 * being replayed. Our readable generator then replaces the game's at exactly
 * that point, same arithmetic and same seed, so the sequence is identical and
 * the search can also save its place.
 */
function openScene(win, PL, levelId, seed) {
  const base = R.makeScene(PL, levelId, seed);
  const rng = S.installRandom(win, seed);
  return { base, rng };
}

/**
 * Search one level.
 *
 * `beam` is how many positions are carried forward at a time and `chunk` how
 * many frames a move is held for. Everything else is bookkeeping.
 */
function search(levelId, opts) {
  opts = opts || {};
  const beamW = opts.beam || 80;
  const seed = opts.seed === undefined ? 20260904 : opts.seed;
  const maxFrames = opts.maxFrames || 4200;
  const log = opts.log || (() => {});

  const win = opts.win || R.sharedWorld();
  const PL = win.PL;
  const map = opts.map || mapFor(PL, levelId);
  const { base, rng } = openScene(win, PL, levelId, seed);
  const p = base.player;

  const start = {
    snap: S.snapshot(base, rng, PL, { horizon: DURATIONS[DURATIONS.length - 1] }),
    g: 0, h: map.costAt(p.x, p.y), key: 0,
    parent: null, act: -1, x: p.x, y: p.y
  };
  if (!isFinite(start.h)) return { ok: false, why: 'the map has no route from the spawn' };

  /**
   * A node's ancestry, spelled back out as one button object per frame.
   *
   * This is the whole output of the search: the shape is exactly what
   * PlayScene.inputLog holds, so what comes out here is a replayable TAS log
   * with no translation step between the search and the game.
   */
  function logOf(node) {
    const steps = [];
    for (let n = node; n && n.act >= 0; n = n.parent) steps.push(n);
    steps.reverse();
    const out = [];
    for (const n of steps) for (let k = 0; k < n.dur; k++) out.push(ACTIONS[n.act]);
    return out;
  }

  /* Nodes are held in bands two frames wide and worked through in time order.
   * A depth-synchronous beam cannot do this: with moves of different lengths,
   * "everyone has taken four moves" stops meaning "everyone is at the same
   * moment", and comparing a node 40 frames in against one 80 frames in on the
   * same estimate silently prefers the one that has done less. Banding by frame
   * keeps the comparison honest — every node in a band is at the same point in
   * the level's own clock, phase blocks and gear arcs included. */
  const BAND = 2;
  /* How long a snapshot is promised to be good for. The search never plays more
   * than the longest move before restoring again, so that is the promise made
   * and the one state.js is held to. */
  const HORIZON = DURATIONS[DURATIONS.length - 1];
  const bands = new Map();
  const bandOf = g => Math.floor(g / BAND);

  /* Offering a position is separated from SAVING it, and `snap` arrives as a
   * thunk that is only called if the position is actually wanted. Saving is the
   * single most expensive thing this search does — more than the physics it is
   * saving — and most children are beaten by a sibling before they are ever
   * expanded. Deciding first and saving second cuts the bill by most of itself.
   *
   * A band is kept as one small set PER PLACE — a couple of columns by one row —
   * rather than as one ranked list.
   *
   * That is not tidiness, it is the difference between finishing The Drowning
   * Tide and not. With a single ranked list, a position that has stopped to
   * climb the ladder is worse than every position still running along the beach,
   * because being further along is exactly what the estimate rewards. It is
   * refused entry and never saved at all, the whole beam is made of runs out on
   * the sand, and the whole beam drowns together when the water comes in — at
   * the same frame, at any width. Diversity applied when survivors are CHOSEN
   * comes too late; nothing trailing ever got into the band to choose from.
   *
   * The row half matters as much as the column half. The map cannot price a
   * tide: it quotes the same thirty-one seconds for the beach and for the
   * plank three rows above it, which is honest — from either one the cup is the
   * same distance away — but it means nothing in the score distinguishes the
   * position that is about to be underwater from the one that is not. Keeping
   * a place for each row means the climb survives on its own merits until the
   * water settles the argument.
   */
  const PER_PLACE = opts.perPlace || 4;
  const COLW = T * 2;
  const placeOf = (x, y) => Math.floor(x / COLW) * 64 + Math.floor(y / T);

  function offer(g, h, key, x, y, snap) {
    const b = bandOf(g);
    let bucket = bands.get(b);
    if (!bucket) bands.set(b, bucket = new Map());
    const cb = placeOf(x, y);
    let m = bucket.get(cb);
    if (!m) bucket.set(cb, m = new Map());

    const f = g + h;
    const have = m.get(key);
    if (have) { if (have.g + have.h <= f) return; }
    else if (m.size >= PER_PLACE) {
      let wk = null, wv = -Infinity;
      for (const [k2, n] of m) if (n.g + n.h > wv) { wv = n.g + n.h; wk = k2; }
      if (f >= wv) return;                    // beaten in its own place: never saved
      m.delete(wk);
    }
    m.set(key, snap());
  }

  bands.set(0, new Map([[Math.floor(start.x / (T * 2)) * 64 + Math.floor(start.y / T),
                         new Map([[0, start]])]]));

  let best = null;
  let expanded = 0, died = 0, offMap = 0, worked = 0;
  const lastBand = Math.ceil(maxFrames / BAND);

  for (let b = 0; b <= lastBand; b++) {
    const bucket = bands.get(b);
    bands.delete(b);
    if (!bucket) continue;

    /* Survivors are drawn round-robin from the places, best of each first. The
     * leading edge still gets the most slots, because it supplies the best node
     * in the most places — but it cannot take them all. */
    const places = [...bucket.values()].map(m => [...m.values()].sort((u, v) => (u.g + u.h) - (v.g + v.h)));
    places.sort((u, v) => (u[0].g + u[0].h) - (v[0].g + v[0].h));

    const nodes = [];
    for (let round = 0; nodes.length < beamW; round++) {
      let took = 0;
      for (const arr of places) {
        if (nodes.length >= beamW) break;
        const n = arr[round];
        if (!n) continue;
        nodes.push(n);
        took++;
      }
      if (!took) break;
    }
    worked++;

    for (const node of nodes) {
      /* A node that cannot beat a finish already in hand, even granting it the
       * fastest Corb the game allows for the whole of the rest, is not worth a
       * snapshot. */
      if (best && node.g + node.h / 1.77 >= best.g) continue;

      for (let a = 0; a < ACTIONS.length; a++) {
        /* One restore serves every length of the same move. The two-frame
         * version of "run right" is a prefix of the six-frame version, so the
         * shorter is taken on the way to the longer rather than by rewinding
         * and starting again. */
        S.restore(base, node.snap, rng);
        let played = 0, dead = false, over = false;
        for (const dur of DURATIONS) {
          while (played < dur && !dead && !over) {
            R.stepTop(PL, base, ACTIONS[a]);
            played++;
            if (base.finished) { over = true; break; }
            if (p.dead) { dead = true; break; }
          }
          expanded++;
          if (dead) { died++; break; }

          const g = base.tasFrame;

          if (over) {
            if (!best || g < best.g) {
              best = { g, node: { parent: node, act: a, dur: played } };
              best.log = logOf(best.node).slice(0, g);
              log('  finish at ' + g + ' frames (' + (g / 60).toFixed(2) + 's)');
            }
            break;
          }
          if (g >= maxFrames) break;

          /* The estimate, divided by how fast this Corb is. A run holding the
           * tonic really is nearer the end than one that is not, and this is
           * where the search learns to want the bottle. */
          const raw = map.costAt(p.x, p.y);
          if (!isFinite(raw)) { offMap++; continue; }
          const h = raw / speedNow(p);

          /* Two positions a few pixels apart, moving the same way, are the same
           * position as far as a route is concerned. Keeping both doubles the
           * beam and buys nothing, so the faster one wins the slot. */
          const key = (Math.round(p.x / 5) * 8192) + (Math.round(p.y / 5) * 8) +
                      (p.vx > 0.2 ? 4 : p.vx < -0.2 ? 2 : 0) + (p.grounded ? 1 : 0);
          const px = p.x, py = p.y, d = played;
          offer(g, h, key, px, py, () => ({
            snap: S.snapshot(base, rng, PL, { horizon: HORIZON }),
            g, h, key, parent: node, act: a, dur: d, x: px, y: py
          }));
        }
      }

      /* Let the saved state go the moment it has been branched from.
       *
       * A node keeps a pointer to its parent so the run can be spelled back out
       * at the end. While that pointer also reached the parent's SNAPSHOT, every
       * ancestor of every live position stayed in memory: a thousand bands deep
       * that is gigabytes, and the search was killed by the system for it rather
       * than finishing — which reads exactly like a level being too hard. What
       * the ancestry is actually needed for is which button was held and for how
       * long, and that is two numbers. */
      node.snap = null;
    }

    if (opts.verbose && b % 60 === 0) {
      let far = 0, lo = Infinity;
      for (const n of nodes) { if (n.x > far) far = n.x; if (n.g + n.h < lo) lo = n.g + n.h; }
      log('  frame ' + String(b * BAND).padStart(4) + '  band ' + String(nodes.length).padStart(4) +
          '  furthest ' + Math.round(far / T) + '/' + map.cols +
          '  best estimate ' + (lo / 60).toFixed(2) + 's' +
          (best ? '   finished ' + (best.g / 60).toFixed(2) + 's' : ''));
    }
  }

  PL.util.restoreRandom();
  return {
    ok: !!best,
    frames: best ? best.g : 0,
    timeMs: best ? best.g * 1000 / 60 : 0,
    log: best ? best.log : null,
    expanded, died, offMap, bands: worked
  };
}

module.exports = { search, mapFor, openScene, ACTIONS, speedNow };
