/* town-oweblock.js — the warzone.
 *
 * Owe Block's whole idea is that the level is not about you. Two gangs are
 * already fighting when you arrive: Crimson Cutters in red, Seaside Circus in
 * blue. They hunt each other on sight and will happily kill each other while
 * you slip past.
 *
 * THE BANDANA RULE
 * Wearing a colour makes that gang read you as one of theirs — they ignore you
 * entirely — and makes the other gang hostile *on sight*, charging from across
 * the alley instead of just patrolling. Wearing nothing means everyone is
 * hostile but nobody hunts you. There is no safe choice, only a chosen one.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  var GANG = {
    red:  { body: '#8f3327', trim: '#c9552e', flag: '#e0703f', name: 'CRIMSON CUTTERS' },
    blue: { body: '#26405e', trim: '#3f6d9e', flag: '#5b95c9', name: 'SEASIDE CIRCUS' }
  };
  PL.Gangs = GANG;

  // ============================================================ gang member

  function Ganger(opts, gang) {
    PL.Enemy.call(this, opts);
    this.w = 22; this.h = 30;
    this.x = opts.x + 5;
    this.y = opts.y + T - this.h;
    this.gang = gang;
    this.rival = gang === 'red' ? 'blue' : 'red';
    this.facing = (opts.tx % 2) ? 1 : -1;
    this.speed = 1.0;
    this.hp = 3;
    this.hitCool = 0;
    this.target = null;
    this.mood = 'patrol';       // patrol | brawl | hunt
    this.swing = 0;
    this.bob = 0;
    this.flash = 0;
  }
  PL.extend(Ganger, PL.Enemy);

  Ganger.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;
    if (this.hitCool > 0) this.hitCool -= dt;
    if (this.swing > 0) this.swing -= dt * 3;
    if (this.flash > 0) this.flash -= dt * 4;

    this.vy = Math.min(this.vy + 0.55, 12);
    this.grounded = false;
    PL.Physics.moveY(this, world, this.vy);
    if (this.grounded) this.vy = 0;

    var p = world.player;
    // A matching bandana buys you invisibility from this gang.
    var friendly = p && p.bandana === this.gang;
    this.harmful = !friendly;

    // --- pick something to be angry at ------------------------------------
    this.target = this.nearestRival(world);
    var huntPlayer = p && !p.dead && !p.frozen && p.bandana === this.rival &&
                     Math.abs(p.cx() - this.cx()) < T * 8 &&
                     Math.abs(p.cy() - this.cy()) < T * 2.5;

    if (this.target && Math.abs(this.target.cx() - this.cx()) < 30 &&
        Math.abs(this.target.cy() - this.cy()) < 26) {
      this.mood = 'brawl';
      this.brawl(this.target, world);
    } else if (this.target) {
      this.mood = 'hunt';
      this.chase(this.target.cx(), world, 1.5);
    } else if (huntPlayer) {
      this.mood = 'hunt';
      this.chase(p.cx(), world, 1.4);
    } else {
      this.mood = 'patrol';
      this.patrol(world);
    }

    if (PL.Physics.lethalOverlap(world, this)) {
      world.fx.burst(this.cx(), this.cy(), GANG[this.gang].trim, 8, { speed: 2, life: 0.5 });
      this.remove = true;
    }
    if (this.y > world.h + 80) this.remove = true;
  };

  Ganger.prototype.nearestRival = function (world) {
    var best = null, bestD = T * 9;
    var ents = world.entities;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e === this || e.remove || e.dying > 0) continue;
      if (e.gang !== this.rival) continue;
      if (Math.abs(e.cy() - this.cy()) > T * 2) continue;
      var d = Math.abs(e.cx() - this.cx());
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  };

  Ganger.prototype.chase = function (targetX, world, mul) {
    var dir = U.sign(targetX - this.cx()) || this.facing;
    this.facing = dir;
    if (!this.grounded) { PL.Physics.moveX(this, world, this.speed * dir * 0.6); return; }
    var aheadX = dir > 0 ? this.x + this.w + 3 : this.x - 3;
    if (!PL.Physics.groundUnder(world, aheadX, this.y + this.h + 4)) return;  // won't leap to death
    PL.Physics.moveX(this, world, this.speed * mul * dir);
    this.bob = Math.sin(this.t * 13) * 1.6;
  };

  Ganger.prototype.patrol = function (world) {
    if (!this.grounded) { PL.Physics.moveX(this, world, this.speed * this.facing * 0.6); return; }
    var aheadX = this.facing > 0 ? this.x + this.w + 3 : this.x - 3;
    if (!PL.Physics.groundUnder(world, aheadX, this.y + this.h + 4)) this.facing *= -1;
    else if (PL.Physics.moveX(this, world, this.speed * this.facing)) this.facing *= -1;
    this.bob = Math.sin(this.t * 8) * 1.3;
  };

  /* Two rivals in reach trade blows on a timer until one drops. The loser
   * spills their purse, which is the player's actual incentive to let it
   * happen rather than wade in. */
  Ganger.prototype.brawl = function (other, world) {
    this.facing = U.sign(other.cx() - this.cx()) || this.facing;
    if (this.hitCool > 0) return;
    this.hitCool = 0.55 + Math.random() * 0.25;
    this.swing = 1;
    other.hp--;
    other.flash = 1;
    world.fx.burst(other.cx(), other.cy(), GANG[this.gang].trim, 4,
                   { speed: 2.2, life: 0.3, size: 2 });
    if (world.camera.sees(this.x, this.y, this.w, this.h, 120)) PL.Audio.sfx('stomp');
    if (other.hp <= 0) other.fall(world);
  };

  /** Dropped by a gang member who loses a brawl. */
  Ganger.prototype.fall = function (world) {
    if (this.dying > 0) return;
    this.harmful = false;
    this.stompable = false;
    this.dying = 0.5;
    world.fx.burst(this.cx(), this.cy(), GANG[this.gang].body, 12, { speed: 2.6, life: 0.6 });
    var drop = 2 + ((Math.random() * 3) | 0);
    for (var i = 0; i < drop; i++) {
      world.add(PL.Entities.create('looseGrog', {
        x: this.cx() - 7, y: this.y + 6,
        vx: (Math.random() - 0.5) * 4, vy: -4 - Math.random() * 3, tx: 0, ty: 0
      }));
    }
  };

  Ganger.prototype.stomp = function (player, world) {
    PL.Enemy.prototype.stomp.call(this, player, world);
    this.hp = 0;
  };

  Ganger.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var col = GANG[this.gang];
    var neutral = !this.harmful;
    ctx.save();
    if (this.dying > 0) {
      ctx.translate(x + this.w / 2, y + this.h);
      ctx.scale(1.2, Math.max(0.1, this.dying / 0.5));
      ctx.translate(-this.w / 2, -this.h);
      x = 0; y = 0;
    }
    if (neutral) ctx.globalAlpha = 0.72;
    var b = this.dying > 0 ? 0 : this.bob;
    var f = this.facing;

    PL.gfx.rect(ctx, x + 3, y + 22, 7, 8, '#1a181c');
    PL.gfx.rect(ctx, x + 12, y + 22, 7, 8, '#1a181c');
    PL.gfx.rect(ctx, x + 2, y + 10 + b * 0.2, 18, 13, col.body);
    PL.gfx.rect(ctx, x + 2, y + 10 + b * 0.2, 18, 3, col.trim);
    PL.gfx.rect(ctx, x + 2, y + 18 + b * 0.2, 18, 2, '#141216');
    PL.gfx.rect(ctx, x + 5, y + 2 + b * 0.2, 12, 9, '#b98a63');
    // the bandana — the only thing that matters here
    PL.gfx.rect(ctx, x + 4, y + 1 + b * 0.2, 14, 4, col.flag);
    ctx.fillStyle = col.flag;
    ctx.beginPath();
    ctx.moveTo(x + (f > 0 ? 4 : 18), y + 3 + b * 0.2);
    ctx.lineTo(x + (f > 0 ? -4 : 26), y + 6 + b * 0.2);
    ctx.lineTo(x + (f > 0 ? 4 : 18), y + 8 + b * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#141216';
    ctx.fillRect(x + (f > 0 ? 12 : 7), y + 6 + b * 0.2, 2, 2);

    // shiv, thrown forward on a swing
    var reach = this.swing > 0 ? 10 : 6;
    ctx.strokeStyle = this.flash > 0 ? '#fff' : '#cfd8dd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var hx = x + (f > 0 ? 19 : 3);
    ctx.moveTo(hx, y + 15 + b * 0.2);
    ctx.lineTo(hx + f * reach, y + (this.swing > 0 ? 12 : 8) + b * 0.2);
    ctx.stroke();

    if (this.flash > 0) {
      ctx.globalAlpha = this.flash * 0.6;
      PL.gfx.rect(ctx, x, y, this.w, this.h, '#fff');
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // a hostile in hunt mode gets a marker, so an ambush is never unfair
    if (this.mood === 'hunt' && this.harmful && this.dying <= 0) {
      var mx = Math.round(this.x - cam.ox()) + this.w / 2;
      var my = Math.round(this.y - cam.oy()) - 8 + Math.sin(this.t * 9) * 2;
      ctx.fillStyle = col.flag;
      ctx.beginPath();
      ctx.moveTo(mx - 4, my - 4); ctx.lineTo(mx + 4, my - 4); ctx.lineTo(mx, my + 2);
      ctx.closePath(); ctx.fill();
    }
  };

  function Cutter(opts) { Ganger.call(this, opts, 'red'); }
  PL.extend(Cutter, Ganger);
  function Circus(opts) { Ganger.call(this, opts, 'blue'); }
  PL.extend(Circus, Ganger);

  // ============================================================== bandanas

  function Bandana(opts, colour) {
    E.call(this, opts);
    this.w = 22; this.h = 16;
    this.x = opts.x + 5; this.baseY = opts.y + 10; this.y = this.baseY;
    this.colour = colour;
  }
  PL.extend(Bandana, E);

  Bandana.prototype.update = function (dt) {
    this.t += dt;
    this.y = this.baseY + Math.sin(this.t * 2.4) * 3;
  };

  Bandana.prototype.touch = function (player, world) {
    if (player.bandana === this.colour) return;
    player.bandana = this.colour;
    var col = GANG[this.colour];
    world.fx.ring(this.cx(), this.cy(), col.flag, 52);
    world.fx.label(this.cx(), this.y - 8, col.name, col.flag);
    PL.Audio.sfx('powerup');
    // Deliberately NOT consumed: you can come back and switch sides.
  };

  Bandana.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var col = GANG[this.colour];
    PL.gfx.glow(ctx, x + 11, y + 8, 24, col.flag, 0.35);
    ctx.fillStyle = col.flag;
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + 22, y + 2 + Math.sin(this.t * 3) * 2);
    ctx.lineTo(x + 11, y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = col.body;
    ctx.fillRect(x + 4, y + 5, 3, 3);
    ctx.fillRect(x + 14, y + 6, 3, 3);
  };

  function BandanaRed(opts) { Bandana.call(this, opts, 'red'); }
  PL.extend(BandanaRed, Bandana);
  function BandanaBlue(opts) { Bandana.call(this, opts, 'blue'); }
  PL.extend(BandanaBlue, Bandana);

  // ============================================================= stank tank

  /* The one door on the Block that nobody kicks in. Mechanically a checkpoint;
   * it just isn't a flag, because nobody here flies colours they'd lose. */
  function StankTank(opts) {
    E.call(this, opts);
    this.w = T * 3; this.h = T * 3;
    this.x = opts.x;
    this.y = opts.y + T - this.h;
    this.isCheckpoint = true;
    this.lit = false;
    this.pop = 0;
    this.cull = false;
  }
  PL.extend(StankTank, E);

  StankTank.prototype.update = function (dt) {
    this.t += dt;
    if (this.pop > 0) this.pop -= dt;
  };

  StankTank.prototype.touch = function (player, world) {
    if (this.lit) return;
    for (var i = 0; i < world.checkpoints.length; i++) world.checkpoints[i].lit = false;
    this.lit = true;
    this.pop = 0.6;
    player.setCheckpoint(this.x + this.w / 2 - player.w / 2, this.y + this.h - player.h);
    world.fx.ring(this.cx(), this.cy(), 'rgba(255,166,43,0.9)', 64);
    world.fx.label(this.cx(), this.y - 6, 'THE STANK TANK — SAFE', C.lanternHi);
    PL.Audio.sfx('flag');
  };

  StankTank.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var w = this.w, h = this.h;
    var lit = this.lit;

    PL.gfx.rect(ctx, x, y + 12, w, h - 12, '#2b262c');
    PL.gfx.rect(ctx, x + 2, y + 14, w - 4, h - 16, '#3c353f');
    // corrugated roof, badly nailed
    ctx.fillStyle = '#4a4048';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 14); ctx.lineTo(x + w + 6, y + 14);
    ctx.lineTo(x + w - 4, y + 2); ctx.lineTo(x + 4, y + 2);
    ctx.closePath(); ctx.fill();
    for (var i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2 + i * 13, y + 3, 2, 11);
    }
    // door and window
    PL.gfx.rect(ctx, x + w / 2 - 12, y + h - 34, 24, 34, '#1c181e');
    ctx.fillStyle = lit ? 'rgba(255,166,43,0.9)' : 'rgba(255,166,43,0.35)';
    ctx.fillRect(x + 10, y + 26, 16, 12);
    ctx.fillRect(x + w - 26, y + 26, 16, 12);
    PL.gfx.glow(ctx, x + w / 2, y + h - 20, lit ? 92 : 52,
                'rgba(255,166,43,0.55)', lit ? 0.7 : 0.35);

    // the sign, buzzing
    var buzz = lit ? 1 : (0.55 + Math.sin(this.t * 17) * 0.2);
    ctx.save();
    ctx.globalAlpha = buzz;
    PL.gfx.rect(ctx, x + 6, y - 16, w - 12, 18, '#191519');
    PL.gfx.text(ctx, 'STANK TANK', x + w / 2, y - 3, {
      font: PL.FONT.hud, align: 'center', color: lit ? '#ffd591' : '#c98a3a'
    });
    ctx.restore();
    if (lit) {
      PL.gfx.text(ctx, 'SAFE HOUSE', x + w / 2, y + h + 12, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(255,213,145,0.75)'
      });
    }
  };

  PL.Entities.define('cutter', Cutter);
  PL.Entities.define('circus', Circus);
  PL.Entities.define('bandanaRed', BandanaRed);
  PL.Entities.define('bandanaBlue', BandanaBlue);
  PL.Entities.define('stankTank', StankTank);

  // =============================================================== backdrop

  function OweBlockBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 11);
    this.blocks = [];
    var x = -120;
    while (x < world.w * 0.7 + 900) {
      this.blocks.push({
        x: x, w: 70 + rnd() * 80, h: 110 + rnd() * 130,
        cols: 2 + ((rnd() * 3) | 0), tone: (rnd() * 3) | 0, seed: rnd()
      });
      x += 90 + rnd() * 60;
    }
    this.heads = [];
    x = 200;
    while (x < world.w * 0.5 + 900) {
      this.heads.push({ x: x, h: 70 + rnd() * 40 });
      x += 420 + rnd() * 420;
    }
    this.lamps = [];
    var lx = -40;
    while (lx < world.w * 0.8 + 600) {
      this.lamps.push({ x: lx, h: 40 + rnd() * 30 });
      lx += 110 + rnd() * 70;
    }
  }

  OweBlockBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;
    var g = ctx.createLinearGradient(0, -camY * 0.1, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.45, C.skyMid);
    g.addColorStop(0.8, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // smog band — no sun gets down here
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#6b4a33';
    for (var s = 0; s < 5; s++) {
      var sy = 40 + s * 30 - camY * 0.05;
      var sx = ((s * 240 - cam.x * 0.04 - time * 5) % (W + 500)) - 250;
      ctx.beginPath();
      ctx.ellipse(sx + 140, sy, 150, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // mine headframes on the skyline
    for (var hh = 0; hh < this.heads.length; hh++) {
      var hd = this.heads[hh];
      var hx = hd.x - cam.x * 0.2;
      if (hx < -100 || hx > W + 100) continue;
      var hb = H * 0.62 - camY * 0.08;
      ctx.strokeStyle = '#191419';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx, hb); ctx.lineTo(hx + 16, hb - hd.h);
      ctx.moveTo(hx + 40, hb); ctx.lineTo(hx + 24, hb - hd.h);
      ctx.moveTo(hx + 16, hb - hd.h); ctx.lineTo(hx + 24, hb - hd.h);
      ctx.stroke();
      ctx.fillStyle = '#191419';
      ctx.beginPath();
      ctx.arc(hx + 20, hb - hd.h - 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2c2229';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx + 20, hb - hd.h - 6, 9, time * 1.4, time * 1.4 + 2.2);
      ctx.stroke();
    }

    // tenement blocks, most windows dark
    var tones = ['#221d24', '#2b2429', '#1a161c'];
    for (var b = 0; b < this.blocks.length; b++) {
      var bl = this.blocks[b];
      var bx = bl.x - cam.x * 0.45;
      if (bx + bl.w < -80 || bx > W + 80) continue;
      var gy = H - 8 - camY * 0.02;
      ctx.fillStyle = tones[bl.tone];
      ctx.fillRect(bx, gy - bl.h, bl.w, bl.h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(bx, gy - bl.h, 4, bl.h);
      // fire escape
      ctx.strokeStyle = '#141016';
      ctx.lineWidth = 2;
      for (var fe = 1; fe * 34 < bl.h; fe++) {
        ctx.beginPath();
        ctx.moveTo(bx + 6, gy - fe * 34); ctx.lineTo(bx + bl.w - 6, gy - fe * 34);
        ctx.stroke();
      }
      for (var wy = 1; wy * 34 < bl.h - 10; wy++) {
        for (var wx = 0; wx < bl.cols; wx++) {
          var on = ((wx * 7 + wy * 13 + b * 5) % 11) < 3;
          if (!on) continue;
          var flick = 0.6 + Math.sin(time * 3 + wx + wy * 2 + b) * 0.18;
          ctx.fillStyle = 'rgba(255,166,43,' + (0.55 * flick) + ')';
          ctx.fillRect(bx + 14 + wx * (bl.w - 28) / Math.max(1, bl.cols - 1) - 5,
                       gy - wy * 34 - 20, 10, 13);
        }
      }
    }

    // sodium street lamps in the near layer
    for (var lp = 0; lp < this.lamps.length; lp++) {
      var la = this.lamps[lp];
      var lx = la.x - cam.x * 0.75;
      if (lx < -60 || lx > W + 60) continue;
      var ly = H - camY * 0.02;
      ctx.strokeStyle = '#141016';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - la.h); ctx.lineTo(lx + 12, ly - la.h - 4);
      ctx.stroke();
      PL.gfx.glow(ctx, lx + 13, ly - la.h - 4, 48, 'rgba(255,166,43,0.5)', 0.45);
    }

    var haze = ctx.createLinearGradient(0, 0, 0, H);
    haze.addColorStop(0, 'rgba(8,6,10,0.5)');
    haze.addColorStop(0.5, 'rgba(8,6,10,0.1)');
    haze.addColorStop(1, 'rgba(140,70,20,0.12)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('oweblock', function (world) { return new OweBlockBackdrop(world); });

})(window.PL = window.PL || {});
