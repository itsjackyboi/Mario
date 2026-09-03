/* Fenwick I — "Brandywine Brush"
 *
 * Wetland. Nothing in this level attacks you: the bog is the hazard, the vines
 * are the schedule, and the phantom footing only exists while a spirit-light
 * is burning. Vine markers go on the first empty tile out from a bank — the
 * vine works out which way to grow.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('fenwick', {
    id: 'fenwick-1',
    name: 'Brandywine Brush',
    blurb: 'Bog, vine and spirit-light. Nothing here wants to hurt you.',

    quips: { '1': '@fw1', '2': '@fw2', '3': '@fw3' },

    segments: [

      /* 0 — dry ground while you get your eye in. */
      [
        '.@...o....o.........1.........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — two crossings, four vines, all on their own clocks. */
      [
        '......t.....t.......t....t....',
        '......o.....o.......o....o....',
        '######~~~~~~~~######~~~~~~####',
        '######~~~~~~~~######~~~~~~####',
        '######~~~~~~~~######~~~~~~####'
      ],

      /* 2 — the light on the bank shows the whole bridge. Then it doesn't. */
      [
        '.....o...o...o...o...o........',
        '.....h.h.h.h.h.h.h.h.h.h......',
        '..i...........................',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 3 — the flag, with bramble in the path. */
      [
        '..............................',
        '...F......o.......o.....l...2.',
        '#########xx########xx#########',
        '##############################',
        '##############################'
      ],

      /* 4 — vine, phantom, vine — and the shard up in the canopy. */
      [
        '..............R...............',
        '.............hhh..............',
        '......o....o...o...o..........',
        '.....t.....h.h.h.h......t.....',
        '..i...........................',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 5 — the cup, in a clearing. */
      [
        '........====..................',
        '.....o.....o.......Z...3......',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
