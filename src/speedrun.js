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
 * TWO CATEGORIES, chosen before the run: a SHARD RUN, where reaching a tankard
 * without that level's Red-Earth Shard sends you back to the start of it with
 * the clock still running, and ANY%, where nothing but the tankard is required.
 * They are different games rather than difficulty settings — the shard is what
 * the towns are gated on, and a route free to walk past it is shorter wherever
 * one appears — so they keep separate whole-game records and separate town
 * splits, and every screen says which one is running.
 *
 * Records go in the normal leaderboard store under a synthetic area/level pair
 * ('_speedrun' / 'full-game', or 'full-game-any'), which needs no schema change
 * and keeps whole-run times out of the per-level boards.
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
  var SR_LEVEL_ANY = 'full-game-any';
  var TOWN_KEY = 'town:';        // + town id, under SR_TOWN

  /* THE TWO RUNS.
   *
   * A run with the shards and a run without are different games, not the same
   * game played two ways: the shard is what the towns are gated on, and a route
   * free to walk past it is shorter everywhere it appears. Putting both on one
   * board would mean the board's top time was always the one that skipped the
   * most, so they get a board each — separate whole-game records, separate town
   * splits — and the run says which it is on every screen it touches.
   *
   * Per-level splits still go on the level's own board either way. Those boards
   * already hold times set without the shard, because a single level has never
   * required it; the mode column is what tells them apart there.
   */
  var MODES = {
    shard: {
      id: 'shard', level: SR_LEVEL, label: 'SHARD RUN', short: 'SHARDS',
      blurb: 'Every level, every Red-Earth Shard. Touch the tankard without one and ' +
             'the level starts again with the clock still running.'
    },
    any: {
      id: 'any', level: SR_LEVEL_ANY, label: 'ANY%', short: 'ANY%',
      blurb: 'Every level, nothing else required. Shards are optional, so anything ' +
             'that reaches the tankard counts.'
    }
  };

  var Speedrun = (PL.Speedrun = {
    TOWN: SR_TOWN,
    LEVEL: SR_LEVEL,
    LEVEL_ANY: SR_LEVEL_ANY,
    TOWN_KEY: TOWN_KEY,
    MODES: MODES,

    /** 'shard' or 'any'. Set by start(), read by everything downstream. */
    mode: 'shard',
    modeDef: function () { return MODES[this.mode] || MODES.shard; },
    /** True when walking past a shard has to cost you the level. */
    needsShards: function () { return this.mode !== 'any'; },

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
    start: function (mode) {
      this.mode = MODES[mode] ? mode : 'shard';
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
      this._cmp = null;
      this.paceReal = PL.Game.realMs;
      this.paceGame = PL.Game.gameMs;
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
      this._cmp = null;                    // that row may have moved a record
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

    // ----------------------------------------------------------- the splits

    /**
     * The time a split is measured against, in ms, or 0 if there is none.
     *
     * Two switches, both set before the run on the title screen, decide which
     * record that is:
     *
     *   WHOSE   your own records, or the fastest anyone has posted
     *   WHICH   times set on the level alone, or splits out of a speedrun
     *
     * Neither is more correct than the other, which is why both are a choice.
     * What matters is that the board says which pair is on, because a gold
     * split means four different things.
     *
     * When the exact record asked for does not exist, it falls back rather than
     * showing nothing: your own time in the same category, then either board's
     * best of any category. A comparison you can only half see is worse than
     * one that quietly uses the closest thing it has, and a board that goes
     * blank mid-run over one unclaimed level is worse than both.
     */
    levelBestMs: function (townId, levelId) {
      var kind = PL.Store.splitMode();
      var world = PL.Store.compareMode() === 'world';
      var mine = PL.Store.bestFor(townId, levelId, kind);
      if (world && PL.Cloud) {
        var w = PL.Cloud.bestMs(levelId, kind);
        if (w) return w;
      }
      if (mine) return mine.timeMs;
      if (world && PL.Cloud) {
        var wa = PL.Cloud.bestMs(levelId);
        if (wa) return wa;
      }
      var any = PL.Store.bestFor(townId, levelId);
      return any ? any.timeMs : 0;
    },

    /**
     * The comparison as a running total: what the clock would read at each
     * split if every level went exactly as well as the record it is being
     * measured against.
     *
     * This is what makes the board readable the moment it appears rather than
     * one level at a time. Every row carries the time to beat from the start,
     * so "am I on pace" is a comparison between two numbers on the same line
     * instead of arithmetic done in your head halfway up a ladder.
     *
     * A level with no record at all stops the accumulation: everything past it
     * is `null` rather than a total that quietly pretends the missing level
     * takes no time.
     */
    comparison: function () {
      if (this._cmp) return this._cmp;
      var rows = this.levels.length ? this.levels : PL.Towns.allLevels();
      var out = [], total = 0, broken = false;
      for (var i = 0; i < rows.length; i++) {
        var def = rows[i].def;
        var ms = this.levelBestMs(def.town, def.id);
        if (!ms) broken = true;
        total += ms;
        out.push({ segMs: ms, totalMs: broken ? 0 : total });
      }
      return (this._cmp = out);
    },

    /* Every record read goes through localStorage and a JSON parse, and the
     * board is drawn sixty times a second, so the comparison is worked out once
     * and thrown away whenever it could have changed: a split landing, a switch
     * being flipped, a run starting. */
    _cmp: null,
    invalidate: function () { this._cmp = null; },

    /**
     * Sum of best: the run you would have if every level went as well as it
     * ever has. It is not a time anyone has run — it is the target, and the
     * gap between it and your best run is what is left on the table.
     *
     * Levels you have never cleared are counted as missing rather than as
     * zero, so a partial sum reads as partial instead of as a fantasy.
     */
    sumOfBest: function () {
      var cmp = this.comparison();
      var total = 0, missing = 0;
      for (var i = 0; i < cmp.length; i++) {
        if (cmp[i].segMs) total += cmp[i].segMs; else missing++;
      }
      return { ms: total, missing: missing, count: cmp.length };
    },

    /**
     * A level's label on the split board: one letter and a number, "S 1".
     *
     * The column is the whole cost of the board — it sits over the left of the
     * screen for an entire run — so the name is squeezed to nothing and the
     * space goes to the times, which are what anyone is actually reading. Six
     * towns, six distinct initials; the bonus level takes a star instead of a
     * number because it is not the fourth of anything.
     */
    shortLabel: function (def, indexInTown) {
      var t = PL.Towns.get(def.town);
      var code = (t && t.code) || def.town.charAt(0).toUpperCase();
      return code + ' ' + (def.bonus ? '★' : (indexInTown + 1));
    },

    /**
     * The storage key for a town's split. Any% gets its own, because a town
     * run without its shards is a different town.
     */
    townKey: function (townId, mode) {
      var m = mode || this.mode;
      return TOWN_KEY + townId + (m === 'any' ? ':any' : '');
    },

    /** Best recorded split for a town in ms, or 0 if it has never been timed. */
    townBestMs: function (townId) {
      var b = PL.Store.bestFor(SR_TOWN, this.townKey(townId));
      return b ? b.timeMs : 0;
    },

    /** Bank the finished town's split and remember it for the HUD's flash. */
    closeTown: function (townId, townName) {
      var ms = this.townMs(townId);
      if (ms <= 0) return;
      var prev = this.townBestMs(townId);       // read before it is written
      PL.Store.recordRun(SR_TOWN, this.townKey(townId), {
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
        deaths: this.deaths,
        pace: PL.Game.pace(this.paceReal, this.paceGame)
      };
      var level = this.modeDef().level;
      var result = PL.Store.recordRun(SR_TOWN, level, run);
      PL.Store.deposit(this.purse);      // the run's surviving purse, banked
      PL.Cloud.submit({
        town: SR_TOWN, level: level,
        timeMs: run.timeMs, grog: run.grog, deaths: run.deaths,
        shards: run.shards, speedrun: true
      });
      PL.Game.replace(new SpeedrunEndScene(run, result, this.splits.slice(), this.mode));
    },

    /** Best whole-run time on this browser for a category, or null. */
    best: function (mode) {
      var m = MODES[mode] || this.modeDef();
      return PL.Store.bestFor(SR_TOWN, m.level);
    }
  });

  // ============================================================ which run
  /**
   * The choice you make before a run: shards, or not.
   *
   * It is a screen of its own rather than two rows on the title, because the
   * two categories need explaining — the difference between them is a rule
   * about the middle of a level, not a difficulty setting — and because each
   * carries its own record, which is worth seeing before you start.
   */
  function SpeedrunPickScene() {
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.order = ['shard', 'any'];
    this.boxes = [{ x: 44, y: 122, w: 262, h: 132 }, { x: 334, y: 122, w: 262, h: 132 }];
  }

  SpeedrunPickScene.prototype.enter = function () {
    PL.Theme.apply(null);
    PL.Cloud.load();
    PL.Audio.music.play('title');
  };

  SpeedrunPickScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    for (var i = 0; i < this.boxes.length; i++) {
      var b = this.boxes[i];
      if (In.hoveredInto(b.x, b.y, b.w, b.h) && this.sel !== i) {
        this.sel = i; PL.Audio.sfx('menu');
      }
      if (In.clickedIn(b.x, b.y, b.w, b.h)) {
        PL.Audio.sfx('select');
        Speedrun.start(this.order[i]);
        return;
      }
    }
    if (In.pressed('left') || In.pressed('up')) {
      this.sel = (this.sel + this.order.length - 1) % this.order.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('right') || In.pressed('down')) {
      this.sel = (this.sel + 1) % this.order.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('back')) { PL.Game.replace(new PL.TitleScene()); return; }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      Speedrun.start(this.order[this.sel]);
    }
  };

  SpeedrunPickScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1020');
    g.addColorStop(1, '#33202a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    PL.gfx.text(ctx, 'DRUNKEN SPEEDRUN', W / 2, 52, {
      font: PL.FONT.title, align: 'center', color: C.lanternHi
    });
    PL.gfx.text(ctx, 'Every level in the isles, back to back, on one unbroken clock. ' +
                     'Two categories, two boards.', W / 2, 76, {
      font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.7)'
    });

    for (var i = 0; i < this.order.length; i++) {
      var m = MODES[this.order[i]], b = this.boxes[i];
      var on = i === this.sel;
      PL.gfx.panel(ctx, b.x, b.y, b.w, b.h, {
        r: 6, alpha: 1,
        fill: on ? 'rgba(255,179,71,0.16)' : 'rgba(22,15,20,0.9)',
        stroke: on ? C.lantern : C.rope
      });
      PL.gfx.text(ctx, m.label, b.x + b.w / 2, b.y + 34, {
        font: PL.FONT.head, align: 'center', color: on ? C.lanternHi : C.parchment
      });
      // The rule, wrapped by hand into the panel.
      var words = m.blurb.split(' '), line = '', ly = b.y + 58;
      ctx.font = PL.FONT.tiny;
      for (var w = 0; w < words.length; w++) {
        var next = line ? line + ' ' + words[w] : words[w];
        if (ctx.measureText(next).width > b.w - 32 && line) {
          PL.gfx.text(ctx, line, b.x + b.w / 2, ly, {
            font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.65)'
          });
          ly += 12;
          line = words[w];
        } else {
          line = next;
        }
      }
      if (line) {
        PL.gfx.text(ctx, line, b.x + b.w / 2, ly, {
          font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.65)'
        });
      }

      var best = Speedrun.best(m.id);
      PL.gfx.rect(ctx, b.x + 16, b.y + b.h - 34, b.w - 32, 1, 'rgba(156,124,82,0.4)');
      PL.gfx.text(ctx, 'YOUR BEST', b.x + 16, b.y + b.h - 14, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)'
      });
      PL.gfx.text(ctx, best ? U.formatTime(best.timeMs) : '—', b.x + b.w - 16, b.y + b.h - 14, {
        font: PL.FONT.mono, align: 'right',
        color: best ? C.parchment : 'rgba(242,227,196,0.35)'
      });
    }

    PL.gfx.text(ctx, 'Your purse carries between levels either way, and a death still costs ' +
                     'five grog.', W / 2, 282, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
    });
    PL.gfx.text(ctx, '← → choose · ENTER start · click either one · ESC back', W / 2, 320, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.45)'
    });
  };

  // =========================================================== results screen

  function SpeedrunEndScene(run, result, splits, mode) {
    this.run = run;
    this.result = result;
    this.splits = splits;
    this.mode = MODES[mode] ? mode : 'shard';
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
      if (act === 'again') Speedrun.start(this.mode);
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

    PL.gfx.text(ctx, 'DRUNKEN SPEEDRUN  ·  ' + MODES[this.mode].label, W / 2, 32, {
      font: PL.FONT.head, align: 'center', color: C.lanternHi
    });

    var best = Speedrun.best(this.mode);
    var isBest = this.result && this.result.isBest;
    PL.gfx.text(ctx,
      isBest ? 'Every level in the isles, and a new best for this browser.'
             : 'Every level in the isles, start to finish.',
      W / 2, 50, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.75)' });

    // ---- the number that matters ----------------------------------------
    PL.gfx.panel(ctx, 22, 64, 244, 216, { r: 6 });
    PL.gfx.text(ctx, MODES[this.mode].label, 38, 88, { font: PL.FONT.small, color: C.lantern });
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
    // Only shown when it has something to say — see scene-complete.js.
    if (this.run.pace != null && this.run.pace < 0.97) {
      PL.gfx.text(ctx, 'Clock: ' + Math.round(this.run.pace * 100) +
        '% of real time — the browser dropped frames', 38, y + 20, {
          font: PL.FONT.tiny, color: C.coral
        });
    }

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

  PL.SpeedrunPickScene = SpeedrunPickScene;
  PL.SpeedrunEndScene = SpeedrunEndScene;

})(window.PL = window.PL || {});
