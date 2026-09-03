/* Roto Kaiishi I — "The Long Pier"
 *
 * The outer market. Everything floats: the stilt platforms drift with the
 * swell and settle under your weight, so a jump you lined up a second ago is
 * not the jump you are taking now. Stalls sell a Wind Pouch or a Seed for ten
 * grog — press DOWN inside one.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('roto', {
    id: 'roto-1',
    name: 'The Long Pier',
    blurb: 'Bobbing boards, open water, and somebody selling something.',

    quips: { '1': '@rt4', '2': '@rt1', '3': '@rt3' },

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
        '.....o....o....o....o.........',
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
        '...F......u.......o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — traders on the fixed decks, floats in between. */
      [
        '........o....o..........o.....',
        '........s....s..........s.....',
        '..p...........o...p...........',
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
        '####xx####xx####xx############',
        '##############################',
        '##############################'
      ],

      /* 6 — the cup at the end of the pier. */
      [
        '........====..................',
        '.....o.....o.......Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
