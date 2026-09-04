/* hud.js — minimal in-run readout: grog, clock, carried items, active powerups.
 * Everything sits in the top strip so the play area stays clear.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  /** A gap against a record, the way a split board writes one: -3.21 / +12.40 */
  function delta(ms) {
    var sign = ms < 0 ? '−' : '+';
    var a = Math.abs(ms);
    return sign + (a >= 60000 ? U.formatTime(a) : (a / 1000).toFixed(2));
  }

  /* The left rail is one column: the town counter and the split board share
   * it. It is deliberately narrow — the board is on screen for a whole run, so
   * every pixel it takes is a pixel of level you cannot see. Names are cut to
   * one letter and a number so the times can sit hard against the edge. */
  var RAIL_W = 104;

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

      // ---- the left rail: town split, then the full split board ------------
      if (scene.speedrun && PL.Speedrun.active) {
        this.townSplit(ctx, scene);
        this.splitBoard(ctx, scene);
      }

      // ---- clock (top-centre) --------------------------------------------
      var tstr = U.formatTime(scene.elapsedMs);
      chip(ctx, W / 2 - 44, 6, 88, 24);
      PL.gfx.text(ctx, tstr, W / 2, 23, {
        font: PL.FONT.hud, align: 'center',
        color: scene.finished ? C.lanternHi : C.parchment
      });

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

      // ---- practice mode ---------------------------------------------------
      if (scene.practice) {
        PL.gfx.text(ctx, 'PRACTICE  ·  nothing is recorded', W / 2, 42, {
          font: PL.FONT.tiny, align: 'center', color: C.teal
        });
        var hint = scene.tas
          ? 'T  leave TAS   ·   .  step   ·   /  hold to run   ·   ,  rewind   ·   R  back to frame 0'
          : (scene.mark ? 'C  lift the marker   ·   T  TAS mode'
                        : 'C  drop a marker   ·   T  TAS mode');
        PL.gfx.text(ctx, hint, W / 2, H - 8, {
          font: PL.FONT.tiny, align: 'center',
          color: scene.markFlash > 0 ? C.lanternHi : 'rgba(242,227,196,0.45)'
        });
        if (scene.tas) this.tasPanel(ctx, scene);
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

    /**
     * The speedrun split counter, tucked under the purse on the left.
     *
     * A whole-game time tells you nothing while you are running it and a
     * per-level one changes too often to read, so the unit here is the town —
     * the six chunks a route is actually thought of in. Three short lines:
     *
     *     ALEFORGE            2/3      where you are
     *     1:12.40      +3.21           this town, live
     *     BEST 1:09.19                 the best you have ever done it in
     *
     * The live clock is parchment until it passes the record and coral after,
     * so losing the town PB is something you feel rather than something you
     * have to work out — and the gap only appears once there is a real one, to
     * keep a number that changes every frame off the screen until it matters.
     * A comparison against a partial best would be a lie: half a town in, you
     * are always "ahead" of a whole-town time.
     *
     * For five seconds after a town closes the bottom line hands over to that
     * town's result, which is the one moment the delta means everything and the
     * one moment you are not looking at the box.
     */
    townSplit: function (ctx, scene) {
      var sr = PL.Speedrun;
      var townId = scene.def.town;
      var now = sr.townMs(townId, scene.elapsedMs);
      var best = sr.townBestMs(townId);
      var town = PL.Towns.get(townId);
      var count = town ? town.levels.length : 0;

      // Same width as the split board below it, so the left rail is one column
      // rather than two things that happen to be stacked.
      var x = 6, y = 34, w = RAIL_W;
      chip(ctx, x, y, w, 44);

      // Where you are in the town.
      PL.gfx.text(ctx, U.fit(ctx, (scene.meta.townName || townId).toUpperCase(),
                             PL.FONT.tiny, w - 36), x + 6, y + 12, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.55)'
      });
      if (count) {
        PL.gfx.text(ctx, Math.min(sr.townDone(townId) + 1, count) + '/' + count,
                    x + w - 6, y + 12, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.4)'
        });
      }

      // The town clock, and the gap once there is one.
      var over = best > 0 && now > best;
      PL.gfx.text(ctx, U.formatTime(now), x + 6, y + 27, {
        font: PL.FONT.mono, color: over ? C.coral : C.parchment
      });
      if (over) {
        PL.gfx.text(ctx, delta(now - best), x + w - 6, y + 27, {
          font: PL.FONT.tiny, align: 'right', color: C.coral
        });
      }

      // The record — or, briefly, the town you just finished.
      var flash = sr.lastTown;
      if (flash && scene.elapsedMs - flash.at < 5000) {
        var col = flash.isBest ? C.lanternHi : C.coral;
        PL.gfx.text(ctx, U.fit(ctx, flash.name.toUpperCase(), PL.FONT.tiny, w - 52),
                    x + 6, y + 39, { font: PL.FONT.tiny, color: col });
        PL.gfx.text(ctx, flash.best ? delta(flash.ms - flash.best) : 'FIRST',
                    x + w - 6, y + 39, {
          font: PL.FONT.tiny, align: 'right', color: col
        });
      } else if (best > 0) {
        PL.gfx.text(ctx, 'BEST ' + U.formatTime(best), x + 6, y + 39, {
          font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)'
        });
      } else {
        PL.gfx.text(ctx, 'BEST  —  never timed', x + 6, y + 39, {
          font: PL.FONT.tiny, color: 'rgba(242,227,196,0.35)'
        });
      }
    },

    /**
     * The full split board, LiveSplit-style, down the left rail.
     *
     * The town counter above it answers "how is this town going". This answers
     * the other question a runner has open at all times: where am I against
     * myself, on every level, right now. Sixteen rows, the current one lit,
     * the running clock on it live, and the sum of best under them.
     *
     * COLOUR IS THE WHOLE POINT. A split that beat your record for that level
     * is gold and one that did not is coral, judged on the SEGMENT rather than
     * the running total — a good level after a bad one should read as a good
     * level, and a total-based comparison would paint it red for a mistake you
     * already paid for.
     *
     * Deliberately quiet: 8px type on a 55%-alpha ground, no borders between
     * rows. It sits over the left third of the screen for a whole run, so it
     * has to be readable at a glance and invisible the rest of the time.
     */
    splitBoard: function (ctx, scene) {
      var sr = PL.Speedrun;
      if (!sr.levels.length) return;

      var x = 6, y = 82, w = RAIL_W;
      var ROW = 11, HEAD = 13, FOOT = 14;
      var h = HEAD + sr.levels.length * ROW + FOOT;
      chip(ctx, x, y, w, h);

      var sob = sr.sumOfBest();
      // The header says which record the colours are judged against, because a
      // gold split means two different things depending on the answer.
      PL.gfx.text(ctx, PL.Store.compareMode() === 'world' ? 'WORLD' : 'YOU', x + 5, y + 9,
                  { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)' });
      PL.gfx.text(ctx, sob.missing ? 'SOB —' : 'SOB ' + U.formatTime(sob.ms),
                  x + w - 4, y + 9, {
        font: PL.FONT.tiny, align: 'right',
        color: sob.missing ? 'rgba(242,227,196,0.3)' : C.lantern
      });
      PL.gfx.rect(ctx, x + 4, y + HEAD - 1, w - 8, 1, 'rgba(156,124,82,0.30)');

      var townIndex = {};
      for (var li = 0; li < sr.levels.length; li++) {
        var row = sr.levels[li];
        var def = row.def;
        var ry = y + HEAD + li * ROW;
        var n = (townIndex[def.town] = (townIndex[def.town] || 0));
        townIndex[def.town] = n + 1;

        var done = li < sr.index;
        var here = li === sr.index;
        var pb = sr.levelBestMs(def.town, def.id);

        // The segment this row is worth, and what it is worth against.
        var seg = null;
        if (done) {
          seg = sr.splits[li] ? sr.splits[li].levelMs : null;
        } else if (here) {
          var prev = li > 0 && sr.splits[li - 1] ? sr.splits[li - 1].totalMs : 0;
          seg = Math.max(0, scene.elapsedMs - prev);
        }

        if (here) {
          PL.gfx.rect(ctx, x + 3, ry - 1, w - 6, ROW, 'rgba(255,179,71,0.14)');
        }

        var col = 'rgba(242,227,196,0.34)';       // not run yet
        if (done) col = (pb && seg > pb) ? C.coral : C.lanternHi;
        else if (here) col = (pb && seg > pb) ? C.coral : C.parchment;

        PL.gfx.text(ctx, sr.shortLabel(def, n), x + 5, ry + 8,
                    { font: PL.FONT.tiny, color: here ? C.lanternHi : col });

        // The gap against your record for this level, once there is one to show.
        if ((done || here) && pb && seg != null && (done || seg > pb)) {
          PL.gfx.text(ctx, delta(seg - pb), x + w - 38, ry + 8, {
            font: PL.FONT.tiny, align: 'right',
            color: seg > pb ? C.coral : C.lanternHi
          });
        }

        /* Running total at this split — the number you compare across runs.
         * A level not yet reached shows nothing rather than its own record:
         * a level PB in the same column as a set of running totals reads as a
         * running total, and a board that lies about which number it is
         * showing is worse than one that shows less. The target for the whole
         * run is in the header as SOB. */
        var shown = done ? (sr.splits[li] ? sr.splits[li].totalMs : null)
                  : here ? scene.elapsedMs
                  : null;
        PL.gfx.text(ctx, shown == null ? '—' : U.formatTime(shown), x + w - 4, ry + 8, {
          font: PL.FONT.tiny, align: 'right',
          color: done ? col : (here ? C.parchment : 'rgba(242,227,196,0.28)')
        });
      }

      // Last segment, the way a split board closes: the one number that says
      // whether the level you just finished went well.
      var fy = y + HEAD + sr.levels.length * ROW;
      PL.gfx.rect(ctx, x + 4, fy, w - 8, 1, 'rgba(156,124,82,0.30)');
      var last = sr.splits.length ? sr.splits[sr.splits.length - 1] : null;
      var lastPb = last ? sr.levelBestMs(last.townId, last.id) : 0;
      PL.gfx.text(ctx, 'LAST', x + 5, fy + 10,
                  { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)' });
      PL.gfx.text(ctx,
        last && lastPb ? delta(last.levelMs - lastPb) : (last ? 'FIRST' : '—'),
        x + w - 4, fy + 10, {
          font: PL.FONT.tiny, align: 'right',
          color: !last ? 'rgba(242,227,196,0.3)'
               : !lastPb ? C.lanternHi
               : (last.levelMs > lastPb ? C.coral : C.lanternHi)
        });
    },

    /**
     * The TAS readout: frame number, exact clock, and the physics the route
     * actually turns on.
     *
     * A frame-stepper is only as useful as what it lets you read between
     * frames, and the numbers that decide a platformer route are the ones the
     * game never shows: horizontal and vertical speed, whether this frame is
     * the one you are still counted as grounded on, and how much coyote time
     * is left. Position to two decimals, because a route can hang on a pixel.
     */
    tasPanel: function (ctx, scene) {
      var p = scene.player;
      var w = 168, h = 78, x = PL.VIEW_W - w - 6, y = PL.VIEW_H - h - 22;
      chip(ctx, x, y, w, h);

      PL.gfx.text(ctx, 'TAS', x + 6, y + 12, { font: PL.FONT.small, color: C.teal });
      PL.gfx.text(ctx, 'FRAME ' + scene.tasFrame, x + w - 6, y + 12, {
        font: PL.FONT.tiny, align: 'right', color: C.lanternHi
      });
      PL.gfx.text(ctx, U.formatTime(scene.elapsedMs), x + 34, y + 12,
                  { font: PL.FONT.tiny, color: C.parchment });

      var rows = [
        ['x', p.x.toFixed(2), 'y', p.y.toFixed(2)],
        ['vx', p.vx.toFixed(3), 'vy', p.vy.toFixed(3)],
        ['grnd', p.grounded ? 'yes' : 'no',
         'coyote', p.coyote > 0 ? p.coyote.toFixed(3) : '—']
      ];
      for (var i = 0; i < rows.length; i++) {
        var ry = y + 26 + i * 12, r = rows[i];
        PL.gfx.text(ctx, r[0], x + 6, ry, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)' });
        PL.gfx.text(ctx, r[1], x + 62, ry, { font: PL.FONT.tiny, align: 'right', color: C.parchment });
        PL.gfx.text(ctx, r[2], x + 74, ry, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)' });
        PL.gfx.text(ctx, r[3], x + w - 6, ry, { font: PL.FONT.tiny, align: 'right', color: C.parchment });
      }

      // What is held right now — the input that the next step will record.
      var In = PL.Input;
      var keys = [['←', 'left'], ['→', 'right'], ['↑', 'up'], ['↓', 'down'],
                  ['JMP', 'jump'], ['ITEM', 'item']];
      var kx = x + 6;
      for (var k = 0; k < keys.length; k++) {
        var on = In.down(keys[k][1]);
        ctx.font = PL.FONT.tiny;
        var kw = ctx.measureText(keys[k][0]).width + 8;
        PL.gfx.rect(ctx, kx, y + h - 15, kw, 11,
                    on ? 'rgba(79,184,165,0.45)' : 'rgba(156,124,82,0.16)');
        PL.gfx.text(ctx, keys[k][0], kx + kw / 2, y + h - 7, {
          font: PL.FONT.tiny, align: 'center',
          color: on ? C.parchment : 'rgba(242,227,196,0.4)'
        });
        kx += kw + 3;
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
     * What every live effect actually does, bottom-right, stacked upward off
     * the floor of the screen.
     *
     * It used to float 76px up, which put it exactly where you look to read
     * the ground ahead. Now it is flush with the bottom edge, and the caption
     * box on the other side is only 292 wide, so the two never meet and the
     * middle of the screen stays clear whatever is running.
     */
    effects: function (ctx, live, W, H) {
      if (!live.length) return;
      var rows = live.slice(0, 4);
      var w = 240, lh = 23;
      var h = 8 + rows.length * lh;
      var x = W - w - 6, y = H - 6 - h;
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
