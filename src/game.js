/* game.js — the engine shell: canvas setup, fixed-timestep loop, scene stack.
 *
 * A Scene is any object with (all optional):
 *   enter(prev)   exit()   update(dt)   draw(ctx)
 * `dt` is always exactly 1/60s — the loop accumulates real time and steps a
 * fixed number of times, so physics is frame-rate independent.
 */
(function (PL) {
  'use strict';

  /* The build, drawn faintly on the title screen and readable from the console
   * as PL.VERSION. It is here so there is a way to tell at a glance which copy
   * a browser has actually loaded — a stale cached script and a fresh pull look
   * identical otherwise. Bump it when the game changes.
   *
   * Not to be confused with the save-schema version in storage.js, which is
   * about the shape of the stored JSON and only moves when that shape does.
   */
  PL.VERSION = '2.2.5';

  PL.VIEW_W = 640;
  PL.VIEW_H = 360;
  PL.TILE = 32;
  PL.STEP = 1 / 60;

  /* HOW THE CLOCK IS KEPT THE SAME FOR EVERYONE.
   *
   * The loop banks real time and spends it in fixed 1/60 steps, and the clock
   * counts steps rather than seconds. So the recorded time is simulated time:
   * the same run on a 60 Hz Chrome, a 120 Hz Safari and a 240 Hz Firefox is
   * the same number, because all three take the same number of steps to cross
   * the same level. Nothing about the display or the browser is in it.
   *
   * The two numbers below are where that stops being true, and both are set so
   * it cannot happen to anyone playing normally:
   *
   * MAX_FRAME caps how much real time one frame may spend. Beyond it, time is
   * dropped rather than simulated — otherwise a stall would be paid off in one
   * enormous burst of physics with no frames drawn, and you would die to a
   * hazard you never saw. The world and the clock stop together, so a stutter
   * costs nothing and gains nothing.
   *
   * MAX_STEPS caps steps per frame, and is set to exactly the number MAX_FRAME
   * allows. Any lower and a machine that fell behind could never catch up: the
   * banked time would grow every frame, the game would run in permanent slow
   * motion, and — since the clock counts steps — a slow machine would hand its
   * player more real seconds to react inside every counted second. That is the
   * one way this timing model can be gamed, so the cap is set where it cannot
   * bind before MAX_FRAME does. At these values the game keeps real time down
   * to 4 fps, which is well past playable.
   */
  var MAX_FRAME = 0.25;                                  // seconds
  var MAX_STEPS = Math.round(MAX_FRAME / PL.STEP);       // 15

  var Game = (PL.Game = {
    canvas: null,
    ctx: null,
    scenes: [],
    _last: 0,
    _acc: 0,
    _raf: 0,
    scale: 1,
    started: false,

    /* Wall time and simulated time since the page loaded. Their ratio over a
     * run is the clock check — see the loop below. */
    realMs: 0,
    gameMs: 0,

    /**
     * How much of the real time between two marks the game actually simulated,
     * as a fraction. 1 is a run that kept perfect pace; below it means the
     * browser lost time to stalls or could not hold 60fps.
     */
    pace: function (fromReal, fromGame) {
      var real = this.realMs - fromReal;
      if (real < 500) return 1;             // too short a sample to mean anything
      return (this.gameMs - fromGame) / real;
    },

    init: function (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      PL.Input.install();
      PL.Input.installPointer(canvas);
      if (PL.Touch) PL.Touch.install(canvas);
      this.resize();
      var self = this;
      window.addEventListener('resize', function () { self.resize(); });
      /* Rotating a phone is not one event with the right numbers in it. The
       * resize arrives while the browser is still deciding how tall the screen
       * is — chrome sliding away, safe areas changing — so the first answer is
       * routinely the old orientation's. Ask again after it has settled.
       * visualViewport is the one that notices a keyboard or a URL bar. */
      window.addEventListener('orientationchange', function () {
        self.resize();
        setTimeout(function () { self.resize(); }, 120);
        setTimeout(function () { self.resize(); }, 400);
      });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', function () { self.resize(); });
      }
      /* CSS turns the selection off; these turn off what is left.
       *
       * A long press is how you hold RIGHT, and it is also how a browser is
       * told to select something or open a context menu. `user-select: none`
       * stops the blue wash, but several engines still raise the menu anyway —
       * and on a desktop this is also what stops a right-click from putting
       * "Save image as…" over the level.
       *
       * Bound to the canvas rather than the document, so the hidden name field
       * keeps every one of them: it is a real text box and long-pressing it to
       * paste a name is a thing somebody should be able to do.
       */
      var stop = function (e) { e.preventDefault(); return false; };
      canvas.addEventListener('contextmenu', stop);
      canvas.addEventListener('selectstart', stop);
      canvas.addEventListener('dragstart', stop);

      // Audio contexts need a user gesture before they will make noise.
      var wake = function () { PL.Audio.resume(); };
      window.addEventListener('keydown', wake);
      window.addEventListener('pointerdown', wake);
    },

    /** Back the canvas at device resolution but keep a 640x360 logical space.
     *
     * THE SMALLEST HONEST ANSWER, not the first one. The stage is
     * `position: fixed; inset: 0`, so its rect is the LAYOUT viewport — and on
     * a phone added to the home screen and turned on its side, that is bigger
     * than the glass: it runs under the notch and past the home indicator,
     * because the page asked for `viewport-fit=cover`. Sizing the canvas to it
     * puts the HUD, the clock and the thumb pad over the edges of the screen,
     * which does not look like a canvas that is too big. It looks like the
     * game zoomed in.
     *
     * window.innerHeight and visualViewport disagree with the layout viewport
     * in different ways on different phones, and none of the three is right
     * everywhere. The smallest of them is always on the glass.
     */
    resize: function () {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var vv = window.visualViewport;
      var box = this.canvas.parentNode.getBoundingClientRect();
      var big = 1e9;
      var w = Math.min(box.width || big, window.innerWidth || big, vv ? vv.width : big);
      var h = Math.min(box.height || big, window.innerHeight || big, vv ? vv.height : big);
      var s = Math.min(w / PL.VIEW_W, h / PL.VIEW_H);
      if (!isFinite(s) || s <= 0) s = 1;
      this.scale = s;
      this.canvas.style.width = Math.floor(PL.VIEW_W * s) + 'px';
      this.canvas.style.height = Math.floor(PL.VIEW_H * s) + 'px';
      this.canvas.width = Math.floor(PL.VIEW_W * dpr);
      this.canvas.height = Math.floor(PL.VIEW_H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
    },

    top: function () { return this.scenes[this.scenes.length - 1]; },

    push: function (scene) {
      var prev = this.top();
      this.scenes.push(scene);
      PL.Input.clear();
      if (scene.enter) scene.enter(prev);
      return scene;
    },

    pop: function () {
      var s = this.scenes.pop();
      if (s && s.exit) s.exit();
      PL.Input.clear();
      var t = this.top();
      if (t && t.resumed) t.resumed();
      return s;
    },

    replace: function (scene) {
      var s = this.scenes.pop();
      if (s && s.exit) s.exit();
      return this.push(scene);
    },

    /** Drop everything and start fresh on `scene` (used by menus). */
    reset: function (scene) {
      while (this.scenes.length) {
        var s = this.scenes.pop();
        if (s && s.exit) s.exit();
      }
      return this.push(scene);
    },

    start: function (scene) {
      if (this.started) return;
      this.started = true;
      this.push(scene);
      this._last = performance.now();
      var self = this;
      var frame = function (now) {
        self._raf = requestAnimationFrame(frame);
        var raw = now - self._last;
        var elapsed = Math.min(MAX_FRAME, raw / 1000);
        self._last = now;
        /* Wall time against simulated time, for the clock check on the results
         * card. A gap between them means the browser could not keep up or was
         * stopped outright, and a run set under either is not the same run as
         * everyone else's. A single gap longer than a second is almost always
         * a switched tab rather than a stutter, so it is counted as a second:
         * enough to notice a real stall, not enough to accuse someone of
         * cheating for answering the door. */
        self.realMs += Math.min(raw, 1000);
        self._acc += elapsed;
        var steps = 0;
        while (self._acc >= PL.STEP && steps < MAX_STEPS) {
          self.gameMs += PL.STEP * 1000;
          self._acc -= PL.STEP;
          steps++;
          var top = self.top();
          if (top && top.update) top.update(PL.STEP);
          if (PL.Input.pressed('mute')) {
            PL.Audio.toggleMute();
          }
          PL.Input.endFrame();
        }
        self.render();
      };
      this._raf = requestAnimationFrame(frame);
    },

    render: function () {
      var ctx = this.ctx;
      ctx.fillStyle = PL.C.ink;
      ctx.fillRect(0, 0, PL.VIEW_W, PL.VIEW_H);
      // Draw from the deepest scene that says it is opaque, so overlays
      // (pause, level-complete) can sit on top of the live level.
      var start = 0;
      for (var i = this.scenes.length - 1; i >= 0; i--) {
        if (this.scenes[i].opaque !== false) { start = i; break; }
      }
      for (var j = start; j < this.scenes.length; j++) {
        var s = this.scenes[j];
        if (s.draw) s.draw(ctx);
      }
      // Over everything, including the pause and level-complete overlays: the
      // thumb pad is how a phone presses the button those screens are asking
      // for, so it cannot be underneath them.
      if (PL.Touch) PL.Touch.draw(ctx);
      if (PL.Audio.muted) {
        PL.gfx.text(ctx, 'MUTED', PL.VIEW_W - 6, PL.VIEW_H - 6, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
        });
      }
    }
  });

})(window.PL = window.PL || {});
