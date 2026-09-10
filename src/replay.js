/* replay.js — watch a tool-assisted run, frame by frame, and read the inputs.
 *
 * A TAS time on the board is a claim; a replay is the answer to "how". The
 * point of this screen is not the time at the top, it is the row of buttons at
 * the bottom: what was held, on which frame, at the moment the run did the
 * thing you cannot work out from watching. A run you can pause, step and read
 * is a route a person can learn. One you can only see the time of is trivia.
 *
 * A REPLAY IS AN INPUT LOG, NOT A RECORDING. There is no video and no captured
 * positions — the level is played again, live, off the same fixed step and the
 * same seeded generator TAS mode uses, with the buttons fed in from the log.
 * That is why it is a few hundred bytes rather than a few megabytes, and why it
 * cannot drift out of step with the game it is replaying: if the level changes
 * under it, the replay breaks honestly instead of showing a run that no longer
 * happens.
 *
 * THE LOG IS ONE CHARACTER A FRAME. Six buttons pack into six bits, and six
 * bits is one character out of the alphabet below, so a thirty-second run is
 * about 1800 characters. Storing 1800 little objects instead would be the same
 * information at twenty times the size, in a file people are meant to be able
 * to open and read.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;
  /* Read at call time, not at load: this file is loaded before game.js, so
   * PL.STEP does not exist yet while these lines are running. Capturing it
   * here would hand `undefined` to every step() call — the position would
   * still evolve, because gravity is per-frame rather than per-second, but the
   * jump buffer and coyote time are counted in seconds and would go NaN, and a
   * replay whose jumps silently never fire looks like a physics change rather
   * than a load-order mistake. */
  function step() { return PL.STEP; }
  var BITS = ['l', 'r', 'u', 'd', 'j', 'i'];
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  var Replay = (PL.Replay = {

    /** An array of {l,r,u,d,j,i} frames to one character per frame. */
    encode: function (log) {
      var out = '';
      for (var f = 0; f < log.length; f++) {
        var h = log[f] || {}, n = 0;
        for (var b = 0; b < BITS.length; b++) if (h[BITS[b]]) n |= (1 << b);
        out += ALPHA.charAt(n);
      }
      return out;
    },

    /** And back again, into exactly the shape PlayScene.inputLog holds. */
    decode: function (str) {
      var out = [];
      for (var i = 0; i < str.length; i++) {
        var n = ALPHA.indexOf(str.charAt(i));
        if (n < 0) n = 0;
        var h = {};
        for (var b = 0; b < BITS.length; b++) h[BITS[b]] = (n >> b) & 1;
        out.push(h);
      }
      return out;
    },

    /**
     * Is watching a run switched on at all?
     *
     * One gate, read by everything: the key that opens the screen, the prompt
     * that says the key exists, and the screen itself. Off by default and off
     * if the setting is missing entirely — a feature that hides an answer
     * should fail closed, so a config that gets lost in a merge cannot quietly
     * put the answers back in front of everybody.
     */
    enabled: function () {
      return !!(PL.CONFIG && PL.CONFIG.tasReplay);
    },

    /** The stored replay for a level, or null. Data lives in data/tas-replays.js. */
    forLevel: function (levelId) {
      if (!Replay.enabled()) return null;
      var all = PL.TasReplays || {};
      var r = all[levelId];
      if (!r || !r.log) return null;
      return r;
    },

    has: function (levelId) { return !!Replay.forLevel(levelId); }
  });

  // ------------------------------------------------------------------- scene

  var SPEEDS = [0.25, 0.5, 1, 2];

  /**
   * Plays `def`'s stored log at whatever speed you ask for.
   *
   * The play scene is driven directly rather than pushed onto the scene stack:
   * this screen owns it, so it can step it a controlled number of times per
   * frame, stop it dead on a pause, and keep drawing it while stopped.
   */
  function ReplayScene(def, meta) {
    this.opaque = true;
    this.def = def;
    this.rec = Replay.forLevel(def.id);
    this.log = Replay.decode(this.rec.log);
    this.play = null;
    this.frame = 0;
    this.acc = 0;
    this.playing = true;
    this.speedIdx = 2;
    this.done = false;
    this.hitTrial = false;
  }

  /**
   * Build the level exactly the way TAS mode does, once this screen is the one
   * in charge.
   *
   * The order matters and is not arbitrary: enter() first, THEN toggleTas(),
   * because toggleTas is what swaps in the seeded generator, and anything that
   * draws a random number between the seeding and the first replayed frame
   * puts the world one draw out of step with the run being replayed. Camera
   * shake is random, the shake moves the cull boundary, and the cull boundary
   * decides whether an entity updates — so one stray draw is the difference
   * between reproducing a run and merely resembling it. Doing this in the
   * constructor, before Theme.apply and the scene push, is exactly that bug.
   */
  ReplayScene.prototype.enter = function () {
    PL.Theme.apply(this.def.town);
    var play = new PL.PlayScene(this.def, { practice: true });
    play.tasSeed = this.rec.seed === undefined ? 20260904 : this.rec.seed;
    play.enter();
    play.toggleTas();          // seeds the generator, as TAS mode does
    play.introT = 0;
    play.fadeIn = 0;
    play.replaying = true;     // the HUD's practice overlay stands down
    /* A trial gate hands control to a minigame that is played, not replayed.
     * Rather than let the log desync against a scene it never recorded, stop
     * and say so. */
    var self = this;
    play.world.onTrial = function () {
      self.hitTrial = true;
      self.playing = false;
    };
    this.play = play;
  };

  ReplayScene.prototype.exit = function () { PL.util.restoreRandom(); };

  /** One recorded frame into the level. */
  ReplayScene.prototype.stepOne = function () {
    if (!this.play) this.enter();
    if (this.frame >= this.log.length || this.done) { this.done = true; return; }
    var held = this.log[this.frame];
    PL.Input.force = held;
    PL.Input.forcePrev = this.log[this.frame - 1] || null;
    this.play.step(step());
    PL.Input.force = PL.Input.forcePrev = null;
    this.frame++;
    if (this.play.finished) this.done = true;
  };

  ReplayScene.prototype.update = function (dt) {
    if (!this.play) return;
    var In = PL.Input;
    if (In.pressed('back') || In.pressed('watch')) { PL.Game.pop(); return; }
    if (In.pressed('pause') || In.pressed('confirm') || In.pressed('jump')) {
      this.playing = !this.playing;
      PL.Audio.sfx('menu');
    }
    if (In.pressed('restart')) {
      PL.Game.replace(new ReplayScene(this.def, this.meta));
      return;
    }
    if (In.pressed('left')) { this.speedIdx = Math.max(0, this.speedIdx - 1); PL.Audio.sfx('menu'); }
    if (In.pressed('right')) { this.speedIdx = Math.min(SPEEDS.length - 1, this.speedIdx + 1); PL.Audio.sfx('menu'); }
    // Paused, `.` walks it one frame at a time — the same key that steps a
    // frame in TAS mode, because it is the same idea.
    if (!this.playing && In.pressed('step')) { this.stepOne(); return; }

    if (!this.playing || this.done) return;
    this.acc += dt * SPEEDS[this.speedIdx];
    var guard = 0;
    while (this.acc >= step() && guard++ < 8) { this.acc -= step(); this.stepOne(); }
  };

  /** The button strip. This is the part somebody is here to read. */
  ReplayScene.prototype.keys = function (ctx, x, y) {
    var held = this.log[Math.max(0, this.frame - 1)] || {};
    var keys = [['←', 'l'], ['→', 'r'], ['↑', 'u'], ['↓', 'd'], ['JUMP', 'j'], ['ITEM', 'i']];
    var kx = x;
    for (var k = 0; k < keys.length; k++) {
      var on = !!held[keys[k][1]];
      ctx.font = PL.FONT.tiny;
      var kw = ctx.measureText(keys[k][0]).width + 12;
      PL.gfx.rect(ctx, kx, y, kw, 14, on ? 'rgba(79,184,165,0.55)' : 'rgba(156,124,82,0.18)');
      PL.gfx.text(ctx, keys[k][0], kx + kw / 2, y + 10, {
        font: PL.FONT.tiny, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.4)'
      });
      kx += kw + 4;
    }
    return kx;
  };

  ReplayScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    if (!this.play) return;
    this.play.draw(ctx);

    /* The banner sits UNDER the game's own top row, not over it. The purse and
     * the clock are part of what a viewer is reading — covering them with the
     * label for the thing they are reading would be a poor trade. */
    PL.gfx.rect(ctx, 0, 36, W, 17, 'rgba(22,15,20,0.72)');
    PL.gfx.text(ctx, 'TAS REPLAY', 8, 48, { font: PL.FONT.small, color: C.teal });
    var by = this.rec.player ? ('by ' + this.rec.player) : '';
    PL.gfx.text(ctx, this.def.name + (by ? '   ·   ' + by : '') +
      (this.rec.build ? '   ·   v' + this.rec.build : ''), 92, 48,
      { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.7)' });
    PL.gfx.text(ctx, 'target ' +
      U.formatTime(this.rec.timeMs || (this.log.length * step() * 1000)),
      W - 8, 48, { font: PL.FONT.tiny, align: 'right', color: C.lanternHi });

    // bottom bar: where we are, and what is being held
    PL.gfx.rect(ctx, 0, H - 30, W, 30, 'rgba(22,15,20,0.78)');
    PL.gfx.text(ctx, 'FRAME ' + this.frame + ' / ' + this.log.length, 8, H - 18,
      { font: PL.FONT.tiny, color: C.lanternHi });
    PL.gfx.text(ctx, (SPEEDS[this.speedIdx] === 1 ? 'normal speed'
                    : SPEEDS[this.speedIdx] + '× speed'), 8, H - 7,
      { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.55)' });
    this.keys(ctx, 108, H - 24);

    var hint = this.playing
      ? 'SPACE pause  ·  ← → speed  ·  R restart  ·  V or ESC back'
      : 'SPACE play  ·  .  step one frame  ·  ← → speed  ·  R restart  ·  V back';
    PL.gfx.text(ctx, hint, W - 8, H - 7,
      { font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.5)' });

    if (this.hitTrial) {
      PL.gfx.panel(ctx, W / 2 - 150, H / 2 - 34, 300, 58, { r: 6 });
      PL.gfx.text(ctx, 'THE REPLAY STOPS AT THE TRIAL', W / 2, H / 2 - 12,
        { font: PL.FONT.small, align: 'center', color: C.coral });
      PL.gfx.text(ctx, 'A trial is played, not replayed — the log has no record of it.',
        W / 2, H / 2 + 6, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.65)' });
    } else if (this.done) {
      PL.gfx.panel(ctx, W / 2 - 120, H / 2 - 30, 240, 50, { r: 6 });
      PL.gfx.text(ctx, this.play.finished ? 'THAT IS THE RUN' : 'END OF THE LOG',
        W / 2, H / 2 - 8, { font: PL.FONT.small, align: 'center', color: C.teal });
      PL.gfx.text(ctx, 'R to watch it again', W / 2, H / 2 + 10,
        { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.65)' });
    }
  };

  PL.ReplayScene = ReplayScene;

})(window.PL = window.PL || {});
