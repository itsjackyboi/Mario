/* town-roto.js — Roto Kaiishi, the floating market.
 *
 * The whole city is tied to poles and floats, so nothing here is quite still.
 * Bobbing stilt platforms sink under your weight and sway with the swell, and
 * the stalls will sell you a way out of a jump if your purse can stand it.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  var STALL_PRICE = 10;

  // =============================================================== bobber

  /* A stilt platform on the swell. It rides the water, drifts sideways with
   * it, and settles under you the longer you stand — capped well short of the
   * waterline, so it is pressure on your timing rather than a drowning. */
  function Bobber(opts) {
    E.call(this, opts);
    this.w = T * 2; this.h = 12;
    this.homeX = opts.x; this.homeY = opts.y + 10;
    this.x = this.homeX; this.y = this.homeY;
    this.isPlatform = true;
    this.active = true;
    this.dx = 0; this.dy = 0;
    this.phase = ((opts.tx * 0.37 + opts.ty * 0.19) % 1) * Math.PI * 2;
    this.sink = 0;
    this.loaded = false;
    this.diff = (opts.def && opts.def.diff) || 1;
    this.cull = false;
  }
  PL.extend(Bobber, E);

  Bobber.prototype.onStand = function (a) {
    // Mossbound Boots keep the float riding high under you.
    if (a && a.has && a.has('grip')) return;
    this.loaded = true;
  };

  Bobber.prototype.update = function (dt) {
    this.t += dt;
    var px = this.x, py = this.y;
    // Settling is quick, recovery is slow and springy.
    this.sink = this.loaded
      ? Math.min(20, this.sink + dt * 34 * this.diff)
      : Math.max(0, this.sink - dt * 13);
    this.loaded = false;

    var swell = Math.sin(this.t * 1.5 + this.phase);
    this.y = this.homeY + swell * 3.5 + this.sink;
    this.x = this.homeX + Math.sin(this.t * 0.8 + this.phase * 1.7) * 5;
    this.dx = this.x - px;
    this.dy = this.y - py;
  };

  Bobber.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    // the poles it is lashed to, running down out of frame
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 7, y + 6); ctx.lineTo(x + 3, y + 46);
    ctx.moveTo(x + this.w - 7, y + 6); ctx.lineTo(x + this.w - 3, y + 46);
    ctx.stroke();

    PL.gfx.rect(ctx, x, y, this.w, this.h, C.woodDark);
    for (var d = 0; d < 4; d++) {
      PL.gfx.rect(ctx, x + 1 + d * 16, y + 1, 14, this.h - 3,
                  d % 2 ? C.wood : C.woodLite);
    }
    PL.gfx.rect(ctx, x, y, this.w, 2, C.woodPale);
    PL.gfx.rect(ctx, x + 2, y + this.h - 3, this.w - 4, 2, C.rope);

    // wash around the floats, heavier the deeper it sits
    ctx.save();
    ctx.globalAlpha = 0.25 + (this.sink / 20) * 0.5;
    ctx.fillStyle = C.seaFoam;
    ctx.fillRect(x - 4, y + this.h, this.w + 8, 2);
    ctx.fillRect(x - 8 + Math.sin(this.t * 4) * 3, y + this.h + 3, 12, 1);
    ctx.fillRect(x + this.w - 6 + Math.cos(this.t * 4) * 3, y + this.h + 3, 12, 1);
    ctx.restore();
  };

  // ================================================================ stall

  /* Merchant stall. Scenery until you stand in it with a full purse: press
   * DOWN to buy the stocked item. One sale each — this is Roto, not charity. */
  function Stall(opts) {
    E.call(this, opts);
    this.w = T * 2; this.h = T * 2;
    this.x = opts.x;
    this.y = opts.y + T - this.h;
    this.stock = (opts.tx % 2) ? 'seed' : 'pouch';
    this.sold = false;
    this.hint = 0;
    this.flash = 0;
    this.cull = false;
    this.hue = (opts.tx * 37) % 4;
  }
  PL.extend(Stall, E);

  Stall.prototype.update = function (dt) {
    this.t += dt;
    if (this.hint > 0) this.hint -= dt;
    if (this.flash > 0) this.flash -= dt;
  };

  Stall.prototype.touch = function (player, world) {
    if (this.sold) return;
    this.hint = 0.4;
    if (!PL.Input.pressed('down')) return;
    if (player.grog < STALL_PRICE) {
      this.flash = 0.6;
      world.fx.label(this.cx(), this.y - 6, 'NEEDS ' + STALL_PRICE + ' GROG', C.hazard);
      PL.Audio.sfx('trialMiss');
      return;
    }
    player.grog -= STALL_PRICE;
    this.sold = true;
    if (this.stock === 'seed') player.giveSeed(); else player.givePouch();
    world.fx.ring(this.cx(), this.cy(), C.bone, 46);
    world.fx.label(this.cx(), this.y - 6,
      this.stock === 'seed' ? 'BOUGHT: SEED' : 'BOUGHT: WIND POUCH', C.lanternHi);
    PL.Audio.sfx('powerup');
  };

  Stall.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var stripes = [['#d94f4f', C.bone], ['#2fa8a0', C.bone], ['#e8a33d', C.bone], ['#7a5ab8', C.bone]];
    var pair = stripes[this.hue];

    // counter and poles
    PL.gfx.rect(ctx, x + 2, y + 26, 4, this.h - 26, C.woodDark);
    PL.gfx.rect(ctx, x + this.w - 6, y + 26, 4, this.h - 26, C.woodDark);
    PL.gfx.rect(ctx, x, y + this.h - 16, this.w, 16, C.wood);
    PL.gfx.rect(ctx, x, y + this.h - 16, this.w, 3, C.woodPale);

    // awning
    var sway = Math.sin(this.t * 1.3) * 1.5;
    for (var s = 0; s < 8; s++) {
      PL.gfx.rect(ctx, x - 4 + s * 9, y + 14 + sway, 9, 12, s % 2 ? pair[0] : pair[1]);
    }
    PL.gfx.rect(ctx, x - 6, y + 10 + sway, this.w + 12, 5, C.woodDark);

    // goods on the counter
    if (!this.sold) {
      PL.ItemIcons[this.stock === 'seed' ? 'seed' : 'pouch'](ctx, x + 12, y + this.h - 32, 16);
      PL.ItemIcons.grog(ctx, x + this.w - 26, y + this.h - 30, 13);
      PL.gfx.glow(ctx, x + this.w / 2, y + this.h - 24, 30, 'rgba(244,234,208,0.4)', 0.3);
    } else {
      PL.gfx.text(ctx, 'SOLD', x + this.w / 2, y + this.h - 22, {
        font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.5)'
      });
    }

    // price board — only while you are actually standing in the stall
    if (this.hint > 0 && !this.sold) {
      var label = (this.stock === 'seed' ? 'SEED' : 'WIND POUCH') + '  ' + STALL_PRICE + ' GROG';
      ctx.save();
      ctx.globalAlpha = this.flash > 0 ? 1 : 0.92;
      PL.gfx.panel(ctx, x + this.w / 2 - 68, y - 30, 136, 24, { r: 4 });
      PL.gfx.text(ctx, label, x + this.w / 2, y - 19, {
        font: PL.FONT.tiny, align: 'center',
        color: this.flash > 0 ? C.hazard : C.lanternHi
      });
      PL.gfx.text(ctx, 'press ↓ to buy', x + this.w / 2, y - 10, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)'
      });
      ctx.restore();
    }
  };

  PL.Entities.define('bobber', Bobber);
  PL.Entities.define('stall', Stall);

  // =============================================================== backdrop

  function RotoBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 23);
    this.sails = [];
    var x = -100;
    while (x < world.w * 0.35 + 900) {
      this.sails.push({ x: x, h: 26 + rnd() * 30, tone: (rnd() * 3) | 0 });
      x += 190 + rnd() * 260;
    }
    this.huts = [];
    x = -120;
    while (x < world.w * 0.8 + 900) {
      this.huts.push({
        x: x, w: 54 + rnd() * 54, h: 44 + rnd() * 40,
        stilts: 3 + ((rnd() * 3) | 0), hue: (rnd() * 4) | 0, flags: rnd() > 0.4
      });
      x += 96 + rnd() * 80;
    }
  }

  RotoBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;
    var g = ctx.createLinearGradient(0, -camY * 0.12, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.38, C.skyMid);
    g.addColorStop(0.68, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var sunX = W * 0.68 - cam.x * 0.02;
    var sunY = H * 0.16 - camY * 0.06;
    PL.gfx.glow(ctx, sunX, sunY, 150, 'rgba(255,244,196,0.55)', 0.6);
    ctx.fillStyle = C.sunDisc;
    ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, Math.PI * 2); ctx.fill();

    // open water to the horizon
    var seaY = H * 0.52 - camY * 0.08;
    var sg = ctx.createLinearGradient(0, seaY, 0, H);
    sg.addColorStop(0, C.seaSurf);
    sg.addColorStop(0.4, C.seaMid);
    sg.addColorStop(1, C.seaDeep);
    ctx.fillStyle = sg;
    ctx.fillRect(0, seaY, W, H - seaY);

    // distant sails
    var tones = ['#f4ead0', '#e8515f', '#2fa8a0'];
    for (var s = 0; s < this.sails.length; s++) {
      var sl = this.sails[s];
      var sx = sl.x - cam.x * 0.12;
      if (sx < -60 || sx > W + 60) continue;
      var sy = seaY - 4 + Math.sin(time * 0.9 + s) * 2;
      ctx.fillStyle = tones[sl.tone];
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 2, sy - sl.h);
      ctx.lineTo(sx + 18, sy);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0e4a52';
      ctx.fillRect(sx - 4, sy, 26, 4);
    }

    // glitter on the swell
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = C.seaFoam;
    for (var r = 0; r < 26; r++) {
      var gx = ((r * 79 - cam.x * 0.25) % (W + 120)) - 60;
      var gy = seaY + 10 + (r % 9) * 12;
      var gw = 8 + Math.sin(time * 2.4 + r) * 6;
      if (gw > 2) ctx.fillRect(gx, gy, gw, 2);
    }
    ctx.restore();

    // the stilt city
    var hues = ['#d94f4f', '#2fa8a0', '#e8a33d', '#7a5ab8'];
    for (var h = 0; h < this.huts.length; h++) {
      var ht = this.huts[h];
      var hx = ht.x - cam.x * 0.5;
      if (hx + ht.w < -100 || hx > W + 100) continue;
      var waterline = H - 26 - camY * 0.02;
      var bobY = Math.sin(time * 1.1 + h * 0.7) * 2;
      var topY = waterline - 44 - ht.h + bobY;
      // stilts
      ctx.strokeStyle = '#5c4326';
      ctx.lineWidth = 4;
      for (var st = 0; st < ht.stilts; st++) {
        var stx = hx + 8 + st * (ht.w - 16) / Math.max(1, ht.stilts - 1);
        ctx.beginPath();
        ctx.moveTo(stx, topY + ht.h);
        ctx.lineTo(stx + (st - 1) * 2, waterline + 16);
        ctx.stroke();
      }
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(hx, topY, ht.w, ht.h);
      ctx.fillStyle = '#a8823f';
      ctx.fillRect(hx, topY, ht.w, 5);
      // roof
      ctx.fillStyle = hues[ht.hue];
      ctx.beginPath();
      ctx.moveTo(hx - 8, topY);
      ctx.lineTo(hx + ht.w + 8, topY);
      ctx.lineTo(hx + ht.w * 0.5, topY - 20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(hx + ht.w * 0.3, topY + ht.h * 0.4, 12, 14);
      if (ht.flags) {
        ctx.strokeStyle = 'rgba(244,234,208,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hx, topY - 6);
        ctx.quadraticCurveTo(hx + ht.w / 2, topY + 4, hx + ht.w, topY - 6);
        ctx.stroke();
        for (var fl = 0; fl < 4; fl++) {
          ctx.fillStyle = hues[(ht.hue + fl) % 4];
          var fx = hx + 8 + fl * (ht.w - 16) / 3;
          ctx.fillRect(fx, topY - 2 + Math.sin(time * 3 + fl) * 1.5, 5, 7);
        }
      }
      // reflection
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = hues[ht.hue];
      ctx.fillRect(hx, waterline + 18, ht.w, 16);
      ctx.restore();
    }

    var glare = ctx.createLinearGradient(0, 0, 0, H);
    glare.addColorStop(0, 'rgba(255,250,220,0.12)');
    glare.addColorStop(1, 'rgba(47,168,160,0.10)');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('roto', function (world) { return new RotoBackdrop(world); });

  // ================================================================== trial

  /* THE HAGGLE — the merchant's price and your offer slide along the same
   * board at different speeds. Close the deal when they meet. */
  function TheHaggle() {
    this.needed = 4;
    this.deals = 0;
    this.walkouts = 3;
    this.ask = 0.18; this.askDir = 1; this.askSpeed = 0.52;
    this.bid = 0.86; this.bidDir = -1; this.bidSpeed = 0.74;
    this.tolerance = 0.075;
    this.flash = 0;
    this.flashText = '';
    this.flashGood = false;
    this.reward = 0;
    this.lockout = 0;
  }

  TheHaggle.prototype.update = function (dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.lockout > 0) this.lockout -= dt;

    this.ask += this.askDir * this.askSpeed * dt;
    if (this.ask > 1) { this.ask = 1; this.askDir = -1; }
    if (this.ask < 0) { this.ask = 0; this.askDir = 1; }
    this.bid += this.bidDir * this.bidSpeed * dt;
    if (this.bid > 1) { this.bid = 1; this.bidDir = -1; }
    if (this.bid < 0) { this.bid = 0; this.bidDir = 1; }

    if (this.lockout <= 0 && (PL.Input.pressed('jump') || PL.Input.pressed('confirm'))) {
      var gap = Math.abs(this.ask - this.bid);
      if (gap <= this.tolerance) {
        var clean = gap <= this.tolerance * 0.3;
        this.deals++;
        this.reward += clean ? 6 : 3;
        this.flash = 0.5; this.flashGood = true;
        this.flashText = clean ? 'STRUCK ON THE NOSE' : 'DEAL';
        this.lockout = 0.25;
        PL.Audio.sfx('grog');
        if (this.deals >= this.needed) return 'won';
        this.askSpeed += 0.16;
        this.bidSpeed += 0.19;
        this.tolerance = Math.max(0.042, this.tolerance - 0.008);
      } else {
        this.walkouts--;
        this.flash = 0.55; this.flashGood = false;
        this.flashText = gap > 0.35 ? 'INSULTING' : 'HE WALKS';
        this.lockout = 0.4;
        PL.Audio.sfx('trialMiss');
        if (this.walkouts <= 0) return 'lost';
      }
    }
    return null;
  };

  TheHaggle.prototype.draw = function (ctx, scene) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var barX = 84, barW = W - 168, barY = 190, barH = 22;
    PL.gfx.panel(ctx, barX - 14, barY - 74, barW + 28, 172, { r: 6 });

    PL.gfx.text(ctx, 'DEALS  ' + this.deals + ' / ' + this.needed, barX, barY - 52,
      { font: PL.FONT.small, color: C.lanternHi });
    for (var w = 0; w < 3; w++) {
      var wx = barX + barW - 14 - w * 16;
      ctx.fillStyle = w < this.walkouts ? C.grogBand : 'rgba(242,227,196,0.18)';
      ctx.beginPath(); ctx.arc(wx, barY - 56, 5, 0, Math.PI * 2); ctx.fill();
    }
    PL.gfx.text(ctx, 'PATIENCE', barX + barW - 58, barY - 52,
      { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)' });

    // the board
    PL.gfx.rect(ctx, barX, barY, barW, barH, '#3a2a14');
    PL.gfx.rect(ctx, barX + 2, barY + 2, barW - 4, barH - 4, '#6b4a1e');
    for (var t = 0; t <= 10; t++) {
      ctx.fillStyle = 'rgba(244,234,208,0.25)';
      ctx.fillRect(barX + (barW - 4) * (t / 10) + 2, barY + 3, 1, barH - 6);
    }

    // the two positions
    var ax = barX + 2 + (barW - 4) * this.ask;
    var bxp = barX + 2 + (barW - 4) * this.bid;
    // agreement window, drawn around the merchant's ask
    ctx.save();
    ctx.globalAlpha = 0.35;
    PL.gfx.rect(ctx, ax - this.tolerance * (barW - 4), barY + 2,
                this.tolerance * (barW - 4) * 2, barH - 4, C.bone);
    ctx.restore();

    drawMarker(ctx, ax, barY, barH, '#e8515f', 'ASK', -1);
    drawMarker(ctx, bxp, barY, barH, '#2fa8a0', 'YOU', 1);

    // the merchant and our man, either end of the board
    drawTrader(ctx, barX - 4, barY + 74, '#e8515f', Math.sin(scene.t * 2) * 0.05);
    drawTrader(ctx, barX + barW + 4, barY + 74, '#2fa8a0', -Math.sin(scene.t * 2.4) * 0.05);

    if (this.flash > 0 && scene.state === 'play') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flash * 2);
      PL.gfx.text(ctx, this.flashText, W / 2, barY + 66, {
        font: PL.FONT.head, align: 'center',
        color: this.flashGood ? C.lanternHi : C.hazard
      });
      ctx.restore();
    }
    if (scene.state === 'play') {
      PL.gfx.text(ctx, 'SPACE / ENTER when your offer meets his price',
        W / 2, H - 14, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)' });
    }
  };

  function drawMarker(ctx, x, y, h, colour, label, side) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    if (side < 0) {
      ctx.moveTo(x, y - 2); ctx.lineTo(x - 6, y - 12); ctx.lineTo(x + 6, y - 12);
    } else {
      ctx.moveTo(x, y + h + 2); ctx.lineTo(x - 6, y + h + 12); ctx.lineTo(x + 6, y + h + 12);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 1, y, 2, h);
    PL.gfx.text(ctx, label, x, side < 0 ? y - 16 : y + h + 24, {
      font: PL.FONT.tiny, align: 'center', color: colour
    });
  }

  function drawTrader(ctx, x, y, colour, lean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    PL.gfx.rect(ctx, -9, -26, 18, 26, '#6b4a1e');
    PL.gfx.rect(ctx, -9, -26, 18, 5, colour);
    PL.gfx.rect(ctx, -6, -36, 12, 10, '#c69a6a');
    PL.gfx.rect(ctx, -9, -38, 18, 4, colour);
    ctx.restore();
  }

  PL.Trials.register('theHaggle', {
    title: 'THE HAGGLE',
    subtitle: 'Roto Kaiishi settles everything the same way: out loud, at speed.',
    prompt: 'Close four deals. Three walkouts and the stall shuts. — SPACE to begin',
    winLine: 'He shakes your hand and overcharges you anyway. That is respect.',
    loseLine: 'Barred from a market that sells literally anything. Impressive.',
    create: function () { return new TheHaggle(); }
  });

})(window.PL = window.PL || {});
