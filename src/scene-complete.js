/* scene-complete.js — the card shown after the tankard: run stats on the left,
 * this browser's top ten for the level on the right.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function CompleteScene(def, meta, run, result) {
    this.def = def;
    this.meta = meta || {};
    this.run = run;
    this.result = result;
    this.opaque = true;
    this.t = 0;
    this.sel = 0;

    this.next = PL.Towns.nextLevel(def.town, def.id);
    this.options = [];
    if (this.next) this.options.push({ label: 'Next level', act: 'next' });
    this.options.push({ label: 'Run it again', act: 'retry' });
    this.options.push({ label: 'Level select', act: 'select' });
  }

  CompleteScene.prototype.update = function (dt) {
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
      if (act === 'next') {
        PL.Game.reset(new PL.PlayScene(this.next.def, this.next.meta));
      } else if (act === 'retry') {
        PL.Game.reset(new PL.PlayScene(this.def, this.meta));
      } else {
        PL.Game.reset(new PL.LevelSelectScene(this.def.town));
      }
    }
  };

  CompleteScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;

    // foam settling into dusk
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241a24');
    g.addColorStop(1, '#4b2f2d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#fbf3dc';
    for (var b = 0; b < 20; b++) {
      var bx = (b * 71 + Math.sin(b * 2.1) * 40 + 40) % W;
      var by = H - ((this.t * 26 + b * 29) % (H + 60));
      ctx.beginPath();
      ctx.arc(bx, by, 5 + (b % 4) * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    PL.gfx.text(ctx, 'DOWN THE HATCH', W / 2, 34, {
      font: PL.FONT.title, align: 'center', color: C.lanternHi
    });
    PL.gfx.text(ctx, (this.meta.townName || 'Shanty Town') + ' — ' + this.def.name, W / 2, 52, {
      font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.7)'
    });

    // ---- run stats -------------------------------------------------------
    PL.gfx.panel(ctx, 26, 68, 268, 210, { r: 6 });
    var y = 94;
    PL.gfx.text(ctx, 'THIS RUN', 42, y, { font: PL.FONT.small, color: C.lantern });
    y += 26;
    this.stat(ctx, 42, y, 'Time', U.formatTime(this.run.timeMs), C.parchment, PL.FONT.head);
    y += 34;
    this.stat(ctx, 42, y, 'Grog collected', String(this.run.grog), C.grogBand);
    y += 22;
    this.stat(ctx, 42, y, 'Red-Earth Shards', this.run.shards + ' / ' + (this.def.shardCount || this.run.shards), C.coral);
    y += 22;
    this.stat(ctx, 42, y, 'Trips to the seabed', String(this.run.deaths), 'rgba(242,227,196,0.8)');
    y += 30;

    var best = this.result.runs[0];
    if (this.result.isBest) {
      PL.gfx.rect(ctx, 42, y - 12, 236, 20, 'rgba(255,179,71,0.18)');
      PL.gfx.text(ctx, 'NEW BEST TIME', 46, y + 2, { font: PL.FONT.small, color: C.lanternHi });
    } else if (this.result.rank) {
      PL.gfx.text(ctx, 'Ranked #' + this.result.rank + ' of your runs', 42, y + 2,
                  { font: PL.FONT.small, color: 'rgba(242,227,196,0.75)' });
    } else {
      PL.gfx.text(ctx, 'Best so far: ' + U.formatTime(best.timeMs), 42, y + 2,
                  { font: PL.FONT.small, color: 'rgba(242,227,196,0.6)' });
    }
    y += 22;
    var purse = PL.Store.townProgress(this.def.town).purse;
    PL.gfx.text(ctx, 'Town purse: ' + purse + ' grog', 42, y + 2, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)'
    });

    // ---- leaderboard -----------------------------------------------------
    PL.gfx.panel(ctx, 308, 68, 306, 210, { r: 6 });
    PL.gfx.text(ctx, 'TOP TEN — THIS BROWSER', 324, 94, { font: PL.FONT.small, color: C.lantern });
    PL.LeaderboardTable.draw(ctx, 324, 104, 274, this.result.runs, this.result.entry);

    // ---- options ---------------------------------------------------------
    var ox = W / 2 - (this.options.length * 150) / 2;
    for (var i = 0; i < this.options.length; i++) {
      var bx2 = ox + i * 150;
      var on = i === this.sel;
      PL.gfx.panel(ctx, bx2 + 8, 296, 134, 30, {
        r: 5, fill: on ? 'rgba(255,179,71,0.22)' : 'rgba(22,15,20,0.9)',
        stroke: on ? C.lantern : C.rope
      });
      PL.gfx.text(ctx, this.options[i].label, bx2 + 75, 316, {
        font: PL.FONT.hud, align: 'center',
        color: on ? C.lanternHi : 'rgba(242,227,196,0.7)'
      });
    }
    PL.gfx.text(ctx, '← → / ↑ ↓ to choose · ENTER to confirm', W / 2, 344, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.45)'
    });
  };

  CompleteScene.prototype.stat = function (ctx, x, y, label, value, color, font) {
    PL.gfx.text(ctx, label, x, y, { font: PL.FONT.body, color: 'rgba(242,227,196,0.6)' });
    PL.gfx.text(ctx, value, x + 236, y, {
      font: font || PL.FONT.hud, align: 'right', color: color
    });
  };

  /* Shared table renderer — used here and on the standalone leaderboard view. */
  PL.LeaderboardTable = {
    draw: function (ctx, x, y, w, runs, highlight) {
      PL.gfx.text(ctx, '#', x, y + 12, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)' });
      PL.gfx.text(ctx, 'TIME', x + 26, y + 12, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)' });
      PL.gfx.text(ctx, 'GROG', x + 118, y + 12, { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)' });
      PL.gfx.text(ctx, 'DEATHS', x + 176, y + 12, { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)' });
      PL.gfx.text(ctx, 'DATE', x + w, y + 12, { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)' });
      ctx.fillStyle = 'rgba(156,124,82,0.4)';
      ctx.fillRect(x, y + 16, w, 1);

      if (!runs || !runs.length) {
        PL.gfx.text(ctx, 'No runs logged yet. Get wet.', x, y + 38, {
          font: PL.FONT.body, color: 'rgba(242,227,196,0.5)'
        });
        return;
      }
      for (var i = 0; i < runs.length && i < 10; i++) {
        var r = runs[i];
        var ry = y + 32 + i * 15;
        var me = highlight && r === highlight;
        if (me) PL.gfx.rect(ctx, x - 4, ry - 11, w + 8, 15, 'rgba(255,179,71,0.16)');
        var col = i === 0 ? PL.C.lanternHi : (me ? PL.C.parchment : 'rgba(242,227,196,0.72)');
        PL.gfx.text(ctx, String(i + 1), x, ry, { font: PL.FONT.small, color: col });
        PL.gfx.text(ctx, U.formatTime(r.timeMs), x + 26, ry, { font: PL.FONT.mono, color: col });
        PL.gfx.text(ctx, String(r.grog), x + 118, ry, { font: PL.FONT.small, align: 'right', color: col });
        PL.gfx.text(ctx, String(r.deaths || 0), x + 176, ry, { font: PL.FONT.small, align: 'right', color: col });
        PL.gfx.text(ctx, r.date || '', x + w, ry, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
        });
      }
    }
  };

  PL.CompleteScene = CompleteScene;

})(window.PL = window.PL || {});
