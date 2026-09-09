/* runner.js — play a genome against a level and say what happened.
 *
 * A genome is an array of per-frame button objects, {l,r,u,d,j,i}, which is
 * exactly the shape PlayScene keeps in `inputLog`. That is on purpose: a genome
 * the search finds IS a TAS input log, replayable in the real game with no
 * translation step.
 *
 * ONE WINDOW, MANY RUNS. Every per-run piece of state lives on the PlayScene,
 * World and Player the scene builds, not on PL itself, so a single loaded game
 * can evaluate genome after genome. Rebuilding the window per genome costs
 * ~260ms; reusing it costs ~1ms.
 *
 * STEP THE TOP OF THE STACK, NOT THE PLAY SCENE. Reaching a trial gate calls
 * PL.Game.push(new TrialScene(...)) and freezes the player. Code that keeps
 * stepping the PlayScene from there is stepping a scene that is no longer in
 * charge — the trial never advances, the player never unfreezes, and the level
 * looks impossible when it is only unattended.
 */
'use strict';

const { buildWindow } = require('./env');

const STEP = 1 / 60;
const EMPTY = { l: 0, r: 0, u: 0, d: 0, j: 0, i: 0 };

let shared = null;

/** The one loaded game every evaluation runs inside. */
function sharedWorld() {
  if (!shared) shared = buildWindow();
  return shared;
}

function levelDef(PL, levelId) {
  const flat = PL.Towns.allLevels();
  for (let i = 0; i < flat.length; i++) if (flat[i].def.id === levelId) return flat[i].def;
  throw new Error('no such level: ' + levelId);
}

/**
 * A PlayScene in practice mode with TAS on, on the real scene stack.
 *
 * Practice is required rather than cosmetic: toggleTas() returns without doing
 * anything outside it, and practice is also what keeps a search from touching
 * the ordinary boards, the purse or the unlock chain.
 */
function makeScene(PL, levelId, seed) {
  const def = levelDef(PL, levelId);
  const scene = new PL.PlayScene(def, { practice: true });
  scene.tasSeed = seed === undefined ? 20260904 : seed;
  PL.Game.reset(scene);
  scene.toggleTas();          // seeds Math.random and starts the input log
  scene.introT = 0;           // the card is not part of the run
  scene.fadeIn = 0;
  return scene;
}

/**
 * Advance one frame on `held`, through whichever scene is actually in charge.
 *
 * The frame is logged on the PlayScene either way, so `inputLog` stays a
 * complete, frame-aligned record of the run even across a trial.
 */
function stepTop(PL, base, held) {
  const prev = base.inputLog[base.tasFrame - 1] || null;
  base.inputLog[base.tasFrame] = held;
  base.tasFrame++;
  PL.Input.force = held;
  PL.Input.forcePrev = prev;
  const top = PL.Game.top();
  if (top === base) base.step(STEP);
  else if (top && top.update) top.update(STEP);
  PL.Input.force = PL.Input.forcePrev = null;
}

/** True once the level is over, however it ended. */
function done(PL, base) {
  if (base.finished) return true;
  const top = PL.Game.top();
  // showResults() replaces the PlayScene with a result card; if the stack no
  // longer holds the scene we started, the run is over.
  return PL.Game.scenes.indexOf(base) < 0;
}

/**
 * Play `genome` and report. `frames` is the frame the tankard was touched on,
 * which is also the time the game would post: the clock is `levelMs`, and
 * `levelMs` is exactly one STEP per frame until `finished` goes true.
 */
function evaluate(levelId, genome, opts) {
  opts = opts || {};
  const win = opts.win || sharedWorld();
  const PL = win.PL;
  const base = makeScene(PL, levelId, opts.seed);
  const world = base.world;
  const p = base.player;

  let bestX = p.x, bestXFrame = 0, deadAt = -1, deaths = 0, finishFrame = -1;
  const limit = Math.min(genome.length, opts.maxFrames || genome.length);

  for (let f = 0; f < limit; f++) {
    stepTop(PL, base, genome[f] || EMPTY);
    if (base.finished && finishFrame < 0) finishFrame = base.tasFrame;
    if (p.x > bestX) { bestX = p.x; bestXFrame = f; }
    if (p.dead) { deaths++; if (deadAt < 0) deadAt = f; }
    if (finishFrame >= 0) break;
    if (done(PL, base)) break;
  }

  const finished = finishFrame >= 0;
  PL.util.restoreRandom();
  return {
    finished: finished,
    frames: finished ? finishFrame : limit,
    timeMs: finished ? finishFrame * STEP * 1000 : 0,
    bestX: bestX,
    bestXFrame: bestXFrame,
    deadAt: deadAt,
    deaths: deaths,
    grog: p.grogEarned || 0,
    shards: p.shards ? p.shards.length : 0,
    worldW: world.w
  };
}

/** Same run, with a per-frame record of where the player was. For diagnosis. */
function trace(levelId, genome, opts) {
  opts = opts || {};
  const win = opts.win || sharedWorld();
  const PL = win.PL;
  const base = makeScene(PL, levelId, opts.seed);
  const p = base.player;
  const path = [];
  for (let f = 0; f < genome.length; f++) {
    stepTop(PL, base, genome[f] || EMPTY);
    path.push({
      f: f, x: +p.x.toFixed(2), y: +p.y.toFixed(2),
      vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2),
      grounded: !!p.grounded, dead: !!p.dead,
      scene: PL.Game.top() === base ? 'play' : (PL.Game.top() || {}).constructor.name
    });
    if (base.finished || done(PL, base)) break;
  }
  PL.util.restoreRandom();
  return { path: path, finished: !!base.finished, frames: base.tasFrame };
}

/** Level geometry the search needs: how wide it is, and where the cup sits. */
function levelInfo(levelId, opts) {
  const win = (opts && opts.win) || sharedWorld();
  const PL = win.PL;
  const def = levelDef(PL, levelId);
  const w = PL.Level.build(def);
  return {
    id: levelId, name: def.name, town: def.town,
    width: w.w, spawnX: w.spawn.x,
    tankardX: w.tankard ? w.tankard.x : w.w,
    trial: def.trial || null, diff: def.diff || 1,
    shardCount: w.shardTotal
  };
}

module.exports = { sharedWorld, makeScene, stepTop, evaluate, trace, levelInfo, STEP, EMPTY };
