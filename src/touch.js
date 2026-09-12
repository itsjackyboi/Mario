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
 *
 * THE PAD IS NOT THE ONLY THING IN HERE. A menu is a list of things to tap, so
 * it does not want a d-pad — but half of what a menu does was never a row to
 * tap in the first place. Going back was ESC, opening the full board was
 * ENTER, swapping shelves was LEFT and RIGHT, and practice mode was C. Every
 * one of those is a key somebody holding a phone has not got.
 *
 * So a scene can hand back a few small buttons of its own (`touchKeys`), and
 * they go through exactly the same machinery as the pad: same hit-testing,
 * same finger tracking, same writing into Input.hits. That is what makes them
 * cheap — a scene names an action and a label, and every line of code that
 * already listens for that action keeps working, untouched and unaware.
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

    /** The scene everything here is asking about. */
    scene: function () {
      var g = PL.Game;
      return (g && g.top && g.top()) || null;
    },

    /**
     * Is the d-pad up right now?
     *
     * Only while something is being PLAYED. A menu is a list of things to tap,
     * and a d-pad floating over it is both useless and in the way — it covers
     * the first town on the level select and the bottom row of every board.
     * Scenes say so themselves with `wantsPad`, rather than this file keeping
     * a list of scene names that would go stale the moment one is added.
     */
    padOn: function () {
      var top = this.scene();
      return !!(this.on && top && top.wantsPad);
    },

    /**
     * Everything tappable this frame: the pad if the scene is being played,
     * plus whatever buttons the scene asked for.
     *
     * Rebuilt every frame on purpose. These things appear and disappear with
     * the state of the screen — the TAS strip only exists in TAS mode, the
     * board swap only where there is a second board — and a list cached at
     * enter() would be a list that is wrong the moment anything changes.
     */
    buttons: function () {
      if (!this.on) return [];
      var top = this.scene();
      var out = this.padOn() ? PAD.slice() : [];
      /* A scene may rename the pad's buttons without moving them. A trial
       * does: JUMP and ITEM are the names of things you do in a LEVEL, and a
       * trial is not one — so both of them say SWIG, or DRINK, or DEAL, and
       * the screen finally has the button it was asking you to press.
       *
       * Copied rather than written into PAD, because PAD is the one shared
       * layout and a label left behind by a scene that has ended would be a
       * level with a SWIG button on it. */
      if (top && top.padLabels && out.length) {
        var names = top.padLabels();
        if (names) {
          for (var i = 0; i < out.length; i++) {
            var name = names[out[i].a];
            if (!name) continue;
            var copy = {}, k;
            for (k in out[i]) copy[k] = out[i][k];
            copy.label = name;
            out[i] = copy;
          }
        }
      }
      if (top && top.touchKeys) {
        var mine = top.touchKeys();
        if (mine && mine.length) out = out.concat(mine);
      }
      return out;
    },

    /** Is there anything of ours on screen at all? */
    active: function () { return this.buttons().length > 0; },

    /** Which button is under this logical point, if any. */
    at: function (x, y) {
      var list = this.buttons();
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
      }
      return null;
    },

    /**
     * Lay a handful of labelled buttons out in a row, right-aligned by default.
     *
     * Scenes describe what they want ({ a: 'back', label: 'BACK' }) and the
     * geometry is worked out here, because a menu should be saying which
     * actions it has rather than doing arithmetic. Widths come from the label
     * length rather than a measured string: the hit test runs on pointerdown,
     * outside any draw, where there is no canvas to measure with — and these
     * are five or six upper-case characters, where an estimate is exact
     * enough and a guaranteed minimum keeps every one of them thumb-sized.
     */
    strip: function (list, opts) {
      opts = opts || {};
      var h = opts.h || 24;
      var y = opts.y == null ? PL.VIEW_H - 30 : opts.y;
      var gap = opts.gap == null ? 6 : opts.gap;
      var out = [], w = [], total = 0, i;
      for (i = 0; i < list.length; i++) {
        w[i] = Math.max(opts.min || 34, list[i].label.length * 6 + 16);
        total += w[i] + (i ? gap : 0);
      }
      var x = opts.left != null ? opts.left
                                : (opts.right == null ? PL.VIEW_W - 10 : opts.right) - total;
      for (i = 0; i < list.length; i++) {
        out.push({ a: list[i].a, label: list[i].label, look: 'flat',
                   x: x, y: y, w: w[i], h: h });
        x += w[i] + gap;
      }
      return out;
    },

    /**
     * Hold this button down, and normally count it as a fresh press.
     *
     * `fresh` is true for a finger LANDING on a button and false for one
     * sliding onto it from the button next door. A landing is always a press:
     * a second thumb arriving on JUMP in the middle of a trial is somebody
     * pressing JUMP, whatever the first thumb is doing, and a timing test
     * where the first of two taps is silently eaten is a timing test that
     * cannot be passed. A slide keeps the old rule — rolling a thumb from
     * LEFT to RIGHT is one continuous hold, not a tap.
     */
    press: function (b, fresh) {
      var In = PL.Input;
      if (fresh || !In.state[b.a]) In.hits[b.a] = true;
      In.state[b.a] = true;
      this.held[b.a] = true;
      var also = ALSO[b.a];
      if (also) {
        if (fresh || !In.state[also]) In.hits[also] = true;
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
        /* A finger going down on an id we still think is HELD means we never
         * saw it come up — the system took the gesture, the page was hidden
         * mid-touch, something ate the pointerup. Left in `live` it gets
         * reasserted after every scene change, and the next thumb to land is
         * then pressing something the game already believes is down.
         *
         * It healed itself on the tap after, because the release cleared the
         * state — so this was never a dead button, and the fix below is not
         * for one. It is for the ONE swallowed press, which in a five-swig
         * timing trial is a life. Let go of the ghost. */
        var ghost = self.live[e.pointerId];
        if (ghost) { self.lift(ghost); delete self.live[e.pointerId]; }
        var b = self.at(pt.x, pt.y);
        if (!b) return;                    // not ours: the tap belongs to the scene
        self.live[e.pointerId] = b;
        self.press(b, true);
        /* And it is ONLY ours. Input's own pointer handler runs first — it is
         * installed first, in Game.init — so by now the tap has already been
         * latched as a click, and a scene testing its rows would find one
         * under the button. Taking the latch back is what stops a BACK button
         * sitting over a list from also selecting whatever it covers. */
        PL.Input.mouse.clicked = false;
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
      var list = this.buttons();
      if (!list.length) { this.clear(); return; }
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
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
        font: PL.FONT.small, align: 'center', color: hot ? C.ink : C.parchment
      });
    }
  });

  PL.Touch = Touch;

})(window.PL = window.PL || {});
