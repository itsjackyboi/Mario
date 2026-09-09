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
    KeyL: 'letter',
    KeyC: 'mark',
    KeyB: 'bank',
    KeyH: 'records',
    /* TAS mode, inside practice. Frame-at-a-time playback needs keys of its
     * own that no ordinary run touches. */
    KeyT: 'tas',
    Period: 'step',
    Comma: 'rewind',
    Slash: 'play',
    Semicolon: 'autorun'
  };

  var Input = (PL.Input = {
    state: {},        // currently held
    hits: {},         // went down since the last frame (latched)
    lifts: {},        // came up since the last frame (latched)

    /* Pointer, in logical 640x360 space. `clicked` is latched like a key press.
     *
     * `moved` is latched the same way, and menus need it: a screen where
     * hovering a row selects it must only do that when the pointer actually
     * moves. Otherwise a mouse left sitting over one option re-selects it every
     * frame, and the arrow keys cannot move off it — you press right, and the
     * stationary pointer drags the cursor back before you see it. */
    mouse: { x: -1, y: -1, down: false, clicked: false, over: false, moved: false },

    /* Text entry. While `typing` is on, keys are letters rather than actions —
     * the action map is skipped entirely, so typing a name with a W in it does
     * not also jump. Scenes drive it with beginText/endText and read `text`.
     *
     * The typing itself is done by a real, invisible <input> parked over the
     * canvas rather than by reading keydown codes. Reading codes means
     * re-implementing a text field, and every layout the author does not have
     * on their desk is where that goes wrong: AltGr symbols arrive with
     * ctrlKey and altKey both set, dead keys and IMEs compose across several
     * events, and anything the browser would have handled — paste, a caret you
     * can move, a mobile keyboard — has to be built by hand or lost. Handing
     * the job to the element the browser already ships means every letter and
     * every symbol on every layout works, because none of it is our code.
     *
     * The field is also what keeps a typed letter from being an action: the
     * keystroke lands on an input, so the window handler below never sees it
     * at all, and M is a letter in a name rather than the mute key. */
    typing: false,
    text: '',
    textMax: 16,
    caret: 0,             // where the cursor is, for the scene to draw
    textDone: false,      // ENTER, latched
    textCancel: false,    // ESC, latched
    textEl: null,
    usingField: false,    // false falls back to reading keydowns

    /** The hidden field, made once and reused. Null if there is no DOM. */
    field: function () {
      if (this.textEl) return this.textEl;
      if (typeof document === 'undefined' || !document.body) return null;
      var self = this;
      var el = document.createElement('input');
      el.type = 'text';
      el.id = 'text-catcher';
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
      el.setAttribute('aria-label', 'Your name for the shared board');
      el.addEventListener('input', function () { self.readField(); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { self.textDone = true; e.preventDefault(); }
        else if (e.key === 'Escape') { self.textCancel = true; e.preventDefault(); }
        // Never let a typed key reach the window handler as an action.
        e.stopPropagation();
      });
      // The caret moves without the value changing — arrows, home, a click —
      // and `input` does not fire for any of that, so it is read back here too.
      el.addEventListener('keyup', function (e) { self.readField(); e.stopPropagation(); });
      el.addEventListener('select', function () { self.readField(); });
      document.body.appendChild(el);
      this.textEl = el;
      return el;
    },

    /** Take the field's value as the truth, clamped to the scene's limit. */
    readField: function () {
      var el = this.textEl;
      if (!el) return;
      if (el.value.length > this.textMax) el.value = el.value.slice(0, this.textMax);
      this.text = el.value;
      this.caret = el.selectionStart == null ? this.text.length : el.selectionStart;
    },

    beginText: function (initial, max) {
      this.typing = true;
      this.text = String(initial == null ? '' : initial);
      this.textMax = max || 16;
      this.caret = this.text.length;
      this.textDone = false;
      this.textCancel = false;
      this.state = {};
      this.hits = {};
      var el = this.field();
      this.usingField = false;
      if (el) {
        el.maxLength = this.textMax;
        el.value = this.text;
        el.style.display = 'block';
        try { el.focus(); el.setSelectionRange(this.text.length, this.text.length); }
        catch (e) { /* focus refused */ }
        // Somewhere that will not give a field focus — a sandboxed frame, say —
        // has to fall back to reading keys, or nothing would type at all.
        this.usingField = document.activeElement === el;
        if (!this.usingField) el.style.display = 'none';
      }
    },

    endText: function () {
      this.typing = false;
      this.usingField = false;
      this.textDone = false;
      this.textCancel = false;
      var el = this.textEl;
      if (el) { el.blur(); el.style.display = 'none'; }
      return this.text;
    },

    /* While a TAS frame is being replayed, the buttons come from the log
     * rather than the keyboard. Everything the scene asks about goes through
     * down/pressed, so forcing them here means the replay drives the exact
     * same code the player does — and every action the log does not carry
     * (pause, restart, the TAS keys themselves) reads as up, which is what
     * stops a replay from re-triggering the thing that started it. */
    force: null,
    forcePrev: null,
    SHORT: { left: 'l', right: 'r', up: 'u', down: 'd', jump: 'j', item: 'i' },

    down: function (a) {
      if (this.force) { var k = this.SHORT[a]; return !!(k && this.force[k]); }
      return !!this.state[a];
    },

    /** True if the pointer is inside this logical rect. */
    hovering: function (x, y, w, h) {
      var m = this.mouse;
      return m.over && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    },

    /**
     * True only on a frame where the pointer moved and landed in this rect.
     *
     * This is what a menu should use to move its cursor. `hovering` answers
     * "is the pointer there", which stays true forever while the mouse sits
     * still — and a menu that reselects on that can never be driven by the
     * keyboard while the pointer rests on a row.
     */
    hoveredInto: function (x, y, w, h) {
      return this.mouse.moved && this.hovering(x, y, w, h);
    },

    /** True on the frame a click lands inside this logical rect. */
    clickedIn: function (x, y, w, h) {
      return this.mouse.clicked && this.hovering(x, y, w, h);
    },

    /* Latched rather than derived from last-frame state: a tap that starts and
     * ends inside a single frame would otherwise be swallowed entirely. */
    pressed: function (a) {
      if (this.force) {
        var k = this.SHORT[a];
        if (!k) return false;
        return !!this.force[k] && !(this.forcePrev && this.forcePrev[k]);
      }
      return !!this.hits[a];
    },
    released: function (a) { return !!this.lifts[a]; },

    endFrame: function () {
      this.hits = {};
      this.lifts = {};
      this.mouse.clicked = false;
      this.mouse.moved = false;
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
        if (self.typing) {
          // A key reaching the window while a field is up means focus has
          // wandered off it (a click on the canvas, usually). Take it back
          // rather than reading the keystroke as an action.
          if (self.usingField) { try { self.textEl.focus(); } catch (err) {} return; }
          self.typeKey(e);
          return;
        }
        var a = MAP[e.code];
        if (a) {
          if (!e.repeat && !self.state[a]) self.hits[a] = true;
          self.state[a] = true;
          // Stop the page scrolling / spacebar-activating focused elements.
          if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
        }
      });
      window.addEventListener('keyup', function (e) {
        if (self.typing) return;
        var a = MAP[e.code];
        if (a) {
          if (self.state[a]) self.lifts[a] = true;
          self.state[a] = false;
        }
      });
      window.addEventListener('blur', function () { self.clear(); });
    },

    /**
     * One keystroke while a scene is taking text, for the case where no hidden
     * field could be made. Never reaches the action map.
     *
     * "Printable" is deliberately generous. A character is anything that is one
     * code point — which lets through the whole of anyone's layout, accents and
     * currency signs included, and still keeps out ArrowLeft and F7, which
     * arrive as words. AltGr is a character key on most of Europe and reports
     * itself as Ctrl+Alt, so only Ctrl or Meta *alone* is treated as a
     * shortcut; refusing anything with altKey set would quietly delete half the
     * symbols on a German or Polish keyboard.
     */
    typeKey: function (e) {
      if (e.key === 'Enter') { this.textDone = true; e.preventDefault(); return; }
      if (e.key === 'Escape') { this.textCancel = true; e.preventDefault(); return; }
      if (e.key === 'Backspace') {
        this.text = this.text.slice(0, -1);
        this.caret = this.text.length;
        e.preventDefault();
        return;
      }
      var lone = (e.ctrlKey || e.metaKey) && !e.altKey;
      var one = e.key.length === 1 ||
                (e.key.length === 2 && e.key.charCodeAt(0) >= 0xD800 && e.key.charCodeAt(0) <= 0xDBFF);
      if (one && !lone) {
        if (this.text.length < this.textMax) this.text += e.key;
        this.caret = this.text.length;
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
        // Sub-pixel jitter from a resting hand should not count as a move, or
        // the keyboard would still be fighting a stationary pointer.
        if (Math.abs(pt.x - self.mouse.x) > 0.5 || Math.abs(pt.y - self.mouse.y) > 0.5) {
          self.mouse.moved = true;
        }
        self.mouse.x = pt.x; self.mouse.y = pt.y; self.mouse.over = true;
      });
      canvas.addEventListener('pointerdown', function (e) {
        // Clicking the canvas takes focus off the hidden field; put it back, or
        // the next letter typed goes nowhere.
        if (self.typing && self.usingField) { try { self.textEl.focus(); } catch (err) {} }
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
