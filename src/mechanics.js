/* mechanics.js — the six late-level mechanics, one per area.
 *
 * Each area's last level is built on a mechanic that appears nowhere else in
 * the game. They live together here rather than in the town files because they
 * are all the same *kind* of thing — a rule about the whole level rather than
 * an obstacle placed in it — and because reading them side by side is the only
 * way to see that none of them repeat.
 *
 *   Shanty Town   THE DROWNING TIDE   the sea itself rises and falls
 *   Aleforge      THE ROLLING BOIL    a wall of steam that never stops coming
 *   Providence    THE HALF BEAT       floor that only exists on every other chime
 *   Fenwick       THE OVERTURNED WOOD gravity flips through a veil gate
 *   Roto Kaiishi  THE UNDERTOW        a current that shoves you, and reverses
 *   The Tavern    THE BEAST'S PULSE   bone spines out of every marked surface
 *
 * Four of them are *level-def systems*: written as a field on the level def
 * (`tide`, `boil`, `current`, `pulse`) rather than placed as a glyph, because
 * they apply to the whole level and there is nowhere sensible to put a marker.
 * `PL.Mechanics.SYSTEMS` lists them and level.js spawns one entity per field it
 * finds. The other two are placed: `(` `)` for phase blocks and `%` for a veil
 * gate.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  /* ================================================== SHANTY TOWN — the tide
   *
   *   tide: { low: 18, high: 12, period: 11, hold: 0.22 }
   *
   * `low` and `high` are tile rows: the waterline rests at `low` and floods to
   * `high`. Everything below the line is drowning water, including ground that
   * was perfectly safe ten seconds ago. The level is a climb you have to time.
   */
  function Tide(opts) {
    E.call(this, opts);
    var cfg = opts.def.tide;
    this.lowY = (cfg.low != null ? cfg.low : 18) * T;
    this.highY = (cfg.high != null ? cfg.high : 12) * T;
    this.period = (cfg.period || 11) / ((opts.def && opts.def.diff) || 1);
    this.hold = cfg.hold != null ? cfg.hold : 0.22;
    this.decor = true;        // never touched through the collision path
    this.cull = false;
    this.level = 0;           // 0 = out, 1 = full flood
    // Covers the level so the decor pass never culls it.
    this.x = 0; this.y = 0;
    this.w = opts.world.w; this.h = opts.world.h;
    opts.world.tideY = this.lowY;
  }
  PL.extend(Tide, E);

  /** 0 out, 1 in. Rises over a quarter of the cycle, holds, falls, rests. */
  Tide.prototype.phase = function () {
    var p = (this.t % this.period) / this.period;
    var rise = 0.26, hold = this.hold, fall = 0.22;
    if (p < rise) return p / rise;
    if (p < rise + hold) return 1;
    if (p < rise + hold + fall) return 1 - (p - rise - hold) / fall;
    return 0;
  };

  Tide.prototype.update = function (dt, world) {
    this.t += dt;
    var f = this.phase();
    this.level = f * f * (3 - 2 * f);
    world.tideY = this.lowY + (this.highY - this.lowY) * this.level;
    world.tideRising = this.phase() > 0 && this.level < 1;

    var p = world.player;
    if (p && !p.dead && !p.frozen && p.y + p.h - 6 > world.tideY) {
      // The Pour Eternal is the one thing that walks on water.
      if (!p.has('pour')) p.kill(world, 'water');
    }
  };

  Tide.prototype.draw = function (ctx, cam) {
    var y = Math.round(this.lowY + (this.highY - this.lowY) * this.level - cam.oy());
    var W = PL.VIEW_W, H = PL.VIEW_H;
    if (y > H) return;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = C.seaDeep || '#123244';
    ctx.fillRect(0, y, W, H - y);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = C.seaFoam || '#cfe6e4';
    for (var i = 0; i < W; i += 8) {
      var wob = Math.sin((i * 0.06) + this.t * 3.4) * 2;
      ctx.fillRect(i, y + wob - 1, 8, 2);
    }
    ctx.restore();

    // A mark on the wall so the next flood is never a surprise.
    if (this.level < 0.02) {
      var hy = Math.round(this.highY - cam.oy());
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = C.seaFoam || '#cfe6e4';
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
      ctx.restore();
    }
  };

  /* ================================================== ALEFORGE — the boil
   *
   *   boil: { speed: 34, start: -140 }
   *
   * A wall of live steam off the mash tuns, moving right at a constant speed
   * from before the spawn point. It does not slow down, it does not stop for a
   * Trial, and there is nothing you can do to it. The level is a sprint.
   */
  function Boil(opts) {
    E.call(this, opts);
    var cfg = opts.def.boil;
    this.speed = (cfg.speed || 34) * ((opts.def && opts.def.diff) || 1);
    this.x = cfg.start != null ? cfg.start : -160;
    this.y = 0;
    this.w = 96;
    this.h = opts.world.h;
    this.cull = false;
    // Not decor: it has to draw *over* Corb, since it is swallowing him. It
    // has no `touch`, so being in the collision pass costs nothing.
    this.decor = false;
  }
  PL.extend(Boil, E);

  Boil.prototype.update = function (dt, world) {
    this.t += dt;
    this.x += this.speed * dt;
    var p = world.player;
    if (!p || p.dead || p.frozen) return;
    if (p.x < this.x + this.w) {
      if (!p.has('pour')) p.kill(world, 'boil');
    }
    // It scours the level as it goes — nothing survives behind the wall.
    for (var i = 0; i < world.entities.length; i++) {
      var e = world.entities[i];
      if (e === this || e.remove || e.decor) continue;
      if (e instanceof PL.Enemy && e.x + e.w < this.x + this.w * 0.6) {
        world.fx.burst(e.cx(), e.cy(), '#e8e2d2', 8, { speed: 2.2, life: 0.5 });
        e.remove = true;
      }
    }
  };

  Boil.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x + this.w - cam.ox());
    if (x < -40) return;
    var H = PL.VIEW_H;
    ctx.save();
    // everything behind the front is gone
    var grad = ctx.createLinearGradient(x - this.w, 0, x, 0);
    grad.addColorStop(0, 'rgba(232,226,210,0.92)');
    grad.addColorStop(0.7, 'rgba(232,226,210,0.68)');
    grad.addColorStop(1, 'rgba(232,226,210,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - this.w, 0, this.w, H);
    ctx.fillStyle = 'rgba(240,236,226,0.95)';
    ctx.fillRect(-PL.VIEW_W, 0, x - this.w + PL.VIEW_W, H);
    // billows along the front
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fdfbf4';
    for (var i = 0; i < 9; i++) {
      var by = (i + 0.5) * H / 9;
      var r = 16 + Math.sin(this.t * 2.6 + i * 1.7) * 9;
      ctx.beginPath();
      ctx.arc(x - 10 + Math.sin(this.t * 1.9 + i) * 6, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ============================================== PROVIDENCE — the half beat
   *
   * Glyphs `(` and `)`. Both are ordinary hull tiles that exist on alternate
   * chimes: `(` is solid on even beats, `)` on odd. They write themselves
   * straight into the tile grid, which is why they collide from every side like
   * real terrain instead of behaving like a platform.
   *
   * They flash for the last third of a beat before they go, and being inside
   * one when it comes back is a death. Both of those are deliberate: the town's
   * whole promise is that its hazards are countable.
   */
  function PhaseBlock(opts) {
    E.call(this, opts);
    this.w = T; this.h = T;
    this.tx = opts.tx; this.ty = opts.ty;
    this.odd = opts.glyph === ')';
    this.on = null;
    this.warn = 0;
    this.cull = false;
    this.decor = true;
  }
  PL.extend(PhaseBlock, E);

  PhaseBlock.prototype.beat = function (world) {
    var b = PL.Providence ? PL.Providence.beatAt(world.time) : Math.floor(world.time / 1.9);
    return (b % 2 === 0) !== this.odd;
  };

  PhaseBlock.prototype.update = function (dt, world) {
    this.t += dt;
    // How far through the current chime we are — the last third is the warning.
    var ph = PL.Providence ? PL.Providence.beatPhase(world.time) : 0;
    this.warn = ph > 0.66 ? (ph - 0.66) / 0.34 : 0;

    var want = this.beat(world);
    if (want === this.on) return;
    this.on = want;
    var i = this.ty * world.cols + this.tx;
    if (want) {
      world.grid[i] = PL.Tiles.HULL;
      var p = world.player;
      if (p && !p.dead && !p.frozen &&
          U.overlaps({ x: this.x + 2, y: this.y + 2, w: T - 4, h: T - 4 }, p)) {
        p.kill(world, 'crushed');
      }
    } else {
      world.grid[i] = PL.Tiles.EMPTY;
    }
  };

  PhaseBlock.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var warn = this.warn || 0;
    ctx.save();
    if (this.on) {
      // the tile itself is already painted; warn that it is about to leave
      if (warn > 0) {
        ctx.globalAlpha = 0.18 + Math.abs(Math.sin(warn * 22)) * 0.35;
        ctx.fillStyle = C.lanternHi || '#ffd77a';
        ctx.fillRect(x, y, T, T);
      }
    } else {
      // a ghost of what is coming back
      ctx.globalAlpha = 0.16 + warn * 0.4;
      ctx.fillStyle = C.pale || '#c6d3d8';
      ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = C.pale || '#c6d3d8';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
    }
    ctx.restore();
  };

  /* ============================================ FENWICK — the overturned wood
   *
   * Glyph `%`. Walk through a veil gate and down changes direction: gravity,
   * your jump and the way you are drawn all invert. The gate has a cooldown so
   * standing in it does not strobe.
   *
   * The player carries the sign in `gsign`; Physics.moveY grounds an inverted
   * body on ceilings. Nothing else in the engine knows about it.
   */
  function VeilGate(opts) {
    E.call(this, opts);
    this.w = T; this.h = T * 2;
    this.x = opts.x; this.y = opts.y - T;
    this.cool = 0;
    this.cull = false;
    this.decor = true;
  }
  PL.extend(VeilGate, E);

  VeilGate.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.cool > 0) this.cool -= dt;
    var p = world.player;
    if (!p || p.dead || p.frozen || this.cool > 0) return;
    if (!U.overlaps(this, p)) return;
    this.cool = 0.6;
    p.flipGravity(world);
    world.fx.ring(this.cx(), this.cy(), '#c9a8f0', 66);
    world.fx.burst(this.cx(), this.cy(), '#c9a8f0', 18, { speed: 2.8, life: 0.7 });
    PL.Audio.sfx('seed');
  };

  VeilGate.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    ctx.save();
    var pulse = 0.5 + Math.sin(this.t * 2.6) * 0.2;
    PL.gfx.glow(ctx, x + T / 2, y + T, T * 2, 'rgba(201,168,240,0.5)', pulse);
    ctx.globalAlpha = this.cool > 0 ? 0.3 : 0.75;
    ctx.strokeStyle = '#c9a8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + T / 2, y + T, T * 0.42, T * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#5c3f7a';
    ctx.beginPath();
    ctx.ellipse(x + T / 2, y + T, T * 0.36, T * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    // the two arrows, pointing at each other
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#e8dcff';
    var bob = Math.sin(this.t * 3) * 3;
    tri(ctx, x + T / 2, y + 10 + bob, 5, 1);
    tri(ctx, x + T / 2, y + T * 2 - 10 - bob, 5, -1);
    ctx.restore();
  };

  function tri(ctx, cx, cy, r, dir) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * dir);
    ctx.lineTo(cx - r, cy - r * dir);
    ctx.lineTo(cx + r, cy - r * dir);
    ctx.closePath(); ctx.fill();
  }

  /* ================================================== ROTO KAIISHI — the undertow
   *
   *   current: { push: 1.35, period: 7 }
   *
   * A tidal race running through the market. It shoves you sideways every
   * frame, holds for half a cycle, goes slack, then runs the other way. On the
   * ground you can walk against it; in the air you cannot, which turns every
   * jump into a wager on where the water will have put you.
   */
  function Current(opts) {
    E.call(this, opts);
    var cfg = opts.def.current;
    this.push = (cfg.push || 1.35) * ((opts.def && opts.def.diff) || 1);
    this.period = cfg.period || 7;
    this.decor = true;
    this.cull = false;
    this.x = 0; this.y = 0;
    this.w = opts.world.w; this.h = opts.world.h;
    this.force = 0;
  }
  PL.extend(Current, E);

  /** -1 .. 1. Runs one way, slackens, runs the other. */
  Current.prototype.strength = function () {
    var p = (this.t % this.period) / this.period;
    var s;
    if (p < 0.38) s = 1;
    else if (p < 0.5) s = 1 - (p - 0.38) / 0.12;
    else if (p < 0.88) s = -1;
    else s = -1 + (p - 0.88) / 0.12;
    return s;
  };

  Current.prototype.update = function (dt, world) {
    this.t += dt;
    this.force = this.strength();
    var p = world.player;
    if (!p || p.dead || p.frozen) return;
    // Mossbound Boots are the one thing that holds against it on the ground.
    var grip = p.grounded && p.has('grip');
    if (grip) return;
    var f = this.push * this.force * (p.grounded ? 0.42 : 1);
    if (f) PL.Physics.moveX(p, world, f);
  };

  Current.prototype.draw = function (ctx, cam) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var f = this.force;
    ctx.save();
    ctx.globalAlpha = 0.20 * Math.abs(f);
    ctx.strokeStyle = C.seaFoam || '#cfe6e4';
    ctx.lineWidth = 2;
    for (var i = 0; i < 26; i++) {
      var yy = ((i * 97) % H);
      var drift = (this.t * 150 * f + i * 53) % (W + 120) - 60;
      ctx.beginPath();
      ctx.moveTo(drift, yy);
      ctx.lineTo(drift + 26 * (f >= 0 ? 1 : -1), yy);
      ctx.stroke();
    }
    ctx.restore();

    // Which way it is running, on the top edge, where nothing else lives.
    if (Math.abs(f) > 0.05) {
      var label = f > 0 ? 'RUNNING  ' + arrows(1) : arrows(-1) + '  RUNNING';
      PL.gfx.text(ctx, label, W / 2, 24, {
        font: PL.FONT.tiny, align: 'center',
        color: 'rgba(207,230,228,' + (0.35 + Math.abs(f) * 0.4).toFixed(2) + ')'
      });
    }
  };

  function arrows(d) { return d > 0 ? '→ → →' : '← ← ←'; }

  /* ============================================ SACKBEARD'S TAVERN — the pulse
   *
   *   pulse: { period: 2.6, up: 0.62 }
   *
   * The beast is not as dead as the sign outside claims. Glyph `,` marks a
   * surface; on every heartbeat a bone spine comes out of it, holds, and
   * withdraws. There is a tell — the whole room throbs a beat ahead — and no
   * way to stop it.
   */
  function Spine(opts) {
    E.call(this, opts);
    var cfg = (opts.def && opts.def.pulse) || {};
    this.w = T; this.h = T;
    this.x = opts.x; this.y = opts.y;
    this.period = (cfg.period || 2.6) / ((opts.def && opts.def.diff) || 1);
    this.up = cfg.up || 0.62;
    this.phase = ((opts.tx * 0.19 + opts.ty * 0.41) % 1) * (cfg.stagger === false ? 0 : this.period);
    this.out = 0;
    this.cull = false;
    this.decor = true;
    this.dir = 0;             // resolved on the first update: out from the wall
  }
  PL.extend(Spine, E);

  Spine.prototype.resolve = function (world) {
    // Grow away from whichever side has the solid on it. Floors are the norm,
    // so a spine with solid under it points up.
    if (world.solidAt(this.tx, this.ty + 1)) this.dir = -1;
    else if (world.solidAt(this.tx, this.ty - 1)) this.dir = 1;
    else this.dir = -1;
  };

  Spine.prototype.update = function (dt, world) {
    this.t += dt;
    if (!this.dir) { this.tx = Math.floor(this.x / T); this.ty = Math.floor(this.y / T); this.resolve(world); }
    var p = ((this.t + this.phase) % this.period) / this.period;
    var w = this.up / (this.period);       // fraction of the cycle it is out
    var f;
    if (p < 0.06) f = p / 0.06;
    else if (p < 0.06 + w) f = 1;
    else if (p < 0.14 + w) f = 1 - (p - 0.06 - w) / 0.08;
    else f = 0;
    this.out = U.clamp(f, 0, 1);

    if (this.out > 0.45) {
      var pl = world.player;
      var box = this.hitbox();
      if (pl && !pl.dead && !pl.frozen && !pl.invulnerable() && U.overlaps(box, pl)) {
        pl.hurt(world, U.sign(pl.cx() - this.cx()) || 1, true);
      }
    }
  };

  Spine.prototype.hitbox = function () {
    var len = T * 1.4 * this.out;
    return this.dir < 0
      ? { x: this.x + 5, y: this.y + T - len, w: T - 10, h: len }
      : { x: this.x + 5, y: this.y, w: T - 10, h: len };
  };

  Spine.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var len = T * 1.4 * this.out;
    ctx.save();
    // the socket, always visible, so the tell is on the map not the clock
    ctx.globalAlpha = 0.5;
    PL.gfx.rect(ctx, x + 9, this.dir < 0 ? y + T - 5 : y, T - 18, 5, '#6b5f52');
    ctx.globalAlpha = 1;
    if (len > 1) {
      var baseY = this.dir < 0 ? y + T : y;
      ctx.fillStyle = '#efe6d0';
      ctx.beginPath();
      ctx.moveTo(x + 6, baseY);
      ctx.lineTo(x + T - 6, baseY);
      ctx.lineTo(x + T / 2, baseY + len * this.dir);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(180,150,120,0.45)';
      ctx.beginPath();
      ctx.moveTo(x + T / 2, baseY);
      ctx.lineTo(x + T - 6, baseY);
      ctx.lineTo(x + T / 2, baseY + len * this.dir);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /* The room's own heartbeat: a red throb over everything, a beat ahead of the
   * spines, so the tell is unmissable and the timing is still yours to learn. */
  function Pulse(opts) {
    E.call(this, opts);
    var cfg = opts.def.pulse;
    this.period = (cfg.period || 2.6) / ((opts.def && opts.def.diff) || 1);
    this.decor = false;       // the throb goes over the whole room
    this.cull = false;
    this.x = 0; this.y = 0;
    this.w = opts.world.w; this.h = opts.world.h;
  }
  PL.extend(Pulse, E);

  Pulse.prototype.update = function (dt) { this.t += dt; };

  Pulse.prototype.draw = function (ctx) {
    var p = (this.t % this.period) / this.period;
    var beat = p < 0.12 ? 1 - p / 0.12 : 0;
    if (beat <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.16 * beat;
    ctx.fillStyle = '#d4574e';
    ctx.fillRect(0, 0, PL.VIEW_W, PL.VIEW_H);
    ctx.restore();
  };

  // ------------------------------------------------------------- registration

  PL.Entities.define('tide', Tide);
  PL.Entities.define('boil', Boil);
  PL.Entities.define('current', Current);
  PL.Entities.define('pulse', Pulse);
  PL.Entities.define('phaseBlock', PhaseBlock);
  PL.Entities.define('veilGate', VeilGate);
  PL.Entities.define('spine', Spine);

  PL.Mechanics = {
    /* Level-def fields that spawn one world-wide system entity each. */
    SYSTEMS: ['tide', 'boil', 'current', 'pulse'],
    /* Placed markers, folded into level.js MARKERS. */
    GLYPHS: { '(': 'phaseBlock', ')': 'phaseBlock', '%': 'veilGate', ',': 'spine' }
  };

})(window.PL = window.PL || {});
