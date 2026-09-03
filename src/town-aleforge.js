/* town-aleforge.js — everything specific to Aleforge.
 *
 * Pattern for every town file: register a backdrop, define this town's
 * entities, register its trial. Nothing here is referenced from engine code —
 * level data reaches it all by glyph (see level.js MARKERS).
 *
 * Aleforge is the brewing capital: brick, copper and steam. Its hazards are
 * industrial rather than feral — kegs off a chute, the Wolendi wind farm, and
 * the CockPowers clock tower's gearing.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity, U = PL.util;

  // ============================================================== rolling kegs

  /* The keg itself: rolls in one direction, falls off ledges, bounces off
   * walls, and breaks when stomped. Spawned by a chute, never placed directly. */
  function Keg(opts) {
    PL.Enemy.call(this, opts);
    this.w = 26; this.h = 26;
    this.dir = opts.dir || -1;
    this.speed = opts.speed || 2.3;
    this.spin = 0;
    this.life = 14;
  }
  PL.extend(Keg, PL.Enemy);

  Keg.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.tickDeath(dt)) return;
    this.life -= dt;
    if (this.life <= 0) { this.remove = true; return; }

    this.vy = Math.min(this.vy + 0.6, 13);
    this.grounded = false;
    PL.Physics.moveY(this, world, this.vy);
    if (this.grounded) this.vy = 0;
    if (PL.Physics.moveX(this, world, this.speed * this.dir)) this.dir *= -1;
    this.spin += this.speed * this.dir * 0.09;

    if (PL.Physics.lethalOverlap(world, this)) {
      world.fx.burst(this.cx(), this.cy(), C.woodPale, 10, { speed: 2.4, life: 0.5 });
      this.remove = true;
    }
    if (this.y > world.h + 80) this.remove = true;
  };

  Keg.prototype.stomp = function (player, world) {
    PL.Enemy.prototype.stomp.call(this, player, world);
    world.fx.burst(this.cx(), this.cy(), C.grogBand, 14, { speed: 3, life: 0.6 });
    world.camera.kick(3);
  };

  Keg.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox() + this.w / 2;
    var y = this.y - cam.oy() + this.h / 2;
    ctx.save();
    ctx.translate(x, y);
    if (this.dying > 0) ctx.scale(1 + (0.45 - this.dying) * 2, Math.max(0.1, this.dying / 0.45));
    ctx.rotate(this.spin);
    ctx.fillStyle = C.grog;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a4a17';
    ctx.beginPath(); ctx.arc(0, 0, 13, -0.4, 0.9); ctx.lineTo(0, 0); ctx.fill();
    // iron bands read as spokes when it spins — that is the point
    ctx.strokeStyle = C.boneDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = C.grogBand;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-13, 0); ctx.lineTo(13, 0);
    ctx.moveTo(0, -13); ctx.lineTo(0, 13);
    ctx.stroke();
    ctx.restore();
  };

  /* The chute: a hopper bolted to the brickwork that lets one go on a cycle. */
  function KegChute(opts) {
    E.call(this, opts);
    this.w = T; this.h = T;
    this.period = 3.4;
    this.timer = 1.2 + ((opts.tx * 0.37) % 1) * 2;
    this.decor = true;      // never damages you itself
    this.cull = false;
    this.kick = 0;
  }
  PL.extend(KegChute, E);

  KegChute.prototype.update = function (dt, world) {
    this.t += dt;
    if (this.kick > 0) this.kick -= dt;
    // Only feed the level while the player can actually see it coming.
    if (!world.camera.sees(this.x, this.y, this.w, this.h, 420)) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.period;
      this.kick = 0.25;
      world.add(PL.Entities.create('keg', {
        x: this.x - 4, y: this.y + 6, tx: this.tx, ty: this.ty, dir: -1
      }));
      PL.Audio.sfx('crumble');
    }
  };

  KegChute.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var k = this.kick > 0 ? this.kick * 8 : 0;
    PL.gfx.rect(ctx, x - 4, y + 2, T + 8, 12, C.woodDark);
    PL.gfx.rect(ctx, x - 4, y + 2, T + 8, 4, '#b87333');
    ctx.fillStyle = C.wood;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 14);
    ctx.lineTo(x + T + 4, y + 14);
    ctx.lineTo(x + 2, y + 26 + k);
    ctx.closePath();
    ctx.fill();
    PL.gfx.glow(ctx, x + T / 2, y + 10, 26, 'rgba(255,157,61,0.35)', 0.3);
  };

  // ============================================================== wind gusts

  /* Wolendi updraft. The marker sits at the TOP of the column; the column runs
   * 2 tiles wide and 7 tall downward from it.
   *
   * Cycle: a short telegraph, a long lift, then a lateral SHEAR that will throw
   * you off the tower if you were still hanging in the air waiting. */
  var GUST_PERIOD = 3.6;
  function WindGust(opts) {
    E.call(this, opts);
    this.w = T * 2; this.h = T * 7;
    this.x = opts.x; this.y = opts.y;
    this.phase = ((opts.tx * 0.29 + opts.ty * 0.11) % 1) * GUST_PERIOD;
    this.shearDir = (opts.tx % 2) ? 1 : -1;
    this.mode = 'calm';
    this.strength = 0;
    this.cull = false;
    this.motes = [];
    for (var i = 0; i < 14; i++) {
      this.motes.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() });
    }
  }
  PL.extend(WindGust, E);

  WindGust.prototype.update = function (dt, world) {
    this.t += dt;
    var p = ((this.t + this.phase) % GUST_PERIOD) / GUST_PERIOD;
    if (p < 0.14) { this.mode = 'wind'; this.strength = p / 0.14; }
    else if (p < 0.56) { this.mode = 'lift'; this.strength = 1; }
    else if (p < 0.70) { this.mode = 'shear'; this.strength = 1; }
    else { this.mode = 'calm'; this.strength = Math.max(0, 1 - (p - 0.70) / 0.1); }

    for (var i = 0; i < this.motes.length; i++) {
      var m = this.motes[i];
      if (this.mode === 'lift' || this.mode === 'wind') {
        m.y -= dt * 0.75 * m.s * this.strength;
        if (m.y < 0) { m.y = 1; m.x = Math.random(); }
      } else if (this.mode === 'shear') {
        m.x += dt * 1.4 * m.s * this.shearDir;
        if (m.x < 0) m.x = 1; else if (m.x > 1) m.x = 0;
      }
    }

    var pl = world.player;
    if (!pl || pl.dead || pl.frozen) return;
    if (!U.overlaps(pl, this)) return;

    if (this.mode === 'lift') {
      // A hard ceiling on rise speed keeps it readable and survivable.
      pl.vy = Math.max(pl.vy - 0.92, -6.2);
      pl.grounded = false;
      if (Math.random() < 0.4) {
        world.fx.burst(pl.cx(), pl.y + pl.h, C.seaFoam, 1,
                       { speed: 0.8, life: 0.4, size: 2, grav: -0.05 });
      }
    } else if (this.mode === 'wind') {
      pl.vy = Math.max(pl.vy - 0.35 * this.strength, -3.5);
    } else if (this.mode === 'shear' && !pl.grounded) {
      pl.vx += this.shearDir * 0.55;
      pl.vx = U.clamp(pl.vx, -8, 8);
    }
  };

  WindGust.prototype.draw = function (ctx, cam) {
    var x = this.x - cam.ox(), y = this.y - cam.oy();
    var live = this.mode !== 'calm';
    ctx.save();
    ctx.globalAlpha = 0.10 + this.strength * 0.14;
    ctx.fillStyle = this.mode === 'shear' ? C.hazard : C.seaFoam;
    ctx.fillRect(x, y, this.w, this.h);
    ctx.restore();

    // the funnel walls, so the column reads as a place even when calm
    ctx.strokeStyle = 'rgba(246,207,130,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + this.h);
    ctx.moveTo(x + this.w - 0.5, y); ctx.lineTo(x + this.w - 0.5, y + this.h);
    ctx.stroke();
    ctx.setLineDash([]);

    if (live) {
      ctx.save();
      ctx.globalAlpha = 0.5 + this.strength * 0.45;
      ctx.fillStyle = this.mode === 'shear' ? C.hazard : C.seaFoam;
      for (var i = 0; i < this.motes.length; i++) {
        var m = this.motes[i];
        var mx = x + m.x * this.w, my = y + m.y * this.h;
        if (this.mode === 'shear') ctx.fillRect(mx, my, 7, 2);
        else ctx.fillRect(mx, my, 2, 7);
      }
      ctx.restore();
    }

    // state flag at the mouth of the column
    var label = this.mode === 'shear' ? '»' : (this.mode === 'calm' ? '·' : '▲');
    PL.gfx.text(ctx, this.shearDir < 0 && this.mode === 'shear' ? '«' : label,
      x + this.w / 2, y + 14, {
        font: PL.FONT.hud, align: 'center',
        color: this.mode === 'shear' ? C.hazard : (live ? C.seaFoam : 'rgba(246,207,130,0.4)')
      });
  };

  // =========================================================== clockwork

  /* A platform riding a gear's rim. Two tiles wide, circles the marker. */
  function GearPlatform(opts) {
    E.call(this, opts);
    this.w = T * 2; this.h = 12;
    this.hubX = opts.x + T; this.hubY = opts.y + T;
    this.radius = T * 2.4;
    this.rate = 0.62 * ((opts.tx % 2) ? -1 : 1);
    this.angle = ((opts.tx * 0.41 + opts.ty * 0.23) % 1) * Math.PI * 2;
    this.isPlatform = true;
    this.active = true;
    this.dx = 0; this.dy = 0;
    this.cull = false;
    this.place();
  }
  PL.extend(GearPlatform, E);

  GearPlatform.prototype.place = function () {
    this.x = this.hubX + Math.cos(this.angle) * this.radius - this.w / 2;
    this.y = this.hubY + Math.sin(this.angle) * this.radius - this.h / 2;
  };

  GearPlatform.prototype.update = function (dt) {
    this.t += dt;
    var px = this.x, py = this.y;
    this.angle += this.rate * dt;
    this.place();
    this.dx = this.x - px;
    this.dy = this.y - py;
  };

  GearPlatform.prototype.draw = function (ctx, cam) {
    var hx = this.hubX - cam.ox(), hy = this.hubY - cam.oy();
    // the gear it rides on
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#7d5340';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, this.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(this.angle * 0.6);
    ctx.fillStyle = '#b87333';
    for (var i = 0; i < 10; i++) {
      ctx.rotate(Math.PI * 2 / 10);
      ctx.fillRect(this.radius - 4, -3, 8, 6);
    }
    ctx.fillStyle = '#8a5a2c';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0a05a';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    var x = Math.round(this.x - cam.ox()), y = Math.round(this.y - cam.oy());
    PL.gfx.rect(ctx, x, y, this.w, this.h, '#4a3128');
    PL.gfx.rect(ctx, x, y, this.w, 3, '#b87333');
    ctx.fillStyle = '#7d5340';
    for (var g = 0; g < 6; g++) ctx.fillRect(x + 3 + g * 10, y + 4, 4, 6);
  };

  /* The clock hand. Sweeps a full circle; touching it costs you. */
  function ClockArm(opts) {
    E.call(this, opts);
    this.hubX = opts.x + T / 2; this.hubY = opts.y + T / 2;
    this.len = T * 3.4;
    this.rate = 0.75 * ((opts.ty % 2) ? -1 : 1);
    this.angle = ((opts.tx * 0.53) % 1) * Math.PI * 2;
    // Bounding box is the whole sweep; touch() does the real test.
    this.w = this.len * 2; this.h = this.len * 2;
    this.x = this.hubX - this.len; this.y = this.hubY - this.len;
    this.cull = false;
  }
  PL.extend(ClockArm, E);

  ClockArm.prototype.update = function (dt) {
    this.t += dt;
    this.angle += this.rate * dt;
  };

  ClockArm.prototype.touch = function (player, world) {
    if (player.invulnerable() || player.dead) return;
    // Distance from the player's centre to the arm segment.
    var ax = this.hubX, ay = this.hubY;
    var bx = ax + Math.cos(this.angle) * this.len;
    var by = ay + Math.sin(this.angle) * this.len;
    var px = player.cx(), py = player.cy();
    var vx = bx - ax, vy = by - ay;
    var len2 = vx * vx + vy * vy;
    var t = len2 ? U.clamp(((px - ax) * vx + (py - ay) * vy) / len2, 0, 1) : 0;
    var qx = ax + vx * t, qy = ay + vy * t;
    var d = Math.hypot(px - qx, py - qy);
    if (d < 14) player.hurt(world, U.sign(px - qx) || 1, true);
  };

  ClockArm.prototype.draw = function (ctx, cam) {
    var hx = this.hubX - cam.ox(), hy = this.hubY - cam.oy();
    ctx.save();
    ctx.translate(hx, hy);
    // faint dial so the sweep is predictable
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, this.len, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (this.len - 6), Math.sin(a) * (this.len - 6));
      ctx.lineTo(Math.cos(a) * this.len, Math.sin(a) * this.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.rotate(this.angle);
    ctx.fillStyle = C.hazardDark;
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(this.len - 10, -3);
    ctx.lineTo(this.len, 0); ctx.lineTo(this.len - 10, 3); ctx.lineTo(0, 6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.hazard;
    ctx.fillRect(6, -2, this.len - 14, 3);
    ctx.fillStyle = '#b87333';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  PL.Entities.define('keg', Keg);
  PL.Entities.define('kegChute', KegChute);
  PL.Entities.define('windGust', WindGust);
  PL.Entities.define('gearPlatform', GearPlatform);
  PL.Entities.define('clockArm', ClockArm);

  // ============================================================== backdrop

  function AleforgeBackdrop(world) {
    var seed = 0;
    for (var i = 0; i < world.id.length; i++) seed = (seed * 31 + world.id.charCodeAt(i)) | 0;
    var rnd = U.rng(seed || 3);
    this.stacks = [];
    var x = -60;
    while (x < world.w * 0.6 + 900) {
      this.stacks.push({ x: x, w: 16 + rnd() * 12, h: 60 + rnd() * 80, puff: rnd() * 6 });
      x += 90 + rnd() * 150;
    }
    this.roofs = [];
    x = -80;
    while (x < world.w * 0.8 + 900) {
      this.roofs.push({ x: x, w: 60 + rnd() * 70, h: 40 + rnd() * 44, tone: (rnd() * 3) | 0 });
      x += 80 + rnd() * 70;
    }
    // Placed in *screen* terms: at 0.18 parallax a world-space position this
    // far along would never scroll into view.
    this.towerX = PL.VIEW_W * 0.5 + (world.w - PL.VIEW_W) * 0.5 * 0.18;
  }

  AleforgeBackdrop.prototype.draw = function (ctx, cam, time) {
    var W = PL.VIEW_W, H = PL.VIEW_H, camY = cam.y;
    var g = ctx.createLinearGradient(0, -camY * 0.15, 0, H - camY * 0.15 + 40);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.4, C.skyMid);
    g.addColorStop(0.72, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var sunX = W * 0.22 - cam.x * 0.03;
    var sunY = H * 0.30 - camY * 0.1;
    PL.gfx.glow(ctx, sunX, sunY, 150, 'rgba(255,200,110,0.5)', 0.6);
    ctx.fillStyle = C.sunDisc;
    ctx.beginPath(); ctx.arc(sunX, sunY, 30, 0, Math.PI * 2); ctx.fill();

    // the CockPowers Clock Tower, visible from everywhere in town
    var tx = this.towerX - cam.x * 0.18;
    if (tx > -160 && tx < W + 160) {
      var ty = H * 0.72 - camY * 0.1;
      ctx.fillStyle = '#3a1f1c';
      ctx.fillRect(tx, ty - 210, 62, 210);
      ctx.fillStyle = '#4d2a22';
      ctx.fillRect(tx + 6, ty - 200, 50, 190);
      ctx.beginPath();
      ctx.moveTo(tx - 8, ty - 208); ctx.lineTo(tx + 70, ty - 208);
      ctx.lineTo(tx + 31, ty - 258); ctx.closePath();
      ctx.fillStyle = '#5a2f20'; ctx.fill();
      // the face
      PL.gfx.glow(ctx, tx + 31, ty - 170, 60, 'rgba(255,214,140,0.5)', 0.5);
      ctx.fillStyle = '#f0d79a';
      ctx.beginPath(); ctx.arc(tx + 31, ty - 170, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a2f20'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tx + 31, ty - 170, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx + 31, ty - 170);
      ctx.lineTo(tx + 31 + Math.cos(time * 0.5) * 15, ty - 170 + Math.sin(time * 0.5) * 15);
      ctx.moveTo(tx + 31, ty - 170);
      ctx.lineTo(tx + 31 + Math.cos(time * 0.13) * 9, ty - 170 + Math.sin(time * 0.13) * 9);
      ctx.stroke();
    }

    // brewery chimneys, steaming
    for (var s = 0; s < this.stacks.length; s++) {
      var st = this.stacks[s];
      var sx = st.x - cam.x * 0.3;
      if (sx < -80 || sx > W + 80) continue;
      var base = H * 0.80 - camY * 0.06;
      ctx.fillStyle = '#432420';
      ctx.fillRect(sx, base - st.h, st.w, st.h);
      ctx.fillStyle = '#5c3128';
      ctx.fillRect(sx, base - st.h, 4, st.h);
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#f6cf82';
      for (var p = 0; p < 4; p++) {
        var pt = ((time * 0.35 + st.puff + p * 0.25) % 1);
        ctx.beginPath();
        ctx.arc(sx + st.w / 2 + Math.sin(pt * 5 + s) * 14, base - st.h - pt * 90,
                8 + pt * 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // near roofline of brick halls
    var tones = ['#4a2620', '#5c3226', '#3e211d'];
    for (var r = 0; r < this.roofs.length; r++) {
      var rf = this.roofs[r];
      var rx = rf.x - cam.x * 0.55;
      if (rx < -140 || rx > W + 140) continue;
      var gy = H - 18 - camY * 0.02;
      ctx.fillStyle = tones[rf.tone];
      ctx.fillRect(rx, gy - rf.h, rf.w, rf.h);
      ctx.fillStyle = '#2c1714';
      ctx.beginPath();
      ctx.moveTo(rx - 6, gy - rf.h);
      ctx.lineTo(rx + rf.w + 6, gy - rf.h);
      ctx.lineTo(rx + rf.w * 0.5, gy - rf.h - 16);
      ctx.closePath(); ctx.fill();
      var flick = 0.75 + Math.sin(time * 5 + r) * 0.14;
      ctx.fillStyle = 'rgba(255,190,110,' + (0.75 * flick) + ')';
      ctx.fillRect(rx + rf.w * 0.28, gy - rf.h * 0.55, 10, 9);
      PL.gfx.glow(ctx, rx + rf.w * 0.28 + 5, gy - rf.h * 0.55 + 4, 36,
                  'rgba(255,157,61,0.4)', 0.4 * flick);
    }

    var haze = ctx.createLinearGradient(0, H * 0.5, 0, H);
    haze.addColorStop(0, 'rgba(255,150,60,0)');
    haze.addColorStop(1, 'rgba(255,140,50,0.16)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, W, H);
  };

  PL.Backdrops.register('aleforge', function (world) { return new AleforgeBackdrop(world); });

  // ================================================================= trial

  /* THE GOLDEN TAPS — a reaction test, not a rhythm one. Wait for the tap to
   * run green, then drink. Jumping the gun is how you lose. */
  function GoldenTaps() {
    this.needed = 5;
    this.hits = 0;
    this.faults = 0;
    this.state = 'wait';        // wait | pour | done
    this.timer = 0.9 + Math.random() * 1.3;
    this.window = 0.6;
    this.flash = 0;
    this.flashText = '';
    this.flashGood = false;
    this.reward = 0;
    this.best = 0;
    this.lastMs = 0;
  }

  GoldenTaps.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt);
    var pressed = PL.Input.pressed('jump') || PL.Input.pressed('confirm');

    if (this.state === 'wait') {
      this.timer -= dt;
      if (pressed) {
        this.faults++;
        this.flash = 0.5; this.flashGood = false; this.flashText = 'TOO EAGER';
        PL.Audio.sfx('trialMiss');
        this.timer = 0.9 + Math.random() * 1.3;
        if (this.faults >= 3) return 'lost';
      } else if (this.timer <= 0) {
        this.state = 'pour';
        this.timer = this.window;
        PL.Audio.sfx('trialHit');
      }
      return null;
    }

    if (this.state === 'pour') {
      this.timer -= dt;
      if (pressed) {
        var reaction = this.window - this.timer;
        this.lastMs = Math.round(reaction * 1000);
        var clean = reaction < 0.26;
        this.hits++;
        this.reward += clean ? 5 : 3;
        this.flash = 0.5; this.flashGood = true;
        this.flashText = clean ? 'CLEAN — ' + this.lastMs + 'ms' : 'DOWN IT — ' + this.lastMs + 'ms';
        PL.Audio.sfx('grog');
        if (this.hits >= this.needed) return 'won';
        this.state = 'wait';
        this.window = Math.max(0.36, this.window - 0.05);
        this.timer = 0.9 + Math.random() * 1.4;
      } else if (this.timer <= 0) {
        this.faults++;
        this.flash = 0.5; this.flashGood = false; this.flashText = 'SLEPT ON IT';
        PL.Audio.sfx('trialMiss');
        this.state = 'wait';
        this.timer = 0.9 + Math.random() * 1.3;
        if (this.faults >= 3) return 'lost';
      }
    }
    return null;
  };

  GoldenTaps.prototype.draw = function (ctx, scene) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var live = this.state === 'pour';

    // the bar back: five brass taps over a trough
    var bx = W / 2 - 190, by = 150;
    PL.gfx.panel(ctx, bx - 14, by - 44, 408, 150, { r: 6 });
    PL.gfx.text(ctx, 'DRAINED  ' + this.hits + ' / ' + this.needed, bx, by - 22,
      { font: PL.FONT.small, color: C.lanternHi });
    for (var f = 0; f < 3; f++) {
      var fx2 = bx + 366 - f * 16;
      ctx.fillStyle = f < (3 - this.faults) ? C.grogBand : 'rgba(242,227,196,0.18)';
      ctx.beginPath(); ctx.arc(fx2, by - 26, 5, 0, Math.PI * 2); ctx.fill();
    }
    PL.gfx.text(ctx, 'FAULTS', bx + 300, by - 22,
      { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)' });

    for (var i = 0; i < 5; i++) {
      var tx2 = bx + 24 + i * 82;
      var filled = i < this.hits;
      // tap
      PL.gfx.rect(ctx, tx2 - 4, by - 12, 8, 22, '#8a5a2c');
      PL.gfx.rect(ctx, tx2 - 12, by - 16, 24, 6, '#b87333');
      // glass
      PL.gfx.rect(ctx, tx2 - 14, by + 14, 28, 42, '#3a2018');
      if (filled) {
        PL.gfx.rect(ctx, tx2 - 11, by + 22, 22, 31, '#e09a2c');
        PL.gfx.rect(ctx, tx2 - 11, by + 18, 22, 6, '#fbf3dc');
      }
      if (live && i === this.hits) {
        PL.gfx.glow(ctx, tx2, by + 20, 46, 'rgba(255,214,110,0.85)', 0.75);
        PL.gfx.rect(ctx, tx2 - 3, by + 6, 6, 12, '#f7c65c');
      }
    }

    // the signal lamp — the only thing you should be watching
    var lampY = by + 78;
    ctx.fillStyle = live ? '#5cd97a' : '#5a2018';
    PL.gfx.roundRect(ctx, W / 2 - 62, lampY, 124, 26, 6);
    ctx.fill();
    if (live) PL.gfx.glow(ctx, W / 2, lampY + 13, 74, 'rgba(92,217,122,0.8)', 0.7);
    PL.gfx.text(ctx, live ? 'POUR!' : 'HOLD', W / 2, lampY + 18, {
      font: PL.FONT.head, align: 'center', color: live ? '#0e2a14' : 'rgba(242,227,196,0.5)'
    });

    if (this.flash > 0 && scene.state === 'play') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.flash * 2);
      PL.gfx.text(ctx, this.flashText, W / 2, lampY + 52, {
        font: PL.FONT.head, align: 'center',
        color: this.flashGood ? C.lanternHi : C.hazard
      });
      ctx.restore();
    }
    if (scene.state === 'play') {
      PL.gfx.text(ctx, 'SPACE / ENTER the instant the lamp turns — not a breath before',
        W / 2, H - 14, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)' });
    }
  };

  PL.Trials.register('goldenTaps', {
    title: 'THE GOLDEN TAPS',
    subtitle: 'Aleforge house rules — five glasses, and never touch a tap early.',
    prompt: 'Drink when the lamp goes green. Three faults and you are out. — SPACE to begin',
    winLine: 'Five clean. The barman writes your name down without being asked.',
    loseLine: 'Thrown out of a brewery. In Aleforge. Think about that.',
    create: function () { return new GoldenTaps(); }
  });

})(window.PL = window.PL || {});
