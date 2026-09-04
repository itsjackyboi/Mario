/* trials.js — the town Trials: short, self-contained skill tests that sit just
 * before a town's final tankard.
 *
 * A trial is registered by id and referenced from level data (`trial: 'id'`).
 * The trial gate entity pushes TrialScene, which runs on top of the paused
 * level and keeps the level clock ticking. Pass and the gate opens; fail and
 * you die and respawn at the Captain's Flag — the clock never stops.
 *
 * Shanty Town's trial is THE PLANK POUR: walk the plank, take five clean
 * swigs off a swinging tankard. Mistime three and the drink takes you.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var registry = {};
  PL.Trials = {
    register: function (id, def) { registry[id] = def; },
    get: function (id) { return registry[id]; }
  };

  // --------------------------------------------------------------- the scene

  function TrialScene(play, gate) {
    this.opaque = false;           // the level stays visible underneath
    this.play = play;
    this.gate = gate;
    this.def = PL.Trials.get(gate.trial) || PL.Trials.get('plankPour');
    this.trial = this.def.create(this);
    this.t = 0;
    this.state = 'intro';          // intro | play | won | lost
    this.stateT = 0;
    this.fade = 0;
  }

  TrialScene.prototype.update = function (dt) {
    this.t += dt;
    this.stateT += dt;
    this.fade = Math.min(1, this.fade + dt * 4);
    /* The level clock keeps running through the trial — and it has to be
     * `levelMs` that runs, not `elapsedMs`.
     *
     * PlayScene recomputes `elapsedMs = baseMs + levelMs` on every frame it
     * owns, so time added to `elapsedMs` here survived exactly until control
     * came back and was then overwritten. The HUD showed the clock running,
     * this comment said it ran, and none of it was ever banked: ten seconds in
     * the Plank Pour moved the recorded time by a single frame. Adding to
     * `levelMs` puts it where the recompute reads from, so the trial costs
     * what it looks like it costs, on the board and in a speedrun alike. */
    this.play.levelMs += dt * 1000;
    this.play.elapsedMs = this.play.baseMs + this.play.levelMs;

    if (this.state === 'intro') {
      if (this.stateT > 1.5 || PL.Input.pressed('jump') || PL.Input.pressed('confirm')) {
        this.state = 'play';
        this.stateT = 0;
      }
      return;
    }

    if (this.state === 'play') {
      var r = this.trial.update(dt);
      if (r === 'won') { this.state = 'won'; this.stateT = 0; PL.Audio.sfx('trialWin'); }
      else if (r === 'lost') { this.state = 'lost'; this.stateT = 0; PL.Audio.sfx('splash'); }
      return;
    }

    if (this.state === 'won' && this.stateT > 1.6) {
      this.gate.passed = true;
      this.gate.armed = false;
      this.play.onTrialPassed(this.trial.reward || 0);
      PL.Game.pop();
      return;
    }
    if (this.state === 'lost' && this.stateT > 1.4) {
      this.gate.armed = true;
      this.play.onTrialFailed();
      PL.Game.pop();
      return;
    }
  };

  TrialScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    ctx.save();
    ctx.globalAlpha = 0.92 * this.fade;
    ctx.fillStyle = 'rgba(12,8,12,1)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    this.trial.draw(ctx, this);

    // Title bar
    PL.gfx.text(ctx, this.def.title, W / 2, 40, {
      font: PL.FONT.head, align: 'center', color: C.lanternHi
    });
    PL.gfx.text(ctx, this.def.subtitle, W / 2, 58, {
      font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.65)'
    });
    // The level clock is still running — keep it visible.
    PL.gfx.text(ctx, PL.util.formatTime(this.play.elapsedMs), W - 12, 24, {
      font: PL.FONT.hud, align: 'right', color: C.parchment
    });

    if (this.state === 'intro') {
      PL.gfx.text(ctx, this.def.prompt, W / 2, 268, {
        font: PL.FONT.body, align: 'center', color: C.parchment
      });
    } else if (this.state === 'won' || this.state === 'lost') {
      // Sits below the pour meter so it never covers it.
      var won = this.state === 'won';
      var ry = 252;
      PL.gfx.panel(ctx, W / 2 - 170, ry, 340, 62);
      PL.gfx.text(ctx, won ? 'TRIAL PASSED' : 'IN THE DRINK', W / 2, ry + 26, {
        font: PL.FONT.head, align: 'center', color: won ? C.lanternHi : C.coral
      });
      PL.gfx.text(ctx, won ? this.def.winLine : this.def.loseLine, W / 2, ry + 46, {
        font: PL.FONT.small, align: 'center', color: C.parchment
      });
    }
  };

  PL.TrialScene = TrialScene;

  // ----------------------------------------------------- THE PLANK POUR

  function PlankPour(scene) {
    this.scene = scene;
    this.needed = 5;
    this.hits = 0;
    this.balance = 3;
    this.pos = 0.08;
    this.dir = 1;
    this.speed = 0.58;
    this.half = 0.115;
    this.target = 0.5;
    this.tilt = 0;
    this.tiltVel = 0;
    this.flash = 0;
    this.flashGood = false;
    this.reward = 0;
    this.lockout = 0;
    this.newTarget();
  }

  PlankPour.prototype.newTarget = function () {
    var t;
    do { t = 0.14 + Math.random() * 0.72; } while (Math.abs(t - this.pos) < 0.2);
    this.target = t;
  };

  PlankPour.prototype.update = function (dt) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.lockout > 0) this.lockout -= dt;

    // the tankard swings back and forth along the plank
    this.pos += this.dir * this.speed * dt;
    if (this.pos > 1) { this.pos = 1; this.dir = -1; }
    if (this.pos < 0) { this.pos = 0; this.dir = 1; }

    // the plank never quite settles
    this.tiltVel += (-this.tilt * 5.5) * dt;
    this.tiltVel *= 0.94;
    this.tilt += this.tiltVel * dt;
    this.tilt += Math.sin(this.scene.t * 2.1) * 0.0006 * (4 - this.balance);

    if (this.lockout <= 0 && (PL.Input.pressed('jump') || PL.Input.pressed('confirm'))) {
      var d = Math.abs(this.pos - this.target);
      if (d <= this.half) {
        var perfect = d <= this.half * 0.34;
        this.hits++;
        this.reward += perfect ? 5 : 3;
        this.flash = 0.35;
        this.flashGood = true;
        this.perfect = perfect;
        this.tiltVel += (Math.random() - 0.5) * 0.6;
        this.lockout = 0.16;
        PL.Audio.sfx('trialHit');
        if (this.hits >= this.needed) return 'won';
        this.speed = 0.58 + this.hits * 0.17;
        this.half = Math.max(0.052, 0.115 - this.hits * 0.014);
        this.newTarget();
      } else {
        this.balance--;
        this.flash = 0.45;
        this.flashGood = false;
        this.tiltVel += (this.pos < this.target ? -1 : 1) * 2.6;
        this.lockout = 0.3;
        PL.Audio.sfx('trialMiss');
        if (this.balance <= 0) return 'lost';
      }
    }
    return null;
  };

  PlankPour.prototype.draw = function (ctx, scene) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var barX = 80, barW = W - 160, barY = 186, barH = 28;
    var plankY = H - 62;
    var seaY = H - 44;

    // --- sea below the plank ---------------------------------------------
    var sg = ctx.createLinearGradient(0, seaY, 0, H);
    sg.addColorStop(0, C.seaMid);
    sg.addColorStop(1, C.seaDeep);
    ctx.fillStyle = sg;
    ctx.fillRect(0, seaY, W, H - seaY);
    ctx.fillStyle = C.seaSurf;
    for (var s = 0; s < W; s += 16) {
      ctx.fillRect(s, seaY + Math.sin(scene.t * 2 + s * 0.05) * 3, 12, 3);
    }

    // --- the plank, tilting ----------------------------------------------
    ctx.save();
    ctx.translate(W / 2, plankY);
    ctx.rotate(this.tilt);
    PL.gfx.plank(ctx, -190, 0, 380, 16, C.wood, C.woodDark);
    PL.gfx.rect(ctx, -190, 0, 380, 3, C.woodPale);

    // our pirate, out on the end of it
    var px = 96;
    ctx.save();
    ctx.translate(px, 0);
    ctx.rotate(-this.tilt * 0.35);
    drawLittlePirate(ctx, -10, -30, this.flash > 0 && !this.flashGood, scene.t);
    ctx.restore();

    // an old salt watching, unimpressed
    ctx.save();
    ctx.translate(-140, 0);
    ctx.fillStyle = '#2a1e24';
    ctx.fillRect(-9, -30, 18, 30);
    ctx.fillRect(-13, -34, 26, 5);
    PL.gfx.glow(ctx, 12, -20, 20, 'rgba(255,139,66,0.7)', 0.5);
    ctx.fillStyle = C.flame;
    ctx.fillRect(10, -22, 3, 3);   // his pipe ember
    ctx.restore();
    ctx.restore();

    // --- the pour meter ---------------------------------------------------
    PL.gfx.panel(ctx, barX - 8, barY - 26, barW + 16, barH + 46, { r: 6 });
    PL.gfx.text(ctx, 'SWIGS  ' + this.hits + ' / ' + this.needed, barX, barY - 10, {
      font: PL.FONT.small, color: C.lanternHi
    });
    // balance pips
    for (var b = 0; b < 3; b++) {
      var bx = barX + barW - 14 - b * 16;
      ctx.fillStyle = b < this.balance ? C.grogBand : 'rgba(242,227,196,0.18)';
      ctx.beginPath(); ctx.arc(bx, barY - 14, 5, 0, Math.PI * 2); ctx.fill();
    }
    PL.gfx.text(ctx, 'FOOTING', barX + barW - 58, barY - 10, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.55)'
    });

    // the trough of beer
    PL.gfx.rect(ctx, barX, barY, barW, barH, '#2a1c1c');
    PL.gfx.rect(ctx, barX + 2, barY + 2, barW - 4, barH - 4, '#8a5a20');
    ctx.fillStyle = '#e09a2c';
    ctx.fillRect(barX + 2, barY + 8, barW - 4, barH - 10);

    // the sweet spot — where the foam is thickest
    var tx = barX + this.target * barW;
    var tw = this.half * barW;
    ctx.save();
    ctx.globalAlpha = 0.9;
    PL.gfx.rect(ctx, tx - tw, barY + 2, tw * 2, barH - 4, 'rgba(251,243,220,0.85)');
    PL.gfx.rect(ctx, tx - tw * 0.34, barY + 2, tw * 0.68, barH - 4, 'rgba(255,232,170,0.95)');
    ctx.restore();
    ctx.strokeStyle = C.lanternHi;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx - tw + 0.5, barY + 2.5, tw * 2 - 1, barH - 5);

    // the swinging tankard
    var mx = barX + this.pos * barW;
    ctx.save();
    ctx.translate(mx, barY + barH / 2);
    ctx.rotate(Math.sin(scene.t * 6) * 0.08);
    PL.gfx.rect(ctx, -9, -20, 18, 26, '#c9bfae');
    PL.gfx.rect(ctx, -7, -18, 14, 22, C.grog);
    PL.gfx.rect(ctx, -7, -18, 14, 5, '#fbf3dc');
    ctx.strokeStyle = '#b9b0a2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(11, -7, 6, -1.2, 1.2); ctx.stroke();
    ctx.restore();
    PL.gfx.rect(ctx, mx - 1, barY - 6, 2, barH + 12, C.parchment);

    // hit / miss flash (only while the round is live — the result panel owns
    // the screen once it is over)
    if (this.flash > 0 && scene.state === 'play') {
      ctx.save();
      ctx.globalAlpha = this.flash * 2;
      PL.gfx.text(ctx,
        this.flashGood ? (this.perfect ? 'CLEAN POUR!' : 'DOWN IT') : 'SLOPPED IT',
        W / 2, barY + barH + 30, {
          font: PL.FONT.head, align: 'center',
          color: this.flashGood ? C.lanternHi : C.coral
        });
      ctx.restore();
    }

    if (scene.state === 'play') {
      PL.gfx.text(ctx, 'SPACE / ENTER — swig when the tankard hits the foam', W / 2, barY - 36, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)'
      });
    }
  };

  /** Small standing version of the player used inside the trial. */
  function drawLittlePirate(ctx, x, y, stumble, t) {
    var lean = stumble ? Math.sin(t * 30) * 0.2 : 0;
    ctx.save();
    ctx.translate(x + 10, y + 30);
    ctx.rotate(lean);
    ctx.translate(-10, -30);
    PL.gfx.rect(ctx, x + 3, y + 20, 6, 8, '#3a2a1e');
    PL.gfx.rect(ctx, x + 11, y + 20, 6, 8, '#3a2a1e');
    PL.gfx.rect(ctx, x + 4, y + 10, 12, 11, '#e6d9b8');
    PL.gfx.rect(ctx, x + 4, y + 17, 12, 3, C.coral);
    PL.gfx.rect(ctx, x + 5, y + 2, 11, 9, '#d9a173');
    ctx.fillStyle = '#40312a';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 3); ctx.lineTo(x + 19, y + 3);
    ctx.lineTo(x + 15, y - 1); ctx.lineTo(x + 5, y - 1);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  PL.Trials.register('plankPour', {
    title: 'THE PLANK POUR',
    subtitle: "Windsunk Council tradition — walk the board, take your five, stay dry.",
    prompt: 'Five clean swigs. Three slips and the sea gets you. — SPACE to begin',
    winLine: 'Old Salty spits. That is as close to applause as it gets.',
    loseLine: 'The water is cold and the laughter is colder.',
    create: function (scene) { return new PlankPour(scene); }
  });

})(window.PL = window.PL || {});
