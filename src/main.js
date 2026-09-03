/* main.js — boot. Loaded last, after every module and every level file. */
(function (PL) {
  'use strict';

  function boot() {
    var canvas = document.getElementById('game');
    var loading = document.getElementById('loading');

    try {
      PL.Game.init(canvas);
      PL.Audio.init();
      // Fail loudly and early if any level file is malformed.
      validateLevels();
      PL.Game.start(new PL.TitleScene());
      if (loading) loading.parentNode.removeChild(loading);
    } catch (err) {
      console.error(err);
      if (loading) {
        loading.innerHTML = '<strong>Could not start.</strong><br>' +
          String(err && err.message ? err.message : err);
      }
    }
  }

  /** Build every registered level once at boot so bad data can't hide. */
  function validateLevels() {
    for (var t = 0; t < PL.Towns.list.length; t++) {
      var town = PL.Towns.list[t];
      for (var l = 0; l < town.levels.length; l++) {
        var def = town.levels[l];
        var world = PL.Level.build(def);
        if (!world.tankard) {
          throw new Error(def.id + ' has no tankard (glyph Z) — no way to finish it.');
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window.PL = window.PL || {});
