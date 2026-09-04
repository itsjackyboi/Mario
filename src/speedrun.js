/* speedrun.js — the Drunken Speedrun: every level in the isles, back to back,
 * on one unbroken clock.
 *
 * The clock is the whole point, so it is owned here rather than by any one
 * level: PlayScene takes `PL.Speedrun.elapsedMs` as the base it counts up from
 * and writes the sum back every frame, which means restarting a level and
 * sitting in a Trial cost you exactly what they should.
 *
 * Nothing inside a run winds that clock back. Dying, respawning at a flag and
 * restarting a level all leave it running — a restart simply hands the new
 * scene the run clock as its base. The only two things that put it back to zero
 * are finishing the run and starting a new one, and the only way out of a bad
 * run is the purse: five grog a death, and an empty one ends it.
 *
 * Every level is in the run, including the Owe Block bonus — a speedrun route
 * that changed depending on your save state would not be comparable to anyone
 * else's, so the lock is ignored here on purpose.
 *
 * Records go in the normal leaderboard store under a synthetic area/level pair
 * ('_speedrun' / 'full-game'), which needs no schema change and keeps whole-run
 * times out of the per-level boards.
 *
 * Each level's split ALSO goes on that level's own board, flagged `speedrun`,
 * because a personal best is a personal best however you got it — the board
 * shows which mode it came from rather than throwing the row away.
 *
 * TOWN SPLITS. A whole-game time is too coarse to route against and a per-level
 * one is too noisy, so the run is also cut at the town boundaries — the six
 * places you actually think of the run in. A town's split is recorded the
 * moment its last level is cleared, under '_speedrun' / 'town:<id>', which
 * needs no schema change and stays out of both the per-level boards and the
 * full-game one. The HUD reads it back to show the town you are in against the
 * best you have ever done it in.
 *
 * The purse carries between levels. Grog is the life pool now, so a run that
 * started every level on nothing would end on the first death of each one.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var SR_TOWN = '_speedrun';
  var SR_LEVEL = 'full-game';
  var TOWN_KEY = 'town:';        // + town id, under SR_TOWN

  var Speedrun = (PL.Speedrun = {
    TOWN: SR_TOWN,
    LEVEL: SR_LEVEL,
    TOWN_KEY: TOWN_KEY,

    active: false,
    levels: [],
    index: 0,
    elapsedMs: 0,
    purse: 0,       // grog in hand right now — carried level to level
    grog: 0,        // everything collected over the whole run
    deaths: 0,
    shards: 0,
    splits: [],
    lastTown: null, // the town just closed, for the HUD's delta flash

    /** Fresh run: rebuild the route and drop straight into the first level. */
    start: function () {
      var flat = PL.Towns.allLevels();
      this.levels = [];
      for (var i = 0; i < flat.length; i++) {
        var meta = PL.Towns.metaFor(flat[i].town.id, flat[i].def.id);
        meta.speedrun = true;
        meta.runIndex = i;
        meta.runCount = flat.length;
        this.levels.push({ def: flat[i].def, meta: meta });
      }
      this.active = true;
      this.index = 0;
      this.elapsedMs = 0;
      this.purse = 0;
      this.grog = 0;
      this.deaths = 0;
      this.shards = 0;
      this.splits = [];
      this.lastTown = null;
      var first = this.levels[0];
      PL.Game.reset(new PL.PlayScene(first.def, first.meta));
    },

    abort: function () {
      this.active = false;
      this.levels = [];
    },

    /** Called by PlayScene when a level's tankard is reached. */
    advance: function (scene) {
      var p = scene.player;
      var prev = this.splits.length ? this.splits[this.splits.length - 1].totalMs : 0;

      this.elapsedMs = scene.elapsedMs;
      this.purse = p.grog;                 // carried into the next level
      this.grog += p.grogEarned;
      this.deaths += p.deaths;
      this.shards += p.shards.length;
      // Measured off the run clock rather than the scene's own, so a level that
      // was restarted still shows every second it actually cost — and the
      // splits always add up to the total.
      var levelMs = scene.elapsedMs - prev;
      this.splits.push({
        id: scene.def.id,
        name: scene.def.name,
        town: scene.meta.townName || scene.def.town,
        townId: scene.def.town,
        totalMs: scene.elapsedMs,
        levelMs: levelMs,
        grog: p.grogEarned
      });

      // The split is a real time on a real level, so it goes on that level's
      // board too — tagged, not hidden.
      var split = {
        timeMs: levelMs,
        grog: p.grogEarned,
        shards: p.shards.length,
        deaths: p.deaths,
        speedrun: true
      };
      PL.Store.recordRun(scene.def.town, scene.def.id, split);
      split.town = scene.def.town;
      split.level = scene.def.id;
      PL.Cloud.submit(split);

      // Shards are permanent, and clearing a level should still unlock what it
      // unlocks — but the run's grog belongs to the run, not the area purse.
      PL.Store.collectShards(scene.def.town, p.shards);
      PL.Store.completeLevel(scene.def.town, scene.def.id, 0);

      this.index++;
      // A town closes on the level that is its last one in the route, whether
      // the run carries on into the next town or ends here.
      var next = this.levels[this.index];
      if (!next || next.def.town !== scene.def.town) {
        this.closeTown(scene.def.town, scene.meta.townName || scene.def.town);
      }
      if (!next) {
        this.finish();
        return;
      }
      PL.Game.replace(new PL.PlayScene(next.def, next.meta));
    },

    // ------------------------------------------------------------ town splits

    /**
     * The run clock as it stood when this town was entered. Found by walking
     * back to the last split that belonged to a *different* town, which works
     * because the route never leaves a town and comes back to it.
     */
    townStartMs: function (townId) {
      for (var i = this.splits.length - 1; i >= 0; i--) {
        if (this.splits[i].townId !== townId) return this.splits[i].totalMs;
      }
      return 0;
    },

    /** How long this town has taken, including the level in progress. */
    townMs: function (townId, nowMs) {
      if (nowMs == null) nowMs = this.elapsedMs;
      return Math.max(0, nowMs - this.townStartMs(townId));
    },

    /** How many of this town's levels the run has already cleared. */
    townDone: function (townId) {
      var n = 0;
      for (var i = 0; i < this.splits.length; i++) {
        if (this.splits[i].townId === townId) n++;
      }
      return n;
    },

    /** Best recorded split for a town in ms, or 0 if it has never been timed. */
    townBestMs: function (townId) {
      var b = PL.Store.bestFor(SR_TOWN, TOWN_KEY + townId);
      return b ? b.timeMs : 0;
    },

    /** Bank the finished town's split and remember it for the HUD's flash. */
    closeTown: function (townId, townName) {
      var ms = this.townMs(townId);
      if (ms <= 0) return;
      var prev = this.townBestMs(townId);       // read before it is written
      PL.Store.recordRun(SR_TOWN, TOWN_KEY + townId, {
        timeMs: ms, grog: 0, shards: 0, deaths: 0, speedrun: true
      });
      this.lastTown = {
        id: townId, name: townName, ms: ms, best: prev,
        isBest: !prev || ms < prev, at: this.elapsedMs
      };
    },

    finish: function () {
      this.active = false;
      var run = {
        timeMs: this.elapsedMs,
        grog: this.grog,
        shards: this.shards,
        deaths: this.deaths
      };
      var result = PL.Store.recordRun(SR_TOWN, SR_LEVEL, run);
      PL.Store.deposit(this.purse);      // the run's surviving purse, banked
      PL.Cloud.submit({
        town: SR_TOWN, level: SR_LEVEL,
        timeMs: run.timeMs, grog: run.grog, deaths: run.deaths,
        shards: run.shards, speedrun: true
      });
      PL.Game.replace(new SpeedrunEndScene(run, result, this.splits.slice()));
    },

    /** Best whole-run time on this browser, or null. */
    best: function () { return PL.Store.bestFor(SR_TOWN, SR_LEVEL); }
  });

  // =========================================================== results screen

  function SpeedrunEndScene(run, result, splits) {
    this.run = run;
    this.result = result;
    this.splits = splits;
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.options = [
      { label: 'Run it again', act: 'again' },
      { label: 'Level select', act: 'select' },
      { label: 'Title', act: 'title' }
    ];
  }

  SpeedrunEndScene.prototype.enter = function () { PL.Theme.apply(null); };

  SpeedrunEndScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('left') || In.pressed('up')) {
      this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('right') || In.pressed('down')) {
      this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('back')) { PL.Game.reset(new PL.TitleScene()); return; }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      var act = this.options[this.sel].act;
      if (act === 'again') Speedrun.start();
      else if (act === 'select') PL.Game.reset(new PL.LevelSelectScene('shantytown'));
      else PL.Game.reset(new PL.TitleScene());
    }
  };

  SpeedrunEndScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1020');
    g.addColorStop(0.6, '#3a1a22');
    g.addColorStop(1, '#6b3126');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    PL.gfx.glow(ctx, W / 2, H + 30, 300, 'rgba(255,140,60,0.4)', 0.45);

    PL.gfx.text(ctx, 'DRUNKEN SPEEDRUN', W / 2, 32, {
      font: PL.FONT.title, align: 'center', color: C.lanternHi
    });

    var best = Speedrun.best();
    var isBest = this.result && this.result.isBest;
    PL.gfx.text(ctx,
      isBest ? 'Every level in the isles, and a new best for this browser.'
             : 'Every level in the isles, start to finish.',
      W / 2, 50, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.75)' });

    // ---- the number that matters ----------------------------------------
    PL.gfx.panel(ctx, 22, 64, 244, 216, { r: 6 });
    PL.gfx.text(ctx, 'FULL GAME', 38, 88, { font: PL.FONT.small, color: C.lantern });
    PL.gfx.text(ctx, U.formatTime(this.run.timeMs), 250, 124, {
      font: 'bold 30px "Trebuchet MS", "Segoe UI", sans-serif',
      align: 'right', color: isBest ? C.lanternHi : C.parchment
    });
    if (isBest) {
      PL.gfx.rect(ctx, 38, 134, 212, 18, 'rgba(255,179,71,0.18)');
      PL.gfx.text(ctx, 'NEW BEST', 42, 147, { font: PL.FONT.small, color: C.lanternHi });
    } else if (best) {
      PL.gfx.text(ctx, 'Best: ' + U.formatTime(best.timeMs), 38, 147, {
        font: PL.FONT.small, color: 'rgba(242,227,196,0.7)'
      });
    }

    var y = 176;
    this.stat(ctx, 38, y, 'Levels', String(this.splits.length), C.parchment); y += 22;
    this.stat(ctx, 38, y, 'Grog collected', String(this.run.grog), C.grogBand); y += 22;
    this.stat(ctx, 38, y, 'Red-Earth Shards', String(this.run.shards), C.coral); y += 22;
    this.stat(ctx, 38, y, 'Deaths', String(this.run.deaths), 'rgba(242,227,196,0.85)');

    // ---- splits, two columns --------------------------------------------
    PL.gfx.panel(ctx, 276, 64, W - 298, 216, { r: 6 });
    PL.gfx.text(ctx, 'SPLITS', 292, 88, { font: PL.FONT.small, color: C.lantern });
    var half = Math.ceil(this.splits.length / 2);
    for (var i = 0; i < this.splits.length; i++) {
      var col = i < half ? 0 : 1;
      var row = i - col * half;
      var sx = 290 + col * 168;
      var sy = 106 + row * 20;
      var sp = this.splits[i];
      PL.gfx.text(ctx, String(i + 1), sx, sy, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.4)'
      });
      PL.gfx.text(ctx, U.fit(ctx, sp.name, PL.FONT.small, 96), sx + 14, sy, {
        font: PL.FONT.small, color: 'rgba(242,227,196,0.85)'
      });
      PL.gfx.text(ctx, U.formatTime(sp.levelMs), sx + 156, sy, {
        font: PL.FONT.mono, align: 'right', color: C.parchment
      });
    }

    // ---- options ---------------------------------------------------------
    var ox = W / 2 - (this.options.length * 150) / 2;
    for (var o = 0; o < this.options.length; o++) {
      var bx = ox + o * 150;
      var on = o === this.sel;
      PL.gfx.panel(ctx, bx + 8, 294, 134, 28, {
        r: 5, fill: on ? 'rgba(255,179,71,0.22)' : 'rgba(22,15,20,0.9)',
        stroke: on ? C.lantern : C.rope
      });
      PL.gfx.text(ctx, this.options[o].label, bx + 75, 313, {
        font: PL.FONT.small, align: 'center',
        color: on ? C.lanternHi : 'rgba(242,227,196,0.7)'
      });
    }
    PL.gfx.text(ctx, '← → choose · ENTER confirm', W / 2, 340, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.4)'
    });
  };

  SpeedrunEndScene.prototype.stat = function (ctx, x, y, label, value, color) {
    PL.gfx.text(ctx, label, x, y, { font: PL.FONT.body, color: 'rgba(242,227,196,0.6)' });
    PL.gfx.text(ctx, value, x + 212, y, {
      font: PL.FONT.hud, align: 'right', color: color
    });
  };

  PL.SpeedrunEndScene = SpeedrunEndScene;

})(window.PL = window.PL || {});
