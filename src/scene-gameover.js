/* scene-gameover.js — the end of the line.
 *
 * Grog is the life pool: a death costs barrels, and dying with an empty purse
 * ends the attempt rather than putting you back at the flag. That is what this
 * screen is for, and it is deliberately not the same as dying:
 *
 *   - on a single level, the level starts over from nothing — including the
 *     clock, which is the only thing an ordinary death does not cost you;
 *   - in a Drunken Speedrun the run is finished, because a run with a reset
 *     clock in the middle of it is not a run. You can start a fresh one.
 *
 * Nothing is banked from a game over: no time, no purse, no leaderboard row.
 * The shards you picked up along the way are already permanent, so the road
 * you opened stays open.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function GameOverScene(def, meta, stats) {
    this.def = def;
    this.meta = meta || {};
    this.stats = stats;           // { timeMs, grogEarned, shards, deaths, cause }
    this.speedrun = !!this.meta.speedrun;
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.options = this.speedrun
      ? [{ label: 'Start a new run', act: 'newrun' },
         { label: 'Level select', act: 'select' },
         { label: 'Title', act: 'title' }]
      : [{ label: 'Take it again', act: 'retry' },
         { label: 'Level select', act: 'select' },
         { label: 'Title', act: 'title' }];
  }

  GameOverScene.prototype.enter = function () {
    if (this.speedrun) PL.Speedrun.abort();
    PL.Audio.sfx('die');
  };

  GameOverScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('up') || In.pressed('left')) {
      this.sel = (this.sel + this.options.length - 1) % this.options.length;
      PL.Audio.sfx('menu');
    }
    if (In.pressed('down') || In.pressed('right')) {
      this.sel = (this.sel + 1) % this.options.length;
      PL.Audio.sfx('menu');
    }
    if (In.pressed('back')) { PL.Game.reset(new PL.TitleScene()); return; }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      var act = this.options[this.sel].act;
      if (act === 'retry') PL.Game.reset(new PL.PlayScene(this.def, this.meta));
      else if (act === 'newrun') PL.Speedrun.start();
      else if (act === 'select') PL.Game.reset(new PL.LevelSelectScene(this.def.town));
      else PL.Game.reset(new PL.TitleScene());
    }
  };

  GameOverScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var open = Math.min(1, this.t / 0.5);

    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120a10');
    g.addColorStop(0.7, '#2a0f14');
    g.addColorStop(1, '#4a1a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    PL.gfx.glow(ctx, W / 2, H + 40, 300, 'rgba(212,87,78,0.35)', 0.5);

    ctx.save();
    ctx.globalAlpha = open;

    PL.gfx.text(ctx, 'PURSE EMPTY', W / 2, 62, {
      font: PL.FONT.title, align: 'center', color: C.coral
    });
    PL.gfx.text(ctx,
      this.speedrun ? 'Nothing left to pay the sea with. The run is over.'
                    : 'Nothing left to pay the sea with. Row back and start again.',
      W / 2, 84, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.75)' });

    var sub = this.speedrun
      ? 'DRUNKEN SPEEDRUN  ·  ' + (this.meta.runIndex + 1) + ' / ' + this.meta.runCount
      : (this.meta.townName || this.def.town).toUpperCase();
    PL.gfx.text(ctx, sub + '  —  ' + this.def.name, W / 2, 106, {
      font: PL.FONT.tiny, align: 'center', color: C.lantern
    });

    // ---- what the attempt was worth, before it stopped being worth anything
    var pw = 300, px = (W - pw) / 2;
    PL.gfx.panel(ctx, px, 122, pw, 122, { r: 6 });
    var y = 148;
    this.stat(ctx, px + 18, y, this.speedrun ? 'Run time' : 'Time on the clock',
              U.formatTime(this.stats.timeMs), C.parchment); y += 24;
    this.stat(ctx, px + 18, y, 'Grog collected', String(this.stats.grogEarned), C.grogBand); y += 24;
    this.stat(ctx, px + 18, y, 'Red-Earth Shards kept', String(this.stats.shards), C.coral); y += 24;
    this.stat(ctx, px + 18, y, 'Trips to the seabed', String(this.stats.deaths),
              'rgba(242,227,196,0.85)');

    PL.gfx.text(ctx, 'Not logged — a run that ends here does not go in the books.',
      W / 2, 258, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.45)' });

    // ---- options
    var ox = W / 2 - (this.options.length * 150) / 2;
    for (var i = 0; i < this.options.length; i++) {
      var bx = ox + i * 150;
      var on = i === this.sel;
      PL.gfx.panel(ctx, bx + 8, 278, 134, 28, {
        r: 5, fill: on ? 'rgba(212,87,78,0.24)' : 'rgba(22,15,20,0.9)',
        stroke: on ? C.coral : C.rope
      });
      PL.gfx.text(ctx, this.options[i].label, bx + 75, 297, {
        font: PL.FONT.small, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.7)'
      });
    }
    PL.gfx.text(ctx, '← → choose · ENTER confirm', W / 2, 328, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.4)'
    });
    ctx.restore();
  };

  GameOverScene.prototype.stat = function (ctx, x, y, label, value, color) {
    PL.gfx.text(ctx, label, x, y, { font: PL.FONT.body, color: 'rgba(242,227,196,0.6)' });
    PL.gfx.text(ctx, value, x + 264, y, {
      font: PL.FONT.hud, align: 'right', color: color
    });
  };

  PL.GameOverScene = GameOverScene;

})(window.PL = window.PL || {});
