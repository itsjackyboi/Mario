/* town-fenwick.js — the Brandywine Brush.
 *
 * Fenwick has no enemies. The Veilwalkers do not fight, and neither does the
 * town: every obstacle here is a question about timing or attention. Vines
 * offer footing on their own schedule, and half the ground only exists while
 * a spirit-light is burning.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  var SPIRIT_TIME = 7.0;

  // ================================================================== vine

  /* Grows out of the bank on a slow cycle. Three tiles of footing when it is
   * out, nothing at all when it isn't. */
  var VINE_PERIOD = 4.6;
  function Vine(opts) {
    E.call(this, opts);
    // Which way it grows depends on which bank is underneath, and the grid
    // below this row is not filled in yet while the level is being built —
    // so it is resolved on the first update instead. Author-side the rule is
    // simple: put the marker on the first empty tile out from the edge.
    this.tx = opts.tx; this.ty = opts.ty;
    this.markX = opts.x;
    this.dir = 0;
    this.maxLen = T * 3;
    this.rootX = opts.x;
    this.y = opts.y + 12;
    this.h = 11;
    this.len = 0;
    this.w = 0;
    this.x = this.rootX;
    this.isPlatform = true;
    this.active = false;
    this.dx = 0; this.dy = 0;
    this.period = VINE_PERIOD / ((opts.def && opts.def.diff) || 1);
    this.phase = ((opts.tx * 0.23 + opts.ty * 0.41) % 1) * this.period;
    this.leaves = [];
    for (var i = 0; i < 6; i++) this.leaves.push({ at: 0.12 + i * 0.15, up: i % 2 ? 1 : -1 });
    this.cull = false;
  }
  PL.extend(Vine, E);

  /** +1 to grow right, -1 to grow left, from the nearest solid ground below. */
  function bankSide(world, tx, ty) {
    if (world) {
      for (var dy = 1; dy <= 4; dy++) {
        if (world.solidAt(tx - 1, ty + dy)) return 1;
        if (world.solidAt(tx + 1, ty + dy)) return -1;
      }
    }
    return (tx % 2) ? -1 : 1;
  }

  Vine.prototype.resolve = function (world) {
    this.dir = bankSide(world, this.tx, this.ty);
    this.rootX = this.markX + (this.dir > 0 ? T : 0);
  };

  Vine.prototype.update = function (dt, world) {
    if (!this.dir) this.resolve(world);
    // Mossbound Boots persuade a vine to stay out.
    var pl = world && world.player;
    if (pl && pl.has && pl.has('grip') && this.len > this.maxLen * 0.9 &&
        PL.util.overlaps(pl, { x: this.x, y: this.y - 8, w: this.w, h: this.h + 12 })) {
      return;
    }
    this.t += dt;
    var p = ((this.t + this.phase) % this.period) / this.period;
    var f;
    if (p < 0.16) f = p / 0.16;             // reaching out
    else if (p < 0.70) f = 1;               // held
    else if (p < 0.86) f = 1 - (p - 0.70) / 0.16;  // curling back
    else f = 0;                             // gone
    f = f * f * (3 - 2 * f);
    this.len = this.maxLen * f;
    this.w = this.len;
    this.x = this.dir > 0 ? this.rootX : this.rootX - this.len;
    this.active = this.len > 14;
  };

  Vine.prototype.draw = function (ctx, cam) {
    var rx = this.rootX - cam.ox(), y = this.y - cam.oy();
    if (this.len < 2) {
      // the bud, so you can read where one is about to appear
      ctx.fillStyle = C.woodLite;
      ctx.beginPath();
      ctx.arc(rx, y + 5, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx, y + 5);
    ctx.quadraticCurveTo(rx + this.dir * this.len * 0.5, y + 1,
                         rx + this.dir * this.len, y + 5);
    ctx.stroke();
    ctx.strokeStyle = '#4e6b2e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rx, y + 4);
    ctx.quadraticCurveTo(rx + this.dir * this.len * 0.5, y,
                         rx + this.dir * this.len, y + 4);
    ctx.stroke();
    ctx.restore();

    // leaves along the length, and a curled tip
    ctx.fillStyle = C.hazard;
    for (var i = 0; i < this.leaves.length; i++) {
      var lf = this.leaves[i];
      if (lf.at * this.maxLen > this.len) continue;
      var lx = rx + this.dir * lf.at * this.maxLen;
      var ly = y + 3 + lf.up * 6;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 5, 3, lf.up * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#4e6b2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(rx + this.dir * this.len, y + 8, 4, -1.2, 2.6);
    ctx.stroke();
  };

  // =========================================================== spirit light

  /* Pick one up and the whole level remembers what it used to look like for a
   * few seconds. Regrows so a missed jump is never a dead end. */
  function SpiritLight(opts) {
    E.call(this, opts);
    this.w = 20; this.h = 20;
    this.x = opts.x + 6; this.baseY = opts.y + 6; this.y = this.baseY;
    this.regrow = (opts.def && opts.def.diff) || 1;
    this.taken = 0;
    this.motes = [];
    for (var i = 0; i < 5; i++) {
      this.motes.push({ a: Math.random() * 6.28, r: 8 + Math.random() * 10, s: 0.6 + Math.random() });
    }
  }
  PL.extend(SpiritLight, E);

  SpiritLight.prototype.update = function (dt) {
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 1.9) * 4;
    if (this.taken > 0) this.taken -= dt;
  };

  /* A light you spent before dying is back when you are. Without this a death
   * in the middle of a phantom crossing leaves the level unfinishable — and in
   * a speedrun, the whole run with it. */
  SpiritLight.prototype.onRespawn = function () {
    this.taken = 0;
  };

  SpiritLight.prototype.touch = function (player, world) {
    if (this.taken > 0) return;
    this.taken = 11 * this.regrow;         // regrows after the light has gone
    world.setTimer('spirit', SPIRIT_TIME);
    world.fx.ring(this.cx(), this.cy(), 'rgba(226,255,246,0.95)', 90);
    world.fx.label(this.cx(), this.y - 8, 'SPIRIT-LIGHT', C.lanternHi);
    PL.Audio.sfx('spirit');
  };

  SpiritLight.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox() + 10, y = this.y - cam.oy() + 10;
    if (this.taken > 0) {
      // a dim seed while it regrows
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.max(0, (11 - this.taken) / 11) * 0.4;
      PL.gfx.glow(ctx, x, y, 14, 'rgba(159,232,216,0.6)', 0.4);
      ctx.fillStyle = C.lantern;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    PL.gfx.glow(ctx, x, y, 42, 'rgba(159,232,216,0.85)', 0.6);
    ctx.fillStyle = C.lanternHi;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.lantern;
    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      var a = m.a + this.t * m.s;
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 3 + i) * 0.3;
      ctx.fillRect(x + Math.cos(a) * m.r, y + Math.sin(a) * m.r * 0.7, 2, 2);
    }
    ctx.globalAlpha = 1;
  };

  // =============================================================== phantom

  /* Footing that only exists while a spirit-light burns. */
  function Phantom(opts) {
    E.call(this, opts);
    this.w = T; this.h = 11;
    this.x = opts.x; this.y = opts.y + 10;
    this.isPlatform = true;
    this.active = false;
    this.dx = 0; this.dy = 0;
    this.vis = 0;
    this.cull = false;
  }
  PL.extend(Phantom, E);

  Phantom.prototype.update = function (dt, world) {
    this.t += dt;
    // Veilwalker's Draught: you see it the way they do, light or no light.
    var pl = world.player;
    var on = world.timer('spirit') > 0 || !!(pl && pl.has && pl.has('veil'));
    this.vis = U.approach(this.vis, on ? 1 : 0, dt * 5);
    this.active = this.vis > 0.5;
  };

  Phantom.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    ctx.save();
    if (this.vis < 0.05) {
      // the merest suggestion — enough to plan a route by
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = C.lantern;
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 5); ctx.lineTo(x + this.w - 2, y + 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    ctx.globalAlpha = 0.25 + this.vis * 0.75;
    PL.gfx.glow(ctx, x + this.w / 2, y + 5, 26, 'rgba(159,232,216,0.6)', 0.4 * this.vis);
    PL.gfx.rect(ctx, x, y, this.w, this.h, '#2f4a3c');
    PL.gfx.rect(ctx, x, y, this.w, 3, C.lantern);
    ctx.fillStyle = C.lanternHi;
    for (var i = 0; i < 3; i++) {
      ctx.globalAlpha = (0.3 + this.vis * 0.6) * (0.5 + Math.sin(this.t * 4 + i) * 0.5);
      ctx.fillRect(x + 6 + i * 10, y + 4, 2, 2);
    }
    ctx.restore();
  };

  PL.Entities.define('vine', Vine);
  PL.Entities.define('spiritLight', SpiritLight);
  PL.Entities.define('phantom', Phantom);

  // =============================================================== backdrop

  function FenwickBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 17);
    this.far = [];
    var x = -100;
    while (x < world.w * 0.4 + 900) {
      this.far.push({ x: x, w: 14 + rnd() * 16, h: 130 + rnd() * 110, lean: (rnd() - 0.5) * 0.1 });
      x += 40 + rnd() * 50;
    }
    this.near = [];
    x = -120;
    while (x < world.w * 0.8 + 900) {
      this.near.push({ x: x, w: 26 + rnd() * 30, h: 180 + rnd() * 130, moss: rnd() > 0.4 });
      x += 130 + rnd() * 150;
    }
    this.motes = [];
    for (var m = 0; m < 34; m++) {
      this.motes.push({ x: rnd(), y: rnd(), s: 0.3 + rnd() * 0.8, p: rnd() * 6.28 });
    }
  }

  FenwickBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;
    var g = ctx.createLinearGradient(0, -camY * 0.12, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.4, C.skyMid);
    g.addColorStop(0.75, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // light coming down through the canopy in shafts
    ctx.save();
    for (var b = 0; b < 5; b++) {
      var bx = ((b * 190 - cam.x * 0.08) % (W + 320)) - 160;
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#cfe3a8';
      ctx.beginPath();
      ctx.moveTo(bx, -20);
      ctx.lineTo(bx + 40, -20);
      ctx.lineTo(bx + 96, H);
      ctx.lineTo(bx + 20, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // far trunks
    for (var f = 0; f < this.far.length; f++) {
      var fr = this.far[f];
      var fx = fr.x - cam.x * 0.16;
      if (fx < -50 || fx > W + 50) continue;
      var base = H * 0.86 - camY * 0.06;
      ctx.save();
      ctx.translate(fx, base);
      ctx.rotate(fr.lean);
      ctx.fillStyle = '#182a22';
      ctx.fillRect(0, -fr.h, fr.w, fr.h);
      ctx.restore();
    }

    // still bog water
    var bogY = H * 0.80 - camY * 0.05;
    var bg = ctx.createLinearGradient(0, bogY, 0, H);
    bg.addColorStop(0, C.seaMid);
    bg.addColorStop(1, C.seaDeep);
    ctx.fillStyle = bg;
    ctx.fillRect(0, bogY, W, H - bogY);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#9fc8a8';
    for (var r = 0; r < 7; r++) {
      ctx.fillRect(((r * 91 - cam.x * 0.3) % (W + 200)) - 100, bogY + 8 + r * 8, 60 + r * 14, 2);
    }
    ctx.restore();

    // near trunks with hanging moss
    for (var n = 0; n < this.near.length; n++) {
      var nr = this.near[n];
      var nx = nr.x - cam.x * 0.5;
      if (nx < -80 || nx > W + 80) continue;
      var nb = H + 20 - camY * 0.02;
      ctx.fillStyle = '#0f1c17';
      ctx.fillRect(nx, nb - nr.h, nr.w, nr.h);
      ctx.fillStyle = '#16261f';
      ctx.fillRect(nx, nb - nr.h, 5, nr.h);
      if (nr.moss) {
        ctx.strokeStyle = 'rgba(125,146,87,0.5)';
        ctx.lineWidth = 2;
        for (var mo = 0; mo < 5; mo++) {
          var mx = nx + 4 + mo * (nr.w - 8) / 4;
          var sw = Math.sin(time * 0.8 + mo + n) * 4;
          ctx.beginPath();
          ctx.moveTo(mx, nb - nr.h + 20);
          ctx.quadraticCurveTo(mx + sw, nb - nr.h + 46, mx + sw * 1.4, nb - nr.h + 70);
          ctx.stroke();
        }
      }
    }

    // spirit motes drifting through the whole frame
    ctx.save();
    for (var mm = 0; mm < this.motes.length; mm++) {
      var mt = this.motes[mm];
      var mx2 = ((mt.x * W * 2 - cam.x * 0.35) % (W + 60)) - 30;
      var my2 = (mt.y * H + Math.sin(time * mt.s + mt.p) * 22) % H;
      ctx.globalAlpha = 0.25 + Math.sin(time * 2 + mt.p) * 0.2;
      ctx.fillStyle = C.lanternHi;
      ctx.fillRect(mx2, my2, 2, 2);
    }
    ctx.restore();

    // low mist
    var mist = ctx.createLinearGradient(0, H * 0.6, 0, H);
    mist.addColorStop(0, 'rgba(159,200,168,0)');
    mist.addColorStop(1, 'rgba(159,200,168,0.16)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('fenwick', function (world) { return new FenwickBackdrop(world); });

  // ================================================================== trial

  /* THE LANTERN OF ROOTS — a puzzle, not a reflex test. Touching a light wakes
   * it and both its neighbours; wake all five and the path shows itself.
   * Generated by scrambling from the solved state, so it is always solvable,
   * and there is no way to lose — Fenwick does not throw anyone in the water. */
  function LanternOfRoots() {
    this.n = 5;
    this.lights = [];
    this.sel = 2;
    this.moves = 0;
    this.hintAt = 22;
    this.hint = -1;
    this.flash = 0;
    this.reward = 0;
    this.solvedT = 0;
    var i;
    for (i = 0; i < this.n; i++) this.lights.push(true);
    // Scramble: an odd number of distinct touches keeps it from starting solved.
    var touches = 3 + ((Math.random() * 3) | 0);
    for (i = 0; i < touches; i++) this.toggle((Math.random() * this.n) | 0, true);
    if (this.solved()) this.toggle(1, true);
  }

  LanternOfRoots.prototype.toggle = function (i, quiet) {
    for (var d = -1; d <= 1; d++) {
      var j = i + d;
      if (j >= 0 && j < this.n) this.lights[j] = !this.lights[j];
    }
    if (!quiet) {
      this.moves++;
      PL.Audio.tone(440 + i * 110, 0.25, 'sine', 0.24);
    }
  };

  LanternOfRoots.prototype.solved = function () {
    for (var i = 0; i < this.n; i++) if (!this.lights[i]) return false;
    return true;
  };

  /** Brute-force the shortest remaining solution; used only for the nudge. */
  LanternOfRoots.prototype.solution = function () {
    var best = null;
    for (var mask = 0; mask < (1 << this.n); mask++) {
      var st = this.lights.slice();
      var count = 0;
      for (var i = 0; i < this.n; i++) {
        if (!(mask & (1 << i))) continue;
        count++;
        for (var d = -1; d <= 1; d++) {
          var j = i + d;
          if (j >= 0 && j < this.n) st[j] = !st[j];
        }
      }
      var ok = true;
      for (var k = 0; k < this.n; k++) if (!st[k]) { ok = false; break; }
      if (ok && (best === null || count < best.count)) best = { mask: mask, count: count };
    }
    return best;
  };

  LanternOfRoots.prototype.update = function (dt) {
    if (this.flash > 0) this.flash -= dt;
    if (this.solvedT > 0) {
      this.solvedT -= dt;
      if (this.solvedT <= 0) return 'won';
      return null;
    }
    var In = PL.Input;
    if (In.pressed('left')) { this.sel = (this.sel + this.n - 1) % this.n; PL.Audio.sfx('menu'); }
    if (In.pressed('right')) { this.sel = (this.sel + 1) % this.n; PL.Audio.sfx('menu'); }
    if (In.pressed('jump') || In.pressed('confirm') || In.pressed('up')) {
      this.toggle(this.sel);
      this.flash = 0.3;
      this.hint = -1;
      if (this.solved()) {
        this.reward = Math.max(6, 30 - this.moves * 2);
        this.solvedT = 0.9;
        PL.Audio.sfx('spirit');
      }
    }
    // If somebody is thrashing, the roots take pity and point.
    if (this.moves >= this.hintAt && this.hint < 0) {
      var sol = this.solution();
      if (sol) {
        for (var i = 0; i < this.n; i++) if (sol.mask & (1 << i)) { this.hint = i; break; }
      }
    }
    return null;
  };

  LanternOfRoots.prototype.draw = function (ctx, scene) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var y = 190;
    PL.gfx.panel(ctx, W / 2 - 210, y - 78, 420, 156, { r: 6 });
    PL.gfx.text(ctx, 'TOUCHES  ' + this.moves, W / 2 - 194, y - 56,
      { font: PL.FONT.small, color: C.lanternHi });
    PL.gfx.text(ctx, 'wake every root', W / 2 + 194, y - 56,
      { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)' });

    // the root running between them
    ctx.strokeStyle = '#2c4a30';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 168, y + 26);
    for (var s = 0; s <= 8; s++) {
      ctx.lineTo(W / 2 - 168 + s * 42, y + 26 + Math.sin(s * 1.3 + scene.t) * 3);
    }
    ctx.stroke();

    for (var i = 0; i < this.n; i++) {
      var cx = W / 2 - 168 + i * 84;
      var on = this.lights[i];
      var picked = i === this.sel;
      if (on) PL.gfx.glow(ctx, cx, y, 54, 'rgba(159,232,216,0.9)', 0.75);
      // the lantern pod
      ctx.fillStyle = on ? '#7fdcc4' : '#26382e';
      ctx.beginPath();
      ctx.ellipse(cx, y, 18, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? '#e2fff6' : '#1a2a22';
      ctx.beginPath();
      ctx.ellipse(cx - 4, y - 6, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // husk
      ctx.strokeStyle = '#3f5c3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, y, 22, 0.6, 2.5);
      ctx.stroke();
      if (picked) {
        ctx.strokeStyle = C.lanternHi;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, y, 30 + Math.sin(scene.t * 6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (this.hint === i) {
        PL.gfx.text(ctx, '▼', cx, y - 40, {
          font: PL.FONT.hud, align: 'center', color: C.hazard
        });
      }
    }

    if (scene.state === 'play') {
      PL.gfx.text(ctx, this.solvedT > 0 ? 'THE PATH OPENS' :
        '← → choose a root · SPACE wakes it and both its neighbours',
        W / 2, y + 62, {
          font: this.solvedT > 0 ? PL.FONT.head : PL.FONT.tiny,
          align: 'center',
          color: this.solvedT > 0 ? C.lanternHi : 'rgba(242,227,196,0.65)'
        });
      PL.gfx.text(ctx, 'Nothing here can hurt you. Take as long as you like.',
        W / 2, H - 14, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.45)' });
    }
  };

  PL.Trials.register('lanternOfRoots', {
    title: 'THE LANTERN OF ROOTS',
    subtitle: 'Fenwick asks nothing of your nerve. Only that you look.',
    prompt: 'Wake all five roots. Each touch wakes its neighbours too. — SPACE to begin',
    winLine: 'The brush parts. Nobody says anything. That is how they say well done.',
    loseLine: '',
    create: function () { return new LanternOfRoots(); }
  });

})(window.PL = window.PL || {});
