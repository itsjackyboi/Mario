/* hud.js — minimal in-run readout: grog, clock, carried items, active powerups.
 * Everything sits in the top strip so the play area stays clear.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function chip(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    PL.gfx.roundRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = 'rgba(20,13,18,0.9)';
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(156,124,82,0.8)';
    ctx.lineWidth = 1;
    PL.gfx.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4);
    ctx.stroke();
    ctx.restore();
  }

  PL.HUD = {
    draw: function (ctx, scene) {
      var p = scene.player;
      var W = PL.VIEW_W;

      // ---- grog purse (top-left) ----------------------------------------
      chip(ctx, 6, 6, 78, 24);
      PL.ItemIcons.grog(ctx, 12, 10, 15);
      PL.gfx.text(ctx, String(p.grog), 33, 23, { font: PL.FONT.hud, color: C.grogBand });
      PL.gfx.text(ctx, 'GROG', 78, 22, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)', align: 'right' });

      // ---- shards --------------------------------------------------------
      if (scene.world.shardTotal > 0) {
        chip(ctx, 90, 6, 54, 24);
        PL.ItemIcons.shard(ctx, 96, 11, 13);
        PL.gfx.text(ctx, p.shards.length + '/' + scene.world.shardTotal, 114, 22,
                    { font: PL.FONT.small, color: C.coral });
      }

      // ---- clock (top-centre) --------------------------------------------
      var tstr = U.formatTime(scene.elapsedMs);
      chip(ctx, W / 2 - 44, 6, 88, 24);
      PL.gfx.text(ctx, tstr, W / 2, 23, {
        font: PL.FONT.hud, align: 'center',
        color: scene.finished ? C.lanternHi : C.parchment
      });

      // ---- carried items (top-right) --------------------------------------
      var slotX = W - 6 - 34;
      this.slot(ctx, slotX, 6, 'seed', p.seeds, 'E');
      slotX -= 38;
      this.slot(ctx, slotX, 6, 'pouch', p.pouch, '↑↑');

      // ---- active powerups ------------------------------------------------
      // Sits below the item slots so it never collides with their key hints.
      var barY = 48;
      if (p.urn > 0) {
        this.bar(ctx, W - 156, barY, 150, 'HOLLOW URN', p.urn / 9.0, C.pale, 'withered');
        barY += 22;
      }
      if (p.tonic > 0) {
        this.bar(ctx, W - 156, barY, 150, 'CLOCKHEART', p.tonic / 9.0, C.teal, 'quickened');
        barY += 22;
      }

      // ---- checkpoint hint -------------------------------------------------
      if (scene.checkpointFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, scene.checkpointFlash);
        PL.gfx.text(ctx, "CAPTAIN'S FLAG RAISED", W / 2, 48, {
          font: PL.FONT.small, align: 'center', color: C.lanternHi
        });
        ctx.restore();
      }
    },

    slot: function (ctx, x, y, icon, count, keyHint) {
      chip(ctx, x, y, 34, 24);
      ctx.save();
      ctx.globalAlpha = count > 0 ? 1 : 0.28;
      PL.ItemIcons[icon](ctx, x + 5, y + 5, 14);
      ctx.restore();
      PL.gfx.text(ctx, 'x' + count, x + 30, y + 18, {
        font: PL.FONT.tiny, align: 'right',
        color: count > 0 ? C.parchment : 'rgba(242,227,196,0.35)'
      });
      PL.gfx.text(ctx, keyHint, x + 17, y + 33, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.4)'
      });
    },

    bar: function (ctx, x, y, w, label, frac, color, sub) {
      chip(ctx, x, y, w, 18);
      var iw = (w - 8) * U.clamp(frac, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.85;
      PL.gfx.rect(ctx, x + 4, y + 12, iw, 3, color);
      ctx.restore();
      PL.gfx.text(ctx, label, x + 5, y + 10, { font: PL.FONT.tiny, color: color });
      PL.gfx.text(ctx, sub, x + w - 5, y + 10, {
        font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
      });
    }
  };

})(window.PL = window.PL || {});
