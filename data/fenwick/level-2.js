/* Fenwick II — "The Overturned Wood"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and all three of them are capped.
 *
 * THE ONE FACT THE WHOLE LEVEL IS BUILT ON. Corb runs at a constant 4.3 pixels
 * a frame, so how far a jump carries is decided entirely by how long it stays
 * in the air — and that is decided by how high it gets. A roof two tiles over
 * his head turns a 4.84-tile jump into a 3.86-tile one. On a grid of 32-pixel
 * tiles that is the only way to ask for exact timing: the ROOF sets the
 * tolerance, not the gap.
 *
 * So there is a roof over all three decks and no open air anywhere to escape
 * into. Every gap in the level is cut against 3.86 tiles.
 *
 *   THE ROOTS — under the bog, and the fast way.
 *      THE FAST ONE. Four staircases: islands four columns apart,
 *   alternating between the floor and one tile above it. Going up, the
 *   capped jump carries 3.20 tiles against the 3.00 you need — nine
 *   pixels, a frame and a half. Coming down off the raised island there
 *   is one tile of roof left and it is the same frame and a half. They
 *   alternate, so there is nothing ordinary in between to breathe on:
 *   seven of them, then five, then eight, then four. And nothing to stop
 *   for anywhere along it, which is the only reason it is quick.
 *
 *   THE BOG — the middle, where the phantoms are.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 *   THE CANOPY — up where the light is.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 * The Lantern of Roots that used to gate the middle of this level has
 * moved to fenwick-3, which is its own level and exists to hold it.
 * Nothing here is a minigame any more.

 * Measured, not felt. bot/envelope.js flies the arc in the game and reads the
 * reach off it; tools/lanes.py refuses to draw a gap that cannot be crossed;
 * bot/reach.js proves all three routes go through; bot/pick.js searches the
 * level with nothing confined and reports which route a perfect run actually
 * takes; bot/tightness.js counts the presses in that run with exactly one
 * frame that works.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('fenwick', {
    id: 'fenwick-2',
    name: 'The Overturned Wood',
    blurb: 'Under the roots, through the bog, or up where the light is.',
    diff: 1.5,
    quips: {
      '1': '@buke5',
      '2': '@guinnie3',
      '3': '@six3',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: down among the roots, into the bog, or up the branches */
      [
        '........................######',
        '........................######',
        '........................######',
        '..............................',
        '..............................',
        '..............................',
        '####################..........',
        '####################...===....',
        '..............................',
        '....................===.......',
        '..@.....l...............1.....',
        '############...###############',
        '############...###############',
        '############...###############',
        '..............................',
        '..............................',
        '..............................',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — the first tangle — eight knots, seven exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..........####################',
        '....###...####################',
        '..o.###....o.....o.....o.....o',
        '##########<<<<<<<<<<<<<<<<<<<<',
        '##############################',
        '..............................',
        '..............................',
        '..o.....o.....o.....o.....o...',
        '#######...##########...#######',
        '#######...##########...#######',
        '#######...##########...#######',
        '..............o...............',
        '......##/..........##/........',
        '..o...###..o.....o.###....o...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 2 — the two-wide tangle; a spirit-light in the bog */
      [
        '##############################',
        '##############################',
        '##############################',
        '###.......................####',
        '###.....###...............####',
        '.....o..###...o.....o.....o...',
        '<<<<######################<<<<',
        '##############################',
        '..............................',
        '###...........................',
        '###..o.....o..i.h.h.o..###...o',
        '##########~~~#######~~~#######',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '..o.....o.#....o..#...o...#..o',
        '#####~#~~~~~~~#~~~~~~~#~~~~~##',
        '##############################',
        '##############################'
      ],

      /* 3 — the third and longest: nine knots, eight exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '###################...........',
        '###################.....###.R.',
        '..o.....o.....o.....o...###===',
        '<<<<<<<<<<<<<<<<<<<<##########',
        '##############################',
        '..............................',
        '###......R....................',
        '###.....===o.....o#.....o.#...',
        '#############~#~~~~~~~#~~~~~~~',
        '##############################',
        '##############################',
        '..............w...............',
        '............................R.',
        '2.....o.....o.....o.....o..===',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — tolls in the bog and the canopy */
      [
        '##############################',
        '##############################',
        '##############################',
        '............##################',
        '............##################',
        '..oo.....o.....o.....o.....o..',
        '############<<<<<<<<<<<<<<<<<<',
        '##############################',
        '..............................',
        '...........................###',
        '.o.....o...F..o.....###o...###',
        '#~#####~~~#######~~~##########',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '...o....#.o.....#o.....o#.....',
        '###~#~~~~~~~#~~~~~~~#~~~~~~~#~',
        '##############################',
        '##############################'
      ],

      /* 5 — the last tangle, and the checkpoint */
      [
        '##############################',
        '##############################',
        '##############################',
        '#####.......................##',
        '#####.......................##',
        '...o.....o.....o.....o....o.o.',
        '<<<<<<######################<<',
        '##############################',
        '..............................',
        '..............................',
        '.3.o.....o.....o....###.o.M...',
        '#######~~~#######~~~##########',
        '##############################',
        '##############################',
        '................o.............',
        '..............................',
        'o.....o.....o.....o.....o.....',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 6 — the Draught, and the last of the rot */
      [
        '##############################',
        '##############################',
        '##############################',
        '#####################.........',
        '#####################.........',
        '....o..................4......',
        '<<<<<<<<<<<<<<<<<<<<<<########',
        '##############################',
        '..............................',
        '..............................',
        '.o.....o.....o.....o......*...',
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        'o.....#o......#...............',
        '#~#~~~~~~~#~~~~~~~#~##########',
        '##############################',
        '##############################'
      ],

      /* 7 — the root stair out, and the cup */
      [
        '##########....................',
        '##########....................',
        '##########....................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..................5.....Z.....',
        '##############...#############',
        '...............###############',
        '............##################',
        '.........#####################',
        '......########################',
        '...###########################',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
