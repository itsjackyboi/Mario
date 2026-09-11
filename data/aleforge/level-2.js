/* Aleforge II — "Wolendi Wind Farm"
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
 *   THE GANTRY — up in the mill’s beams.
 *      THE FAST ONE. Four staircases: islands four columns apart,
 *   alternating between the floor and one tile above it. Going up, the
 *   capped jump carries 3.20 tiles against the 3.00 you need — nine
 *   pixels, a frame and a half. Coming down off the raised island there
 *   is one tile of roof left and it is the same frame and a half. They
 *   alternate, so there is nothing ordinary in between to breathe on:
 *   seven of them, then five, then eight, then four. And nothing to stop
 *   for anywhere along it, which is the only reason it is quick.
 *
 *   THE YARD — the middle, under the chutes.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 *   THE CELLAR — under the whole mill.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 * Measured, not felt. bot/envelope.js flies the arc in the game and reads the
 * reach off it; tools/lanes.py refuses to draw a gap that cannot be crossed;
 * bot/reach.js proves all three routes go through; bot/pick.js searches the
 * level with nothing confined and reports which route a perfect run actually
 * takes; bot/tightness.js counts the presses in that run with exactly one
 * frame that works.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('aleforge', {
    id: 'aleforge-2',
    name: 'Wolendi Wind Farm',
    blurb: 'Through the beams, across the yard, or under the whole mill.',
    diff: 1.15,
    quips: {
      '1': '@buke3',
      '2': '@jager2',
      '3': '@six2',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: up into the beams, across the yard, or down the cellar */
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
        '..@.....l.............1.......',
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

      /* 1 — the gantry’s first staircase — eight decks, seven exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '....|....|....|..o............',
        '........................W.....',
        '..o.....o.....o.....o...#..o..',
        '#####################xxxxxxx##',
        '##############################',
        '....|....|....................',
        '.................###..........',
        '..o.....o.....o..###...o.....o',
        '###########################xxx',
        '##############################',
        '##############################',
        '..........####################',
        '....###...####################',
        '..o.###....o.....o.....o.....o',
        '##########<<<<<<<<<<<<<<<<<<<<',
        '##############################',
        '##############################'
      ],

      /* 2 — the two-wide staircase; a keg chute in the yard */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '...o.....o...#..o....#.o.....#',
        '########x#xxxxxxx#xxxxxxx#xxxx',
        '##############################',
        '..............................',
        '.................###..........',
        '.....o....###.o..###...o.....o',
        '#####k#xxx#################xxx',
        '##############################',
        '##############################',
        '###.......................####',
        '###.....###...............####',
        '.....o..###.c..o.....o.....o..',
        '<<<<######################<<<<',
        '##############################',
        '##############################'
      ],

      /* 3 — the third and longest: nine decks, eight exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............o..|....|.......',
        '............................R.',
        'o2.....o.....o.....o.....o.===',
        'x####xxxxxx###################',
        '##############################',
        '..............................',
        '..............................',
        '.....o....###.o...p..o..#...o.',
        '#######xxx#########x#xxxxxxx#x',
        '##############################',
        '##############################',
        '###################...........',
        '###################.....###.R.',
        '...o.....o.....o.....o..###===',
        '<<<<<<<<<<<<<<<<<<<<##########',
        '##############################',
        '##############################'
      ],

      /* 4 — tolls in the yard and the cellar */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '....o.....o#.....o.#....o..#..',
        '######x#xxxxxxx#xxxxxxx#xxxxxx',
        '##############################',
        '..............................',
        '.............###..............',
        '..#..o....F.o###.....o.....o3.',
        'xxxxxx#x#############k#xxx####',
        '##############################',
        '##############################',
        '............##################',
        '............##################',
        '...o.....oo.....o.....o.....o.',
        '############<<<<<<<<<<<<<<<<<<',
        '##############################',
        '##############################'
      ],

      /* 5 — the last staircase, and the checkpoint */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '.o.....o.....o.....o.....o....',
        'x#x###########################',
        '##############################',
        '..............................',
        '.............R................',
        '....o.###...===.o.....o.....o.',
        '###xxx########################',
        '##############################',
        '##############################',
        '#####.......................##',
        '#####.......................##',
        '....o.....o.....o.....o...4..o',
        '<<<<<<######################<<',
        '##############################',
        '##############################'
      ],

      /* 6 — the Bellows, down where nobody looks */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '.o.......#.......#............',
        '####x#xxxxxxx#xxxxxxx#x#######',
        '##############################',
        '..............................',
        '..............................',
        '....o.....o.....No............',
        '##############################',
        '##############################',
        '##############################',
        '#####################.........',
        '#####################.........',
        '.....o.................E......',
        '<<<<<<<<<<<<<<<<<<<<<<########',
        '##############################',
        '##############################'
      ],

      /* 7 — the cellar stair, and the cup */
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
