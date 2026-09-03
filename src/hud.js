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
      var W = PL.VIEW_W, H = PL.VIEW_H;

      // ---- grog purse (top-left) ----------------------------------------
      // It is the life pool as well as the score, so an empty purse pulses:
      // the next death with nothing in here ends the run, not the life.
      var broke = p.grog <= 0 && p.urn <= 0;
      chip(ctx, 6, 6, 78, 24);
      if (broke) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(p.t * 4)) * 0.35;
        PL.gfx.rect(ctx, 6, 6, 78, 24, C.coral);
        ctx.restore();
      }
      PL.ItemIcons.grog(ctx, 12, 10, 15);
      PL.gfx.text(ctx, String(p.grog), 33, 23, {
        font: PL.FONT.hud, color: broke ? C.coral : C.grogBand
      });
      PL.gfx.text(ctx, broke ? 'LAST' : 'GROG', 78, 22, {
        font: PL.FONT.tiny, align: 'right',
        color: broke ? C.coral : 'rgba(242,227,196,0.5)'
      });

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

      if (scene.deathClockFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, scene.deathClockFlash);
        PL.gfx.text(ctx, 'CLOCK BACK TO ZERO', W / 2, scene.speedrun ? 56 : 42, {
          font: PL.FONT.tiny, align: 'center', color: C.coral
        });
        ctx.restore();
      }

      // ---- speedrun readout, under the clock ------------------------------
      if (scene.speedrun) {
        var sr = PL.Speedrun;
        PL.gfx.text(ctx,
          'RUN ' + (scene.meta.runIndex + 1) + ' / ' + scene.meta.runCount +
          '  ·  ' + (sr.grog + p.grogEarned) + ' grog collected',
          W / 2, 42, {
            font: PL.FONT.tiny, align: 'center', color: C.lantern
          });
      }

      // ---- carried things (top-right) --------------------------------------
      var slotX = W - 6 - 40;
      this.itemSlot(ctx, slotX, 6, p);
      slotX -= 38;
      this.slot(ctx, slotX, 6, 'pouch', p.pouch, '↑↑');
      if (p.urn > 0) {
        slotX -= 38;
        this.slot(ctx, slotX, 6, 'urn', p.urn, 'SPARE');
      }

      // ---- worn colours (Owe Block) ---------------------------------------
      if (p.bandana) {
        var gang = PL.Gangs[p.bandana];
        slotX -= 96;
        chip(ctx, slotX, 6, 92, 24);
        ctx.fillStyle = gang.flag;
        ctx.beginPath();
        ctx.moveTo(slotX + 6, 12);
        ctx.lineTo(slotX + 24, 12);
        ctx.lineTo(slotX + 15, 25);
        ctx.closePath();
        ctx.fill();
        PL.gfx.text(ctx, gang.name.split(' ')[0], slotX + 88, 22, {
          font: PL.FONT.tiny, align: 'right', color: gang.flag
        });
      }

      // ---- active buffs ----------------------------------------------------
      // Two halves, deliberately apart: the COUNTDOWN stays up here under the
      // item slots where the eye already is, and WHAT IT DOES goes in the
      // bottom-right corner with room to actually read it. Cramming the effect
      // text into the timer chip meant it was truncated to nothing.
      var live = [];
      if (p.tonic > 0) {
        live.push({ label: 'CLOCKHEART', frac: p.tonic / 9.0, colour: C.teal,
                    text: 'faster on your feet, and the room knows it' });
      }
      for (var bn in p.buffs) {
        if (bn === 'dashing') continue;                 // too brief to bother
        var cfg = PL.TownItems.byBuff[bn];
        if (!cfg || p.buffs[bn] <= 0) continue;
        live.push({ label: cfg.hud, frac: p.buffs[bn] / cfg.secs,
                    colour: cfg.colour, text: cfg.blurb });
      }

      var barY = 48;
      for (var lb = 0; lb < live.length && barY <= 160; lb++) {
        this.bar(ctx, W - 176, barY, 170, live[lb].label, live[lb].frac, live[lb].colour);
        barY += 20;
      }
      this.effects(ctx, live, W, H);

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

    /** The one ITEM button: shows what E will spend, and how many are queued. */
    itemSlot: function (ctx, x, y, p) {
      chip(ctx, x, y, 40, 24);
      var kind = p.items[0];
      if (kind) {
        var cfg = kind === 'seed' ? null : PL.TownItems.byCarry[kind];
        if (cfg) PL.TownItems.icon(ctx, cfg, x + 5, y + 4, 16, p.t);
        else PL.ItemIcons.seed(ctx, x + 5, y + 5, 15);
        if (p.items.length > 1) {
          PL.gfx.text(ctx, '+' + (p.items.length - 1), x + 36, y + 18, {
            font: PL.FONT.tiny, align: 'right', color: C.parchment
          });
        }
      } else {
        PL.gfx.text(ctx, '—', x + 20, y + 17, {
          font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.3)'
        });
      }
      PL.gfx.text(ctx, 'E', x + 20, y + 33, {
        font: PL.FONT.tiny, align: 'center',
        color: kind ? C.lantern : 'rgba(242,227,196,0.4)'
      });
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

    /** Name and countdown only. What it does is drawn by effects(). */
    bar: function (ctx, x, y, w, label, frac, color) {
      chip(ctx, x, y, w, 17);
      var iw = (w - 8) * U.clamp(frac, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.85;
      PL.gfx.rect(ctx, x + 4, y + 12, iw, 3, color);
      ctx.restore();
      PL.gfx.text(ctx, label, x + 5, y + 10, { font: PL.FONT.tiny, color: color });
      PL.gfx.text(ctx, Math.ceil(frac * 100) + '%', x + w - 5, y + 10, {
        font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
      });
    },

    /**
     * What every live effect actually does, bottom-right, stacked upward.
     * It sits clear of the quip caption (bottom-left, up to 420 wide) and of
     * the countdown chips (top-right, down to y=160).
     */
    effects: function (ctx, live, W, H) {
      if (!live.length) return;
      var rows = live.slice(0, 4);
      var w = 240, lh = 23;
      var h = 8 + rows.length * lh;
      var x = W - w - 6, y = H - 76 - h;
      PL.gfx.panel(ctx, x, y, w, h, {
        r: 4, fill: 'rgba(18,12,17,0.82)', stroke: 'rgba(156,124,82,0.55)', alpha: 1
      });
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i], ly = y + 5 + i * lh;
        PL.gfx.rect(ctx, x + 7, ly + 4, 3, 13, r.colour);
        PL.gfx.text(ctx, r.label, x + 15, ly + 9, { font: PL.FONT.tiny, color: r.colour });
        PL.gfx.text(ctx, U.fit(ctx, r.text, PL.FONT.tiny, w - 24), x + 15, ly + 20, {
          font: PL.FONT.tiny, color: 'rgba(242,227,196,0.72)'
        });
      }
    }
  };

})(window.PL = window.PL || {});
