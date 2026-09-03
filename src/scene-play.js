/* scene-play.js — the level runner. Owns the world, the player, the clock and
 * the transitions in and out of a run.
 *
 * TIMER RULE: the clock starts the instant control is handed over and runs
 * continuously until the tankard is touched. Dying does NOT reset it — only
 * the player's position resets. Checkpoint efficiency is the whole point.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function PlayScene(def, meta) {
    this.def = def;
    this.meta = meta || {};
    this.opaque = true;
  }

  PlayScene.prototype.enter = function () {
    var self = this;
    var world = (this.world = PL.Level.build(this.def));
    world.fx = new PL.Fx();
    world.camera = this.camera = new PL.Camera(world.w, world.h);
    this.backdrop = PL.Backdrops.create(world);
    this.quips = new PL.QuipBox();

    var p = (this.player = new PL.Player({ x: world.spawn.x, y: world.spawn.y }));
    world.player = p;

    this.elapsedMs = 0;
    this.finished = false;
    this.goalT = 0;
    this.respawnT = 0;
    this.introT = 2.1;
    this.fadeIn = 1;
    this.checkpointFlash = 0;
    this.trialActive = false;
    this.trialBonus = 0;

    world.onGoal = function () { self.reachGoal(); };
    world.onDeath = function () { self.respawnT = 1.35; };
    world.onTrial = function (gate) {
      self.trialActive = true;
      p.frozen = true;
      PL.Game.push(new PL.TrialScene(self, gate));
    };

    this.camera.follow(p, true);
  };

  PlayScene.prototype.resumed = function () {
    // Coming back from the trial or the pause overlay.
    if (this.trialActive) {
      this.trialActive = false;
      this.player.frozen = false;
    }
  };

  // ------------------------------------------------------------------ update

  PlayScene.prototype.update = function (dt) {
    var world = this.world, p = this.player;
    world.time += dt;
    this.fadeIn = Math.max(0, this.fadeIn - dt * 1.6);
    if (this.introT > 0) this.introT -= dt;
    if (this.checkpointFlash > 0) this.checkpointFlash -= dt;

    if (PL.Input.pressed('pause') || PL.Input.pressed('back')) {
      PL.Game.push(new PauseScene(this));
      return;
    }
    if (PL.Input.pressed('restart') && !this.finished) {
      PL.Game.replace(new PlayScene(this.def, this.meta));
      return;
    }

    if (!this.finished) this.elapsedMs += dt * 1000;

    // --- goal sequence ----------------------------------------------------
    if (this.finished) {
      this.goalT += dt;
      world.fx.update(dt);
      this.camera.update();
      if (this.goalT > 1.7) this.showResults();
      return;
    }

    // --- entities ---------------------------------------------------------
    var ents = world.entities;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.remove) continue;
      if (e.cull && !this.camera.sees(e.x, e.y, e.w, e.h, 140)) continue;
      if (e.update) e.update(dt, world);
    }

    p.update(dt, world);

    // --- player vs entities ----------------------------------------------
    if (!p.dead) {
      var pb = { x: p.x + 2, y: p.y + 2, w: p.w - 4, h: p.h - 3 };
      for (var j = 0; j < ents.length; j++) {
        var en = ents[j];
        if (en.remove || en.decor) continue;
        if (!U.overlaps(pb, en)) continue;

        if (en instanceof PL.Enemy) {
          if (!en.harmful) continue;
          var wasAbove = (p.y + p.h) - p.vy <= en.y + 10;
          if (en.stompable && p.vy > 0.5 && wasAbove) {
            en.stomp(p, world);
            p.vy = PL.Input.down('jump') ? -11.0 : -8.2;
            p.grounded = false;
            this.camera.kick(3);
          } else if (!p.invulnerable()) {
            p.hurt(world, U.sign(p.cx() - en.cx()) || 1);
          }
        } else if (en.touch) {
          en.touch(p, world);
          // A freshly raised Captain's Flag flashes a confirmation in the HUD.
          if (en.lit && en.pop > 0.5) this.checkpointFlash = 2.0;
        }
      }
    }

    // --- quips ------------------------------------------------------------
    for (var q = 0; q < world.quipZones.length; q++) {
      var z = world.quipZones[q];
      if (z.fired) continue;
      if (U.overlaps(p, z)) {
        z.fired = true;
        this.quips.say(z.text, p);
      }
    }
    this.quips.update(dt);

    // --- housekeeping -----------------------------------------------------
    for (var k = ents.length - 1; k >= 0; k--) {
      if (ents[k].remove) {
        var dead = ents.splice(k, 1)[0];
        if (dead.isPlatform) {
          var pi = world.platforms.indexOf(dead);
          if (pi >= 0) world.platforms.splice(pi, 1);
        }
      }
    }

    world.fx.update(dt);
    this.camera.update();
    if (!p.dead) this.camera.follow(p);

    // --- respawn ----------------------------------------------------------
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        p.respawn(world);
        this.camera.follow(p, true);
        this.fadeIn = 0.8;
      }
    }
  };

  PlayScene.prototype.onTrialPassed = function (bonus) {
    this.trialActive = false;
    this.player.frozen = false;
    if (bonus) {
      this.player.addGrog(bonus);
      this.trialBonus = bonus;
      this.world.fx.label(this.player.cx(), this.player.y - 8, '+' + bonus + ' GROG', C.grogBand);
    }
  };

  PlayScene.prototype.onTrialFailed = function () {
    this.trialActive = false;
    this.player.frozen = false;
    this.player.kill(this.world, 'water');
  };

  PlayScene.prototype.reachGoal = function () {
    if (this.finished) return;
    this.finished = true;
    this.goalT = 0;
    var p = this.player, t = this.world.tankard;
    p.frozen = true;
    p.vx = 0;
    // Dive into the foam.
    p.x = t.x + t.w / 2 - p.w / 2;
    p.y = t.y + 10;
    this.world.fx.splash(t.x + t.w / 2, t.y + 16);
    this.world.fx.burst(t.x + t.w / 2, t.y + 18, '#fbf3dc', 26, { speed: 3.6, lift: 2.6, life: 1.0 });
    this.camera.kick(8);
    PL.Audio.sfx('splash');
    setTimeout(function () { PL.Audio.sfx('trialWin'); }, 380);
  };

  PlayScene.prototype.showResults = function () {
    var p = this.player;
    var run = {
      timeMs: this.elapsedMs,
      grog: p.grog,
      shards: p.shards.length,
      deaths: p.deaths
    };
    PL.Store.collectShards(this.def.town, p.shards);
    PL.Store.completeLevel(this.def.town, this.def.id, p.grog);
    var result = PL.Store.recordRun(this.def.town, this.def.id, run);
    PL.Game.replace(new PL.CompleteScene(this.def, this.meta, run, result));
  };

  // -------------------------------------------------------------------- draw

  PlayScene.prototype.draw = function (ctx) {
    var world = this.world, cam = this.camera, p = this.player;
    var W = PL.VIEW_W, H = PL.VIEW_H;

    this.backdrop.draw(ctx, cam, world.time);
    world.drawTerrain(ctx, cam);

    var ents = world.entities;
    // decor first, then everything else, so lanterns sit behind actors
    for (var d = 0; d < ents.length; d++) {
      if (ents[d].decor && cam.sees(ents[d].x, ents[d].y, ents[d].w, ents[d].h)) ents[d].draw(ctx, cam);
    }
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.decor) continue;
      if (!cam.sees(e.x, e.y, e.w, e.h)) continue;
      e.draw(ctx, cam);
    }

    if (!this.finished || this.goalT < 0.45) p.draw(ctx, cam);
    world.fx.draw(ctx, cam);

    // dusk vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(14,8,14,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // ClockHeart tints the whole scene — day order, night revelry
    if (p.tonic > 0) {
      var pulse = (Math.sin(world.time * 3) + 1) / 2;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.20 + pulse * 0.12;
      ctx.fillStyle = pulse > 0.5 ? C.teal : C.lantern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // The Hollow Urn drains the world of colour along with your soul.
    if (p.urn > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = C.pale;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    PL.HUD.draw(ctx, this);
    this.quips.draw(ctx, cam);

    // level card
    if (this.introT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.introT / 0.5);
      PL.gfx.panel(ctx, W / 2 - 150, H / 2 - 40, 300, 74, { r: 6 });
      PL.gfx.text(ctx, (this.meta.townName || 'SHANTY TOWN').toUpperCase(), W / 2, H / 2 - 18, {
        font: PL.FONT.small, align: 'center', color: C.lantern
      });
      PL.gfx.text(ctx, this.def.name, W / 2, H / 2 + 4, {
        font: PL.FONT.head, align: 'center', color: C.parchment
      });
      PL.gfx.text(ctx, this.def.blurb || '', W / 2, H / 2 + 22, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)'
      });
      ctx.restore();
    }

    // fades
    if (this.fadeIn > 0) {
      ctx.save();
      ctx.globalAlpha = U.clamp(this.fadeIn, 0, 1);
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    if (this.respawnT > 0 && this.respawnT < 0.6) {
      ctx.save();
      ctx.globalAlpha = 1 - this.respawnT / 0.6;
      ctx.fillStyle = C.ink;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // splash-into-foam wipe on level end
    if (this.finished) {
      var f = U.clamp((this.goalT - 0.5) / 1.0, 0, 1);
      ctx.save();
      ctx.globalAlpha = f;
      ctx.fillStyle = '#fbf3dc';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = f * 0.6;
      ctx.fillStyle = '#e6dcc2';
      for (var b = 0; b < 26; b++) {
        var bx = (b * 61 + Math.sin(b) * 30) % W;
        var by = H - ((this.goalT * 220 + b * 37) % (H + 80));
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (b % 5) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------- pause

  function PauseScene(play) {
    this.play = play;
    this.opaque = false;
    this.sel = 0;
    this.options = ['Resume', 'Restart level', 'Level select', 'Abandon to title'];
  }

  PauseScene.prototype.update = function () {
    var In = PL.Input;
    if (In.pressed('up')) { this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('pause') || In.pressed('back')) { PL.Game.pop(); return; }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      switch (this.sel) {
        case 0: PL.Game.pop(); break;
        case 1: PL.Game.pop(); PL.Game.replace(new PlayScene(this.play.def, this.play.meta)); break;
        case 2: PL.Game.reset(new PL.LevelSelectScene(this.play.def.town)); break;
        case 3: PL.Game.reset(new PL.TitleScene()); break;
      }
    }
  };

  PauseScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    PL.gfx.panel(ctx, W / 2 - 110, H / 2 - 78, 220, 156, { r: 6 });
    PL.gfx.text(ctx, 'ANCHORED', W / 2, H / 2 - 50, {
      font: PL.FONT.head, align: 'center', color: C.lanternHi
    });
    for (var i = 0; i < this.options.length; i++) {
      var y = H / 2 - 20 + i * 24;
      var on = i === this.sel;
      if (on) {
        PL.gfx.rect(ctx, W / 2 - 92, y - 13, 184, 20, 'rgba(255,179,71,0.16)');
        PL.gfx.text(ctx, '>', W / 2 - 84, y, { font: PL.FONT.hud, color: C.lantern });
      }
      PL.gfx.text(ctx, this.options[i], W / 2, y, {
        font: PL.FONT.hud, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.55)'
      });
    }
    PL.gfx.text(ctx, 'ESC resumes · M mutes', W / 2, H / 2 + 66, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.45)'
    });
  };

  PL.PlayScene = PlayScene;
  PL.PauseScene = PauseScene;

})(window.PL = window.PL || {});
