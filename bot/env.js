/* env.js — the real game, loaded headless.
 *
 * The game is plain <script> tags on a global `PL`, with no module system and
 * no build step, so "loading it" means running the same files in the same order
 * index.html does, inside a jsdom window. Nothing is stubbed out except the
 * canvas: the bot never calls a draw(), and a 2D context that returns nothing
 * is enough to get past the one or two places that ask for one at start-up.
 *
 * Reading the script order out of index.html rather than listing it here is
 * deliberate — that order IS the dependency graph, and a copy of it would go
 * stale the first time a file is added to the game.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');

/** The local scripts index.html loads, in order, with cache-busting stripped. */
function scriptList() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script src="([^"]+)"><\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].split('?')[0];
    if (/^[a-z]+:/i.test(src) || src.indexOf('//') === 0) continue;  // not ours
    out.push(src);
  }
  return out;
}

/* A canvas context with every method present and doing nothing. The game only
 * touches one at draw time, which the bot never reaches, but Theme.apply and a
 * couple of measurement helpers can ask for one early. */
function stubContext() {
  const noop = function () {};
  const ctx = {
    canvas: { width: 640, height: 360 },
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, drawImage: noop
  };
  ['save', 'restore', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc',
   'arcTo', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'rect', 'fill',
   'stroke', 'clip', 'fillRect', 'strokeRect', 'clearRect', 'fillText',
   'strokeText', 'translate', 'rotate', 'scale', 'transform', 'setTransform',
   'setLineDash', 'createImageData'].forEach(k => { ctx[k] = noop; });
  return ctx;
}

/**
 * A window with the whole game loaded and started.
 *
 * `PL.Game.start()` runs off main.js as it does in a browser; the animation
 * frame it schedules never fires here, which is exactly what is wanted — the
 * bot drives the fixed step itself rather than racing a render loop.
 */
function buildWindow() {
  const dom = new JSDOM(
    '<!doctype html><html><body><canvas id="game" width="640" height="360"></canvas></body></html>',
    { runScripts: 'dangerously', pretendToBeVisual: false }
  );
  const win = dom.window;

  win.HTMLCanvasElement.prototype.getContext = function () { return stubContext(); };
  // Nothing should be waiting on a frame; if anything asks, never answer.
  win.requestAnimationFrame = function () { return 0; };
  win.cancelAnimationFrame = function () {};
  // Audio is synthesised from an AudioContext the harness does not provide, and
  // every call site already copes with there being none.
  win.AudioContext = undefined;
  win.webkitAudioContext = undefined;

  /* THE HARNESS CANNOT POST. The shared board's endpoint is blanked the moment
   * config.js has run and before anything can call into PL.Cloud, which makes
   * every Cloud method a no-op by the game's own rule ("no endpoint, no
   * requests"). A search that evaluates tens of thousands of genomes must not
   * be one stray call away from writing to a board other people read, and the
   * safest way to guarantee that is for the thing doing the searching to have
   * no address to write to. Submitting is a separate, deliberate act in a real
   * browser — see bot/submit.md. */
  const ctx = vm.createContext(win);
  for (const rel of scriptList()) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: rel });
    } catch (e) {
      throw new Error('loading ' + rel + ': ' + e.message);
    }
    if (/config\.js$/.test(rel) && win.PL && win.PL.CONFIG) {
      win.PL.CONFIG.leaderboardUrl = '';
    }
  }
  // Belt and braces: if anything ever does reach for the network, it fails
  // loudly here rather than quietly succeeding somewhere else.
  win.fetch = function () {
    return Promise.reject(new Error('the bot harness has no network by design'));
  };
  if (!win.PL || !win.PL.Game) throw new Error('game did not load (no PL.Game)');
  return win;
}

module.exports = { buildWindow, scriptList, ROOT };
