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
    KeyE: 'item', ShiftLeft: 'item', ShiftRight: 'item', KeyX: 'item', KeyL: 'item',
    Enter: 'confirm', NumpadEnter: 'confirm',
    Escape: 'back', Backspace: 'back',
    KeyP: 'pause',
    KeyM: 'mute',
    KeyR: 'restart'
  };

  var Input = (PL.Input = {
    state: {},        // currently held
    hits: {},         // went down since the last frame (latched)
    lifts: {},        // came up since the last frame (latched)

    down: function (a) { return !!this.state[a]; },

    /* Latched rather than derived from last-frame state: a tap that starts and
     * ends inside a single frame would otherwise be swallowed entirely. */
    pressed: function (a) { return !!this.hits[a]; },
    released: function (a) { return !!this.lifts[a]; },

    endFrame: function () {
      this.hits = {};
      this.lifts = {};
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
    }
  });

})(window.PL = window.PL || {});
