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
 */
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
  const chunk = opts.chunk || 6;
  const seed = opts.seed === undefined ? 20260904 : opts.seed;
  const maxFrames = opts.maxFrames || 4200;
  const log = opts.log || (() => {});

  const win = opts.win || R.sharedWorld();
  const PL = win.PL;
  const map = opts.map || mapFor(PL, levelId);
  const { base, rng } = openScene(win, PL, levelId, seed);
  const p = base.player;

  const start = {
    snap: S.snapshot(base, rng, PL), g: 0, h: map.costAt(p.x, p.y),
    parent: null, act: -1, x: p.x, y: p.y
  };
  if (!isFinite(start.h)) return { ok: false, why: 'the map has no route from the spawn' };

  let beam = [start];
  let best = null;                 // the fastest finish seen
  let expanded = 0, died = 0, offMap = 0;

  /** Replay a node's ancestry into a flat input log. */
  function logOf(node) {
    const acts = [];
    for (let n = node; n && n.act >= 0; n = n.parent) acts.push(n.act);
    acts.reverse();
    const out = [];
    for (const a of acts) for (let k = 0; k < chunk; k++) out.push(ACTIONS[a]);
    return out;
  }

  for (let depth = 0; beam.length && depth * chunk < maxFrames; depth++) {
    const kids = new Map();        // dedup key -> the best child holding it

    for (const node of beam) {
      // a node already slower than a finished run is not worth extending
      if (best && node.g + node.h / 1.45 >= best.g) continue;

      for (let a = 0; a < ACTIONS.length; a++) {
        S.restore(base, node.snap, rng);
        let dead = false;
        for (let k = 0; k < chunk; k++) {
          R.stepTop(PL, base, ACTIONS[a]);
          if (base.finished) break;
          if (p.dead) { dead = true; break; }
        }
        expanded++;
        if (dead) { died++; continue; }

        const g = base.tasFrame;

        if (base.finished) {
          if (!best || g < best.g) {
            best = { g, node: { parent: node, act: a }, };
            best.log = logOf(best.node).slice(0, g);
            log('  finish at ' + g + ' frames (' + (g / 60).toFixed(2) + 's) — depth ' + depth);
          }
          continue;
        }
        if (g >= maxFrames) continue;

        /* The estimate, divided by how fast this Corb is. A run holding the
         * tonic really is nearer the end than one that is not, and this is
         * where the search learns to want the bottle. */
        const raw = map.costAt(p.x, p.y);
        if (!isFinite(raw)) { offMap++; continue; }
        const h = raw / speedNow(p);

        /* Two positions a few pixels apart, moving the same way, are the same
         * position as far as a route is concerned. Keeping both doubles the
         * beam and buys nothing, so the faster one wins the slot. */
        const key = (Math.round(p.x / 6) << 12) ^ (Math.round(p.y / 6) << 3) ^
                    ((p.vx > 0.2 ? 2 : p.vx < -0.2 ? 1 : 0) << 1) ^ (p.grounded ? 1 : 0);
        const have = kids.get(key);
        if (have && have.g + have.h <= g + h) continue;

        kids.set(key, {
          snap: S.snapshot(base, rng, PL), g, h,
          parent: node, act: a, x: p.x, y: p.y
        });
      }
    }

    beam = [...kids.values()].sort((u, v) => (u.g + u.h) - (v.g + v.h)).slice(0, beamW);

    if (opts.verbose && depth % 20 === 0 && beam.length) {
      const lead = beam[0];
      log('  depth ' + String(depth).padStart(4) + '  frame ' + String(lead.g).padStart(4) +
          '  beam ' + String(beam.length).padStart(4) +
          '  furthest ' + Math.round(Math.max(...beam.map(b => b.x)) / T) + '/' + map.cols +
          '  best estimate ' + ((lead.g + lead.h) / 60).toFixed(2) + 's' +
          (best ? '   finished ' + (best.g / 60).toFixed(2) + 's' : ''));
    }
  }

  PL.util.restoreRandom();
  return {
    ok: !!best,
    frames: best ? best.g : 0,
    timeMs: best ? best.g * 1000 / 60 : 0,
    log: best ? best.log : null,
    expanded, died, offMap
  };
}

module.exports = { search, mapFor, openScene, ACTIONS, speedNow };
