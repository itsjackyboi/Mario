/* storage.js — local-only persistence. No backend, no network calls.
 *
 * Two namespaced localStorage keys:
 *   pintland-drunken-trials:leaderboard  — per-level run history / best times
 *   pintland-drunken-trials:progress     — unlocks, key items, town purse
 *
 * Both are keyed by *town id* then *level id* so adding the remaining five
 * towns later is purely additive — no migration needed. `version` is stored
 * so a future format change can be detected.
 */
(function (PL) {
  'use strict';

  var LB_KEY = 'pintland-drunken-trials:leaderboard';
  var PR_KEY = 'pintland-drunken-trials:progress';
  var VERSION = 1;
  var MAX_ROWS = 10;

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return fallback;
      return obj;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, obj) {
    try {
      window.localStorage.setItem(key, JSON.stringify(obj));
      return true;
    } catch (e) {
      // Private browsing / quota. The game stays playable, scores just vanish.
      return false;
    }
  }

  var S = (PL.Store = {
    available: (function () {
      try {
        window.localStorage.setItem('pintland-drunken-trials:probe', '1');
        window.localStorage.removeItem('pintland-drunken-trials:probe');
        return true;
      } catch (e) { return false; }
    })(),

    // ---------------------------------------------------------------- leaderboard

    loadBoard: function () {
      var b = read(LB_KEY, null);
      if (!b || b.version !== VERSION) b = { version: VERSION, towns: {} };
      if (!b.towns) b.towns = {};
      return b;
    },

    /** All recorded runs for a level, best time first. */
    runsFor: function (townId, levelId) {
      var b = this.loadBoard();
      var t = b.towns[townId];
      if (!t || !t.levels || !t.levels[levelId]) return [];
      return t.levels[levelId].runs || [];
    },

    bestFor: function (townId, levelId) {
      var runs = this.runsFor(townId, levelId);
      return runs.length ? runs[0] : null;
    },

    /**
     * Record a completed run. Returns { rank, runs, isBest } where rank is the
     * 1-based position in the top ten, or 0 if it did not make the board.
     */
    recordRun: function (townId, levelId, run) {
      var b = this.loadBoard();
      var t = (b.towns[townId] = b.towns[townId] || { levels: {} });
      if (!t.levels) t.levels = {};
      var lv = (t.levels[levelId] = t.levels[levelId] || { runs: [], plays: 0 });
      lv.plays = (lv.plays || 0) + 1;

      var entry = {
        timeMs: Math.round(run.timeMs),
        grog: run.grog | 0,
        shards: run.shards | 0,
        deaths: run.deaths | 0,
        date: PL.util.stamp()
      };
      lv.runs = (lv.runs || []).concat([entry]);
      lv.runs.sort(function (a, c) { return a.timeMs - c.timeMs; });
      var rank = lv.runs.indexOf(entry) + 1;
      lv.runs = lv.runs.slice(0, MAX_ROWS);
      lv.bestTimeMs = lv.runs[0].timeMs;
      lv.bestGrog = Math.max(lv.bestGrog || 0, entry.grog);
      lv.totalGrog = (lv.totalGrog || 0) + entry.grog;

      write(LB_KEY, b);
      return {
        rank: rank <= MAX_ROWS ? rank : 0,
        runs: lv.runs,
        isBest: rank === 1,
        entry: entry
      };
    },

    clearBoard: function () { write(LB_KEY, { version: VERSION, towns: {} }); },

    // ------------------------------------------------------------------ progress

    loadProgress: function () {
      var p = read(PR_KEY, null);
      if (!p || p.version !== VERSION) p = { version: VERSION, towns: {} };
      if (!p.towns) p.towns = {};
      return p;
    },

    townProgress: function (townId) {
      var p = this.loadProgress();
      var t = p.towns[townId] || {};
      return {
        completed: t.completed || [],
        shards: t.shards || [],
        purse: t.purse || 0
      };
    },

    /** Mark a level cleared and bank its grog into the town purse. */
    completeLevel: function (townId, levelId, grog) {
      var p = this.loadProgress();
      var t = (p.towns[townId] = p.towns[townId] || { completed: [], shards: [], purse: 0 });
      if (t.completed.indexOf(levelId) === -1) t.completed.push(levelId);
      t.purse = (t.purse || 0) + (grog | 0);
      write(PR_KEY, p);
    },

    /** Red-Earth Shards are permanent once picked up — id is "levelId:index". */
    collectShards: function (townId, shardIds) {
      if (!shardIds || !shardIds.length) return;
      var p = this.loadProgress();
      var t = (p.towns[townId] = p.towns[townId] || { completed: [], shards: [], purse: 0 });
      if (!t.shards) t.shards = [];
      for (var i = 0; i < shardIds.length; i++) {
        if (t.shards.indexOf(shardIds[i]) === -1) t.shards.push(shardIds[i]);
      }
      write(PR_KEY, p);
    },

    isLevelComplete: function (townId, levelId) {
      return this.townProgress(townId).completed.indexOf(levelId) !== -1;
    },

    clearProgress: function () { write(PR_KEY, { version: VERSION, towns: {} }); }
  });

})(window.PL = window.PL || {});
