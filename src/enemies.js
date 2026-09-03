/* enemies.js — Shanty Town's unfriendly locals.
 *
 * Every enemy exposes: harmful (bool), stompable (bool), and stomp(player).
 * The player handles the collision resolution, so adding an enemy for a future
 * town means writing update/draw and registering the type — nothing else.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity;

  function Enemy(opts) {
    E.call(this, opts);
    this.harmful = true;
    this.stompable = true;
    this.dying = 0;
  }
  PL.extend(Enemy, E);

  Enemy.prototype.stomp = function (player, world) {
    this.harmful = false;
    this.stompable = false;
    this.dying = 0.45;
    world.fx.burst(this.cx(), this.y + this.h - 4, C.woodPale, 10, { speed: 2.4, life: 0.5 });
    PL.Audio.sfx('stomp');
    player.addGrog(1);
    world.fx.label(this.cx(), this.y - 4, '+1', C.grogBand);
  };

  Enemy.prototype.tickDeath = function (dt) {
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.remove = true;
      return true;
    }
    return false;
  };

  // ------------------------------------------------------- rival crew patroller

  function Patroller(opts) {
    Enemy.call(this, opts);
    this.w = 22; this.h = 28;
    this.x = opts.x + 5;
    this.y = opts.y + T - this.h;
    this.speed = 0.85;
    this.facing = (opts.tx % 2 === 0) ? -1 : 1;
    this.vy = 0;
    this.bob = 0;
  }
  PL.extend(Patroller, Enemy);

  Patroller.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;

    this.vy = Math.min(this.vy + 0.55, 12);
    this.grounded = false;
    PL.Physics.moveY(this, world, this.vy);
    if (this.grounded) this.vy = 0;

    if (this.grounded) {
      // Turn at a wall or at the lip of a platform — they're drunk, not suicidal.
      var aheadX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
      var floor = PL.Physics.groundUnder(world, aheadX, this.y + this.h + 4);
      if (!floor) this.facing *= -1;
      if (PL.Physics.moveX(this, world, this.speed * this.facing)) this.facing *= -1;
      this.bob = Math.sin(this.t * 9) * 1.4;
    } else {
      PL.Physics.moveX(this, world, this.speed * this.facing * 0.6);
    }

    if (PL.Physics.lethalOverlap(world, this)) {
      this.remove = true;
      world.fx.splash(this.cx(), this.y + this.h);
    }
    if (this.y > world.h + 80) this.remove = true;
  };

  Patroller.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    ctx.save();
    if (this.dying > 0) {
      ctx.translate(x + this.w / 2, y + this.h);
      ctx.scale(1.15, Math.max(0.1, this.dying / 0.45));
      ctx.translate(-this.w / 2, -this.h);
      x = 0; y = 0;
    }
    var b = this.dying > 0 ? 0 : this.bob;
    var f = this.facing;

    // legs / boots
    PL.gfx.rect(ctx, x + 4, y + 21 + b * 0.3, 6, 7, '#3b2a1c');
    PL.gfx.rect(ctx, x + 12, y + 21 - b * 0.3, 6, 7, '#3b2a1c');
    // salt-stained coat
    PL.gfx.rect(ctx, x + 2, y + 9 + b * 0.2, 18, 13, '#5c4a63');
    PL.gfx.rect(ctx, x + 2, y + 9 + b * 0.2, 18, 3, '#7a6480');
    ctx.fillStyle = C.rope;
    ctx.fillRect(x + 2, y + 16 + b * 0.2, 18, 2);
    // head + bandana
    PL.gfx.rect(ctx, x + 5, y + 2 + b * 0.2, 12, 9, '#c08e63');
    PL.gfx.rect(ctx, x + 4, y + 1 + b * 0.2, 14, 4, C.coralDark);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + (f > 0 ? 12 : 6), y + 6 + b * 0.2, 2, 2);
    // cutlass
    ctx.strokeStyle = '#cfd8dd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var hx = x + (f > 0 ? 19 : 3);
    ctx.moveTo(hx, y + 14 + b * 0.2);
    ctx.lineTo(hx + f * 7, y + 6 + b * 0.2);
    ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------- coral-eyed sea-wretch

  /* Rises out of the surf on a fixed cycle. Stompable at the top of its arc,
   * harmful whenever any part of it is above the waterline. */
  function Wretch(opts) {
    Enemy.call(this, opts);
    this.w = 24; this.h = 30;
    this.x = opts.x + 4;
    // The marker glyph sits on the air tile above the surf, so the waterline
    // is one tile further down.
    this.waterY = opts.y + T;
    this.hideY = this.waterY + 30;
    this.upY = this.waterY - 26;
    this.y = this.hideY;
    this.period = 3.1;
    this.phase = (opts.tx * 0.37) % 1;    // stagger neighbours
    this.risen = 0;
  }
  PL.extend(Wretch, Enemy);

  Wretch.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;
    var p = ((this.t / this.period) + this.phase) % 1;
    // 0.00-0.10 rise, 0.10-0.45 up, 0.45-0.55 sink, rest hidden
    var r;
    if (p < 0.10) r = p / 0.10;
    else if (p < 0.45) r = 1;
    else if (p < 0.55) r = 1 - (p - 0.45) / 0.10;
    else r = 0;
    r = r * r * (3 - 2 * r); // smoothstep
    this.risen = r;
    var prevY = this.y;
    this.y = this.hideY + (this.upY - this.hideY) * r;
    this.harmful = r > 0.25;
    this.stompable = r > 0.45;
    if (prevY > this.y && r > 0.05 && r < 0.35 && Math.random() < 0.25) {
      world.fx.burst(this.cx(), this.waterY + 4, C.seaFoam, 2, { speed: 1.2, life: 0.4, size: 2 });
    }
  };

  Wretch.prototype.stomp = function (player, world) {
    Enemy.prototype.stomp.call(this, player, world);
    world.fx.splash(this.cx(), this.waterY + 4);
  };

  Wretch.prototype.draw = function (ctx, cam) {
    if (this.risen <= 0.02 && this.dying <= 0) return;
    var x = Math.round(this.x - cam.ox());
    var y = Math.round(this.y - cam.oy());
    var waterScreenY = Math.round(this.waterY - cam.oy());
    ctx.save();
    // clip at the waterline so it really emerges from the surf
    ctx.beginPath();
    ctx.rect(x - 12, -80, this.w + 24, Math.max(0, waterScreenY + 10 + 80));
    ctx.clip();

    if (this.dying > 0) {
      ctx.globalAlpha = Math.max(0, this.dying / 0.45);
    }
    // hunched drowned body
    PL.gfx.rect(ctx, x + 2, y + 10, 20, 20, '#4c6d63');
    PL.gfx.rect(ctx, x + 2, y + 10, 20, 4, '#628a7d');
    // kelp hair
    ctx.strokeStyle = '#3d5c4c';
    ctx.lineWidth = 2;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 4 + i * 5, y + 6);
      ctx.lineTo(x + 3 + i * 5 + Math.sin(this.t * 3 + i) * 2, y + 15);
      ctx.stroke();
    }
    // head
    PL.gfx.rect(ctx, x + 5, y + 1, 14, 11, '#7fa094');
    // coral eyes, lit
    PL.gfx.glow(ctx, x + 9, y + 6, 8, 'rgba(212,87,78,0.85)', 0.6);
    PL.gfx.glow(ctx, x + 15, y + 6, 8, 'rgba(212,87,78,0.85)', 0.6);
    PL.gfx.rect(ctx, x + 8, y + 5, 3, 3, C.coral);
    PL.gfx.rect(ctx, x + 14, y + 5, 3, 3, C.coral);
    // barnacle crust
    ctx.fillStyle = C.seaFoam;
    ctx.globalAlpha *= 0.6;
    ctx.fillRect(x + 4, y + 18, 3, 2);
    ctx.fillRect(x + 16, y + 23, 3, 2);
    ctx.restore();

    // foam collar where it breaks the surface
    if (this.risen > 0.05 && this.dying <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.5 * Math.min(1, this.risen * 2);
      PL.gfx.rect(ctx, x - 2, waterScreenY - 1, this.w + 4, 3, C.seaFoam);
      ctx.restore();
    }
  };

  PL.Entities.define('patroller', Patroller);
  PL.Entities.define('wretch', Wretch);
  PL.Enemy = Enemy;

})(window.PL = window.PL || {});
