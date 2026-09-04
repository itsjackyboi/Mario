/* Pintland Isles: The Drunken Trials Tryout
 * util.js — tiny helpers shared by every module.
 * No build step: every file attaches to the global `PL` namespace so the game
 * can be opened straight from the filesystem (ES modules would need a server).
 */
(function (PL) {
  'use strict';

  var U = (PL.util = {});

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.sign = function (v) { return v < 0 ? -1 : (v > 0 ? 1 : 0); };

  /** Move `v` toward `target` by at most `step`. */
  U.approach = function (v, target, step) {
    return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
  };

  /** Deterministic PRNG so procedural scenery looks the same every load. */
  U.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.overlaps = function (a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  };

  U.pointIn = function (px, py, r) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  };

  /** 92345 -> "1:32.34" */
  U.formatTime = function (ms) {
    if (ms == null || !isFinite(ms)) return '--:--.--';
    var total = Math.max(0, Math.floor(ms));
    var m = Math.floor(total / 60000);
    var s = Math.floor((total % 60000) / 1000);
    var cs = Math.floor((total % 1000) / 10);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + (cs < 10 ? '0' : '') + cs;
  };

  U.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  /**
   * The same clock with the minutes zero-padded: 00:41.20 rather than 0:41.20.
   * Used for the shared sheet, where a column of times should line up and sort
   * as text; the HUD keeps the unpadded form, which reads better in play.
   */
  U.formatClock = function (ms) {
    if (ms == null || !isFinite(ms)) return '--:--.--';
    var total = Math.max(0, Math.floor(ms));
    return U.pad2(Math.floor(total / 60000)) + ':' +
           U.pad2(Math.floor((total % 60000) / 1000)) + '.' +
           U.pad2(Math.floor((total % 1000) / 10));
  };

  /** Short date stamp for leaderboard rows. */
  U.stamp = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + U.pad2(d.getMonth() + 1) + '-' + U.pad2(d.getDate());
  };

  /** Wraps text to `maxWidth` using the context's current font. */
  U.wrapText = function (ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  /** Blend two #rrggbb colours. Used to tint sprites without compositing
   *  over the rest of the frame. */
  U.mix = function (a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
    var g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
    var bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  };

  /** Shorten `text` with an ellipsis until it measures under `maxW`. */
  U.fit = function (ctx, text, font, maxW) {
    ctx.font = font;
    if (ctx.measureText(text).width <= maxW) return text;
    var s = String(text);
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  };

  U.pick = function (arr, rand) {
    return arr[Math.floor((rand || Math.random)() * arr.length) % arr.length];
  };

})(window.PL = window.PL || {});
