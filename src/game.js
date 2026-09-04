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
  PL.VERSION = '1.8';

  PL.VIEW_W = 640;
  PL.VIEW_H = 360;
  PL.TILE = 32;
  PL.STEP = 1 / 60;

  var Game = (PL.Game = {
    canvas: null,
    ctx: null,
    scenes: [],
    _last: 0,
    _acc: 0,
    _raf: 0,
    scale: 1,
    started: false,

    init: function (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.ctx.imageSmoothingEnabled = false;
      PL.Input.install();
      PL.Input.installPointer(canvas);
      this.resize();
      var self = this;
      window.addEventListener('resize', function () { self.resize(); });
      // Audio contexts need a user gesture before they will make noise.
      var wake = function () { PL.Audio.resume(); };
      window.addEventListener('keydown', wake);
      window.addEventListener('pointerdown', wake);
    },

    /** Back the canvas at device resolution but keep a 640x360 logical space. */
    resize: function () {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var box = this.canvas.parentNode.getBoundingClientRect();
      var s = Math.min(box.width / PL.VIEW_W, box.height / PL.VIEW_H);
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
        var elapsed = Math.min(0.25, (now - self._last) / 1000);
        self._last = now;
        self._acc += elapsed;
        var steps = 0;
        while (self._acc >= PL.STEP && steps < 5) {
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
      if (PL.Audio.muted) {
        PL.gfx.text(ctx, 'MUTED', PL.VIEW_W - 6, PL.VIEW_H - 6, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
        });
      }
    }
  });

})(window.PL = window.PL || {});
