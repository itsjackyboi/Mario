/* Sackbeard's Tavern — the capstone.
 *
 * Inside the shell of the Great Shelled Beast. Every town's hazard shows up
 * here at once: Shanty Town's loose planks and wretches, Aleforge's kegs and
 * gears, Providence's Apostles, Fenwick's vines and phantoms, Roto's bobbers,
 * and an Owe Block pair still settling their argument in the corner.
 *
 * `ending: true` sends the results to the ending screen instead of the usual
 * level-complete card; `tankardScale` makes the last cup the biggest in the
 * game.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('tavern', {
    id: 'tavern-1',
    name: "Sackbeard's Tavern",
    blurb: 'The great shell, the whole isles, and the biggest cup ever poured.',
    ending: true,
    tankardScale: 1.7,

    quips: { '1': '@tv1', '2': '@tv4', '3': '@tv2', '4': '@tv3', '5': '@tv5' },

    segments: [

      /* 0 — in under the ribs. */
      [
        '..............................',
        '.@...o....o....l......1.......',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — Shanty Town's welcome: loose boards over the grog-sea. */
      [
        '.....o...o...o...o...o...o....',
        '....LL..LL..LL..LL..LL..LL....',
        '...c......c.......c...........',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 2 — Aleforge sends the kegs down the long table. */
      [
        '..p.....o....p......o......k..',
        '########..###########..#######',
        '########..###########..#######',
        '########..###########..#######'
      ],

      /* 3 — the flag by the hearth. */
      [
        '..............................',
        '...F......o....l..o.....b...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — Providence marches through, on Aleforge's gearing. */
      [
        '.......o.........o............',
        '.......e.........e............',
        '............==................',
        '..a...........................',
        '..............................',
        '####.....................#####',
        '####.....................#####',
        '####.....................#####'
      ],

      /* 5 — Fenwick's half of the room, and the shard in the rafters. */
      [
        '..............R...............',
        '.............hhh..............',
        '......o....o...o...o......3...',
        '.....t.....h.h.h.h......t.....',
        '..i...........................',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 6 — Roto's floats, and an argument from the Block still running. */
      [
        '....o....o....o....o....o.....',
        '....s....s....s....s....s.....',
        '..m........j.........c........',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 7 — the last floor, everything at once. */
      [
        '.......o......o.......o.......',
        '......====...====....====.....',
        '..a....U.....p.......n....4...',
        '####xx#####xx#####xx##########',
        '##############################',
        '##############################'
      ],

      /* 8 — the biggest tankard in the eleven seas. */
      [
        '........====..................',
        '.....o.....o....5.Z...........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
