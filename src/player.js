/* player.js — the unproven pirate.
 *
 * Movement is momentum platforming with one deliberate exception: on the
 * ground, releasing the direction keys stops Corb dead. Acceleration, variable
 * jump height, coyote time, a jump buffer and drop-through platforms all
 * behave normally. Air momentum is untouched — killing that too would make
 * every jump uncontrollable.
 *
 * DAMAGE MODEL (documented choice):
 *   - Enemy or spike contact with grog in the purse: you keep your life, a few
 *     Grog Barrels bounce loose (re-collectable for a few seconds), and you get
 *     ~1.5s of invincibility.
 *   - The same contact with an empty purse is fatal.
 *   - Water and falling out of the level are fatal too.
 *   - EXCEPT while you are carrying a Hollow Urn: any death at all breaks the
 *     urn instead, sets you back down on the last safe ground you stood on and
 *     gives you a long mercy window. It is a spare life, not a state.
 *
 * GROG IS THE LIFE POOL. A death you actually take costs DEATH_COST barrels
 * out of the purse. Dying with an empty purse is a GAME OVER — the level (or,
 * in a Drunken Speedrun, the whole run) is finished, not merely restarted from
 * the flag. So grog stopped being only a score the moment it became the thing
 * standing between you and the end of a run: never walk past a barrel.
 *
 * GRAVITY: `gsign` is +1 normally and -1 after a Fenwick veil gate. It scales
 * gravity, the jump impulse and the sprite; Physics.moveY reads `invert` to
 * ground an upside-down body on ceilings. Nothing else in the engine cares.
 *
 * BUFFS: timed effects live in `this.buffs` as name -> seconds remaining, set
 * by `buff(name, secs)` and read by `has(name)`. Every town item is one of
 * these; see items-town.js. Carried single-use items queue in `this.items` and
 * are spent front-first with the ITEM key.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, U = PL.util, E = PL.Entity;

  var GRAV = 0.62, MAXFALL = 12.5;
  var ACCEL_G = 0.78, ACCEL_A = 0.5;
  var MAXRUN = 4.3;
  var JUMP_V = -11.4;
  var JUMP_CUT = 0.42;
  var COYOTE = 0.11;
  var BUFFER = 0.13;

  var TONIC_TIME = 9.0;

  /* Barrels a death costs you. Four deaths on a full-ish purse, which is enough
   * rope to learn a level and not enough to ignore one. */
  var DEATH_COST = 5;
  PL.DEATH_COST = DEATH_COST;

  function Player(opts) {
    E.call(this, opts || {});
    this.w = 20; this.h = 28;
    this.spawnX = this.x; this.spawnY = this.y;
    this.checkpoint = null;

    this.grog = 0;          // the purse: also the life pool (see DEATH_COST)
    this.grogEarned = 0;    // everything picked up, before deaths took any
    this.shards = [];
    this.pouch = 0;         // Wolendi Wind Pouches held (extra mid-air jump)
    this.items = [];        // carried single-use items, spent front-first
    this.bandana = null;    // Owe Block: 'red' | 'blue' — who lets you pass
    this.deaths = 0;

    this.gsign = 1;         // +1 down, -1 after a veil gate (Fenwick)
    this.urn = 0;           // Hollow Urns carried — each one is a spare life
    this.urnFlash = 0;      // the moment one breaks
    this.tonic = 0;         // ClockHeart Tonic timer
    this.buffs = {};        // name -> seconds remaining
    this.safe = null;       // last patch of ground worth putting you back on
    this.safeT = 0;
    this.iframes = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.deathToll = 0;     // barrels the last death cost, for the HUD
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

  // ------------------------------------------------------------------- buffs

  Player.prototype.buff = function (name, secs) {
    this.buffs[name] = Math.max(this.buffs[name] || 0, secs);
  };

  Player.prototype.has = function (name) { return (this.buffs[name] || 0) > 0; };

  Player.prototype.buffLeft = function (name) { return this.buffs[name] || 0; };

  Player.prototype.clearBuffs = function () { this.buffs = {}; };

  // --------------------------------------------------------------- modifiers

  Player.prototype.speedMul = function () {
    var m = 1;
    if (this.tonic > 0) m *= 1.45;      // clockheart: day order, night revelry
    if (this.has('marrow')) m *= 1.22;  // leviathan marrow
    return m;
  };

  Player.prototype.jumpMul = function () {
    var m = 1;
    if (this.tonic > 0) m *= 1.05;
    if (this.has('lagerhorn')) m *= 1.30;
    return m;
  };

  Player.prototype.gravMul = function () {
    return this.has('spiritweed') ? 0.60 : 1;
  };

  Player.prototype.invulnerable = function () {
    return this.iframes > 0 || this.has('pour');
  };

  // ----------------------------------------------------------------- updates

  Player.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tonic > 0) this.tonic = Math.max(0, this.tonic - dt);
    if (this.urnFlash > 0) this.urnFlash -= dt;
    for (var bk in this.buffs) {
      this.buffs[bk] -= dt;
      if (this.buffs[bk] <= 0) delete this.buffs[bk];
    }
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
      // Hands off the keys means stop, on the spot. The old friction slide
      // carried you off ledges after you had already let go, which read as the
      // game killing you rather than you missing.
      this.vx = 0;
    } else {
      this.vx *= 0.985;
    }

    // --- jumping ------------------------------------------------------------
    if (In.pressed('jump')) this.buffer = BUFFER;
    if (this.buffer > 0) this.buffer -= dt;
    if (this.coyote > 0) this.coyote -= dt;

    if (this.buffer > 0) {
      var g = this.gsign;
      if (this.grounded || this.coyote > 0) {
        this.doJump(world, JUMP_V * this.jumpMul() * g, false);
      } else if (this.airJumpsLeft > 0) {
        this.airJumpsLeft--;
        this.doJump(world, JUMP_V * 0.92 * this.jumpMul() * g, true);
      } else if (this.pouch > 0) {
        this.pouch--;
        this.doJump(world, JUMP_V * 0.94 * this.jumpMul() * g, true);
        world.fx.label(this.cx(), this.y - 6, 'WOLENDI GUST', C.seaFoam);
      }
    }

    // Variable jump height: let go early and the arc is cut short.
    if (!In.down('jump') && this.vy * this.gsign < 0) {
      this.vy *= (1 - (1 - JUMP_CUT) * 0.55);
    }

    // Drop through a one-way plank. Planks only hold from above, so there is
    // nothing to drop through while you are upside down.
    if (In.down('down') && In.pressed('jump') && this.grounded && this.gsign > 0) {
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
    if (In.pressed('item')) this.useItem(world);

    // --- integrate ----------------------------------------------------------
    this.vy += GRAV * this.gravMul() * this.gsign;
    this.vy = U.clamp(this.vy, -MAXFALL, MAXFALL);
    // Albatross Ballast: hold JUMP on the way down and you barely fall at all.
    if (this.has('glide') && this.vy * this.gsign > 2.2 && In.down('jump')) {
      this.vy = 2.2 * this.gsign;
    }
    this.invert = this.gsign < 0;

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
      if (this.vy * this.gsign > 0) {
        if (!wasGrounded && this.vy * this.gsign > 6) {
          this.landSquash = 0.12;
          world.fx.burst(this.cx(), this.gsign > 0 ? this.y + this.h : this.y,
                         'rgba(216,198,156,0.5)', 4,
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
      // Remember somewhere solid to put you back down if an urn breaks.
      this.safeT -= dt;
      if (this.safeT <= 0) {
        this.safeT = 0.25;
        if (this.gsign > 0 && !PL.Physics.lethalOverlap(world, this)) {
          this.safe = { x: this.x, y: this.y };
        }
      }
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
    if (this.y > world.h + 40 || this.y < -120) this.kill(world, 'pit');
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

  /** Leviathan Marrow makes every barrel count twice. */
  Player.prototype.addGrog = function (n) {
    var got = this.has('marrow') ? n * 2 : n;
    this.grog += got;
    this.grogEarned += got;
  };

  Player.prototype.giveUrn = function () { this.urn++; };
  Player.prototype.giveTonic = function () { this.tonic = TONIC_TIME; };
  Player.prototype.givePouch = function () { this.pouch++; };

  /** Queue a carried single-use item. `kind` is dispatched by useItem(). */
  Player.prototype.giveItem = function (kind) {
    if (this.items.length < 9) this.items.push(kind);
  };
  Player.prototype.giveSeed = function () { this.giveItem('seed'); };

  Player.prototype.collectShard = function (id) {
    if (this.shards.indexOf(id) === -1) this.shards.push(id);
  };

  /** Spend the front carried item. One button for all of them. */
  Player.prototype.useItem = function (world) {
    if (!this.items.length) return;
    var kind = this.items[0];
    var used = true;

    if (kind === 'seed') {
      // Veilwalker Seed: a short-lived shelf of packed earth ahead of you.
      var px = U.clamp(this.cx() + this.facing * 46 - 29, 0, world.w - 58);
      var py = this.y + this.h + 16;
      world.add(PL.Entities.create('seedPlatform', { x: px, y: py, tx: 0, ty: 0 }));
      world.fx.burst(px + 29, py, '#9ec27a', 12, { speed: 2.2, life: 0.6 });
      PL.Audio.sfx('seed');

    } else if (kind === 'dash') {
      // Bellows-Breath: one hard shove of bought Wolendi wind.
      this.vx = this.facing * 11.5;
      this.vy = Math.min(this.vy, -1.2);
      this.buff('dashing', 0.42);
      world.fx.burst(this.cx(), this.cy(), '#f6cf82', 16,
                     { speed: 3.2, life: 0.5, angle: this.facing > 0 ? Math.PI : 0, spread: 1.2 });
      world.camera.kick(4);
      PL.Audio.sfx('gust');

    } else if (kind === 'colours') {
      // Windsunk Colours: fly your own flag and the sea respects it.
      this.setCheckpoint(this.x, this.y);
      world.fx.ring(this.cx(), this.cy(), PL.C.coral, 60);
      world.fx.label(this.cx(), this.y - 8, 'COLOURS PLANTED', PL.C.lanternHi);
      PL.Audio.sfx('flag');

    } else if (kind === 'spareUrn') {
      // Sackbeard's Own Cup: drink it and there is one more life in you.
      this.giveUrn();
      world.fx.ring(this.cx(), this.cy(), '#ffd77a', 64);
      world.fx.label(this.cx(), this.y - 8, 'ONE MORE IN YOU', '#ffd77a');
      PL.Audio.sfx('urn');

    } else {
      used = false;
    }

    if (used) this.items.shift();
  };

  Player.prototype.setCheckpoint = function (x, y) {
    this.checkpoint = { x: x, y: y };
  };

  // ------------------------------------------------------------------ damage

  /** Take a hit: shed grog and get a moment of mercy, or die if broke. */
  Player.prototype.hurt = function (world, knockDir, fromHazard) {
    if (this.dead || this.invulnerable()) return;

    // Glyph of Purity: nothing leaves your purse, and an empty purse is not
    // a death sentence while it holds.
    if (this.has('purity')) {
      this.iframes = 1.2;
      this.vx = (knockDir || -this.facing) * 2.6;
      this.vy = -4.4;
      this.grounded = false;
      world.fx.ring(this.cx(), this.cy(), '#e8ecf3', 40);
      world.fx.label(this.cx(), this.y - 6, 'UNTOUCHED', '#e8ecf3');
      PL.Audio.sfx('chime');
      return;
    }

    // Crimson Firewater: the Block's answer to an empty purse. You still get
    // knocked about, you just do not go down for it.
    if (this.grog <= 0 && this.has('firewater')) {
      this.iframes = 1.5;
      this.vx = (knockDir || -this.facing) * 3.4;
      this.vy = -5.2;
      this.grounded = false;
      world.camera.kick(fromHazard ? 6 : 4);
      world.fx.burst(this.cx(), this.cy(), '#e04b3a', 12, { speed: 2.6, life: 0.5 });
      world.fx.label(this.cx(), this.y - 6, 'STILL STANDING', '#e04b3a');
      PL.Audio.sfx('hurt');
      return;
    }

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

    // A Hollow Urn takes the death instead of you: it shatters, you are set
    // back on the last safe ground, and you get a long mercy window.
    if (this.urn > 0) {
      this.urn--;
      this.urnFlash = 0.9;
      this.iframes = 2.2;
      var back = this.safe || this.checkpoint || { x: this.spawnX, y: this.spawnY };
      this.x = back.x; this.y = back.y;
      this.vx = 0; this.vy = 0;
      this.dropThrough = 0;
      this.setGravity(1);       // wherever it puts you back, down is down again
      world.fx.ring(this.cx(), this.cy(), 'rgba(198,211,216,0.95)', 78);
      world.fx.burst(this.cx(), this.cy(), PL.C.pale, 22, { speed: 3.2, life: 0.8 });
      world.fx.label(this.cx(), this.y - 10, 'THE URN TAKES IT', PL.C.pale);
      world.camera.kick(6);
      PL.Audio.sfx('urn');
      return;
    }

    // Grog is what a death is paid for with. An empty purse means there is
    // nothing left to pay, and the run ends rather than restarting at the flag.
    if (this.grog <= 0) {
      this.dead = true;
      this.deaths++;
      this.deathTimer = 0;
      this.vy = -7.5;
      this.vx = 0;
      this.frozen = false;
      world.camera.kick(9);
      PL.Audio.sfx('die');
      if (world.onGameOver) world.onGameOver(cause);
      return;
    }
    var toll = Math.min(DEATH_COST, this.grog);
    this.grog -= toll;
    this.deathToll = toll;

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
    world.fx.label(this.cx(), this.y - 10, '-' + toll + ' GROG', C.coral);
    if (world.onDeath) world.onDeath(cause);
  };

  Player.prototype.respawn = function (world) {
    var p = this.checkpoint || { x: this.spawnX, y: this.spawnY };
    this.x = p.x; this.y = p.y;
    this.vx = this.vy = 0;
    this.dead = false;
    this.frozen = false;
    this.iframes = 1.2;
    this.tonic = 0;
    this.clearBuffs();       // timed effects lapse; carried things do not
    this.airJumpsLeft = 0;
    this.dropThrough = 0;
    this.safe = null;
    this.deathToll = 0;
    this.setGravity(1);
  };

  /** Set which way is down. Kept in one place so nothing forgets `invert`. */
  Player.prototype.setGravity = function (sign) {
    this.gsign = sign;
    this.invert = sign < 0;
  };

  /** A Fenwick veil gate turns the wood — and Corb — over. */
  Player.prototype.flipGravity = function (world) {
    this.setGravity(-this.gsign);
    this.vy = 0;
    this.grounded = false;
    this.coyote = 0;
    this.riding = null;
    this.safe = null;         // the old footing is a ceiling now
    if (world) world.fx.label(this.cx(), this.cy(), 'OVER YOU GO', '#c9a8f0');
  };

  /**
   * Whatever he bought to put on his head, drawn into the sprite's own
   * coordinate space (origin at the top-left of a 20x28 Corb).
   *
   * The shapes are here rather than in bank.js because a hat has to sit on
   * *this* head — the catalogue owns the colours and the name, the sprite owns
   * where a brim goes.
   */
  function drawHat(ctx, lid, tint, f) {
    var main = tint(lid.hat), band = tint(lid.band);
    if (lid.hood) {
      // a cowl, drawn over the skull rather than on top of it
      PL.gfx.rect(ctx, 3, -1, 15, 8, main);
      PL.gfx.rect(ctx, 4, 5, 13, 3, band);
      PL.gfx.rect(ctx, f > 0 ? 2 : 16, 2, 3, 9, main);
      return;
    }
    if (lid.low) {
      // bandana or cap: tight to the skull, with a tail or a peak
      PL.gfx.rect(ctx, 4, 1, 13, 4, main);
      PL.gfx.rect(ctx, 4, 4, 13, 1, band);
      PL.gfx.rect(ctx, f > 0 ? 2 : 16, 2, 3, 5, main);
      return;
    }
    // the default silhouette: a brim with something on top
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(1, 3); ctx.lineTo(19, 3); ctx.lineTo(15, -1); ctx.lineTo(5, -1);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, 3, 2, 14, 2, band);
    if (lid.spikes) {
      for (var i = 0; i < 4; i++) {
        var sx2 = 3 + i * 4;
        ctx.fillStyle = lid.crown ? main : band;
        ctx.beginPath();
        ctx.moveTo(sx2, -1);
        ctx.lineTo(sx2 + 2, lid.crown ? -6 : -5);
        ctx.lineTo(sx2 + 4, -1);
        ctx.closePath(); ctx.fill();
      }
      if (lid.crown) PL.gfx.rect(ctx, 3, -2, 14, 2, band);
    }
  }

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
    var rise = this.vy * this.gsign;
    if (this.landSquash > 0) { sy = 0.86; sx = 1.12; }
    else if (airborne) { sy = rise < -2 ? 1.08 : (rise > 6 ? 1.05 : 1); sx = 2 - sy; }
    // Under a veil gate the whole sprite turns over, feet to the ceiling.
    if (this.gsign < 0) {
      ctx.translate(x + this.w / 2, y + this.h / 2);
      ctx.scale(1, -1);
      ctx.translate(-(x + this.w / 2), -(y + this.h / 2));
    }
    ctx.translate(x + this.w / 2, y + this.h);
    ctx.scale(sx, sy);
    if (this.dead) ctx.rotate(Math.sin(this.t * 12) * 0.25);
    ctx.translate(-this.w / 2, -this.h);

    // Powerups recolour the sprite itself rather than compositing a rectangle
    // over the frame — the silhouette has to stay readable either way.
    var tintTo = null, tintAmt = 0;
    if (this.has('pour')) {
      // A measure of the Pour Eternal: he is briefly not really here.
      var cyc = Math.floor(this.t * 14) % 3;
      tintTo = cyc === 0 ? C.lanternHi : (cyc === 1 ? C.coral : C.teal);
      tintAmt = 0.66;
    } else if (this.has('spiritweed')) {
      tintTo = '#9fe8d8';
      tintAmt = 0.35;
    } else if (this.urnFlash > 0) {
      tintTo = C.pale;
      tintAmt = 0.7;
    } else if (this.tonic > 0) {
      var pulse = (Math.sin(this.t * 6) + 1) / 2;
      tintTo = pulse > 0.5 ? C.teal : C.lantern;
      tintAmt = 0.16 + Math.abs(pulse - 0.5) * 0.34;
    }
    function tint(hex) { return tintTo ? U.mix(hex, tintTo, tintAmt) : hex; }

    // Whatever is on him from the Beer Bank. Cosmetic only — every colour
    // here, and the shape of the hat below, changes nothing about a run.
    var fit = PL.Bank.worn('outfit'), lid = PL.Bank.worn('hat');
    var boot = tint('#3a2a1e'), skin = tint(fit.skin), shirt = tint(fit.trim);
    var coat = tint(U.mix(fit.coat, '#000000', 0.32)), sash = tint(fit.coat);

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

    // head and stubble
    PL.gfx.rect(ctx, 5, 2, 11, 9, skin);
    ctx.fillStyle = tint('#b07f55');
    ctx.fillRect(5, 8, 11, 2);
    ctx.fillStyle = C.ink;
    ctx.fillRect(f > 0 ? 12 : 6, 5, 2, 2);
    drawHat(ctx, lid, tint, f);

    ctx.globalAlpha = 1;
    ctx.restore();

    // trailing marks drawn outside the squash transform
    if (this.urn > 0) {
      // the stored soul, riding along as a small pale wisp
      var uy = y - 8 + Math.sin(this.t * 3) * 2;
      PL.gfx.glow(ctx, x + this.w / 2, uy, 14, 'rgba(198,211,216,0.7)', 0.4);
      PL.gfx.rect(ctx, x + this.w / 2 - 3, uy - 3, 6, 6, C.pale);
      if (this.urn > 1) {
        PL.gfx.text(ctx, 'x' + this.urn, x + this.w / 2 + 8, uy + 3,
                    { font: PL.FONT.tiny, color: C.pale });
      }
    }
    if (this.has('pour')) {
      for (var pi = 1; pi <= 3; pi++) {
        ctx.fillStyle = ['rgba(255,226,168,0.4)', 'rgba(212,87,78,0.35)', 'rgba(79,184,165,0.3)'][pi - 1];
        ctx.fillRect(x - this.facing * pi * 8, y + 4, 8, this.h - 8);
      }
    }
    if (this.has('dashing')) {
      ctx.fillStyle = 'rgba(246,207,130,0.5)';
      for (var di = 1; di <= 4; di++) ctx.fillRect(x - this.facing * di * 9, y + 6 + di, 7, 3);
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
