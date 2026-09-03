/* town-providence.js — the ordered city.
 *
 * Everything in Providence runs on one clock. `beatAt()` derives the current
 * chime from world.time, so apostles, bells and friars stay in lockstep with
 * no shared state and no engine changes — the town's whole identity is that
 * its hazards are perfectly predictable if you can count.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  var BEAT = 1.9;                       // seconds per chime
  function beatAt(time) { return Math.floor(time / BEAT); }
  function beatPhase(time) { return (time % BEAT) / BEAT; }
  PL.Providence = { BEAT: BEAT, beatAt: beatAt, beatPhase: beatPhase };

  /* A Cardinal's Indulgence stops the whole Order — Apostles mid-step, Friars
   * mid-sweep. Both read it from one place so they can never disagree. */
  function stilled(world) {
    var p = world && world.player;
    return !!(p && p.has && p.has('stilled'));
  }

  // ================================================================ apostle

  /* Marches exactly one tile per chime, then stands. Turns about every fourth
   * beat, and at any wall or ledge. Stompable like anything else. */
  function Apostle(opts) {
    PL.Enemy.call(this, opts);
    this.w = 22; this.h = 30;
    this.x = opts.x + 5;
    this.y = opts.y + T - this.h;
    this.facing = (opts.tx % 2) ? 1 : -1;
    this.turnEvery = 4;
    this.lastBeat = -1;
    this.stepped = 0;
    this.censer = 0;
  }
  PL.extend(Apostle, PL.Enemy);

  Apostle.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;
    // Cardinal's Indulgence: signed, sealed, and they stop where they stand.
    if (stilled(world)) { this.lastBeat = -1; return; }

    this.vy = Math.min(this.vy + 0.55, 12);
    this.grounded = false;
    PL.Physics.moveY(this, world, this.vy);
    if (this.grounded) this.vy = 0;

    var beat = beatAt(world.time);
    var phase = beatPhase(world.time);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.stepped = 0;
      if (beat % this.turnEvery === 0) this.facing *= -1;
      this.censer = 1;
    }
    if (this.censer > 0) this.censer -= dt * 2.5;

    // The step happens in the first 55% of the beat; the rest is a hold.
    if (phase < 0.55 && this.grounded) {
      var move = (T / (BEAT * 0.55)) * dt;
      var aheadX = this.facing > 0 ? this.x + this.w + 3 : this.x - 3;
      if (!PL.Physics.groundUnder(world, aheadX, this.y + this.h + 4)) this.facing *= -1;
      else if (PL.Physics.moveX(this, world, move * this.facing)) this.facing *= -1;
      this.stepped += move;
    }

    if (PL.Physics.lethalOverlap(world, this)) { this.remove = true; }
    if (this.y > world.h + 80) this.remove = true;
  };

  Apostle.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    ctx.save();
    if (this.dying > 0) {
      ctx.translate(x + this.w / 2, y + this.h);
      ctx.scale(1.15, Math.max(0.1, this.dying / 0.45));
      ctx.translate(-this.w / 2, -this.h);
      x = 0; y = 0;
    }
    var f = this.facing;
    // pale robe, hard edges — nothing frayed in this town
    ctx.fillStyle = '#e2e8f1';
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 30);
    ctx.lineTo(x + 6, y + 10);
    ctx.lineTo(x + 16, y + 10);
    ctx.lineTo(x + 18, y + 30);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, x + 4, y + 27, 14, 3, '#b6c1d2');
    PL.gfx.rect(ctx, x + 10, y + 12, 2, 15, C.lantern);   // gold stripe
    // hood
    ctx.fillStyle = '#cdd6e4';
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 12); ctx.lineTo(x + 11, y + 1);
    ctx.lineTo(x + 17, y + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#25406b';
    ctx.fillRect(x + (f > 0 ? 11 : 8), y + 7, 4, 4);
    // swinging censer, brightest right on the beat
    var sw = Math.sin(this.t * 3) * 6;
    var cxp = x + (f > 0 ? 19 : 3) + sw * f * 0.4;
    ctx.strokeStyle = C.rope; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + (f > 0 ? 17 : 5), y + 14); ctx.lineTo(cxp, y + 22); ctx.stroke();
    var glow = 0.3 + Math.max(0, this.censer) * 0.6;
    PL.gfx.glow(ctx, cxp, y + 24, 18, 'rgba(255,215,122,0.9)', glow);
    PL.gfx.rect(ctx, cxp - 3, y + 21, 6, 6, C.lantern);
    ctx.restore();
  };

  // ================================================================== friar

  /* Stands his post and sweeps a lamp. Cross the beam and he fines you a few
   * barrels — no damage, but your purse is your health here. */
  function Friar(opts) {
    PL.Enemy.call(this, opts);
    this.w = 24; this.h = 32;
    this.x = opts.x + 4;
    this.y = opts.y + T - this.h;
    this.facing = (opts.tx % 2) ? 1 : -1;
    // He takes grog, never blood — walking into him is not supposed to be a
    // death on an empty purse, which is what inheriting Enemy's default made
    // it. He is still stompable if you would rather settle it that way.
    this.harmful = false;
    this.range = T * 5.5;
    this.cooldown = 0;
    this.alert = 0;
    this.lastBeat = -1;
    this.cull = false;
  }
  PL.extend(Friar, PL.Enemy);

  Friar.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;
    if (stilled(world)) { this.lastBeat = -1; this.alert = 0; return; }
    this.vy = Math.min(this.vy + 0.55, 12);
    this.grounded = false;
    PL.Physics.moveY(this, world, this.vy);
    if (this.grounded) this.vy = 0;

    // Turns on every second chime, so the safe window is countable.
    var beat = beatAt(world.time);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (beat % 2 === 0) this.facing *= -1;
    }

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.alert > 0) this.alert -= dt * 1.6;

    var p = world.player;
    if (!p || p.dead || p.frozen || this.cooldown > 0) return;
    if (p.has('purity')) return;                 // the Glyph answers for you

    if (this.sees(p, world)) {
      this.alert = 1;
      this.cooldown = 3.0;
      var fine = Math.min(4, p.grog);
      if (fine > 0) {
        p.grog -= fine;
        world.fx.label(p.cx(), p.y - 8, '-' + fine + ' FINED', C.hazard);
        for (var i = 0; i < fine; i++) {
          world.fx.burst(p.cx(), p.cy(), C.grogBand, 3,
                         { speed: 2.4, life: 0.5, angle: Math.atan2(this.cy() - p.cy(), this.cx() - p.cx()), spread: 0.5 });
        }
      } else {
        world.fx.label(p.cx(), p.y - 8, 'NOTHING TO TAKE', C.pale);
      }
      world.camera.kick(3);
      PL.Audio.sfx('fine');
    }
  };

  /** Line of sight along the lamp beam, blocked by solid tiles. */
  Friar.prototype.sees = function (p, world) {
    var eyeY = this.y + 10;
    if (Math.abs(p.cy() - eyeY) > 34) return false;
    var dx = p.cx() - this.cx();
    if (U.sign(dx) !== this.facing) return false;
    var dist = Math.abs(dx);
    if (dist > this.range) return false;
    var steps = Math.ceil(dist / T);
    for (var s = 1; s <= steps; s++) {
      var sx = this.cx() + this.facing * s * T;
      if (world.solidAt(Math.floor(sx / T), Math.floor(eyeY / T))) return false;
    }
    return true;
  };

  Friar.prototype.draw = function (ctx, cam) {
    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    var f = this.facing;

    // the beam, drawn first so the figure sits on top of it
    if (this.dying <= 0) {
      var hot = this.cooldown > 0 && this.alert <= 0;
      ctx.save();
      ctx.globalAlpha = this.alert > 0 ? 0.42 : (hot ? 0.10 : 0.24);
      var grad = ctx.createLinearGradient(x + 12, 0, x + 12 + f * this.range, 0);
      grad.addColorStop(0, this.alert > 0 ? 'rgba(212,87,78,0.9)' : 'rgba(255,215,122,0.9)');
      grad.addColorStop(1, 'rgba(255,215,122,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 10);
      ctx.lineTo(x + 12 + f * this.range, y - 8);
      ctx.lineTo(x + 12 + f * this.range, y + 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    if (this.dying > 0) {
      ctx.translate(x + this.w / 2, y + this.h);
      ctx.scale(1.15, Math.max(0.1, this.dying / 0.45));
      ctx.translate(-this.w / 2, -this.h);
      x = 0; y = 0;
    }
    // heavier robe than an apostle, and a ledger chained to the belt
    ctx.fillStyle = '#b9c4d4';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 32); ctx.lineTo(x + 5, y + 9);
    ctx.lineTo(x + 19, y + 9); ctx.lineTo(x + 22, y + 32);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, x + 2, y + 29, 20, 3, '#8c99ad');
    PL.gfx.rect(ctx, x + 6, y + 1, 12, 9, '#d7dfea');
    ctx.fillStyle = '#1b2c48';
    ctx.fillRect(x + (f > 0 ? 13 : 8), y + 5, 3, 3);
    PL.gfx.rect(ctx, x + 4, y + 18, 6, 8, C.lantern);      // the ledger
    // lamp
    var lx = x + (f > 0 ? 20 : 4);
    PL.gfx.rect(ctx, lx - 3, y + 6, 7, 9, '#5a6577');
    PL.gfx.rect(ctx, lx - 2, y + 8, 5, 5, this.alert > 0 ? C.hazard : C.lantern);
    PL.gfx.glow(ctx, lx, y + 10, 26, this.alert > 0
      ? 'rgba(212,87,78,0.8)' : 'rgba(255,215,122,0.7)', 0.55);
    ctx.restore();
  };

  // =================================================================== bell

  /* Scenery, but load-bearing scenery: it is the visible beat. */
  function Bell(opts) {
    E.call(this, opts);
    this.w = T; this.h = T * 2;
    this.x = opts.x; this.y = opts.y - T;
    this.decor = true;
    this.lastBeat = -1;
    this.ring = 0;
    this.cull = false;
  }
  PL.extend(Bell, E);

  Bell.prototype.update = function (dt, world) {
    this.t += dt;
    var beat = beatAt(world.time);
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      this.ring = 1;
      if (world.camera.sees(this.x, this.y, this.w, this.h, 200)) {
        PL.Audio.sfx(beat % 4 === 0 ? 'chimeLow' : 'chime');
      }
    }
    if (this.ring > 0) this.ring -= dt * 1.4;
  };

  Bell.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var swing = Math.max(0, this.ring) * Math.sin(this.t * 22) * 0.28;
    // frame
    PL.gfx.rect(ctx, x + 2, y, 4, 14, C.woodDark);
    PL.gfx.rect(ctx, x + T - 6, y, 4, 14, C.woodDark);
    PL.gfx.rect(ctx, x, y, T, 5, C.bone);
    ctx.save();
    ctx.translate(x + T / 2, y + 8);
    ctx.rotate(swing);
    PL.gfx.glow(ctx, 0, 12, 34, 'rgba(255,215,122,' + (0.3 + Math.max(0, this.ring) * 0.6) + ')', 0.5);
    ctx.fillStyle = '#c9a24a';
    ctx.beginPath();
    ctx.moveTo(-10, 22);
    ctx.quadraticCurveTo(-9, 2, 0, 0);
    ctx.quadraticCurveTo(9, 2, 10, 22);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8cf85';
    ctx.beginPath();
    ctx.moveTo(-6, 20); ctx.quadraticCurveTo(-5, 5, 0, 3);
    ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, -11, 21, 22, 3, '#8a6b2c');
    ctx.restore();
  };

  PL.Entities.define('apostle', Apostle);
  PL.Entities.define('friar', Friar);
  PL.Entities.define('bell', Bell);

  // =============================================================== backdrop

  function ProvidenceBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 5);
    this.spires = [];
    var x = -80;
    while (x < world.w * 0.5 + 900) {
      this.spires.push({ x: x, w: 26 + rnd() * 22, h: 90 + rnd() * 120, cross: rnd() > 0.5 });
      x += 110 + rnd() * 130;
    }
    this.terraces = [];
    x = -100;
    while (x < world.w * 0.8 + 900) {
      this.terraces.push({ x: x, w: 70 + rnd() * 60, h: 30 + rnd() * 46, tone: (rnd() * 3) | 0 });
      x += 78 + rnd() * 50;
    }
  }

  ProvidenceBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;
    var g = ctx.createLinearGradient(0, -camY * 0.15, 0, H - camY * 0.15 + 40);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.42, C.skyMid);
    g.addColorStop(0.76, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // a cold, high sun — order, not warmth
    var sunX = W * 0.5 - cam.x * 0.02;
    var sunY = H * 0.18 - camY * 0.08;
    PL.gfx.glow(ctx, sunX, sunY, 120, 'rgba(220,235,255,0.45)', 0.5);
    ctx.fillStyle = C.sunDisc;
    ctx.beginPath(); ctx.arc(sunX, sunY, 20, 0, Math.PI * 2); ctx.fill();

    // ruled cloud bands — even these are tidy
    ctx.save();
    for (var cl = 0; cl < 6; cl++) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#dbe7f2';
      var cy = 54 + cl * 26 - camY * 0.05;
      var cxp = ((cl * 210 - cam.x * 0.04) % (W + 400)) - 200;
      ctx.fillRect(cxp, cy, 150 + cl * 20, 3);
    }
    ctx.restore();

    // spires
    for (var s = 0; s < this.spires.length; s++) {
      var sp = this.spires[s];
      var sx = sp.x - cam.x * 0.16;
      if (sx < -80 || sx > W + 80) continue;
      var base = H * 0.72 - camY * 0.09;
      ctx.fillStyle = '#233a5c';
      ctx.fillRect(sx, base - sp.h, sp.w, sp.h);
      ctx.beginPath();
      ctx.moveTo(sx - 4, base - sp.h);
      ctx.lineTo(sx + sp.w + 4, base - sp.h);
      ctx.lineTo(sx + sp.w / 2, base - sp.h - 34);
      ctx.closePath(); ctx.fill();
      if (sp.cross) {
        ctx.fillStyle = C.lantern;
        ctx.fillRect(sx + sp.w / 2 - 1, base - sp.h - 48, 2, 14);
        ctx.fillRect(sx + sp.w / 2 - 5, base - sp.h - 43, 10, 2);
      }
      ctx.fillStyle = 'rgba(255,215,122,0.5)';
      for (var wdw = 0; wdw < 3; wdw++) {
        ctx.fillRect(sx + sp.w * 0.35, base - sp.h + 24 + wdw * 26, 6, 12);
      }
    }

    // lake, flat as a rule
    var lakeY = H * 0.74 - camY * 0.07;
    var lg = ctx.createLinearGradient(0, lakeY, 0, H);
    lg.addColorStop(0, C.seaSurf);
    lg.addColorStop(1, C.seaDeep);
    ctx.fillStyle = lg;
    ctx.fillRect(0, lakeY, W, H - lakeY);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#dbe7f2';
    for (var r = 0; r < 8; r++) ctx.fillRect(0, lakeY + 6 + r * 9, W, 1);
    ctx.restore();

    // terraced stone housing, all the same height rules
    var tones = ['#39506e', '#2e4360', '#455d7d'];
    for (var t2 = 0; t2 < this.terraces.length; t2++) {
      var te = this.terraces[t2];
      var tx = te.x - cam.x * 0.5;
      if (tx < -140 || tx > W + 140) continue;
      var gy = H - 14 - camY * 0.02;
      ctx.fillStyle = tones[te.tone];
      ctx.fillRect(tx, gy - te.h, te.w, te.h);
      ctx.fillStyle = '#1e2f47';
      ctx.fillRect(tx - 3, gy - te.h - 6, te.w + 6, 6);
      ctx.fillStyle = 'rgba(255,215,122,0.55)';
      for (var w2 = 0; w2 < 3; w2++) {
        ctx.fillRect(tx + 10 + w2 * 22, gy - te.h * 0.6, 7, 10);
      }
    }

    // the chime, made visible even where no bell is in shot
    var pulse = 1 - beatPhase(time);
    ctx.save();
    ctx.globalAlpha = 0.05 + pulse * pulse * 0.07;
    ctx.fillStyle = '#dbe7f2';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  PL.Backdrops.register('providence', function (world) { return new ProvidenceBackdrop(world); });

  // ================================================================== trial

  /* THE ORDER OF CHIMES — repeat the bells back in order. Providence does not
   * test your nerve, it tests whether you were paying attention. */
  var KEYS = ['left', 'down', 'up', 'right'];
  var KEY_GLYPH = ['←', '↓', '↑', '→'];
  var KEY_FREQ = [523, 659, 784, 1046];

  function OrderOfChimes() {
    this.round = 0;
    this.rounds = 3;
    this.graces = 3;
    this.seq = [];
    this.step = 0;
    this.mode = 'show';       // show | echo | pass | fail
    this.showIdx = -1;
    this.timer = 0.8;
    this.lit = -1;
    this.litT = 0;
    this.flash = 0;
    this.flashText = '';
    this.flashGood = false;
    this.reward = 0;
    this.newRound();
  }

  OrderOfChimes.prototype.newRound = function () {
    this.round++;
    var len = 2 + this.round;
    this.seq = [];
    for (var i = 0; i < len; i++) this.seq.push((Math.random() * 4) | 0);
    this.mode = 'show';
    this.showIdx = -1;
    this.step = 0;
    this.timer = 0.7;
  };

  OrderOfChimes.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.litT > 0) this.litT -= dt;
    if (this.litT <= 0) this.lit = -1;

    if (this.mode === 'show') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.showIdx++;
        if (this.showIdx >= this.seq.length) {
          this.mode = 'echo';
          this.step = 0;
        } else {
          this.lit = this.seq[this.showIdx];
          this.litT = 0.34;
          this.timer = 0.52;
          PL.Audio.tone(KEY_FREQ[this.lit], 0.4, 'sine', 0.26);
        }
      }
      return null;
    }

    if (this.mode === 'echo') {
      for (var k = 0; k < 4; k++) {
        if (!PL.Input.pressed(KEYS[k])) continue;
        this.lit = k;
        this.litT = 0.24;
        PL.Audio.tone(KEY_FREQ[k], 0.3, 'sine', 0.26);
        if (k === this.seq[this.step]) {
          this.step++;
          this.reward += 2;
          if (this.step >= this.seq.length) {
            this.flash = 0.6; this.flashGood = true; this.flashText = 'IN ORDER';
            this.reward += 5;
            if (this.round >= this.rounds) return 'won';
            this.newRound();
          }
        } else {
          this.graces--;
          this.flash = 0.6; this.flashGood = false; this.flashText = 'OUT OF ORDER';
          PL.Audio.sfx('trialMiss');
          if (this.graces <= 0) return 'lost';
          this.mode = 'show';
          this.showIdx = -1;
          this.step = 0;
          this.timer = 0.9;
        }
        break;
      }
    }
    return null;
  };

  OrderOfChimes.prototype.draw = function (ctx, scene) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var bx = W / 2 - 180, by = 150;
    PL.gfx.panel(ctx, bx - 14, by - 44, 388, 152, { r: 6 });

    PL.gfx.text(ctx, 'VERSE ' + this.round + ' OF ' + this.rounds, bx, by - 22,
      { font: PL.FONT.small, color: C.lanternHi });
    for (var g = 0; g < 3; g++) {
      var gx = bx + 346 - g * 16;
      ctx.fillStyle = g < this.graces ? C.lantern : 'rgba(242,227,196,0.18)';
      ctx.beginPath(); ctx.arc(gx, by - 26, 5, 0, Math.PI * 2); ctx.fill();
    }
    PL.gfx.text(ctx, 'GRACES', bx + 282, by - 22,
      { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)' });

    // four bells
    for (var i = 0; i < 4; i++) {
      var cx = bx + 46 + i * 90;
      var on = this.lit === i;
      if (on) PL.gfx.glow(ctx, cx, by + 34, 60, 'rgba(255,215,122,0.9)', 0.8);
      ctx.fillStyle = on ? '#f0d79a' : '#7a6a44';
      ctx.beginPath();
      ctx.moveTo(cx - 20, by + 56);
      ctx.quadraticCurveTo(cx - 18, by + 10, cx, by + 6);
      ctx.quadraticCurveTo(cx + 18, by + 10, cx + 20, by + 56);
      ctx.closePath(); ctx.fill();
      PL.gfx.rect(ctx, cx - 22, by + 54, 44, 5, on ? '#c9a24a' : '#514732');
      PL.gfx.text(ctx, KEY_GLYPH[i], cx, by + 44, {
        font: PL.FONT.title, align: 'center',
        color: on ? '#1b2c48' : 'rgba(27,44,72,0.55)'
      });
    }

    // progress pips for the echo
    var pipY = by + 78;
    for (var p = 0; p < this.seq.length; p++) {
      var px = W / 2 - (this.seq.length - 1) * 9 + p * 18;
      var done = this.mode === 'echo' && p < this.step;
      ctx.fillStyle = done ? C.lanternHi : 'rgba(242,227,196,0.22)';
      ctx.beginPath(); ctx.arc(px, pipY, 4, 0, Math.PI * 2); ctx.fill();
    }

    PL.gfx.text(ctx, this.mode === 'show' ? 'LISTEN' : 'ANSWER', W / 2, pipY + 26, {
      font: PL.FONT.head, align: 'center',
      color: this.mode === 'show' ? 'rgba(242,227,196,0.6)' : C.lanternHi
    });

    if (this.flash > 0 && scene.state === 'play') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flash * 1.8);
      PL.gfx.text(ctx, this.flashText, W / 2, pipY + 50, {
        font: PL.FONT.head, align: 'center',
        color: this.flashGood ? C.lanternHi : C.hazard
      });
      ctx.restore();
    }
    if (scene.state === 'play') {
      PL.gfx.text(ctx, 'Arrow keys — answer the bells in the order they rang',
        W / 2, H - 14, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)' });
    }
  };

  PL.Trials.register('orderOfChimes', {
    title: 'THE ORDER OF CHIMES',
    subtitle: 'Providence keeps time. You will keep it with them.',
    prompt: 'Listen to the bells, then answer them in order. Three graces. — SPACE to begin',
    winLine: 'The Apostles record that you were, on this occasion, orderly.',
    loseLine: 'A whole town of clocks and you could not keep one beat.',
    create: function () { return new OrderOfChimes(); }
  });

})(window.PL = window.PL || {});
