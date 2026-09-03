/* player.js — the unproven pirate.
 *
 * Movement is classic momentum platforming: acceleration + friction, variable
 * jump height on button release, coyote time and a jump buffer, and one-way
 * platforms you can drop through with Down + Jump.
 *
 * DAMAGE MODEL (documented choice):
 *   - Enemy or spike contact with grog in the purse: you keep your life, a few
 *     Grog Barrels bounce loose (re-collectable for a few seconds), and you get
 *     ~1.5s of invincibility.
 *   - The same contact with an empty purse is fatal.
 *   - Water and falling out of the level are always fatal, powerup or not —
 *     otherwise the Hollow Urn would let you sit in the sea forever.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, U = PL.util, E = PL.Entity;

  var GRAV = 0.62, MAXFALL = 12.5;
  var ACCEL_G = 0.78, ACCEL_A = 0.5;
  var FRICTION = 0.80;
  var MAXRUN = 4.3;
  var JUMP_V = -11.4;
  var JUMP_CUT = 0.42;
  var COYOTE = 0.11;
  var BUFFER = 0.13;

  var URN_TIME = 9.0;
  var TONIC_TIME = 9.0;

  function Player(opts) {
    E.call(this, opts || {});
    this.w = 20; this.h = 28;
    this.spawnX = this.x; this.spawnY = this.y;
    this.checkpoint = null;

    this.grog = 0;
    this.shards = [];
    this.pouch = 0;         // Wolendi Wind Pouches held (extra mid-air jump)
    this.seeds = 0;         // Veilwalker Seeds held
    this.deaths = 0;

    this.urn = 0;           // Hollow Urn timer
    this.tonic = 0;         // ClockHeart Tonic timer
    this.iframes = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.frozen = false;    // set during trials / level-complete

    this.coyote = 0;
    this.buffer = 0;
    this.airJumpsLeft = 0;
    this.jumpHeld = false;
    this.runPhase = 0;
    this.facing = 1;
    this.landSquash = 0;
    this.cull = false;
  }
  PL.extend(Player, E);

  // --------------------------------------------------------------- modifiers

  Player.prototype.speedMul = function () {
    var m = 1;
    if (this.urn > 0) m *= 0.60;     // soullessness: unkillable but withered
    if (this.tonic > 0) m *= 1.45;   // clockheart: day order, night revelry
    return m;
  };

  Player.prototype.jumpMul = function () {
    var m = 1;
    if (this.urn > 0) m *= 0.88;
    if (this.tonic > 0) m *= 1.05;
    return m;
  };

  Player.prototype.invulnerable = function () {
    return this.iframes > 0 || this.urn > 0;
  };

  // ----------------------------------------------------------------- updates

  Player.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.urn > 0) this.urn = Math.max(0, this.urn - dt);
    if (this.tonic > 0) this.tonic = Math.max(0, this.tonic - dt);
    if (this.iframes > 0) this.iframes -= dt;
    if (this.landSquash > 0) this.landSquash -= dt;
    if (this.dropThrough > 0) this.dropThrough--;

    if (this.dead) {
      this.deathTimer -= dt;
      this.vy = Math.min(this.vy + GRAV * 0.7, MAXFALL);
      this.y += this.vy;
      return;
    }

    if (this.frozen) {
      this.vx = 0;
      this.vy = Math.min(this.vy + GRAV, MAXFALL);
      this.grounded = false;
      PL.Physics.moveY(this, world, this.vy);
      if (this.grounded) this.vy = 0;
      return;
    }

    var In = PL.Input;
    var dir = (In.down('right') ? 1 : 0) - (In.down('left') ? 1 : 0);
    var sm = this.speedMul();
    var maxRun = MAXRUN * sm;
    var accel = (this.grounded ? ACCEL_G : ACCEL_A) * (this.tonic > 0 ? 1.25 : 1);

    if (dir !== 0) {
      this.facing = dir;
      // Turning around bites harder than accelerating — gives it weight.
      var a = (U.sign(this.vx) !== 0 && U.sign(this.vx) !== dir) ? accel * 1.9 : accel;
      this.vx = U.approach(this.vx, maxRun * dir, a);
    } else if (this.grounded) {
      this.vx *= FRICTION;
      if (Math.abs(this.vx) < 0.08) this.vx = 0;
    } else {
      this.vx *= 0.985;
    }

    // --- jumping ------------------------------------------------------------
    if (In.pressed('jump')) this.buffer = BUFFER;
    if (this.buffer > 0) this.buffer -= dt;
    if (this.coyote > 0) this.coyote -= dt;

    if (this.buffer > 0) {
      if (this.grounded || this.coyote > 0) {
        this.doJump(world, JUMP_V * this.jumpMul(), false);
      } else if (this.airJumpsLeft > 0) {
        this.airJumpsLeft--;
        this.doJump(world, JUMP_V * 0.92 * this.jumpMul(), true);
      } else if (this.pouch > 0) {
        this.pouch--;
        this.doJump(world, JUMP_V * 0.94 * this.jumpMul(), true);
        world.fx.label(this.cx(), this.y - 6, 'WOLENDI GUST', C.seaFoam);
      }
    }

    // Variable jump height: let go early and the arc is cut short.
    if (!In.down('jump') && this.vy < 0) this.vy *= (1 - (1 - JUMP_CUT) * 0.55);

    // Drop through a one-way plank.
    if (In.down('down') && In.pressed('jump') && this.grounded) {
      var below = Math.floor((this.y + this.h + 2) / T);
      var lx = Math.floor((this.x + 2) / T), rx = Math.floor((this.x + this.w - 2) / T);
      if ((world.oneWayAt(lx, below) || world.oneWayAt(rx, below)) &&
          !world.solidAt(lx, below) && !world.solidAt(rx, below)) {
        this.dropThrough = 10;
        this.y += 3;
        this.grounded = false;
      } else if (this.riding) {
        this.dropThrough = 10;
        this.y += 3;
        this.grounded = false;
      }
    }

    // --- item use -----------------------------------------------------------
    if (In.pressed('item')) this.useSeed(world);

    // --- integrate ----------------------------------------------------------
    this.vy = Math.min(this.vy + GRAV, MAXFALL);

    var ride = this.riding;
    this.riding = null;
    var wasGrounded = this.grounded;
    this.grounded = false;

    if (ride && ride.active && wasGrounded) {
      // Carried along by the platform we were standing on.
      if (ride.dx) PL.Physics.moveX(this, world, ride.dx);
      if (ride.dy) this.y += ride.dy;
    }

    PL.Physics.moveX(this, world, this.vx);
    var hitY = PL.Physics.moveY(this, world, this.vy);
    if (hitY) {
      if (this.vy > 0) {
        if (!wasGrounded && this.vy > 6) {
          this.landSquash = 0.12;
          world.fx.burst(this.cx(), this.y + this.h, 'rgba(216,198,156,0.5)', 4,
                         { speed: 1.2, life: 0.3, size: 2, grav: 0.1 });
        }
        this.vy = 0;
      } else {
        this.vy = 0;
      }
    }

    if (this.grounded) {
      this.coyote = COYOTE;
      this.airJumpsLeft = 0;
      this.runPhase += Math.abs(this.vx) * 0.12;
    } else if (wasGrounded && this.vy > 0) {
      // just walked off a ledge — coyote already primed above
    }

    // --- hazards ------------------------------------------------------------
    var lethal = PL.Physics.lethalOverlap(world, {
      x: this.x + 3, y: this.y + 3, w: this.w - 6, h: this.h - 4
    });
    if (lethal === PL.Tiles.WATER) {
      this.kill(world, 'water');
    } else if (lethal === PL.Tiles.SPIKE && !this.invulnerable()) {
      this.hurt(world, this.facing * -1, true);
    }
    if (this.y > world.h + 40) this.kill(world, 'pit');
  };

  Player.prototype.doJump = function (world, v, isAir) {
    this.vy = v;
    this.buffer = 0;
    this.coyote = 0;
    this.grounded = false;
    this.riding = null;
    if (isAir) {
      PL.Audio.sfx('doubleJump');
      world.fx.burst(this.cx(), this.y + this.h, C.seaFoam, 10,
                     { speed: 2.2, life: 0.45, size: 2, grav: 0.05, angle: Math.PI / 2, spread: 2.4 });
      world.fx.ring(this.cx(), this.y + this.h, 'rgba(207,230,228,0.7)', 26);
    } else {
      PL.Audio.sfx('jump');
    }
  };

  // ------------------------------------------------------------------- items

  Player.prototype.addGrog = function (n) { this.grog += n; };

  Player.prototype.giveUrn = function () { this.urn = URN_TIME; };
  Player.prototype.giveTonic = function () { this.tonic = TONIC_TIME; };
  Player.prototype.givePouch = function () { this.pouch++; };
  Player.prototype.giveSeed = function () { this.seeds++; };

  Player.prototype.collectShard = function (id) {
    if (this.shards.indexOf(id) === -1) this.shards.push(id);
  };

  /** Veilwalker Seed: grow a short-lived shelf of packed earth ahead of you. */
  Player.prototype.useSeed = function (world) {
    if (this.seeds <= 0) return;
    this.seeds--;
    var px = this.cx() + this.facing * 46 - 29;
    var py = this.y + this.h + 16;
    px = U.clamp(px, 0, world.w - 58);
    var plat = PL.Entities.create('seedPlatform', { x: px, y: py, tx: 0, ty: 0 });
    world.add(plat);
    world.fx.burst(px + 29, py, '#9ec27a', 12, { speed: 2.2, life: 0.6 });
    PL.Audio.sfx('seed');
  };

  Player.prototype.setCheckpoint = function (x, y) {
    this.checkpoint = { x: x, y: y };
  };

  // ------------------------------------------------------------------ damage

  /** Take a hit: shed grog and get a moment of mercy, or die if broke. */
  Player.prototype.hurt = function (world, knockDir, fromHazard) {
    if (this.dead || this.invulnerable()) return;
    if (this.grog <= 0) { this.kill(world, 'hit'); return; }

    var drop = Math.min(6, this.grog);
    this.grog -= drop;
    for (var i = 0; i < drop; i++) {
      var ang = -Math.PI / 2 + (i - (drop - 1) / 2) * 0.42;
      world.add(PL.Entities.create('looseGrog', {
        x: this.cx() - 7, y: this.y + 6,
        vx: Math.cos(ang) * 3.1, vy: Math.sin(ang) * 5.4 - 1.5,
        tx: 0, ty: 0
      }));
    }
    this.iframes = 1.5;
    this.vx = (knockDir || -this.facing) * 3.4;
    this.vy = -5.2;
    this.grounded = false;
    world.camera.kick(fromHazard ? 6 : 4);
    world.fx.label(this.cx(), this.y - 6, '-' + drop + ' GROG', C.coral);
    PL.Audio.sfx('hurt');
  };

  Player.prototype.kill = function (world, cause) {
    if (this.dead) return;
    this.dead = true;
    this.deaths++;
    this.deathTimer = 1.15;
    this.vy = -7.5;
    this.vx = 0;
    world.camera.kick(7);
    if (cause === 'water') {
      world.fx.splash(this.cx(), this.y + this.h);
      PL.Audio.sfx('splash');
    } else {
      PL.Audio.sfx('die');
    }
    if (world.onDeath) world.onDeath(cause);
  };

  Player.prototype.respawn = function (world) {
    var p = this.checkpoint || { x: this.spawnX, y: this.spawnY };
    this.x = p.x; this.y = p.y;
    this.vx = this.vy = 0;
    this.dead = false;
    this.frozen = false;
    this.iframes = 1.2;
    this.urn = 0;
    this.tonic = 0;
    this.airJumpsLeft = 0;
    this.dropThrough = 0;
  };

  // ------------------------------------------------------------------- render

  Player.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox());
    var y = Math.round(this.y - cam.oy());

    // Blink through invincibility frames (but never while the Urn is active —
    // there the pale tint is the signal).
    if (this.iframes > 0 && this.urn <= 0 && Math.floor(this.iframes * 18) % 2 === 0) return;

    var f = this.facing;
    var moving = Math.abs(this.vx) > 0.4 && this.grounded;
    var step = moving ? Math.sin(this.runPhase) : 0;
    var airborne = !this.grounded && !this.dead;

    ctx.save();

    // squash on landing, stretch while rising
    var sy = 1, sx = 1;
    if (this.landSquash > 0) { sy = 0.86; sx = 1.12; }
    else if (airborne) { sy = this.vy < -2 ? 1.08 : (this.vy > 6 ? 1.05 : 1); sx = 2 - sy; }
    ctx.translate(x + this.w / 2, y + this.h);
    ctx.scale(sx, sy);
    if (this.dead) ctx.rotate(Math.sin(this.t * 12) * 0.25);
    ctx.translate(-this.w / 2, -this.h);

    // Powerups recolour the sprite itself rather than compositing a rectangle
    // over the frame — the silhouette has to stay readable either way.
    var tintTo = null, tintAmt = 0;
    if (this.urn > 0) {
      tintTo = C.pale;
      tintAmt = 0.62;
      ctx.globalAlpha = 0.78;
    } else if (this.tonic > 0) {
      var pulse = (Math.sin(this.t * 6) + 1) / 2;
      tintTo = pulse > 0.5 ? C.teal : C.lantern;
      tintAmt = 0.16 + Math.abs(pulse - 0.5) * 0.34;
    }
    function tint(hex) { return tintTo ? U.mix(hex, tintTo, tintAmt) : hex; }

    var boot = tint('#3a2a1e'), skin = tint('#d9a173'), shirt = tint('#e6d9b8');
    var coat = tint('#7a4a3c'), sash = tint(C.coral);

    // legs
    var legA = airborne ? -3 : step * 4;
    var legB = airborne ? 3 : -step * 4;
    PL.gfx.rect(ctx, 3 + legA * 0.4, 20, 6, 8, boot);
    PL.gfx.rect(ctx, 11 - legB * 0.4, 20, 6, 8, boot);
    PL.gfx.rect(ctx, 3 + legA * 0.4, 26, 7, 2, tint('#241a14'));
    PL.gfx.rect(ctx, 11 - legB * 0.4, 26, 7, 2, tint('#241a14'));

    // ragged shirt + open coat: no crew colours, nothing earned yet
    PL.gfx.rect(ctx, 4, 10, 12, 11, shirt);
    PL.gfx.rect(ctx, f > 0 ? 2 : 14, 10, 4, 12, coat);
    PL.gfx.rect(ctx, 4, 17, 12, 3, sash);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(4, 14, 12, 1);

    // arm
    var armY = airborne ? 9 : 13 + step * 2;
    PL.gfx.rect(ctx, f > 0 ? 14 : 3, armY, 4, 7, shirt);

    // head, stubble, and a tricorn a size too big
    PL.gfx.rect(ctx, 5, 2, 11, 9, skin);
    ctx.fillStyle = tint('#b07f55');
    ctx.fillRect(5, 8, 11, 2);
    ctx.fillStyle = C.ink;
    ctx.fillRect(f > 0 ? 12 : 6, 5, 2, 2);
    ctx.fillStyle = tint('#40312a');
    ctx.beginPath();
    ctx.moveTo(1, 3); ctx.lineTo(19, 3); ctx.lineTo(15, -1); ctx.lineTo(5, -1);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, 3, 2, 14, 2, tint('#5a4436'));

    ctx.globalAlpha = 1;
    ctx.restore();

    // trailing wisps / speed lines drawn outside the squash transform
    if (this.urn > 0) {
      for (var i = 0; i < 3; i++) {
        var wy = y + 6 + ((this.t * 26 + i * 11) % 26);
        ctx.fillStyle = 'rgba(198,211,216,' + (0.35 - i * 0.08) + ')';
        ctx.fillRect(x + 3 + Math.sin(this.t * 4 + i * 2) * 8, wy, 3, 3);
      }
    }
    if (this.tonic > 0 && Math.abs(this.vx) > 2) {
      ctx.fillStyle = 'rgba(79,184,165,0.35)';
      for (var s = 1; s <= 3; s++) {
        ctx.fillRect(x - this.facing * s * 7, y + 8 + s * 3, 6, 2);
      }
    }
  };

  PL.Player = Player;

})(window.PL = window.PL || {});
