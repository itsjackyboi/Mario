/* town-tavern.js — Sackbeard's Tavern, the capstone.
 *
 * The Shelled Tavern is built inside the carcass of the Great Shelled Beast
 * that Sackbeard killed — the building every other town's history hangs off.
 * The backdrop deliberately quotes each town in turn as you run right: salvage
 * hulls, brewery copper, a Providence bell, Fenwick moss, Roto canvas. No new
 * hazards live here; the level data pulls them in from every town at once.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function TavernBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 29);
    this.worldW = world.w;

    // Ribs of the beast, arcing overhead the whole length of the level.
    this.ribs = [];
    var x = -100;
    while (x < world.w + 600) {
      this.ribs.push({ x: x, h: 200 + rnd() * 90, lean: (rnd() - 0.5) * 0.16 });
      x += 96 + rnd() * 40;
    }

    // Crew banners — one per town, in the order you visited them.
    this.banners = [
      { at: 0.10, tone: '#a9773f', mark: 'hull' },     // Shanty Town
      { at: 0.28, tone: '#b9573a', mark: 'keg' },      // Aleforge
      { at: 0.46, tone: '#98a1b3', mark: 'bell' },     // Providence
      { at: 0.62, tone: '#c9552e', mark: 'tag' },      // Owe Block
      { at: 0.78, tone: '#6b6135', mark: 'leaf' },     // Fenwick
      { at: 0.92, tone: '#2fa8a0', mark: 'sail' }      // Roto Kaiishi
    ];

    this.tables = [];
    x = -60;
    while (x < world.w + 600) {
      this.tables.push({ x: x, w: 46 + rnd() * 34, h: 22 + rnd() * 12, mugs: 1 + ((rnd() * 4) | 0) });
      x += 120 + rnd() * 110;
    }

    this.embers = [];
    for (var e = 0; e < 40; e++) {
      this.embers.push({ x: rnd(), y: rnd(), s: 0.4 + rnd(), p: rnd() * 6.28 });
    }
  }

  TavernBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;

    // Inside, so the "sky" is the roof of the beast, lit from below.
    var g = ctx.createLinearGradient(0, -camY * 0.1, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.4, C.skyMid);
    g.addColorStop(0.74, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // the great hearth, off to the far side, throwing everything into relief
    var fx = W * 0.5 - cam.x * 0.05;
    var fy = H * 0.62 - camY * 0.08;
    var flick = 0.8 + Math.sin(time * 6) * 0.12 + Math.sin(time * 17) * 0.06;
    PL.gfx.glow(ctx, fx, fy, 230 * flick, 'rgba(224,96,62,0.4)', 0.55 * flick);
    PL.gfx.glow(ctx, fx, fy, 110 * flick, 'rgba(255,207,138,0.6)', 0.6 * flick);

    // ribs
    for (var r = 0; r < this.ribs.length; r++) {
      var rb = this.ribs[r];
      var rx = rb.x - cam.x * 0.22;
      if (rx < -120 || rx > W + 120) continue;
      var base = H * 0.94 - camY * 0.06;
      ctx.save();
      ctx.translate(rx, base);
      ctx.rotate(rb.lean);
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(24, -rb.h * 0.7, 62, -rb.h);
      ctx.stroke();
      ctx.strokeStyle = '#5c3b26';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(24, -rb.h * 0.7, 62, -rb.h);
      ctx.stroke();
      ctx.restore();
    }

    // town banners strung between the ribs
    for (var b = 0; b < this.banners.length; b++) {
      var bn = this.banners[b];
      var bx = bn.at * this.worldW - cam.x * 0.45;
      if (bx < -80 || bx > W + 80) continue;
      var by = 46 - camY * 0.05;
      ctx.strokeStyle = 'rgba(160,130,88,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 40, by - 6);
      ctx.quadraticCurveTo(bx, by + 6, bx + 40, by - 6);
      ctx.stroke();
      ctx.fillStyle = bn.tone;
      ctx.beginPath();
      ctx.moveTo(bx - 22, by + 2);
      ctx.lineTo(bx + 22, by + 2);
      ctx.lineTo(bx + 22, by + 42 + Math.sin(time * 1.6 + b) * 3);
      ctx.lineTo(bx, by + 52);
      ctx.lineTo(bx - 22, by + 42 - Math.sin(time * 1.6 + b) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(20,12,10,0.45)';
      // a crude town mark on each
      if (bn.mark === 'hull') ctx.fillRect(bx - 12, by + 16, 24, 6);
      else if (bn.mark === 'keg') { ctx.fillRect(bx - 9, by + 12, 18, 16); ctx.fillStyle = bn.tone; ctx.fillRect(bx - 9, by + 18, 18, 3); }
      else if (bn.mark === 'bell') { ctx.beginPath(); ctx.moveTo(bx - 9, by + 30); ctx.quadraticCurveTo(bx, by + 8, bx + 9, by + 30); ctx.closePath(); ctx.fill(); }
      else if (bn.mark === 'tag') { ctx.fillRect(bx - 11, by + 14, 22, 5); ctx.fillRect(bx - 11, by + 14, 5, 18); }
      else if (bn.mark === 'leaf') { ctx.beginPath(); ctx.ellipse(bx, by + 24, 11, 6, 0.5, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(bx, by + 10); ctx.lineTo(bx + 10, by + 32); ctx.lineTo(bx - 10, by + 32); ctx.closePath(); ctx.fill(); }
    }

    // long tables of drinkers' leavings, near layer
    for (var t = 0; t < this.tables.length; t++) {
      var tb = this.tables[t];
      var tx = tb.x - cam.x * 0.62;
      if (tx + tb.w < -80 || tx > W + 80) continue;
      var gy = H - 10 - camY * 0.02;
      ctx.fillStyle = '#2e1d13';
      ctx.fillRect(tx, gy - tb.h, tb.w, tb.h);
      ctx.fillStyle = '#42291a';
      ctx.fillRect(tx - 4, gy - tb.h, tb.w + 8, 5);
      for (var m = 0; m < tb.mugs; m++) {
        var mx = tx + 8 + m * 13;
        ctx.fillStyle = '#5c3b26';
        ctx.fillRect(mx, gy - tb.h - 9, 7, 9);
        ctx.fillStyle = 'rgba(240,226,189,0.6)';
        ctx.fillRect(mx, gy - tb.h - 11, 7, 3);
      }
    }

    // embers rising off the hearth
    ctx.save();
    for (var em = 0; em < this.embers.length; em++) {
      var eb = this.embers[em];
      var ex = ((eb.x * W * 2 - cam.x * 0.3) % (W + 40)) - 20;
      var ey = H - ((time * 26 * eb.s + eb.y * H) % (H + 40));
      ctx.globalAlpha = 0.25 + Math.sin(time * 4 + eb.p) * 0.2;
      ctx.fillStyle = em % 3 ? C.hazard : C.lanternHi;
      ctx.fillRect(ex, ey, 2, 2);
    }
    ctx.restore();

    var warm = ctx.createLinearGradient(0, 0, 0, H);
    warm.addColorStop(0, 'rgba(21,12,20,0.45)');
    warm.addColorStop(0.55, 'rgba(184,100,47,0.08)');
    warm.addColorStop(1, 'rgba(224,96,62,0.16)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('tavern', function (world) { return new TavernBackdrop(world); });

})(window.PL = window.PL || {});
