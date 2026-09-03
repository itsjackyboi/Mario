/* Fenwick II — "The Root Lantern"
 *
 * Deeper in, where the ground stops being reliable. Ends with the Lantern of
 * Roots — a puzzle rather than a reflex test, because Fenwick does not throw
 * anybody in the water.
 *
 * It will let you throw yourself in, mind. The phantom spans here are longer
 * than one spirit-light burns, so the crossings have to be planned before
 * they are started.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('fenwick', {
    id: 'fenwick-2',
    name: 'The Root Lantern',
    blurb: 'Half the path is only there when the lights are.',
    trial: 'lanternOfRoots',
    diff: 1.4,

    quips: { '1': '@fw3', '2': '@fw1', '3': '@six3', '4': '@ru11', '5': '@in7' },

    segments: [

      /* 0 — the trailhead. */
      [
        '.@...o....o....i....1.........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — a phantom bridge with the light at the wrong end. */
      [
        '.....o..o..o..o..o..o..o..o...',
        '.....h..h..h..h..h..h..h..h...',
        '..i...........................',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 2 — vines over deep bog, no lights at all. */
      [
        '.....o......o......o.....o....',
        '.....t......t......t.....t....',
        '#####~~~~~~~~~~~~~~~~~~~~~####',
        '#####~~~~~~~~~~~~~~~~~~~~~####',
        '#####~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 3 — the flag on an island of dry root. */
      [
        '..............................',
        '...F...*..o....w..o.....l...2.',
        '########xxx#######xxx#########',
        '##############################',
        '##############################'
      ],

      /* 4 — light, vine, phantom, shard. All four at once. */
      [
        '.................R............',
        '................hhh...........',
        '......o....o...o...o..........',
        '.....t.....h.h.h.h......t.....',
        '..i...................i...4...',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 5 — the last bog. Vine to phantom to vine, on three clocks. */
      [
        '.....o...o...o...o...o...o....',
        '.....t...h...t...h...t...h....',
        '..............................',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 6 — the Lantern of Roots. */
      [
        '..........o.......o...........',
        '.......G....M..i.....S....3...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 7 — the cup under the canopy. */
      [
        '........====..................',
        '.....o.....o....5..Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
