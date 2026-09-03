/* items.js — every pickup in the game.
 *
 * GROG ECONOMY (documented choice):
 * Grog Barrels are tracked PER LEVEL. The counter resets when a level starts
 * and is *kept* through deaths and checkpoint respawns, so a run's grog total
 * is a meaningful, comparable leaderboard stat. On level completion the total
 * is banked into a persistent town purse (see storage.js) shown on the
 * level-select screen.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  // ------------------------------------------------------------- pickup base

  function Pickup(opts) {
    E.call(this, opts);
    this.w = 20; this.h = 20;
    this.x = opts.x + (T - this.w) / 2;
    this.y = opts.y + (T - this.h) / 2;
    this.baseY = this.y;
    this.phase = (opts.tx * 0.7 + opts.ty * 1.3) % (Math.PI * 2);
    this.taken = false;
  }
  PL.extend(Pickup, E);

  Pickup.prototype.update = function (dt) {
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 2.6 + this.phase) * 3;
  };

  Pickup.prototype.take = function (world, player) {
    this.taken = true;
    this.remove = true;
  };

  // ----------------------------------------------------------------- grog

  function Grog(opts) {
    Pickup.call(this, opts);
    this.w = 18; this.h = 20;
    this.x = opts.x + (T - this.w) / 2;
    this.baseY = opts.y + (T - this.h) / 2;
    this.y = this.baseY;
  }
  PL.extend(Grog, Pickup);

  Grog.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.addGrog(1);
    world.fx.burst(this.cx(), this.cy(), C.grogBand, 7, { speed: 1.8, life: 0.4, size: 2 });
    PL.Audio.sfx('grog');
  };

  Grog.prototype.draw = function (ctx, cam) {
    drawBarrel(ctx, this.x - cam.ox(), this.y - cam.oy(), this.w, this.h);
  };

  function drawBarrel(ctx, x, y, w, h) {
    ctx.save();
    PL.gfx.glow(ctx, x + w / 2, y + h / 2, 15, 'rgba(255,179,71,0.55)', 0.4);
    // staves
    PL.gfx.rect(ctx, x + 1, y + 2, w - 2, h - 4, C.grog);
    PL.gfx.rect(ctx, x, y + 5, w, h - 10, C.grog);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x + 1, y + 2, 3, h - 4);
    PL.gfx.rect(ctx, x + w - 5, y + 3, 3, h - 6, C.grogBand);
    // iron bands
    PL.gfx.rect(ctx, x, y + 6, w, 3, C.boneDark);
    PL.gfx.rect(ctx, x, y + h - 9, w, 3, C.boneDark);
    ctx.restore();
  }
  PL.drawBarrelIcon = drawBarrel;

  // ------------------------------------------------------ dropped grog (on hit)

  /** Grog knocked loose by a hit: bounces, then can be scooped back up. */
  function LooseGrog(opts) {
    E.call(this, opts);
    this.w = 14; this.h = 16;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || -4;
    this.life = 5.0;
    this.armed = 0.55;   // brief delay before it can be re-collected
  }
  PL.extend(LooseGrog, E);

  LooseGrog.prototype.update = function (dt, world) {
    this.t += dt;
    this.life -= dt;
    this.armed -= dt;
    if (this.life <= 0) { this.remove = true; return; }
    this.vy = Math.min(this.vy + 0.42, 10);
    if (PL.Physics.moveX(this, world, this.vx)) this.vx *= -0.5;
    this.grounded = false;
    if (PL.Physics.moveY(this, world, this.vy)) {
      if (this.vy > 0) { this.vy *= -0.45; this.vx *= 0.82; }
      else this.vy = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }
    if (PL.Physics.lethalOverlap(world, this)) this.remove = true;
    if (this.y > world.h + 64) this.remove = true;
  };

  LooseGrog.prototype.touch = function (player, world) {
    if (this.armed > 0 || this.remove) return;
    this.remove = true;
    player.addGrog(1);
    world.fx.burst(this.cx(), this.cy(), C.grogBand, 5, { speed: 1.6, life: 0.35, size: 2 });
    PL.Audio.sfx('grog');
  };

  LooseGrog.prototype.draw = function (ctx, cam) {
    var blink = this.life < 1.6 && Math.floor(this.life * 12) % 2 === 0;
    if (blink) return;
    drawBarrel(ctx, this.x - cam.ox(), this.y - cam.oy(), this.w, this.h);
  };

  PL.LooseGrog = LooseGrog;

  // ------------------------------------------------------------- hollow urn

  function Urn(opts) { Pickup.call(this, opts); this.w = 20; this.h = 24;
    this.x = opts.x + 6; this.baseY = opts.y + 6; this.y = this.baseY; }
  PL.extend(Urn, Pickup);

  Urn.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.giveUrn();
    world.fx.ring(this.cx(), this.cy(), 'rgba(198,211,216,0.9)', 46);
    world.fx.label(this.cx(), this.y - 6, 'HOLLOW URN', C.pale);
    PL.Audio.sfx('urn');
  };

  Urn.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    PL.gfx.glow(ctx, x + 10, y + 12, 20, 'rgba(198,211,216,0.5)', 0.35);
    // pale ceramic vessel
    ctx.fillStyle = C.pale;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 6);
    ctx.quadraticCurveTo(x - 1, y + 16, x + 5, y + 23);
    ctx.lineTo(x + 15, y + 23);
    ctx.quadraticCurveTo(x + 21, y + 16, x + 15, y + 6);
    ctx.closePath();
    ctx.fill();
    PL.gfx.rect(ctx, x + 3, y + 3, 14, 4, '#9fb0b8');
    ctx.fillStyle = 'rgba(22,15,20,0.55)';
    ctx.fillRect(x + 5, y + 4, 10, 2);
    // escaping wisp
    ctx.strokeStyle = 'rgba(207,230,228,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var yy = y + 2 - i * 2.2;
      var xx = x + 10 + Math.sin(this.t * 3 + i * 0.7) * 3;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  };

  // -------------------------------------------------------- clockheart tonic

  function Tonic(opts) { Pickup.call(this, opts); this.w = 16; this.h = 24;
    this.x = opts.x + 8; this.baseY = opts.y + 6; this.y = this.baseY; }
  PL.extend(Tonic, Pickup);

  Tonic.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.giveTonic();
    world.fx.ring(this.cx(), this.cy(), 'rgba(79,184,165,0.9)', 42);
    world.fx.label(this.cx(), this.y - 6, 'CLOCKHEART', C.teal);
    PL.Audio.sfx('powerup');
  };

  Tonic.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    PL.gfx.glow(ctx, x + 8, y + 14, 18, 'rgba(79,184,165,0.55)', 0.4);
    PL.gfx.rect(ctx, x + 5, y, 6, 6, '#6b8f88');       // neck
    PL.gfx.rect(ctx, x + 4, y - 2, 8, 3, C.woodDark);  // cork
    ctx.fillStyle = '#20424a';
    PL.gfx.roundRect(ctx, x, y + 5, 16, 19, 4); ctx.fill();
    ctx.fillStyle = C.teal;
    PL.gfx.roundRect(ctx, x + 2, y + 9, 12, 13, 3); ctx.fill();
    // tiny clock face — day order / night revelry
    ctx.strokeStyle = C.lanternHi;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 8, y + 15, 4, 0, Math.PI * 2); ctx.stroke();
    var a = this.t * 2.4;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 15);
    ctx.lineTo(x + 8 + Math.cos(a) * 3, y + 15 + Math.sin(a) * 3);
    ctx.stroke();
  };

  // ------------------------------------------------------ wolendi wind pouch

  function Pouch(opts) { Pickup.call(this, opts); this.w = 22; this.h = 20;
    this.x = opts.x + 5; this.baseY = opts.y + 8; this.y = this.baseY; }
  PL.extend(Pouch, Pickup);

  Pouch.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.givePouch();
    world.fx.ring(this.cx(), this.cy(), 'rgba(216,198,156,0.9)', 40);
    world.fx.label(this.cx(), this.y - 6, 'WIND POUCH', C.bone);
    PL.Audio.sfx('powerup');
  };

  Pouch.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    ctx.fillStyle = C.woodLite;
    ctx.beginPath();
    ctx.ellipse(x + 11, y + 12, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    PL.gfx.rect(ctx, x + 7, y + 1, 8, 5, C.wood);
    ctx.fillStyle = C.rope;
    ctx.fillRect(x + 6, y + 4, 10, 2);
    // gust curling out of the neck
    ctx.strokeStyle = 'rgba(207,230,228,0.85)';
    ctx.lineWidth = 1.5;
    for (var i = 0; i < 2; i++) {
      ctx.beginPath();
      var yy = y + 1 - i * 4;
      ctx.moveTo(x + 12, yy);
      ctx.quadraticCurveTo(x + 20 + Math.sin(this.t * 4 + i) * 3, yy - 3, x + 15, yy - 6);
      ctx.stroke();
    }
  };

  // ------------------------------------------------------- veilwalker seed

  function Seed(opts) { Pickup.call(this, opts); this.w = 16; this.h = 18;
    this.x = opts.x + 8; this.baseY = opts.y + 8; this.y = this.baseY; }
  PL.extend(Seed, Pickup);

  Seed.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.giveSeed();
    world.fx.ring(this.cx(), this.cy(), 'rgba(122,160,90,0.9)', 38);
    world.fx.label(this.cx(), this.y - 6, 'VEILWALKER SEED', '#9ec27a');
    PL.Audio.sfx('powerup');
  };

  Seed.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    PL.gfx.glow(ctx, x + 8, y + 10, 14, 'rgba(158,194,122,0.4)', 0.35);
    ctx.fillStyle = '#7a4a2c';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 11, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a3663c';
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9ec27a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.quadraticCurveTo(x + 12 + Math.sin(this.t * 2) * 2, y, x + 14, y + 2);
    ctx.stroke();
  };

  // -------------------------------------------------------- red-earth shard

  function Shard(opts) {
    Pickup.call(this, opts);
    this.w = 20; this.h = 24;
    this.x = opts.x + 6; this.baseY = opts.y + 4; this.y = this.baseY;
    this.shardId = opts.shardId;
  }
  PL.extend(Shard, Pickup);

  Shard.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.take(world, player);
    player.collectShard(this.shardId);
    world.fx.ring(this.cx(), this.cy(), 'rgba(212,87,78,0.95)', 56);
    world.fx.burst(this.cx(), this.cy(), C.coral, 14, { speed: 2.6, life: 0.7 });
    world.fx.label(this.cx(), this.y - 8, 'RED-EARTH SHARD', C.coral);
    PL.Audio.sfx('shard');
  };

  Shard.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var spin = Math.sin(this.t * 1.6);
    PL.gfx.glow(ctx, x + 10, y + 12, 24, 'rgba(212,87,78,0.6)', 0.5);
    ctx.save();
    ctx.translate(x + 10, y + 12);
    ctx.scale(0.6 + Math.abs(spin) * 0.5, 1);
    ctx.fillStyle = C.coralDark;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(8, -1); ctx.lineTo(3, 12); ctx.lineTo(-6, 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.coral;
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(4, -2); ctx.lineTo(0, 10); ctx.lineTo(-4, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,200,0.8)';
    ctx.fillRect(-1, -9, 2, 8);
    ctx.restore();
  };

  // ------------------------------------------------------- registration

  PL.Entities.define('grog', Grog);
  PL.Entities.define('looseGrog', LooseGrog);
  PL.Entities.define('urn', Urn);
  PL.Entities.define('tonic', Tonic);
  PL.Entities.define('pouch', Pouch);
  PL.Entities.define('seed', Seed);
  PL.Entities.define('shard', Shard);

  /* Icon painters reused by the HUD and the level-select legend. */
  PL.ItemIcons = {
    grog: function (ctx, x, y, s) { drawBarrel(ctx, x, y, s * 0.9, s); },
    urn: function (ctx, x, y, s) {
      ctx.fillStyle = C.pale;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + s * 0.25);
      ctx.quadraticCurveTo(x, y + s * 0.65, x + s * 0.25, y + s);
      ctx.lineTo(x + s * 0.75, y + s);
      ctx.quadraticCurveTo(x + s, y + s * 0.65, x + s * 0.75, y + s * 0.25);
      ctx.closePath(); ctx.fill();
      PL.gfx.rect(ctx, x + s * 0.15, y + s * 0.1, s * 0.7, s * 0.16, '#9fb0b8');
    },
    tonic: function (ctx, x, y, s) {
      PL.gfx.rect(ctx, x + s * 0.35, y, s * 0.3, s * 0.28, '#6b8f88');
      ctx.fillStyle = C.teal;
      PL.gfx.roundRect(ctx, x + s * 0.12, y + s * 0.25, s * 0.76, s * 0.72, 3); ctx.fill();
    },
    pouch: function (ctx, x, y, s) {
      ctx.fillStyle = C.woodLite;
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s * 0.6, s * 0.45, s * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      PL.gfx.rect(ctx, x + s * 0.33, y + s * 0.08, s * 0.34, s * 0.26, C.wood);
    },
    seed: function (ctx, x, y, s) {
      ctx.fillStyle = '#7a4a2c';
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s * 0.6, s * 0.34, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9ec27a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + s / 2, y + s * 0.2);
      ctx.quadraticCurveTo(x + s * 0.85, y, x + s * 0.9, y + s * 0.15);
      ctx.stroke();
    },
    shard: function (ctx, x, y, s) {
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y);
      ctx.lineTo(x + s * 0.9, y + s * 0.45);
      ctx.lineTo(x + s * 0.62, y + s);
      ctx.lineTo(x + s * 0.15, y + s * 0.6);
      ctx.closePath(); ctx.fill();
    }
  };

})(window.PL = window.PL || {});
