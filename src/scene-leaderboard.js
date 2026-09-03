/* scene-leaderboard.js — the dedicated records view. Local to this browser;
 * nothing is ever sent anywhere.
 *
 * The level list scrolls inside its panel: with seventeen entries (sixteen
 * levels plus the whole-game speedrun) it will not fit, so only a window of
 * rows is drawn and the window follows the selection.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var LIST_X = 16, LIST_Y = 60, LIST_W = 200, LIST_H = 250;
  var ROW_H = 34;
  var FIRST_ROW_Y = 84;
  var VISIBLE = Math.floor((LIST_H - (FIRST_ROW_Y - LIST_Y) - 8) / ROW_H);

  function LeaderboardScene() {
    this.opaque = true;
    this.t = 0;

    // The whole-game speedrun sits at the top, then every level in play order.
    this.rows = [{
      speedrun: true,
      townName: 'Whole game',
      townId: PL.Speedrun.TOWN,
      def: {
        id: PL.Speedrun.LEVEL,
        name: 'Drunken Speedrun',
        blurb: 'Every level, back to back, on one unbroken clock.'
      },
      index: -1
    }];
    var flat = PL.Towns.allLevels();
    for (var i = 0; i < flat.length; i++) {
      this.rows.push({
        speedrun: false,
        townName: flat[i].town.name,
        townId: flat[i].town.id,
        def: flat[i].def,
        index: flat[i].index
      });
    }
    this.sel = 0;
    this.scroll = 0;
  }

  LeaderboardScene.prototype.enter = function () { PL.Theme.apply(null); };

  LeaderboardScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('back') || In.pressed('confirm')) { PL.Game.pop(); return; }
    if (!this.rows.length) return;
    if (In.pressed('up')) { this.sel = (this.sel + this.rows.length - 1) % this.rows.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.rows.length; PL.Audio.sfx('menu'); }

    // Keep the selection inside the drawn window.
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel > this.scroll + VISIBLE - 1) this.scroll = this.sel - VISIBLE + 1;
    this.scroll = U.clamp(this.scroll, 0, Math.max(0, this.rows.length - VISIBLE));
  };

  LeaderboardScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1e1622');
    g.addColorStop(1, '#3a2730');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    PL.gfx.text(ctx, 'THE BOOKS OF CAPTAINS', 20, 32, { font: PL.FONT.head, color: C.parchment });
    PL.gfx.text(ctx, 'Local records for this browser only — no ledger leaves this machine.',
      20, 48, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)' });

    if (!this.rows.length) {
      PL.gfx.text(ctx, 'No levels registered.', W / 2, H / 2, {
        font: PL.FONT.hud, align: 'center', color: C.coral
      });
      return;
    }

    // ---- scrolling level list -------------------------------------------
    PL.gfx.panel(ctx, LIST_X, LIST_Y, LIST_W, LIST_H, { r: 6 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(LIST_X + 2, LIST_Y + 14, LIST_W - 4, LIST_H - 20);
    ctx.clip();

    var last = Math.min(this.rows.length, this.scroll + VISIBLE);
    for (var i = this.scroll; i < last; i++) {
      var r = this.rows[i];
      var y = FIRST_ROW_Y + (i - this.scroll) * ROW_H;
      var on = i === this.sel;
      if (on) {
        PL.gfx.rect(ctx, LIST_X + 6, y - 15, LIST_W - 12, 30,
          r.speedrun ? 'rgba(255,179,71,0.28)' : 'rgba(255,179,71,0.2)');
      }
      PL.gfx.text(ctx, r.townName, LIST_X + 16, y - 3, {
        font: PL.FONT.small, color: 'rgba(242,227,196,0.55)'
      });
      var label = r.speedrun ? '★  ' + r.def.name
                             : (PL.Towns.ROMAN[r.index] || (r.index + 1)) + '.  ' + r.def.name;
      // The list scrolls, so a long name must end in an ellipsis inside the
      // panel rather than run under the scroll track and get sliced by the clip.
      label = PL.util.fit(ctx, label, PL.FONT.hud, LIST_W - 34);
      PL.gfx.text(ctx, label, LIST_X + 16, y + 10, {
        font: PL.FONT.hud, color: on ? C.lanternHi : 'rgba(242,227,196,0.8)'
      });
    }
    ctx.restore();

    // scroll position: a track down the right edge of the panel, plus arrows
    if (this.rows.length > VISIBLE) {
      var trackX = LIST_X + LIST_W - 7;
      var trackY = LIST_Y + 18, trackH = LIST_H - 30;
      PL.gfx.rect(ctx, trackX, trackY, 3, trackH, 'rgba(242,227,196,0.12)');
      var thumbH = Math.max(18, trackH * VISIBLE / this.rows.length);
      var maxScroll = this.rows.length - VISIBLE;
      var thumbY = trackY + (trackH - thumbH) * (maxScroll ? this.scroll / maxScroll : 0);
      PL.gfx.rect(ctx, trackX, thumbY, 3, thumbH, C.lantern);
      if (this.scroll > 0) {
        PL.gfx.text(ctx, '▲', LIST_X + LIST_W / 2, LIST_Y + 13, {
          font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
        });
      }
      if (this.scroll < maxScroll) {
        PL.gfx.text(ctx, '▼', LIST_X + LIST_W / 2, LIST_Y + LIST_H - 4, {
          font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
        });
      }
    }
    PL.gfx.text(ctx, (this.sel + 1) + ' / ' + this.rows.length, LIST_X + LIST_W - 14, LIST_Y + 13, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.4)'
    });

    // ---- table -----------------------------------------------------------
    var sel = this.rows[this.sel];
    var runs = PL.Store.runsFor(sel.townId, sel.def.id);
    PL.gfx.panel(ctx, 226, LIST_Y, W - 246, LIST_H, { r: 6 });
    PL.gfx.text(ctx, sel.def.name.toUpperCase(), 244, 84, {
      font: PL.FONT.head, color: sel.speedrun ? C.lanternHi : C.lantern
    });
    PL.gfx.text(ctx, sel.def.blurb || '', 244, 100, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)'
    });
    PL.LeaderboardTable.draw(ctx, 244, 108, W - 286, runs, null);

    PL.gfx.text(ctx, '↑ ↓ pick a level · ESC / ENTER back', W / 2, 332, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
    });
  };

  PL.LeaderboardScene = LeaderboardScene;

})(window.PL = window.PL || {});
