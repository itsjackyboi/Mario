/* props.js — level furniture: moving/collapsing platforms, the Captain's Flag
 * checkpoint, the level-end tankard, the trial gate, and scenery.
 *
 * The checkpoint and tankard are deliberately generic: they read nothing
 * Shanty-Town-specific, so every future town reuses them as-is.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity;

  // ------------------------------------------------------------ loose plank

  /* Stand on it and it shudders, tips, and drops away. Respawns after a beat.
   * Doubles as the "wobbly rigging" hazard. */
  function LoosePlank(opts) {
    E.call(this, opts);
    this.w = T; this.h = 10;
    this.x = opts.x; this.y = opts.y + 8;
    this.homeY = this.y;
    this.isPlatform = true;
    this.active = true;
    this.state = 'idle';   // idle | shake | fall | gone
    this.timer = 0;
    this.tilt = 0;
    this.dx = 0; this.dy = 0;
    this.cull = false;
  }
  PL.extend(LoosePlank, E);

  LoosePlank.prototype.onStand = function () {
    if (this.state === 'idle') {
      this.state = 'shake';
      this.timer = 0.6;
    }
  };

  LoosePlank.prototype.update = function (dt, world) {
    this.t += dt;
    var prevY = this.y;
    if (this.state === 'shake') {
      this.timer -= dt;
      this.tilt = Math.sin(this.t * 46) * 0.055;
      if (this.timer <= 0) {
        this.state = 'fall';
        this.timer = 2.6;
        this.vy = 0.6;
        this.active = false;
        PL.Audio.sfx('crumble');
        world.fx.burst(this.cx(), this.y + 6, C.woodPale, 8, { speed: 1.8, life: 0.6 });
      }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.5, 12);
      this.y += this.vy;
      this.tilt += 0.05;
      this.timer -= dt;
      if (this.timer <= 0) {
        this.state = 'idle';
        this.y = this.homeY;
        this.tilt = 0;
        this.vy = 0;
        this.active = true;
      }
    } else {
      this.tilt = Math.sin(this.t * 1.6 + this.x) * 0.012;
    }
    this.dy = this.y - prevY;
  };

  LoosePlank.prototype.draw = function (ctx, cam) {
    if (this.state === 'idle' || this.state === 'shake' || this.state === 'fall') {
      var x = this.x - cam.ox(), y = this.y - cam.oy();
      ctx.save();
      ctx.globalAlpha = this.state === 'fall' ? Math.max(0.15, this.timer / 2.6) : 1;
      ctx.translate(x + this.w / 2, y + this.h / 2);
      ctx.rotate(this.tilt);
      ctx.translate(-this.w / 2, -this.h / 2);
      PL.gfx.plank(ctx, 0, 0, this.w, this.h, this.state === 'shake' ? C.woodLite : C.wood, C.woodDark);
      PL.gfx.rect(ctx, 0, 0, this.w, 2, C.woodPale);
      // frayed rope stubs
      ctx.strokeStyle = C.rope; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(3, this.h); ctx.lineTo(2, this.h + 4);
      ctx.moveTo(this.w - 3, this.h); ctx.lineTo(this.w - 2, this.h + 4);
      ctx.stroke();
      ctx.restore();
    }
  };

  // -------------------------------------------------------- moving platforms

  function Mover(opts, axis) {
    E.call(this, opts);
    this.w = T * 2; this.h = 12;
    this.x = opts.x; this.y = opts.y + 10;
    this.homeX = this.x; this.homeY = this.y;
    this.axis = axis;
    this.range = (opts.range || 3) * T;
    this.speed = opts.speed || 0.55;
    this.isPlatform = true;
    this.active = true;
    this.phase = (opts.tx * 0.31 + opts.ty * 0.17) % 1 * Math.PI * 2;
    this.dx = 0; this.dy = 0;
    this.cull = false;
  }
  PL.extend(Mover, E);

  Mover.prototype.update = function (dt) {
    this.t += dt;
    var px = this.x, py = this.y;
    var s = Math.sin(this.t * this.speed + this.phase);
    if (this.axis === 'x') this.x = this.homeX + s * this.range;
    else this.y = this.homeY + s * this.range;
    this.dx = this.x - px;
    this.dy = this.y - py;
  };

  Mover.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    // rigging line back to the anchor point
    ctx.strokeStyle = 'rgba(156,124,82,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (this.axis === 'y') {
      ctx.moveTo(x + this.w / 2, y);
      ctx.lineTo(x + this.w / 2, Math.round(this.homeY - this.range - cam.oy()));
    } else {
      ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y - 26);
      ctx.moveTo(x + this.w - 4, y); ctx.lineTo(x + this.w - 4, y - 26);
    }
    ctx.stroke();
    PL.gfx.plank(ctx, x, y, this.w, this.h, C.wood, C.woodDark);
    PL.gfx.rect(ctx, x, y, this.w, 2, C.woodPale);
    PL.gfx.rect(ctx, x + 2, y + this.h - 3, this.w - 4, 2, C.rope);
  };

  function MoverH(opts) { Mover.call(this, opts, 'x'); }
  PL.extend(MoverH, Mover);
  function MoverV(opts) { Mover.call(this, opts, 'y'); }
  PL.extend(MoverV, Mover);

  // ------------------------------------------------- veilwalker seed platform

  /* Conjured by the player. Solid on top, fades, then vanishes. */
  function SeedPlatform(opts) {
    E.call(this, opts);
    this.w = 58; this.h = 12;
    this.x = opts.x; this.y = opts.y;
    this.isPlatform = true;
    this.active = true;
    this.life = opts.life || 5.0;
    this.max = this.life;
    this.dx = 0; this.dy = 0;
    this.grow = 0;
    this.cull = false;
  }
  PL.extend(SeedPlatform, E);

  SeedPlatform.prototype.update = function (dt) {
    this.t += dt;
    this.life -= dt;
    this.grow = Math.min(1, this.grow + dt * 6);
    if (this.life <= 0) { this.remove = true; this.active = false; }
  };

  SeedPlatform.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var fade = this.life < 1.2 ? (Math.floor(this.life * 10) % 2 ? 0.35 : 0.9) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    var w = this.w * this.grow;
    var cx = x + this.w / 2;
    PL.gfx.glow(ctx, cx, y + 6, 34, 'rgba(158,194,122,0.5)', 0.35);
    // a knot of packed red earth and green shoots
    PL.gfx.rect(ctx, cx - w / 2, y, w, this.h, '#6b4a30');
    PL.gfx.rect(ctx, cx - w / 2, y, w, 3, '#8a5c3a');
    ctx.strokeStyle = '#9ec27a';
    ctx.lineWidth = 2;
    for (var i = 0; i < 5; i++) {
      var sx = cx - w / 2 + 6 + i * (w - 12) / 4;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + 3, y - 6, sx + 6 + Math.sin(this.t * 3 + i) * 2, y - 9);
      ctx.stroke();
    }
    ctx.restore();
  };

  PL.SeedPlatform = SeedPlatform;

  // ---------------------------------------------------- captain's flag (checkpoint)

  function Checkpoint(opts) {
    E.call(this, opts);
    this.w = 26; this.h = T * 2;
    this.x = opts.x + 3;
    // The marker tile is the flag's *base*; the pole rises two tiles from it.
    this.y = opts.y + T - this.h;
    this.isCheckpoint = true;
    this.lit = false;
    this.pop = 0;
    this.cull = false;
  }
  PL.extend(Checkpoint, E);

  Checkpoint.prototype.update = function (dt) {
    this.t += dt;
    if (this.pop > 0) this.pop -= dt;
  };

  Checkpoint.prototype.touch = function (player, world) {
    if (this.lit) return;
    for (var i = 0; i < world.checkpoints.length; i++) world.checkpoints[i].lit = false;
    this.lit = true;
    this.pop = 0.6;
    player.setCheckpoint(this.x + this.w / 2 - player.w / 2, this.y + this.h - player.h);
    world.fx.ring(this.cx(), this.y + 8, 'rgba(255,179,71,0.9)', 52);
    world.fx.label(this.cx(), this.y - 6, 'COLOURS RAISED', C.lanternHi);
    PL.Audio.sfx('flag');
  };

  Checkpoint.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var baseY = y + this.h;
    // driven into a heap of ballast stones
    PL.gfx.rect(ctx, x + 2, baseY - 6, 22, 6, C.boneDark);
    PL.gfx.rect(ctx, x + 5, baseY - 9, 14, 4, C.bone);
    // pole
    PL.gfx.rect(ctx, x + 11, y, 4, this.h - 6, C.wood);
    PL.gfx.rect(ctx, x + 11, y, 2, this.h - 6, C.woodLite);
    if (this.lit) {
      var s = this.pop > 0 ? 1 + this.pop * 0.5 : 1;
      PL.gfx.glow(ctx, x + 13, y + 12, 34 * s, 'rgba(255,179,71,0.55)', 0.5);
      // flying colours: a crew flag, snapping
      ctx.fillStyle = C.coral;
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 2);
      for (var i = 0; i <= 6; i++) {
        var t = i / 6;
        ctx.lineTo(x + 15 + t * 24, y + 2 + Math.sin(this.t * 7 + t * 4) * 2.5);
      }
      for (var j = 6; j >= 0; j--) {
        var t2 = j / 6;
        ctx.lineTo(x + 15 + t2 * 24, y + 16 + Math.sin(this.t * 7 + t2 * 4) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
      // crude skull sigil
      ctx.fillStyle = C.parchment;
      ctx.fillRect(x + 24, y + 6, 6, 5);
      ctx.fillStyle = C.coralDark;
      ctx.fillRect(x + 25, y + 7, 1, 2);
      ctx.fillRect(x + 28, y + 7, 1, 2);
    } else {
      // furled and sodden
      ctx.fillStyle = '#6a6068';
      ctx.beginPath();
      ctx.moveTo(x + 15, y + 3);
      ctx.lineTo(x + 22, y + 8);
      ctx.lineTo(x + 15, y + 20);
      ctx.closePath();
      ctx.fill();
    }
  };

  // --------------------------------------------------------- the tankard (goal)

  /* THE LEVEL-END CONVENTION: every level in every town finishes by leaping
   * into a giant tankard of beer. Touch it and the run stops. */
  function Tankard(opts) {
    E.call(this, opts);
    // `tankardScale` on the level def makes the capstone's cup outsize.
    var k = (opts.def && opts.def.tankardScale) || 1;
    this.w = Math.round(T * 3 * k);
    this.h = Math.round(T * 4 * k);
    this.x = opts.x;
    this.y = opts.y + T - this.h;
    this.cull = false;
    this.foam = 0;
    this.taken = false;
  }
  PL.extend(Tankard, E);

  Tankard.prototype.update = function (dt) { this.t += dt; };

  Tankard.prototype.touch = function (player, world) {
    if (this.taken) return;
    this.taken = true;
    if (world.onGoal) world.onGoal(this);
  };

  Tankard.prototype.draw = function (ctx, cam) {
    // Drawn at the base 96x128 size inside a scale transform, so the capstone
    // level's outsize cup is the same artwork, just bigger.
    var k = this.w / (T * 3);
    ctx.save();
    ctx.translate(Math.round(this.x - cam.ox()), Math.round(this.y - cam.oy()));
    ctx.scale(k, k);
    var x = 0, y = 0;
    var w = T * 3, h = T * 4;
    var bodyY = y + 18;
    var bodyH = h - 18;

    PL.gfx.glow(ctx, x + w / 2, y + h * 0.55, 96, 'rgba(255,179,71,0.35)', 0.5);

    // handle
    ctx.strokeStyle = '#b9b0a2';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(x + w - 4, bodyY + bodyH * 0.5, 22, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.strokeStyle = '#8d8478';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + w - 4, bodyY + bodyH * 0.5, 22, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // vessel: staved wood banded in iron
    PL.gfx.rect(ctx, x, bodyY, w, bodyH, C.woodDark);
    for (var i = 0; i < 6; i++) {
      PL.gfx.rect(ctx, x + 3 + i * 15, bodyY + 2, 13, bodyH - 4, i % 2 ? C.wood : C.woodLite);
    }
    PL.gfx.rect(ctx, x - 2, bodyY + 8, w + 4, 5, C.boneDark);
    PL.gfx.rect(ctx, x - 2, bodyY + bodyH - 18, w + 4, 5, C.boneDark);
    PL.gfx.rect(ctx, x - 3, bodyY + bodyH - 6, w + 6, 6, '#5a5148');

    // the pour, visible over the rim
    var beerY = y + 20;
    PL.gfx.rect(ctx, x + 4, beerY, w - 8, 16, '#e09a2c');
    ctx.fillStyle = '#f7c65c';
    for (var b = 0; b < 5; b++) {
      var bx = x + 10 + b * 16;
      var by = beerY + 12 - ((this.t * 22 + b * 13) % 14);
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // foam head, wobbling
    ctx.fillStyle = '#fbf3dc';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 22);
    for (var f = 0; f <= 8; f++) {
      var t = f / 8;
      var fy = y + 8 + Math.sin(this.t * 2 + t * 6) * 3 - Math.sin(t * Math.PI) * 8;
      ctx.lineTo(x - 2 + t * (w + 4), fy);
    }
    ctx.lineTo(x + w + 2, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e6dcc2';
    ctx.beginPath();
    ctx.arc(x + 18, y + 12, 5, 0, Math.PI * 2);
    ctx.arc(x + 62, y + 10, 6, 0, Math.PI * 2);
    ctx.fill();

    // rim
    PL.gfx.rect(ctx, x - 3, y + 18, w + 6, 5, '#c9bfae');
    ctx.restore();
  };

  // ------------------------------------------------------------- trial gate

  /* Stand in front of it and the town's trial begins. Level 3 only, but the
   * mechanism is generic — set `trial: '<id>'` on any level def. */
  function TrialGate(opts) {
    E.call(this, opts);
    this.w = T * 2; this.h = T * 4;
    this.x = opts.x;
    this.y = opts.y + T - this.h;
    this.trial = opts.trial || 'plankPour';
    this.passed = false;
    this.armed = true;
    this.cull = false;
  }
  PL.extend(TrialGate, E);

  TrialGate.prototype.update = function (dt) { this.t += dt; };

  TrialGate.prototype.touch = function (player, world) {
    if (!this.armed || this.passed) return;
    this.armed = false;
    if (world.onTrial) world.onTrial(this);
  };

  TrialGate.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    // two whale-rib uprights with a rope swag and a hanging sign
    PL.gfx.rect(ctx, x + 2, y + 10, 8, this.h - 10, C.boneDark);
    PL.gfx.rect(ctx, x + 3, y + 10, 4, this.h - 10, C.bone);
    PL.gfx.rect(ctx, x + this.w - 10, y + 10, 8, this.h - 10, C.boneDark);
    PL.gfx.rect(ctx, x + this.w - 9, y + 10, 4, this.h - 10, C.bone);
    ctx.strokeStyle = C.rope;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 14);
    ctx.quadraticCurveTo(x + this.w / 2, y + 26, x + this.w - 6, y + 14);
    ctx.stroke();

    var sway = Math.sin(this.t * 1.7) * 0.09;
    ctx.save();
    ctx.translate(x + this.w / 2, y + 22);
    ctx.rotate(sway);
    PL.gfx.rect(ctx, -26, 0, 52, 26, C.woodDark);
    PL.gfx.rect(ctx, -24, 2, 48, 22, this.passed ? '#3d5c4c' : C.wood);
    PL.gfx.text(ctx, this.passed ? 'PASSED' : 'THE TRIAL', 0, 12, {
      font: PL.FONT.small, align: 'center', color: this.passed ? C.seaFoam : C.lanternHi
    });
    PL.gfx.text(ctx, this.passed ? '' : 'OF THE PLANK', 0, 21, {
      font: PL.FONT.tiny, align: 'center', color: C.bone
    });
    ctx.restore();
    if (!this.passed) PL.gfx.glow(ctx, x + this.w / 2, y + 24, 40, 'rgba(255,179,71,0.4)', 0.4);
  };

  // -------------------------------------------------------------- decoration

  function Lantern(opts) {
    E.call(this, opts);
    this.w = 12; this.h = 16;
    this.x = opts.x + 10; this.y = opts.y + 6;
    this.decor = true;
    this.phase = (opts.tx * 1.7) % 6.28;
  }
  PL.extend(Lantern, E);
  Lantern.prototype.update = function (dt) { this.t += dt; };
  Lantern.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var flick = 0.82 + Math.sin(this.t * 9 + this.phase) * 0.1 + Math.sin(this.t * 23) * 0.05;
    ctx.strokeStyle = C.rope; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 6, y - 10); ctx.lineTo(x + 6, y); ctx.stroke();
    PL.gfx.rect(ctx, x + 1, y, 10, 12, '#4a3a2c');
    PL.gfx.rect(ctx, x + 3, y + 2, 6, 8, C.lantern);
    PL.gfx.glow(ctx, x + 6, y + 6, 46 * flick, 'rgba(255,179,71,0.55)', 0.55 * flick);
  };

  function Post(opts) {
    E.call(this, opts);
    this.w = 14; this.h = T;
    this.x = opts.x + 9; this.y = opts.y;
    this.decor = true;
    this.seed = (opts.tx * 37 + opts.ty * 11) % 100 / 100;
  }
  PL.extend(Post, E);
  Post.prototype.update = function () {};
  Post.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    PL.gfx.rect(ctx, x, y + 4, 14, this.h - 4, C.woodDark);
    PL.gfx.rect(ctx, x + 1, y + 4, 5, this.h - 4, C.wood);
    PL.gfx.rect(ctx, x - 2, y, 18, 5, C.wood);
    ctx.fillStyle = C.seaFoam;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x + 2, y + 14 + this.seed * 8, 9, 3);
    ctx.globalAlpha = 1;
    if (this.seed > 0.5) {
      ctx.strokeStyle = C.rope; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 7, y + 8, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  };

  PL.Entities.define('loosePlank', LoosePlank);
  PL.Entities.define('moverH', MoverH);
  PL.Entities.define('moverV', MoverV);
  PL.Entities.define('checkpoint', Checkpoint);
  PL.Entities.define('tankard', Tankard);
  PL.Entities.define('trialGate', TrialGate);
  PL.Entities.define('lantern', Lantern);
  PL.Entities.define('post', Post);
  PL.Entities.define('seedPlatform', SeedPlatform);

})(window.PL = window.PL || {});
