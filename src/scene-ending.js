/* scene-ending.js — what you get for finishing Sackbeard's Tavern.
 *
 * Everything on this card is read back out of the local leaderboard, so it is
 * a summary of your *best* run through the isles rather than the one you just
 * did: total of every level's best time, every town's banked grog, every
 * Red-Earth Shard.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function EndingScene(def, meta, run, result) {
    this.def = def;
    this.meta = meta || {};
    this.run = run;
    this.result = result;
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.options = [
      { label: 'Level select', act: 'select' },
      { label: 'Run the Tavern again', act: 'retry' },
      { label: 'Title', act: 'title' }
    ];
  }

  EndingScene.prototype.enter = function () {
    PL.Theme.apply(this.def.theme || this.def.town);
    this.totals = PL.Store.grandTotals();
    this.rows = [];
    for (var i = 0; i < PL.Towns.list.length; i++) {
      var town = PL.Towns.list[i];
      if (!town.levels.length) continue;
      var sum = 0, done = 0;
      for (var l = 0; l < town.levels.length; l++) {
        var best = PL.Store.bestFor(town.id, town.levels[l].id);
        if (best) { sum += best.timeMs; done++; }
      }
      this.rows.push({
        name: town.name, done: done, of: town.levels.length,
        ms: sum, purse: PL.Store.townProgress(town.id).purse
      });
    }
  };

  EndingScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('up') || In.pressed('left')) {
      this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('down') || In.pressed('right')) {
      this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu');
    }
    if (In.pressed('back')) { PL.Game.reset(new PL.LevelSelectScene(this.def.town)); return; }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      var act = this.options[this.sel].act;
      if (act === 'retry') PL.Game.reset(new PL.PlayScene(this.def, this.meta));
      else if (act === 'title') PL.Game.reset(new PL.TitleScene());
      else PL.Game.reset(new PL.LevelSelectScene(this.def.town));
    }
  };

  EndingScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H, T = this.totals;

    // firelight settling
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#150c14');
    g.addColorStop(0.6, '#3a1a20');
    g.addColorStop(1, '#6e2f27');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var flick = 0.8 + Math.sin(this.t * 5) * 0.1;
    PL.gfx.glow(ctx, W / 2, H + 30, 320 * flick, 'rgba(255,140,60,0.45)', 0.5);
    ctx.save();
    for (var e = 0; e < 30; e++) {
      var ex = (e * 97 + Math.sin(e * 2.3) * 40) % W;
      var ey = H - ((this.t * 30 + e * 41) % (H + 60));
      ctx.globalAlpha = 0.18 + Math.sin(this.t * 3 + e) * 0.14;
      ctx.fillStyle = e % 3 ? '#e0603e' : '#ffcf8a';
      ctx.fillRect(ex, ey, 2, 2);
    }
    ctx.restore();

    PL.gfx.text(ctx, 'THE TRYOUT IS OVER', W / 2, 34, {
      font: PL.FONT.title, align: 'center', color: C.lanternHi
    });
    PL.gfx.text(ctx,
      T.cleared >= T.levels
        ? 'Every level in the isles, cleared. Six kings, and not one of them saw you coming.'
        : 'You made it to the bottom of the biggest cup in the eleven seas.',
      W / 2, 54, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.75)' });

    // ---- headline totals -------------------------------------------------
    PL.gfx.panel(ctx, 26, 68, 268, 214, { r: 6 });
    PL.gfx.text(ctx, 'THE WHOLE RUN', 42, 92, { font: PL.FONT.small, color: C.lantern });
    PL.gfx.text(ctx, 'Total of every best time', 42, 116, {
      font: PL.FONT.body, color: 'rgba(242,227,196,0.6)'
    });
    PL.gfx.text(ctx, U.formatTime(T.totalBestMs), 278, 142, {
      font: 'bold 26px "Trebuchet MS", "Segoe UI", sans-serif',
      align: 'right', color: C.parchment
    });
    if (T.missing > 0) {
      PL.gfx.text(ctx, T.missing + ' level' + (T.missing === 1 ? '' : 's') + ' still unrun',
        42, 158, { font: PL.FONT.tiny, color: C.hazard });
    }

    var y = 182;
    this.stat(ctx, 42, y, 'Levels cleared', T.cleared + ' / ' + T.levels, C.lanternHi); y += 22;
    this.stat(ctx, 42, y, 'Grog banked', String(T.grog), C.grogBand); y += 22;
    this.stat(ctx, 42, y, 'Red-Earth Shards', T.shards + ' / ' + T.shardTotal,
              T.shards >= T.shardTotal ? C.coral : 'rgba(242,227,196,0.8)'); y += 22;
    this.stat(ctx, 42, y, 'This run', U.formatTime(this.run.timeMs) + ' · ' + this.run.grog + ' grog',
              'rgba(242,227,196,0.75)', PL.FONT.small);

    // ---- per-town breakdown ----------------------------------------------
    PL.gfx.panel(ctx, 308, 68, 306, 214, { r: 6 });
    PL.gfx.text(ctx, 'BY TOWN', 324, 92, { font: PL.FONT.small, color: C.lantern });
    ctx.fillStyle = 'rgba(156,124,82,0.4)';
    ctx.fillRect(324, 100, 274, 1);
    for (var r = 0; r < this.rows.length; r++) {
      var row = this.rows[r];
      var ry = 118 + r * 26;
      var full = row.done >= row.of;
      // Drop a size rather than let a long area name run into the count column.
      ctx.font = PL.FONT.hud;
      var nameFont = ctx.measureText(row.name).width > 148 ? PL.FONT.small : PL.FONT.hud;
      PL.gfx.text(ctx, row.name, 324, ry, {
        font: nameFont, color: full ? C.parchment : 'rgba(242,227,196,0.6)'
      });
      PL.gfx.text(ctx, row.done + '/' + row.of, 478, ry, {
        font: PL.FONT.small, align: 'right', color: full ? C.lanternHi : 'rgba(242,227,196,0.5)'
      });
      PL.gfx.text(ctx, row.ms ? U.formatTime(row.ms) : '--:--.--', 556, ry, {
        font: PL.FONT.mono, align: 'right', color: row.ms ? C.parchment : 'rgba(242,227,196,0.35)'
      });
      PL.gfx.text(ctx, row.purse + 'g', 598, ry, {
        font: PL.FONT.small, align: 'right', color: C.grogBand
      });
    }

    // ---- the last word ----------------------------------------------------
    PL.gfx.text(ctx,
      '"Six kings. Six towns. And every one of them still owes me a pint."',
      W / 2, 296, { font: PL.FONT.body, align: 'center', color: 'rgba(242,227,196,0.8)' });

    var ox = W / 2 - (this.options.length * 150) / 2;
    for (var i = 0; i < this.options.length; i++) {
      var bx = ox + i * 150;
      var on = i === this.sel;
      PL.gfx.panel(ctx, bx + 8, 310, 134, 26, {
        r: 5, fill: on ? 'rgba(255,179,71,0.22)' : 'rgba(22,15,20,0.9)',
        stroke: on ? C.lantern : C.rope
      });
      PL.gfx.text(ctx, this.options[i].label, bx + 75, 328, {
        font: PL.FONT.small, align: 'center',
        color: on ? C.lanternHi : 'rgba(242,227,196,0.7)'
      });
    }
    PL.gfx.text(ctx, '← → choose · ENTER confirm', W / 2, 352, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.4)'
    });
  };

  EndingScene.prototype.stat = function (ctx, x, y, label, value, color, font) {
    PL.gfx.text(ctx, label, x, y, { font: PL.FONT.body, color: 'rgba(242,227,196,0.6)' });
    PL.gfx.text(ctx, value, x + 236, y, {
      font: font || PL.FONT.hud, align: 'right', color: color
    });
  };

  PL.EndingScene = EndingScene;

})(window.PL = window.PL || {});
