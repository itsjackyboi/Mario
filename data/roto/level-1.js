/* Roto Kaiishi I — "The Long Pier"
 *
 * The outer market. Everything floats: the stilt platforms drift with the
 * swell and settle under your weight, so a jump you lined up a second ago is
 * not the jump you are taking now. Stalls sell a Wind Pouch or a Seed for ten
 * grog — press DOWN inside one.
 *
 * The swell out here runs faster than anything in Fenwick, and the last
 * crossing is five floats with no deck under any of them.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('roto', {
    id: 'roto-1',
    name: 'The Long Pier',
    blurb: 'Bobbing boards, open water, and somebody selling something.',
    diff: 1.4,

    quips: { '1': '@rt4', '2': '@rt1', '3': '@rt3', '4': '@?ru', '5': '@?in,cr' },

    segments: [

      /* 0 — the pier head, and the first stall. */
      [
        '..............................',
        '.@...o....u.......o...1.......',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — four floats. Let each one settle before you go. */
      [
        '.....o....o....o....o....5....',
        '.....s....s....s....s.........',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 2 — the surf here has teeth in it. */
      [
        '....o....o....o....o....o.....',
        '....s....s....s....s....s.....',
        '......c.........c.........c...',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 3 — the flag beside a chandler's stall. */
      [
        '..............................',
        '...F...^..u....D..o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — traders on the fixed decks, floats in between. */
      [
        '........o....o..........o.....',
        '........s....s..........s.....',
        '..p...........o...p.......c...',
        '########~~~~~~~~########~~~~##',
        '########~~~~~~~~########~~~~##',
        '########~~~~~~~~########~~~~##'
      ],

      /* 5 — cargo hooks in the deck, and a shard over the top of them. */
      [
        '..............R...............',
        '............====..............',
        '......====....................',
        '..o.......o.......o.....T...3.',
        '###xxx##xxx###xxx#############',
        '##############################',
        '##############################'
      ],

      /* 6 — the outer floats. Five of them, and the surf is awake. */
      [
        '...o....o....o....o....o......',
        '...s....s....s....s....s......',
        '.....c.......c.......c........',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###'
      ],

      /* 7 — the cup at the end of the pier. */
      [
        '........====..................',
        '.....o.....o....4..Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
