/* input.js — keyboard state as named actions, with edge detection.
 * Scenes read `Input.down(a)` for held state and `Input.pressed(a)` for a
 * single-frame press. `Input.endFrame()` is called once per fixed step.
 */
(function (PL) {
  'use strict';

  var MAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
    KeyE: 'item', ShiftLeft: 'item', ShiftRight: 'item', KeyX: 'item',
    Enter: 'confirm', NumpadEnter: 'confirm',
    Escape: 'back', Backspace: 'back',
    KeyP: 'pause',
    KeyM: 'mute',
    KeyR: 'restart',
    KeyL: 'letter'
  };

  var Input = (PL.Input = {
    state: {},        // currently held
    hits: {},         // went down since the last frame (latched)
    lifts: {},        // came up since the last frame (latched)

    // Pointer, in logical 640x360 space. `clicked` is latched like a key press.
    mouse: { x: -1, y: -1, down: false, clicked: false, over: false },

    /* Text entry. While `typing` is on, keys are letters rather than actions —
     * the action map is skipped entirely, so typing a name with a W in it does
     * not also jump. Scenes drive it with beginText/endText and read `text`. */
    typing: false,
    text: '',
    textMax: 16,
    textDone: false,      // ENTER, latched
    textCancel: false,    // ESC, latched

    beginText: function (initial, max) {
      this.typing = true;
      this.text = String(initial == null ? '' : initial);
      this.textMax = max || 16;
      this.textDone = false;
      this.textCancel = false;
      this.state = {};
    },

    endText: function () {
      this.typing = false;
      this.textDone = false;
      this.textCancel = false;
      return this.text;
    },

    down: function (a) { return !!this.state[a]; },

    /** True if the pointer is inside this logical rect. */
    hovering: function (x, y, w, h) {
      var m = this.mouse;
      return m.over && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    },

    /** True on the frame a click lands inside this logical rect. */
    clickedIn: function (x, y, w, h) {
      return this.mouse.clicked && this.hovering(x, y, w, h);
    },

    /* Latched rather than derived from last-frame state: a tap that starts and
     * ends inside a single frame would otherwise be swallowed entirely. */
    pressed: function (a) { return !!this.hits[a]; },
    released: function (a) { return !!this.lifts[a]; },

    endFrame: function () {
      this.hits = {};
      this.lifts = {};
      this.mouse.clicked = false;
      this.textDone = false;
      this.textCancel = false;
    },

    /** Forget everything — used on scene changes so a held key doesn't leak. */
    clear: function () {
      this.state = {};
      this.hits = {};
      this.lifts = {};
    },

    install: function () {
      var self = this;
      window.addEventListener('keydown', function (e) {
        if (self.typing) { self.typeKey(e); return; }
        var a = MAP[e.code];
        if (a) {
          if (!e.repeat && !self.state[a]) self.hits[a] = true;
          self.state[a] = true;
          // Stop the page scrolling / spacebar-activating focused elements.
          if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
        }
      });
      window.addEventListener('keyup', function (e) {
        var a = MAP[e.code];
        if (a) {
          if (self.state[a]) self.lifts[a] = true;
          self.state[a] = false;
        }
      });
      window.addEventListener('blur', function () { self.clear(); });
    },

    /** One keystroke while a scene is taking text. Never reaches the action map. */
    typeKey: function (e) {
      if (e.key === 'Enter') { this.textDone = true; e.preventDefault(); return; }
      if (e.key === 'Escape') { this.textCancel = true; e.preventDefault(); return; }
      if (e.key === 'Backspace') {
        this.text = this.text.slice(0, -1);
        e.preventDefault();
        return;
      }
      // Printable single characters only: no arrows, no F-keys, no modifiers.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (this.text.length < this.textMax) this.text += e.key;
        e.preventDefault();
      }
    },

    /** Map real pointer positions onto the fixed 640x360 logical canvas. */
    installPointer: function (canvas) {
      var self = this;
      function toLogical(e) {
        var r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return null;
        return {
          x: (e.clientX - r.left) / r.width * PL.VIEW_W,
          y: (e.clientY - r.top) / r.height * PL.VIEW_H
        };
      }
      canvas.addEventListener('pointermove', function (e) {
        var pt = toLogical(e);
        if (!pt) return;
        self.mouse.x = pt.x; self.mouse.y = pt.y; self.mouse.over = true;
      });
      canvas.addEventListener('pointerdown', function (e) {
        var pt = toLogical(e);
        if (!pt) return;
        self.mouse.x = pt.x; self.mouse.y = pt.y;
        self.mouse.over = true;
        self.mouse.down = true;
        self.mouse.clicked = true;
      });
      window.addEventListener('pointerup', function () { self.mouse.down = false; });
      canvas.addEventListener('pointerleave', function () { self.mouse.over = false; });
    }
  });

})(window.PL = window.PL || {});
