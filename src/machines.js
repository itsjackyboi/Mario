/* machines.js — three placed machine parts, added for v2.
 *
 * WHY THESE THREE AND NOT MORE OF WHAT WAS ALREADY THERE. The rebuilt second
 * levels are all cut from the same geometric idea: a roof two tiles over your
 * head caps the jump at 3.86 tiles instead of 4.84, and footing set against the
 * smaller number gives a nine-pixel window. That is a good idea and it is one
 * idea. Five levels built out of nothing else read as five copies of the same
 * level, which is exactly what the screenshots showed.
 *
 * So each of these changes a DIFFERENT term in the same equation, rather than
 * putting another spike somewhere:
 *
 *   THE BELT changes how fast you arrive. Speed is otherwise a constant 4.3
 *   pixels a frame, everywhere, always — so a belt is the only thing in the
 *   game that alters the spacing of the frames you may take off on. Running a
 *   gap off a belt that carries you forward, each frame moves you 5.4 pixels
 *   instead of 4.3, so a window nine pixels wide stops being two frames and
 *   becomes one. Against the belt it is the opposite: three pixels a frame,
 *   and the same window is three frames of fussy little adjustments.
 *
 *   THE PRESS changes when you may be somewhere. It is on a short cycle and it
 *   is the only thing here that cares what time you arrive. A row of them
 *   phased a third of a beat apart can be threaded without stopping by exactly
 *   one approach speed — the fastest one — which is how you build a stretch
 *   that only opens for a player who has not lost a frame all level.
 *
 *   THE SPRING takes the choice away. Every other jump in the game is variable:
 *   let go early and the arc is cut. A spring sets your rise for you, so the
 *   only thing left to decide is where you were standing when you touched it.
 *   One variable instead of two, and the landing has to be hit on the pixel.
 *
 * None of them is a new kind of danger. They are new kinds of ARITHMETIC.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  /* ==================================================================== BELT
   *
   *   '>' carries you along, '<' carries you back.
   *
   * A platform that never moves and carries anyway. `dx` is what Physics reads
   * to drag whatever is standing on a platform, and nothing says the platform
   * has to have gone anywhere itself — so a belt is four lines of state and a
   * drawing, and it is the only thing in the game that changes your speed.
   */
  /* MEASURED: standing still on a belt carries you 1.10 px a frame, and running
   * with one under you covers 5.40 px a frame against a bare floor's 4.30 —
   * a quarter faster, and against it 3.20, a quarter slower. Nothing else in
   * the game moves that number at all. */
  var BELT = 1.1;

  function Belt(opts) {
    E.call(this, opts);
    this.w = T; this.h = 12;
    this.x = opts.x; this.y = opts.y;
    this.dir = opts.glyph === '<' ? -1 : 1;
    this.isPlatform = true;
    this.active = true;
    this.dx = this.dir * BELT;
    this.dy = 0;
    this.roll = 0;
    this.cull = false;
  }
  PL.extend(Belt, E);

  Belt.prototype.update = function (dt) {
    this.t += dt;
    this.roll = (this.roll + this.dir * dt * 40) % 8;
  };

  Belt.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    PL.gfx.rect(ctx, x, y, this.w, this.h, C.boneDark);
    PL.gfx.rect(ctx, x, y, this.w, 2, C.bone);
    // chevrons, running the way the belt runs
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, this.w, this.h);
    ctx.clip();
    ctx.strokeStyle = C.lanternHi;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    for (var i = -1; i < 5; i++) {
      var cx = x + i * 8 + this.roll;
      ctx.beginPath();
      ctx.moveTo(cx, y + 3);
      ctx.lineTo(cx + this.dir * 4, y + 7);
      ctx.lineTo(cx, y + 11);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* =================================================================== PRESS
   *
   *   '|' — hangs from where you put it, and comes down.
   *
   * The only obstacle in these levels that cares what time it is. Rest, slam,
   * hold, lift, on a cycle short enough to be a rhythm rather than a wait.
   *
   * It is not standable and it is not a platform. Being under it when it lands
   * is the whole of it, and the warning is that it lifts before it drops.
   */
  var PRESS_CYCLE = 2.2;

  function Press(opts) {
    E.call(this, opts);
    this.w = T; this.h = T * 2;
    this.homeY = opts.y - T;             // the marker is the head's resting foot
    this.x = opts.x; this.y = this.homeY;
    this.drop = T * 3;
    this.period = PRESS_CYCLE / ((opts.def && opts.def.diff) || 1);
    /* Phased off the column it stands in, so a row of them is a rhythm rather
     * than a wall — and so the phase is a property of where the author put it
     * rather than a number to keep in step by hand. */
    this.phase = ((opts.tx * 0.37) % 1) * this.period;
    this.cull = false;
    this.decor = true;                   // the kill is done here, not by touch()
    this.at = 0;
  }
  PL.extend(Press, E);

  /** 0 up, 1 down. Quick on the way down, slow on the way back. */
  Press.prototype.phaseAt = function () {
    var p = ((this.t + this.phase) % this.period) / this.period;
    if (p < 0.44) return 0;                       // waiting
    if (p < 0.56) return (p - 0.44) / 0.12;       // the slam
    if (p < 0.70) return 1;                       // held
    if (p < 0.94) return 1 - (p - 0.70) / 0.24;   // the lift
    return 0;
  };

  Press.prototype.update = function (dt, world) {
    this.t += dt;
    this.at = this.phaseAt();
    this.y = this.homeY + this.at * this.drop;
    var p = world.player;
    if (!p || p.dead || p.frozen || p.invulnerable()) return;
    if (U.overlaps({ x: this.x + 3, y: this.y + 2, w: this.w - 6, h: this.h - 4 }, p)) {
      p.kill(world, 'crushed');
    }
  };

  Press.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    // the shaft it runs on, back up to where it rests
    var top = Math.round(this.homeY - cam.oy());
    PL.gfx.rect(ctx, x + this.w / 2 - 2, top - 40, 4, y - top + 40, C.boneDark);
    PL.gfx.rect(ctx, x, y, this.w, this.h, C.bone);
    PL.gfx.rect(ctx, x + 2, y + 2, this.w - 4, this.h - 6, C.boneDark);
    PL.gfx.rect(ctx, x, y + this.h - 5, this.w, 5, C.hazard);
    // it lifts before it drops, and that is the tell
    if (this.at > 0.02 && this.at < 0.98) {
      PL.gfx.glow(ctx, x + this.w / 2, y + this.h, 26, 'rgba(214,90,70,0.45)', 0.5);
    }
  };

  /* ================================================================== SPRING
   *
   *   '/' — stand on it and it decides how high you go.
   *
   * Every other jump in this game is yours to cut short. This one is not: it
   * sets the rise and the only thing you still choose is where you were when
   * you touched it. Under a roof that is a trap; over a gap it is the only way
   * across; and either way the landing has to be right on the pixel, because
   * there is no second variable left to fix it with.
   *
   * The launch happens in update rather than in onStand because Physics zeroes
   * vy immediately after a landing — anything set from inside the collision is
   * thrown away before the next frame reads it.
   *
   * A spring REPLACES the floor tile it is written on, exactly like a belt: its
   * top surface is the top of that tile, so you stand on it at the same height
   * you stood on the ground either side. Sitting it lower was the first draft
   * and it never fired once, because Physics resolves solid tiles before it
   * looks at platforms — the terrain underneath simply caught you first.
   */
  /* 12.5 and not a pixel more, because Player clamps vy to ±MAXFALL every
   * frame and MAXFALL is 12.5. A spring written as 14.2 launches at 12.5
   * anyway; the extra was a number that never left the file. What actually
   * buys the height is the lighter gravity the rise falls under — see
   * LAUNCH_G in player.js — and that is measured here rather than predicted:
   *
   *      peak rise            4.79 tiles   (an ordinary jump: 3.10, pouch 5.34)
   *      reach, landing flat  6.32 tiles   (an ordinary jump: 4.84, pouch 9.27)
   *      landing 1 up         5.78
   *      landing 2 up         5.51
   *      landing 3 up         4.97
   *      landing 4 up         4.43         (an ordinary jump cannot land here)
   *
   * Three tiers of height now exist and they do not overlap: your own legs,
   * a spring, a pouch. A spring is the only one of them that is a place. */
  var SPRING_V = 12.5;

  function Spring(opts) {
    E.call(this, opts);
    this.w = T; this.h = 10;
    this.x = opts.x; this.y = opts.y;
    this.isPlatform = true;
    this.active = true;
    this.dx = 0; this.dy = 0;
    this.squash = 0;
    this.cull = false;
  }
  PL.extend(Spring, E);

  Spring.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.squash > 0) this.squash -= dt * 4;
    var p = world.player;
    if (!p || p.dead || p.frozen) return;
    if (p.riding === this && p.grounded) {
      p.vy = -SPRING_V * (p.gsign || 1);
      p.grounded = false;
      p.riding = null;
      /* No jump on top of the launch, and no cutting it short: the spring owns
       * the whole arc. Coyote time is cleared because a frame of it left over
       * would let a player add a full jump to a spring and land two tiles past
       * anything measured. */
      p.coyote = 0;
      p.buffer = 0;
      p.launch = 1;
      this.squash = 1;
      world.fx.burst(this.cx(), this.y, C.teal, 8, { speed: 2.2, life: 0.4, size: 2 });
      PL.Audio.sfx('seed');
    }
  };

  Spring.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var k = Math.max(0, this.squash);
    var h = this.h - k * 4;
    PL.gfx.rect(ctx, x + 1, y + (this.h - h), this.w - 2, h, C.teal);
    PL.gfx.rect(ctx, x + 1, y + (this.h - h), this.w - 2, 2, C.seaFoam);
    // the coil under it
    ctx.strokeStyle = C.boneDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var yy = y + this.h + 2 + i * 3 - k * 3;
      ctx.moveTo(x + 3, yy);
      ctx.lineTo(x + this.w - 3, yy + 2);
    }
    ctx.stroke();
  };

  // ------------------------------------------------------------- registration

  PL.Entities.define('belt', Belt);
  PL.Entities.define('press', Press);
  PL.Entities.define('spring', Spring);

  /* Folded into level.js's marker table alongside the mechanics ones. Kept
   * separate from PL.Mechanics.GLYPHS because those are the six area
   * mechanics and these are parts, not rules. */
  PL.Machines = {
    GLYPHS: { '>': 'belt', '<': 'belt', '|': 'press', '/': 'spring' },
    BELT: BELT, SPRING_V: SPRING_V, PRESS_CYCLE: PRESS_CYCLE
  };

})(window.PL = window.PL || {});
