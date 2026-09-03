/* backdrop.js — parallax scenery, registered per town.
 *
 * Add a town later by calling PL.Backdrops.register('<town>', factory) where
 * factory(world) returns an object with draw(ctx, cam, time).
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var registry = {};

  PL.Backdrops = {
    register: function (town, factory) { registry[town] = factory; },
    create: function (world) {
      var f = registry[world.town] || registry['shantytown'];
      return f(world);
    }
  };

  // ---------------------------------------------------------- Shanty Town

  function ShantyBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 1);
    this.world = world;

    // Far cliffs: a jagged skyline the town is nailed onto.
    this.cliffs = [];
    var cx = -200;
    while (cx < world.w * 0.35 + 900) {
      var wd = 120 + rnd() * 220;
      this.cliffs.push({ x: cx, w: wd, h: 90 + rnd() * 90 });
      cx += wd * 0.72;
    }

    // Mid layer: crashed hulls and bare masts — the price of living here.
    this.wrecks = [];
    var wx = 60;
    while (wx < world.w * 0.62 + 900) {
      this.wrecks.push({
        x: wx, w: 90 + rnd() * 90, h: 34 + rnd() * 26,
        masts: 1 + Math.floor(rnd() * 3), lean: (rnd() - 0.5) * 0.28
      });
      wx += 200 + rnd() * 340;
    }

    // Near layer: the stacked shanties themselves, lit from within.
    this.huts = [];
    var hx = -40;
    while (hx < world.w * 0.8 + 900) {
      var stack = 1 + Math.floor(rnd() * 3);
      var group = { x: hx, boxes: [] };
      var baseY = 0;
      for (var s = 0; s < stack; s++) {
        var bw = 44 + rnd() * 44;
        var bh = 34 + rnd() * 26;
        group.boxes.push({
          dx: (rnd() - 0.5) * 22, y: baseY, w: bw, h: bh,
          lamp: rnd() > 0.35, tone: Math.floor(rnd() * 3), lean: (rnd() - 0.5) * 0.1
        });
        baseY -= bh - 4;
      }
      this.huts.push(group);
      hx += 130 + rnd() * 190;
    }

    this.stars = [];
    for (var st = 0; st < 40; st++) {
      this.stars.push({ x: rnd() * PL.VIEW_W, y: rnd() * 90, a: 0.2 + rnd() * 0.5 });
    }
  }

  ShantyBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var camY = cam.y;

    // --- dusk sky ---------------------------------------------------------
    var g = ctx.createLinearGradient(0, -camY * 0.15, 0, H - camY * 0.15 + 40);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.42, C.skyMid);
    g.addColorStop(0.74, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // first stars over the darker top
    ctx.save();
    for (var s = 0; s < this.stars.length; s++) {
      var st = this.stars[s];
      ctx.globalAlpha = st.a * (0.5 + 0.5 * Math.sin(time * 1.6 + s));
      ctx.fillStyle = '#f2e3c4';
      ctx.fillRect(st.x, st.y - camY * 0.05, 1, 1);
    }
    ctx.restore();

    // --- low sun ----------------------------------------------------------
    var sunX = W * 0.76 - cam.x * 0.03;
    sunX = ((sunX % (W * 2)) + W * 2) % (W * 2);
    var sunY = H * 0.52 - camY * 0.1;
    PL.gfx.glow(ctx, sunX, sunY, 130, 'rgba(255,180,90,0.55)', 0.6);
    ctx.fillStyle = C.sunDisc;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();

    // --- cloud banks ------------------------------------------------------
    // Soft, low-contrast smears; anything harder reads as UI, not weather.
    ctx.save();
    for (var cl = 0; cl < 7; cl++) {
      var cy = 46 + cl * 20 - camY * 0.06;
      var cw = 90 + cl * 26;
      var cxp = ((cl * 190 - cam.x * 0.05 - time * 3) % (W + 400)) - 200;
      ctx.globalAlpha = 0.10 + (cl % 3) * 0.035;
      ctx.fillStyle = cl % 2 ? '#f0c07a' : '#9b6672';
      ctx.beginPath();
      ctx.ellipse(cxp + cw / 2, cy, cw / 2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cxp + cw * 0.34, cy - 2, cw * 0.22, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- far cliffs -------------------------------------------------------
    var horizon = H * 0.62 - camY * 0.12;
    ctx.fillStyle = '#3d2b3a';
    for (var i = 0; i < this.cliffs.length; i++) {
      var cf = this.cliffs[i];
      var x = cf.x - cam.x * 0.12;
      if (x + cf.w < -60 || x > W + 60) continue;
      ctx.beginPath();
      ctx.moveTo(x, horizon + 10);
      ctx.lineTo(x + cf.w * 0.18, horizon - cf.h);
      ctx.lineTo(x + cf.w * 0.55, horizon - cf.h * 0.72);
      ctx.lineTo(x + cf.w * 0.8, horizon - cf.h * 0.95);
      ctx.lineTo(x + cf.w, horizon + 10);
      ctx.closePath();
      ctx.fill();
    }

    // --- distant sea ------------------------------------------------------
    var seaY = horizon + 8;
    var sg = ctx.createLinearGradient(0, seaY, 0, H);
    sg.addColorStop(0, '#48414f');
    sg.addColorStop(0.35, C.seaMid);
    sg.addColorStop(1, C.seaDeep);
    ctx.fillStyle = sg;
    ctx.fillRect(0, seaY, W, H - seaY);
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = '#ffcf94';
    for (var r = 0; r < 12; r++) {
      var ry = seaY + 4 + r * 5;
      var rw = 30 + Math.sin(time * 1.1 + r) * 22 + r * 6;
      ctx.fillRect(sunX - rw / 2, ry, rw, 2);
    }
    ctx.restore();

    // --- mid: wrecked hulls ----------------------------------------------
    for (var w2 = 0; w2 < this.wrecks.length; w2++) {
      var wr = this.wrecks[w2];
      var wx = wr.x - cam.x * 0.3;
      if (wx + wr.w < -80 || wx > W + 80) continue;
      var wy = horizon + 18 - camY * 0.04;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(wr.lean);
      ctx.fillStyle = '#33232c';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(wr.w * 0.5, wr.h * 1.5, wr.w, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#33232c';
      ctx.lineWidth = 3;
      for (var m = 0; m < wr.masts; m++) {
        var mx = wr.w * (0.25 + m * 0.25);
        ctx.beginPath();
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx + wr.lean * 40, -40 - m * 14);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- near: the shanties ----------------------------------------------
    var tones = ['#4b3328', '#3f2c26', '#553a2b'];
    for (var h = 0; h < this.huts.length; h++) {
      var grp = this.huts[h];
      var gx = grp.x - cam.x * 0.55;
      if (gx < -160 || gx > W + 160) continue;
      var groundY = H - 26 - camY * 0.02;
      for (var b = 0; b < grp.boxes.length; b++) {
        var bx = grp.boxes[b];
        var x2 = gx + bx.dx;
        var y2 = groundY + bx.y - bx.h;
        ctx.save();
        ctx.translate(x2 + bx.w / 2, y2 + bx.h);
        ctx.rotate(bx.lean * 0.1);
        ctx.translate(-bx.w / 2, -bx.h);
        ctx.fillStyle = tones[bx.tone];
        ctx.fillRect(0, 0, bx.w, bx.h);
        // roof of mismatched boards
        ctx.fillStyle = '#2c1f22';
        ctx.beginPath();
        ctx.moveTo(-5, 0); ctx.lineTo(bx.w + 5, 0);
        ctx.lineTo(bx.w * 0.68, -9); ctx.lineTo(bx.w * 0.2, -9);
        ctx.closePath(); ctx.fill();
        if (bx.lamp) {
          var flick = 0.75 + Math.sin(time * 7 + h * 2 + b) * 0.12 + Math.sin(time * 19 + b) * 0.06;
          ctx.fillStyle = 'rgba(255,190,110,' + (0.75 * flick) + ')';
          ctx.fillRect(bx.w * 0.3, bx.h * 0.3, 9, 8);
          PL.gfx.glow(ctx, bx.w * 0.3 + 4, bx.h * 0.3 + 4, 34, 'rgba(255,179,71,0.45)', 0.45 * flick);
        }
        ctx.restore();
      }
    }

    // Warm haze pooling in the low ground, keeps the palette cohesive.
    var haze = ctx.createLinearGradient(0, H * 0.55, 0, H);
    haze.addColorStop(0, 'rgba(255,150,80,0)');
    haze.addColorStop(1, 'rgba(255,140,70,0.13)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('shantytown', function (world) { return new ShantyBackdrop(world); });

})(window.PL = window.PL || {});
