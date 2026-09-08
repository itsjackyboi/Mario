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
    /* Tool-assisted times are kept under an area of their own rather than on
     * the level's board. They are a real answer to "how fast can this level go"
     * and a meaningless answer to "how fast can it be played", so they are
     * never mixed in with times set by hand. */
    TAS_TOWN: '_tas',

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

    /**
     * The best recorded run on a level, or null.
     *
     * `kind` narrows it to where the time came from: 'level' for a level played
     * on its own, 'speedrun' for a split out of a Drunken Speedrun. They are
     * genuinely different records — a split is run with a carried purse, no
     * intro card and everything still to come, so comparing a solo attempt
     * against one is comparing two different events. Omit `kind` for the
     * fastest of either, which is what everything outside the split board wants.
     */
    bestFor: function (townId, levelId, kind) {
      var runs = this.runsFor(townId, levelId);      // already sorted, best first
      if (!kind || kind === 'any') return runs.length ? runs[0] : null;
      var want = kind === 'speedrun';
      for (var i = 0; i < runs.length; i++) {
        if (!!runs[i].speedrun === want) return runs[i];
      }
      return null;
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
        // Set on a split out of a Drunken Speedrun. Stored as a flag rather
        // than a separate board so a personal best stays a personal best
        // however it was set, and the table can say which mode it came from.
        speedrun: !!run.speedrun,
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

    /**
     * Take rows off a level's board by hand. Nothing in the game calls these —
     * they exist so a time set under a bug can be struck off from the browser
     * console without hand-editing the stored JSON:
     *
     *   PL.Store.dropRun('shantytown', 'shantytown-1', 1)
     *   PL.Store.dropRuns('shantytown', 'shantytown-1',
     *                     function (r) { return r.speedrun && r.timeMs < 20000; })
     *
     * Both return how many rows went, and both leave the board consistent: the
     * best time and the grog totals are recomputed from what is left rather
     * than carrying the deleted row's numbers forward.
     */
    dropRuns: function (townId, levelId, pred) {
      var b = this.loadBoard();
      var t = b.towns[townId];
      var lv = t && t.levels && t.levels[levelId];
      if (!lv || !lv.runs) return 0;

      var kept = [], gone = 0;
      for (var i = 0; i < lv.runs.length; i++) {
        if (pred(lv.runs[i], i)) {
          gone++;
          lv.totalGrog = Math.max(0, (lv.totalGrog || 0) - (lv.runs[i].grog | 0));
        } else {
          kept.push(lv.runs[i]);
        }
      }
      if (!gone) return 0;

      lv.runs = kept;
      lv.bestTimeMs = kept.length ? kept[0].timeMs : 0;
      lv.bestGrog = 0;
      for (var k = 0; k < kept.length; k++) {
        lv.bestGrog = Math.max(lv.bestGrog, kept[k].grog | 0);
      }
      write(LB_KEY, b);
      return gone;
    },

    /** Drop one row by its rank on the board, 1 being the top. */
    dropRun: function (townId, levelId, rank) {
      return this.dropRuns(townId, levelId, function (r, i) { return i === rank - 1; });
    },

    // ------------------------------------------------------------------ progress

    loadProgress: function () {
      var p = read(PR_KEY, null);
      if (!p || p.version !== VERSION) p = { version: VERSION, towns: {} };
      if (!p.towns) p.towns = {};
      return p;
    },

    /**
     * A town's state: which levels are cleared, which shards are held, and the
     * purse.
     *
     * THE PURSE IS A SUM, NOT A TALLY. It is the most grog you have ever
     * carried out of each of the town's levels, added up — one number per
     * level, no matter how many times you have run them.
     *
     * It used to be an accumulator: every completion added whatever you walked
     * out with, forever. That is not a purse, it is a lifetime total of every
     * attempt, and it read as nonsense — three Shanty Town levels worth about
     * seventy grog between them could show eleven hundred, because the number
     * counted the fortieth run of level one as much as the first. Nothing
     * spends it, so nothing was broken by it, but a number on screen should
     * mean what it says.
     *
     * Kept per level and summed on read rather than as a running figure, so it
     * cannot drift: it is derived from the record, and a wrong value would have
     * to be a wrong record.
     */
    townProgress: function (townId) {
      var p = this.loadProgress();
      var t = p.towns[townId] || {};
      var carried = t.carried || {};
      var purse = 0;
      for (var id in carried) purse += carried[id] | 0;
      return {
        completed: t.completed || [],
        shards: t.shards || [],
        carried: carried,
        purse: purse
      };
    },

    /**
     * Mark a level cleared, and record what was carried out of it if it beats
     * what was carried out before. A speedrun passes 0 — the run's grog belongs
     * to the run, and 0 can never lower a level's best haul.
     */
    completeLevel: function (townId, levelId, grog) {
      var p = this.loadProgress();
      var t = (p.towns[townId] = p.towns[townId] || { completed: [], shards: [] });
      if (t.completed.indexOf(levelId) === -1) t.completed.push(levelId);
      if (!t.carried) t.carried = {};
      t.carried[levelId] = Math.max(t.carried[levelId] | 0, grog | 0);
      // The old running total. Left behind rather than migrated: there is no
      // way to work out which levels those barrels came out of, and a guess
      // would be a made-up number wearing a real one's clothes.
      delete t.purse;
      write(PR_KEY, p);
    },

    /** Red-Earth Shards are permanent once picked up — id is "levelId:index". */
    collectShards: function (townId, shardIds) {
      if (!shardIds || !shardIds.length) return;
      var p = this.loadProgress();
      var t = (p.towns[townId] = p.towns[townId] || { completed: [], shards: [] });
      if (!t.shards) t.shards = [];
      for (var i = 0; i < shardIds.length; i++) {
        if (t.shards.indexOf(shardIds[i]) === -1) t.shards.push(shardIds[i]);
      }
      write(PR_KEY, p);
    },

    isLevelComplete: function (townId, levelId) {
      return this.townProgress(townId).completed.indexOf(levelId) !== -1;
    },

    /**
     * Has any Red-Earth Shard from this level been banked? Shard ids are
     * "levelId:index", so the prefix is the whole test — which is what lets the
     * unlock chain work without storing a second thing alongside it.
     */
    hasShardFrom: function (townId, levelId) {
      var shards = this.townProgress(townId).shards;
      var prefix = levelId + ':';
      for (var i = 0; i < shards.length; i++) {
        if (shards[i].indexOf(prefix) === 0) return true;
      }
      return false;
    },

    clearProgress: function () { write(PR_KEY, { version: VERSION, towns: {} }); },

    // ----------------------------------------------------------- beer bank

    /**
     * The Beer Bank: every barrel you have ever walked out of a level with,
     * minus whatever you have spent in it. Kept on the progress blob beside
     * the per-area purses rather than in a key of its own, so a save is still
     * one thing to move or clear.
     *
     * `banked` is the running total ever earned and never goes down — it is
     * the number worth bragging about, and it makes "spent" answerable.
     */
    bank: function () {
      var p = this.loadProgress();
      return {
        grog: p.bank || 0,
        banked: p.banked || 0,
        owned: p.owned || [],
        pet: p.pet || '',
        outfit: p.outfit || '',
        hat: p.hat || ''
      };
    },

    /** Bank a finished run's purse. Returns the new balance. */
    deposit: function (n) {
      n = Math.max(0, n | 0);
      var p = this.loadProgress();
      p.bank = (p.bank || 0) + n;
      p.banked = (p.banked || 0) + n;
      write(PR_KEY, p);
      return p.bank;
    },

    owns: function (id) { return this.bank().owned.indexOf(id) !== -1; },

    /** Buy one catalogue item. False if it is already owned or unaffordable. */
    buy: function (id, price) {
      var p = this.loadProgress();
      if (!p.owned) p.owned = [];
      if (p.owned.indexOf(id) !== -1) return false;
      if ((p.bank || 0) < price) return false;
      p.bank -= price;
      p.owned.push(id);
      write(PR_KEY, p);
      return true;
    },

    /** Wear something you own. Pass '' to take it off. Slots: pet, outfit, hat. */
    equip: function (slot, id) {
      if (id && !this.owns(id)) return false;
      var p = this.loadProgress();
      p[slot] = id || '';
      write(PR_KEY, p);
      return true;
    },

    /**
     * The name that goes on the shared board. Kept in the progress blob rather
     * than a key of its own so a save is still one thing to move or clear.
     */
    playerName: function () {
      return this.loadProgress().player || '';
    },

    /**
     * What the split board measures you against: 'self' or 'world'.
     *
     * Personal is the default because it is the comparison that always exists
     * — the shared board can be unreachable, empty, or switched off entirely,
     * and a split board with nothing to compare to is just a list of numbers.
     */
    compareMode: function () {
      return this.loadProgress().compare === 'world' ? 'world' : 'self';
    },

    setCompareMode: function (mode) {
      var p = this.loadProgress();
      p.compare = mode === 'world' ? 'world' : 'self';
      write(PR_KEY, p);
      return p.compare;
    },

    /**
     * Which pool of records the split board races: 'level' or 'speedrun'.
     *
     * The same level has two records and they are not the same achievement. A
     * solo attempt starts on a fresh purse with nothing riding on it; a
     * speedrun split is run with whatever the last level left you and a whole
     * game still ahead. Racing the solo record during a run is the ambitious
     * comparison and racing the split record is the honest one, so it is a
     * choice rather than a rule — and the header says which is on.
     *
     * Level records are the default: everyone has those first.
     */
    splitMode: function () {
      return this.loadProgress().splitKind === 'speedrun' ? 'speedrun' : 'level';
    },

    setSplitMode: function (kind) {
      var p = this.loadProgress();
      p.splitKind = kind === 'speedrun' ? 'speedrun' : 'level';
      write(PR_KEY, p);
      return p.splitKind;
    },

    setPlayerName: function (name) {
      var p = this.loadProgress();
      p.player = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 24);
      write(PR_KEY, p);
      return p.player;
    },

    // ------------------------------------------------------------ aggregates

    /**
     * Totals across every registered level, for the finale's ending screen.
     * `totalBestMs` sums each level's best time; levels never cleared count as
     * missing rather than zero, so a partial run reads honestly.
     */
    grandTotals: function () {
      var towns = (PL.Towns && PL.Towns.list) || [];
      var out = {
        levels: 0, cleared: 0, totalBestMs: 0, missing: 0,
        grog: 0, shards: 0, shardTotal: 0, deaths: 0
      };
      for (var t = 0; t < towns.length; t++) {
        var town = towns[t];
        var prog = this.townProgress(town.id);
        out.grog += prog.purse;
        out.shards += prog.shards.length;
        for (var l = 0; l < town.levels.length; l++) {
          var def = town.levels[l];
          out.levels++;
          out.shardTotal += PL.Towns.shardCount(def);
          var best = this.bestFor(town.id, def.id);
          if (best) {
            out.cleared++;
            out.totalBestMs += best.timeMs;
            out.deaths += best.deaths || 0;
          } else {
            out.missing++;
          }
        }
      }
      return out;
    },

    /** True once the named level has been cleared at least once. */
    cleared: function (townId, levelId) {
      return !!this.bestFor(townId, levelId);
    }
  });

})(window.PL = window.PL || {});
