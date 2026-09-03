/* scene-levelselect.js — towns on the left, that town's levels on the right.
 * Future towns already appear here as sealed entries; giving them levels in
 * data/ is all that's needed to make them playable.
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
    this.col = 1;   // 0 = town list, 1 = level list
    this.msg = 0;
  }

  LevelSelectScene.prototype.indexOfTown = function (id) {
    for (var i = 0; i < this.towns.length; i++) if (this.towns[i].id === id) return i;
    return 0;
  };

  LevelSelectScene.prototype.town = function () { return this.towns[this.townIdx]; };

  LevelSelectScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.msg > 0) this.msg -= dt;
    var In = PL.Input;
    var town = this.town();
    var levels = town.levels;
    if (this.col === 1 && !levels.length) this.col = 0;

    if (In.pressed('back')) { PL.Game.replace(new PL.TitleScene()); return; }

    if (In.pressed('left')) { this.col = 0; PL.Audio.sfx('menu'); }
    if (In.pressed('right')) { if (levels.length) { this.col = 1; PL.Audio.sfx('menu'); } }

    if (this.col === 0) {
      if (In.pressed('up')) { this.townIdx = (this.townIdx + this.towns.length - 1) % this.towns.length; this.levelIdx = 0; PL.Audio.sfx('menu'); }
      if (In.pressed('down')) { this.townIdx = (this.townIdx + 1) % this.towns.length; this.levelIdx = 0; PL.Audio.sfx('menu'); }
      if (In.pressed('confirm') || In.pressed('jump')) {
        if (this.town().levels.length) { this.col = 1; PL.Audio.sfx('select'); }
        else { this.msg = 2.2; PL.Audio.sfx('trialMiss'); }
      }
    } else {
      if (In.pressed('up')) { this.levelIdx = (this.levelIdx + levels.length - 1) % levels.length; PL.Audio.sfx('menu'); }
      if (In.pressed('down')) { this.levelIdx = (this.levelIdx + 1) % levels.length; PL.Audio.sfx('menu'); }
      if (In.pressed('confirm') || In.pressed('jump')) {
        var def = levels[this.levelIdx];
        PL.Audio.sfx('select');
        PL.Game.replace(new PL.PlayScene(def, PL.Towns.metaFor(town.id, def.id)));
      }
    }
  };

  LevelSelectScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(1, '#3f2b30');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // faint sea-chart grid
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = C.parchment;
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy < H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    ctx.restore();

    PL.gfx.text(ctx, 'THE ELEVEN SEAS', 20, 30, { font: PL.FONT.head, color: C.parchment });
    PL.gfx.text(ctx, 'Six towns. Six kings. One nobody with something to prove.', 20, 46, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.55)'
    });

    // ---- towns -----------------------------------------------------------
    PL.gfx.panel(ctx, 16, 58, 200, 246, { r: 6 });
    for (var i = 0; i < this.towns.length; i++) {
      var tn = this.towns[i];
      var y = 84 + i * 38;
      var on = i === this.townIdx;
      var playable = tn.levels.length > 0;
      if (on) {
        PL.gfx.rect(ctx, 22, y - 16, 188, 34,
          this.col === 0 ? 'rgba(255,179,71,0.22)' : 'rgba(255,179,71,0.10)');
      }
      PL.gfx.text(ctx, tn.name, 32, y - 2, {
        font: PL.FONT.hud,
        color: playable ? (on ? C.lanternHi : C.parchment) : 'rgba(242,227,196,0.35)'
      });
      PL.gfx.text(ctx, tn.tagline, 32, y + 12, {
        font: PL.FONT.tiny,
        color: playable ? 'rgba(242,227,196,0.55)' : 'rgba(242,227,196,0.28)'
      });
      if (!playable) {
        PL.gfx.text(ctx, 'SEALED', 202, y - 2, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.3)'
        });
      } else {
        var prog = PL.Store.townProgress(tn.id);
        PL.gfx.text(ctx, prog.completed.length + '/' + tn.levels.length, 202, y - 2, {
          font: PL.FONT.small, align: 'right', color: 'rgba(242,227,196,0.6)'
        });
      }
    }

    // ---- levels ----------------------------------------------------------
    var town = this.town();
    PL.gfx.panel(ctx, 226, 58, W - 246, 246, { r: 6 });
    PL.gfx.text(ctx, town.name.toUpperCase(), 244, 80, { font: PL.FONT.head, color: C.lantern });

    if (!town.levels.length) {
      PL.gfx.text(ctx, town.sealedNote || 'The tide has not turned this way yet.', 244, 106, {
        font: PL.FONT.body, color: 'rgba(242,227,196,0.6)'
      });
      PL.gfx.text(ctx, 'Levels for this town land in a later build.', 244, 124, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.4)'
      });
    } else {
      var prog = PL.Store.townProgress(town.id);
      for (var l = 0; l < town.levels.length; l++) {
        var def = town.levels[l];
        var ly = 100 + l * 44;
        var sel = this.col === 1 && l === this.levelIdx;
        if (sel) PL.gfx.rect(ctx, 234, ly - 16, W - 262, 40, 'rgba(255,179,71,0.18)');
        var done = prog.completed.indexOf(def.id) !== -1;

        PL.gfx.text(ctx, PL.Towns.ROMAN[l] || (l + 1), 246, ly, {
          font: PL.FONT.head, color: done ? C.lanternHi : 'rgba(242,227,196,0.45)'
        });
        PL.gfx.text(ctx, def.name, 278, ly - 3, {
          font: PL.FONT.hud, color: sel ? C.parchment : 'rgba(242,227,196,0.8)'
        });
        PL.gfx.text(ctx, def.blurb || '', 278, ly + 11, {
          font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)'
        });

        var best = PL.Store.bestFor(town.id, def.id);
        PL.gfx.text(ctx, best ? U.formatTime(best.timeMs) : '--:--.--', W - 40, ly - 3, {
          font: PL.FONT.mono, align: 'right', color: best ? C.lanternHi : 'rgba(242,227,196,0.35)'
        });
        var shardsHere = PL.Towns.shardCount(def);
        var got = 0;
        for (var s = 0; s < prog.shards.length; s++) {
          if (prog.shards[s].indexOf(def.id + ':') === 0) got++;
        }
        PL.gfx.text(ctx, 'shards ' + got + '/' + shardsHere, W - 40, ly + 11, {
          font: PL.FONT.tiny, align: 'right',
          color: got >= shardsHere ? C.coral : 'rgba(242,227,196,0.4)'
        });
        if (def.trial) {
          PL.gfx.text(ctx, '★ TRIAL', W - 118, ly + 11, {
            font: PL.FONT.tiny, align: 'right', color: C.lantern
          });
        }
      }

      // ---- town shard bonus indicator -----------------------------------
      var total = 0;
      for (var t2 = 0; t2 < town.levels.length; t2++) total += PL.Towns.shardCount(town.levels[t2]);
      var have = PL.Store.townProgress(town.id).shards.length;
      var by = 262;
      PL.gfx.rect(ctx, 244, by - 14, W - 284, 30, have >= total && total > 0
        ? 'rgba(212,87,78,0.22)' : 'rgba(0,0,0,0.25)');
      PL.ItemIcons.shard(ctx, 250, by - 10, 16);
      if (total > 0 && have >= total) {
        PL.gfx.text(ctx, 'ALL SHARDS FOUND — bonus trial unlocked (soon)', 274, by + 3, {
          font: PL.FONT.small, color: C.coral
        });
      } else {
        PL.gfx.text(ctx, 'Shards ' + have + ' / ' + total + ' — collect all for the town bonus',
          274, by + 3, { font: PL.FONT.small, color: 'rgba(242,227,196,0.6)' });
      }
    }

    // ---- footer ----------------------------------------------------------
    var purse = PL.Store.townProgress(town.id).purse;
    PL.gfx.text(ctx, 'Town purse: ' + purse + ' grog', 20, 324, {
      font: PL.FONT.small, color: C.grogBand
    });
    PL.gfx.text(ctx, '↑ ↓ select · ← → switch column · ENTER play · ESC title', W - 20, 324, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.5)'
    });
    if (this.msg > 0) {
      PL.gfx.text(ctx, 'That town is sealed. Shanty Town first.', W / 2, 344, {
        font: PL.FONT.small, align: 'center', color: C.coral
      });
    }
  };

  PL.LevelSelectScene = LevelSelectScene;

})(window.PL = window.PL || {});
