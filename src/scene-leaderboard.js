/* scene-leaderboard.js — the dedicated records view. Local to this browser;
 * nothing is ever sent anywhere.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function LeaderboardScene() {
    this.opaque = true;
    this.t = 0;
    this.rows = [];
    // Flat list of every level that exists, in town order — extends for free.
    for (var i = 0; i < PL.Towns.list.length; i++) {
      var town = PL.Towns.list[i];
      for (var l = 0; l < town.levels.length; l++) {
        this.rows.push({ town: town, def: town.levels[l], index: l });
      }
    }
    this.sel = 0;
  }

  LeaderboardScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('back') || In.pressed('confirm')) { PL.Game.pop(); return; }
    if (!this.rows.length) return;
    if (In.pressed('up')) { this.sel = (this.sel + this.rows.length - 1) % this.rows.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.rows.length; PL.Audio.sfx('menu'); }
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

    // level list
    PL.gfx.panel(ctx, 16, 60, 200, 250, { r: 6 });
    for (var i = 0; i < this.rows.length; i++) {
      var r = this.rows[i];
      var y = 84 + i * 34;
      var on = i === this.sel;
      if (on) PL.gfx.rect(ctx, 22, y - 15, 188, 30, 'rgba(255,179,71,0.2)');
      PL.gfx.text(ctx, r.town.name, 32, y - 3, {
        font: PL.FONT.small, color: 'rgba(242,227,196,0.55)'
      });
      PL.gfx.text(ctx, (PL.Towns.ROMAN[r.index] || (r.index + 1)) + '.  ' + r.def.name, 32, y + 10, {
        font: PL.FONT.hud, color: on ? C.lanternHi : 'rgba(242,227,196,0.8)'
      });
    }

    // table
    var sel = this.rows[this.sel];
    var runs = PL.Store.runsFor(sel.town.id, sel.def.id);
    PL.gfx.panel(ctx, 226, 60, W - 246, 250, { r: 6 });
    PL.gfx.text(ctx, sel.def.name.toUpperCase(), 244, 84, { font: PL.FONT.head, color: C.lantern });
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
