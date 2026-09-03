/* Fenwick I — "Brandywine Brush"
 *
 * Wetland. Nothing in this level attacks you: the bog is the hazard, the vines
 * are the schedule, and the phantom footing only exists while a spirit-light
 * is burning. Vine markers go on the first empty tile out from a bank — the
 * vine works out which way to grow.
 *
 * By this point in the tryout the crossings are long enough that you cannot
 * stand and watch a whole cycle before committing to it.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('fenwick', {
    id: 'fenwick-1',
    name: 'Brandywine Brush',
    blurb: 'Bog, vine and spirit-light. Nothing here wants to hurt you.',
    diff: 1.3,

    quips: { '1': '@fw1', '2': '@fw2', '3': '@fw3', '4': '@?ru', '5': '@?in,cr' },

    segments: [

      /* 0 — dry ground while you get your eye in. */
      [
        '.@...o....o....w....1.........',
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
        '.....o..o..o..o..o..o..o..o...',
        '.....h..h..h..h..h..h..h..h...',
        '..i...........................',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 3 — the flag, with bramble in the path. */
      [
        '..............................',
        '...F...*..o....M..o.....l...2.',
        '########xxx#######xxx#########',
        '##############################',
        '##############################'
      ],

      /* 4 — vine, phantom, vine — and the shard up in the canopy. */
      [
        '..............R...............',
        '.............hhh..............',
        '......o....o...o...o..........',
        '.....t.....h.h.h.h......t.....',
        '..i.......................4...',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 5 — the deep bog. Four vines, no light, no phantoms. */
      [
        '......o....o......o....o......',
        '......t....t......t....t......',
        '######~~~~~~######~~~~~~######',
        '######~~~~~~######~~~~~~######',
        '######~~~~~~######~~~~~~######'
      ],

      /* 6 — the cup, in a clearing. */
      [
        '........====..................',
        '.....o.....o....5..Z...3......',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
