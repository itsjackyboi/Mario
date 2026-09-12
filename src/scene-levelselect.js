/* scene-levelselect.js — areas on the left, that area's levels on the right.
 *
 * Every area is selectable from the start. The only gated entry is Owe Block,
 * which hangs off Providence as a bonus branch and is drawn indented, in the
 * Crimson Cutters' red, with its own difficulty flag.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function LevelSelectScene(townId) {
    this.opaque = true;
    this.t = 0;
    this.towns = PL.Towns.list;
    this.townIdx = Math.max(0, this.indexOfTown(townId));
    this.levelIdx = 0;
    this.col = 1;   // 0 = area list, 1 = level list
    this.msg = 0;
    this.msgText = '';
  }

  LevelSelectScene.prototype.enter = function () {
    PL.Theme.apply(null);
    // Warm the shared board here so a level started from this shelf already has
    // the world record for its rail. No endpoint, no request.
    PL.Cloud.load();
    // The area's own tune starts on the shelf you pick it from, so walking into
    // a level is a continuation rather than a cut.
    PL.Audio.music.play(this.town().id);
  };

  LevelSelectScene.prototype.indexOfTown = function (id) {
    for (var i = 0; i < this.towns.length; i++) if (this.towns[i].id === id) return i;
    return 0;
  };

  LevelSelectScene.prototype.town = function () { return this.towns[this.townIdx]; };

  /* WHERE THE ROWS ARE, so a finger can be told which one it hit. The same two
   * numbers the draw below lays them out with — kept here rather than written
   * twice, because a tap target that has drifted from the thing it is under is
   * worse than no tap target at all. */
  LevelSelectScene.prototype.townRect = function (i) {
    return { x: 20, y: 76 + i * 34 - 15, w: 184, h: 30 };
  };
  LevelSelectScene.prototype.levelRect = function (i) {
    var px = 218, pw = PL.VIEW_W - 232;
    var indent = this.town().levels[i] && this.town().levels[i].bonus ? 18 : 0;
    return { x: px + 8 + indent, y: 100 + i * 38 - 15, w: pw - 20 - indent, h: 34 };
  };

  /**
   * A tap on a row. Select it if it is not selected; open it if it is.
   *
   * Two taps rather than one, deliberately. A level select is a place people
   * browse — times, shards, what is still locked — and opening a level on the
   * first touch means never being able to read the row you are pointing at.
   * The first tap says which one, the second says yes, and that is also how
   * the arrow keys have always worked here.
   */
  LevelSelectScene.prototype.tapped = function () {
    var In = PL.Input;
    if (!In.mouse.clicked) return false;
    var i;
    for (i = 0; i < this.towns.length; i++) {
      var r = this.townRect(i);
      if (In.clickedIn(r.x, r.y, r.w, r.h)) {
        if (this.townIdx !== i) { this.townIdx = i; this.levelIdx = 0; }
        this.col = this.towns[i].levels.length ? 1 : 0;
        PL.Audio.sfx('menu');
        return true;
      }
    }
    var levels = this.town().levels;
    for (i = 0; i < levels.length; i++) {
      var lr = this.levelRect(i);
      if (In.clickedIn(lr.x, lr.y, lr.w, lr.h)) {
        if (this.col === 1 && this.levelIdx === i) return 'open';
        this.col = 1; this.levelIdx = i;
        PL.Audio.sfx('menu');
        return true;
      }
    }
    return false;
  };

  /* WHAT A FINGER HAS INSTEAD OF C, V AND ESC. The rows were already tappable;
   * these are the three things on this screen that never were a row. */
  LevelSelectScene.prototype.touchKeys = function () {
    var keys = [{ a: 'mark', label: 'PRACTICE' }];
    if (PL.Replay && PL.Replay.enabled()) keys.push({ a: 'watch', label: 'TAS' });
    keys.push({ a: 'back', label: 'TITLE' });
    return PL.Touch.strip(keys, { y: 328 });
  };

  LevelSelectScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.msg > 0) this.msg -= dt;
    var In = PL.Input;
    var town = this.town();
    var levels = town.levels;
    var tap = this.tapped();
    if (tap === true) return;
    if (tap === 'open') { this.open(this.town().levels[this.levelIdx], false); return; }
    if (this.col === 1 && !levels.length) this.col = 0;
    if (this.levelIdx >= levels.length) this.levelIdx = 0;

    if (In.pressed('back')) { PL.Game.replace(new PL.TitleScene()); return; }
    if (In.pressed('left')) { this.col = 0; PL.Audio.sfx('menu'); }
    if (In.pressed('right') && levels.length) { this.col = 1; PL.Audio.sfx('menu'); }

    if (this.col === 0) {
      if (In.pressed('up')) {
        this.townIdx = (this.townIdx + this.towns.length - 1) % this.towns.length;
        this.levelIdx = 0; PL.Audio.sfx('menu');
      }
      if (In.pressed('down')) {
        this.townIdx = (this.townIdx + 1) % this.towns.length;
        this.levelIdx = 0; PL.Audio.sfx('menu');
      }
      if (In.pressed('confirm') || In.pressed('jump')) {
        if (this.town().levels.length) { this.col = 1; PL.Audio.sfx('select'); }
      }
      return;
    }

    if (In.pressed('up')) { this.levelIdx = (this.levelIdx + levels.length - 1) % levels.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.levelIdx = (this.levelIdx + 1) % levels.length; PL.Audio.sfx('menu'); }
    // PRACTICE. Same key that plants a marker in a level, so there is one
    // thing to remember: C. Only ever offered on a level already unlocked —
    // it is for drilling a crossing you keep missing, not a way in.
    var wantPractice = In.pressed('mark');

    /* WATCH THE TAS. A time on the tool-assisted board says how fast the level
     * can go; the replay says how, which is the only part anybody can use. It
     * opens on any level that has a log, locked or not — reading somebody
     * else's route is not the same as skipping the level.
     *
     * Switched off for the v2 launch (config.js, `tasReplay`), and switched off
     * silently: the key does nothing and the prompt does not mention it, so
     * there is nothing to find rather than a locked door to rattle. */
    if (In.pressed('watch') && PL.Replay && PL.Replay.enabled()) {
      var wdef = levels[this.levelIdx];
      if (PL.Replay && PL.Replay.has(wdef.id)) {
        PL.Audio.sfx('select');
        PL.Game.push(new PL.ReplayScene(wdef, PL.Towns.metaFor(town.id, wdef.id)));
      } else {
        this.msg = 2.2;
        this.msgText = 'No TAS replay recorded for this level yet.';
        PL.Audio.sfx('trialMiss');
      }
      return;
    }

    if (In.pressed('confirm') || In.pressed('jump') || wantPractice) {
      this.open(levels[this.levelIdx], wantPractice);
    }
  };

  /** Start a level, or say why it will not start. Shared by key and tap. */
  LevelSelectScene.prototype.open = function (def, practice) {
    if (!def) return;
    if (!PL.Towns.isUnlocked(def)) {
      this.msg = 2.6;
      this.msgText = PL.Towns.unlockNote(def);
      PL.Audio.sfx('trialMiss');
      return;
    }
    PL.Audio.sfx('select');
    var meta = PL.Towns.metaFor(this.town().id, def.id);
    if (practice) meta.practice = true;
    PL.Game.replace(new PL.PlayScene(def, meta));
  };

  LevelSelectScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(1, '#3f2b30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = C.parchment;
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy < H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    ctx.restore();

    var totals = PL.Store.grandTotals();
    PL.gfx.text(ctx, 'THE ELEVEN SEAS', 18, 28, { font: PL.FONT.head, color: C.parchment });
    PL.gfx.text(ctx, 'Six towns. Six kings. One nobody with something to prove.', 18, 42, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.55)'
    });
    PL.gfx.text(ctx, totals.cleared + ' / ' + totals.levels + ' cleared', W - 18, 26, {
      font: PL.FONT.hud, align: 'right',
      color: totals.cleared >= totals.levels ? C.lanternHi : C.parchment
    });
    PL.gfx.text(ctx, totals.shards + ' / ' + totals.shardTotal + ' shards · ' +
                     totals.grog + ' grog banked', W - 18, 42, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)'
    });

    // ---- areas -----------------------------------------------------------
    PL.gfx.panel(ctx, 14, 52, 196, 250, { r: 6 });
    for (var i = 0; i < this.towns.length; i++) {
      var tn = this.towns[i];
      var y = 76 + i * 34;
      var on = i === this.townIdx;
      if (on) {
        PL.gfx.rect(ctx, 20, y - 15, 184, 30,
          this.col === 0 ? 'rgba(255,179,71,0.22)' : 'rgba(255,179,71,0.10)');
      }
      PL.gfx.text(ctx, tn.name, 30, y - 2, {
        font: PL.FONT.hud, color: on ? C.lanternHi : C.parchment
      });
      PL.gfx.text(ctx, tn.tagline, 30, y + 10, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)'
      });
      var prog = PL.Store.townProgress(tn.id);
      var done = 0;
      for (var d = 0; d < tn.levels.length; d++) {
        if (prog.completed.indexOf(tn.levels[d].id) !== -1) done++;
      }
      PL.gfx.text(ctx, done + '/' + tn.levels.length, 198, y - 2, {
        font: PL.FONT.small, align: 'right',
        color: done >= tn.levels.length && tn.levels.length
          ? C.lanternHi : 'rgba(242,227,196,0.55)'
      });
    }

    // ---- levels ----------------------------------------------------------
    var town = this.town();
    var px = 218, pw = W - 232;
    PL.gfx.panel(ctx, px, 52, pw, 250, { r: 6 });
    PL.gfx.text(ctx, town.name.toUpperCase(), px + 16, 74, {
      font: PL.FONT.head, color: C.lantern
    });

    if (!town.levels.length) {
      PL.gfx.text(ctx, 'No levels registered for this area.', px + 16, 100, {
        font: PL.FONT.body, color: 'rgba(242,227,196,0.6)'
      });
    } else {
      var prog2 = PL.Store.townProgress(town.id);
      for (var l = 0; l < town.levels.length; l++) {
        var def = town.levels[l];
        var bonus = !!def.bonus;
        var locked = !PL.Towns.isUnlocked(def);
        var ly = 100 + l * 38;
        var indent = bonus ? 18 : 0;
        var sel = this.col === 1 && l === this.levelIdx;

        if (sel) {
          PL.gfx.rect(ctx, px + 8 + indent, ly - 15, pw - 20 - indent, 34,
            bonus ? 'rgba(212,87,78,0.22)' : 'rgba(255,179,71,0.18)');
        }
        if (bonus) {
          // branch connector back up to the level above
          ctx.strokeStyle = 'rgba(212,87,78,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 18, ly - 30);
          ctx.lineTo(px + 18, ly + 1);
          ctx.lineTo(px + 26, ly + 1);
          ctx.stroke();
        }

        var numX = px + 16 + indent;
        var done2 = prog2.completed.indexOf(def.id) !== -1;
        PL.gfx.text(ctx, bonus ? '★' : (PL.Towns.ROMAN[l] || (l + 1)), numX, ly + 2, {
          font: PL.FONT.head,
          color: locked ? 'rgba(242,227,196,0.25)'
               : (bonus ? C.coral : (done2 ? C.lanternHi : 'rgba(242,227,196,0.45)'))
        });

        var nameX = numX + (bonus ? 22 : 30);
        PL.gfx.text(ctx, def.name, nameX, ly - 2, {
          font: PL.FONT.hud,
          color: locked ? 'rgba(242,227,196,0.35)'
               : (sel ? C.parchment : 'rgba(242,227,196,0.82)')
        });
        PL.gfx.text(ctx, locked ? PL.Towns.unlockNote(def) : (def.blurb || ''), nameX, ly + 11, {
          font: PL.FONT.tiny,
          color: locked ? 'rgba(212,87,78,0.8)' : 'rgba(242,227,196,0.5)'
        });

        var best = locked ? null : PL.Store.bestFor(town.id, def.id);
        PL.gfx.text(ctx, best ? U.formatTime(best.timeMs) : '--:--.--', W - 24, ly - 2, {
          font: PL.FONT.mono, align: 'right',
          color: best ? C.lanternHi : 'rgba(242,227,196,0.3)'
        });

        var tagX = W - 24;
        if (!locked) {
          var shardsHere = PL.Towns.shardCount(def);
          var got = 0;
          for (var s = 0; s < prog2.shards.length; s++) {
            if (prog2.shards[s].indexOf(def.id + ':') === 0) got++;
          }
          if (shardsHere) {
            PL.gfx.text(ctx, 'shards ' + got + '/' + shardsHere, tagX, ly + 11, {
              font: PL.FONT.tiny, align: 'right',
              color: got >= shardsHere ? C.coral : 'rgba(242,227,196,0.4)'
            });
            tagX -= 58;
          }
          if (def.trial) {
            PL.gfx.text(ctx, '★ TRIAL', tagX, ly + 11, {
              font: PL.FONT.tiny, align: 'right', color: C.lantern
            });
            tagX -= 44;
          }
          if (def.ending) {
            PL.gfx.text(ctx, 'FINALE', tagX, ly + 11, {
              font: PL.FONT.tiny, align: 'right', color: C.lanternHi
            });
          } else if (bonus) {
            PL.gfx.text(ctx, def.difficulty || 'HARD', tagX, ly + 11, {
              font: PL.FONT.tiny, align: 'right', color: C.coral
            });
          }
        } else {
          PL.gfx.text(ctx, 'LOCKED', tagX, ly + 11, {
            font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.4)'
          });
        }
      }

      // ---- area shard bonus indicator -----------------------------------
      var total = 0;
      for (var t2 = 0; t2 < town.levels.length; t2++) total += PL.Towns.shardCount(town.levels[t2]);
      var have = prog2.shards.length;
      var by = 282;
      PL.gfx.rect(ctx, px + 12, by - 14, pw - 24, 26,
        have >= total && total > 0 ? 'rgba(212,87,78,0.22)' : 'rgba(0,0,0,0.25)');
      PL.ItemIcons.shard(ctx, px + 18, by - 10, 15);
      PL.gfx.text(ctx, total === 0 ? 'No shards in this area'
        : (have >= total ? 'ALL SHARDS FOUND — area bonus lit'
                         : 'Shards ' + have + ' / ' + total + ' — collect all for the area bonus'),
        px + 40, by + 3, {
          font: PL.FONT.small,
          color: have >= total && total > 0 ? C.coral : 'rgba(242,227,196,0.65)'
        });
    }

    // ---- footer ----------------------------------------------------------
    PL.gfx.text(ctx, 'Town purse: ' + PL.Store.townProgress(town.id).purse + ' grog', 18, 320, {
      font: PL.FONT.small, color: C.grogBand
    });
    /* Naming keys to somebody holding a phone is worse than saying nothing:
     * every one of them is a key they have not got, and it reads as a game
     * that has not noticed where it is being played. */
    var keyHint = (PL.Touch && PL.Touch.on)
      ? 'tap a town · tap a level · tap it again to play'
      : '↑ ↓ select · ← → column · ENTER play · C practice · ' +
        (PL.Replay && PL.Replay.enabled() ? 'V watch TAS · ' : '') + 'ESC title';
    PL.gfx.text(ctx, keyHint, W - 18, 320, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.5)'
    });
    if (this.msg > 0) {
      PL.gfx.text(ctx, this.msgText, W / 2, 342, {
        font: PL.FONT.small, align: 'center', color: C.coral
      });
    }
  };

  PL.LevelSelectScene = LevelSelectScene;

})(window.PL = window.PL || {});
