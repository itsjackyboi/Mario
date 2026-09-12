/* touch.js — the game on a phone.
 *
 * A thumb pad drawn into the same 640x360 logical space as everything else,
 * which is the whole reason this is forty lines of hit-testing rather than a
 * layer of HTML elements to keep in step with a canvas that resizes. The
 * buttons ARE part of the picture: they scale with it, they rotate with it,
 * and there is nothing to line up.
 *
 * HOW IT REACHES THE GAME. It does not. It writes into Input.state and
 * Input.hits, which is what a key does, so `down('jump')` and `pressed('jump')`
 * never learn that a finger exists — and neither does any scene, any trial, or
 * the replay. One code path, driven from two places.
 *
 * WHY MULTI-TOUCH IS NOT OPTIONAL. Input.mouse is a single pointer, and a
 * single pointer cannot hold right and press jump, which is most of this game.
 * So pointers are tracked by id here, each one owning at most one button, and
 * released on pointerup, pointercancel or the window losing them.
 *
 * IT ONLY APPEARS FOR A FINGER. The pad stays hidden until a `touch` pointer
 * actually lands, so a desktop never sees it; after that it stays up, because
 * a tablet with a keyboard should not have the controls flicker away mid-jump.
 */
(function (PL) {
  'use strict';

  var C = PL.C;

  /* Laid out bottom-heavy and to the edges, because the middle of a phone
   * screen held in landscape is where the hands are NOT. Left and right are
   * tall rather than square: they are held for whole seconds at a time, and a
   * thumb that drifts up or down the screen should not let go of them. */
  var PAD = [
    { a: 'left',  x: 10,  y: 222, w: 54, h: 108, look: 'arrow', dir: 180 },
    { a: 'right', x: 108, y: 222, w: 54, h: 108, look: 'arrow', dir: 0 },
    { a: 'up',    x: 64,  y: 222, w: 44, h: 52,  look: 'arrow', dir: 270 },
    { a: 'down',  x: 64,  y: 278, w: 44, h: 52,  look: 'arrow', dir: 90 },
    { a: 'jump',  x: 556, y: 250, w: 74, h: 74,  look: 'round', label: 'JUMP' },
    { a: 'item',  x: 478, y: 268, w: 60, h: 56,  look: 'round', label: 'ITEM' },
    { a: 'back',  x: 294, y: 306, w: 52, h: 26,  look: 'flat',  label: 'MENU' }
  ];

  /* The JUMP button answers to `confirm` as well, so one pad drives the menus
   * too: a tap on a level row already works through Input.mouse, and this is
   * what says yes on every screen that wants a key instead. `back` doubles as
   * pause for the same reason — it is the one the level select and the pause
   * screen both listen for. */
  var ALSO = { jump: 'confirm' };

  var Touch = (PL.Touch = {
    on: false,                 // has a finger ever touched this screen?
    live: {},                  // pointerId -> the button it is holding
    held: {},                  // action -> true, for drawing

    /** Which button is under this logical point, if any. */
    at: function (x, y) {
      for (var i = 0; i < PAD.length; i++) {
        var b = PAD[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
      }
      return null;
    },

    press: function (b) {
      var In = PL.Input;
      if (!In.state[b.a]) In.hits[b.a] = true;
      In.state[b.a] = true;
      this.held[b.a] = true;
      var also = ALSO[b.a];
      if (also) {
        if (!In.state[also]) In.hits[also] = true;
        In.state[also] = true;
      }
    },

    lift: function (b) {
      var In = PL.Input;
      if (In.state[b.a]) In.lifts[b.a] = true;
      In.state[b.a] = false;
      delete this.held[b.a];
      var also = ALSO[b.a];
      if (also) { if (In.state[also]) In.lifts[also] = true; In.state[also] = false; }
    },

    /** Put held buttons back after something cleared the whole input state. */
    reassert: function () {
      var In = PL.Input;
      for (var id in this.live) {
        var b = this.live[id];
        In.state[b.a] = true;
        if (ALSO[b.a]) In.state[ALSO[b.a]] = true;
      }
    },

    /** Let go of everything — a scene change, or the page going away. */
    clear: function () {
      for (var id in this.live) this.lift(this.live[id]);
      this.live = {};
      this.held = {};
    },

    install: function (canvas) {
      var self = this;
      function toLogical(e) {
        var r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return { x: (e.clientX - r.left) / r.width * PL.VIEW_W,
                 y: (e.clientY - r.top) / r.height * PL.VIEW_H };
      }

      canvas.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'touch') return;
        self.on = true;
        if (PL.Input.typing) return;       // the keyboard is up; let it have the tap
        var pt = toLogical(e);
        if (!pt) return;
        var b = self.at(pt.x, pt.y);
        if (!b) return;
        self.live[e.pointerId] = b;
        self.press(b);
        e.preventDefault();
      });

      /* Sliding between buttons hands the finger over rather than dropping it,
       * because rolling a thumb from left to right is how anybody actually
       * turns round, and lifting off to do it loses the run. */
      canvas.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'touch') return;
        var was = self.live[e.pointerId];
        if (!was) return;
        var pt = toLogical(e);
        if (!pt) return;
        var now = self.at(pt.x, pt.y);
        if (now === was) return;
        self.lift(was);
        if (now) { self.live[e.pointerId] = now; self.press(now); }
        else delete self.live[e.pointerId];
      });

      /* On the window, not the canvas: a finger that leaves the canvas still
       * has to let go of the button, or Corb runs right for ever. */
      function release(e) {
        var b = self.live[e.pointerId];
        if (!b) return;
        self.lift(b);
        delete self.live[e.pointerId];
      }
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      window.addEventListener('blur', function () { self.clear(); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) self.clear();
      });
    },

    // ------------------------------------------------------------------ paint

    draw: function (ctx) {
      if (!this.on) return;
      for (var i = 0; i < PAD.length; i++) {
        var b = PAD[i];
        var hot = !!this.held[b.a];
        ctx.save();
        ctx.globalAlpha = hot ? 0.96 : 0.62;
        if (b.look === 'round') this.round(ctx, b, hot);
        else if (b.look === 'arrow') this.arrow(ctx, b, hot);
        else this.flat(ctx, b, hot);
        ctx.restore();
      }
    },

    round: function (ctx, b, hot) {
      var cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(b.w, b.h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = hot ? C.lanternHi : 'rgba(16,11,16,0.82)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = hot ? C.parchment : C.rope;
      ctx.stroke();
      PL.gfx.text(ctx, b.label, cx, cy + 4, {
        font: PL.FONT.small, align: 'center', color: hot ? C.ink : C.parchment
      });
    },

    arrow: function (ctx, b, hot) {
      var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      PL.gfx.rect(ctx, b.x, b.y, b.w, b.h, hot ? C.lanternHi : 'rgba(16,11,16,0.82)');
      ctx.lineWidth = 2;
      ctx.strokeStyle = hot ? C.parchment : C.rope;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(b.dir * Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(9, 0); ctx.lineTo(-6, -10); ctx.lineTo(-6, 10);
      ctx.closePath();
      ctx.fillStyle = hot ? C.ink : C.parchment;
      ctx.fill();
      ctx.restore();
    },

    flat: function (ctx, b, hot) {
      PL.gfx.rect(ctx, b.x, b.y, b.w, b.h, hot ? C.lanternHi : 'rgba(16,11,16,0.82)');
      ctx.lineWidth = 2;
      ctx.strokeStyle = hot ? C.parchment : C.rope;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      PL.gfx.text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 4, {
        font: PL.FONT.tiny, align: 'center', color: hot ? C.ink : C.parchment
      });
    }
  });

  PL.Touch = Touch;

})(window.PL = window.PL || {});
