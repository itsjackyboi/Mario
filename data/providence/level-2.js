/* Providence II — "The Tithe Walk"
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
 *   THE WALK — inside the arcade, and the quick way.
 *      THE FAST ONE. Four staircases: islands four columns apart,
 *   alternating between the floor and one tile above it. Going up, the
 *   capped jump carries 3.20 tiles against the 3.00 you need — nine
 *   pixels, a frame and a half. Coming down off the raised island there
 *   is one tile of roof left and it is the same frame and a half. They
 *   alternate, so there is nothing ordinary in between to breathe on:
 *   seven of them, then five, then eight, then four. And nothing to stop
 *   for anywhere along it, which is the only reason it is quick.
 *
 *   THE LEADS — over the roof.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 *   THE OSSUARY — among the paid-for dead.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 * The fast route being the middle one is the point: Providence charges
 * for everything, and the covered walk is the cheapest thing in the city
 * and still the hardest.

 * Measured, not felt. bot/envelope.js flies the arc in the game and reads the
 * reach off it; tools/lanes.py refuses to draw a gap that cannot be crossed;
 * bot/reach.js proves all three routes go through; bot/pick.js searches the
 * level with nothing confined and reports which route a perfect run actually
 * takes; bot/tightness.js counts the presses in that run with exactly one
 * frame that works.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('providence', {
    id: 'providence-2',
    name: 'The Tithe Walk',
    blurb: 'Over the leads, under the vault, or down among the paid-for dead.',
    diff: 1.3,
    quips: {
      '1': '@buke4',
      '2': '@guinnie1',
      '3': '@jp1',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: into the arcade, up to the leads, or down to the bones */
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

      /* 1 — the first course — eight slabs, seven exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..###.........................',
        '..###o.....o.....o.....o.###..',
        '############xxx#######xxx#####',
        '##############################',
        '................o.............',
        '..............................',
        '..o...#..o....#.o.....#o.....o',
        '#x#xxxxxxx#xxxxxxx#xxxxxxx#xxx',
        '##############################',
        '##############################',
        '..............................',
        '...###........................',
        '..o###.....o.....o.....o..###.',
        '#############xxx#######xxx####',
        '##############################',
        '##############################'
      ],

      /* 2 — the two-wide course; the bell tower on the leads */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..###.........................',
        '..###o...2..o..#...o...#..o...',
        '##########x#xxxxxxx#xxxxxxx#xx',
        '######b#######################',
        '..............................',
        '..............................',
        '#.....no.....o..n...o.....no..',
        'xx############################',
        '##############################',
        '##############################',
        '..............................',
        '...###........................',
        '..o###.....oc.....o.....o.###.',
        '#############xxx#######xxx####',
        '##############################',
        '##############################'
      ],

      /* 3 — the third and longest: nine slabs, eight exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '.#.o.....on.....o...n..o.....o',
        'xxxxx#x#######################',
        '##############################',
        '.............................K',
        '..............................',
        '...o..##...o....##.o.....o##..',
        'x##xxxxxxxx##xxxxxxxx##xxxxxx#',
        '##############################',
        '##############################',
        '..............................',
        '...###........................',
        '...###o.....o.....o.....o.###.',
        '#############xxx#######xxx####',
        '##############################',
        '##############################'
      ],

      /* 4 — tolls on the leads and among the bones */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        'o.....o.....o###.....o...#..o.',
        'xxx#######xxx#######x#xxxxxxx#',
        '##############################',
        '.............................o',
        '..............................',
        '...o.....o..F...o...n..o.....3',
        '####......####################',
        '####......####################',
        '####......####################',
        '......V.......................',
        '..............................',
        'Q...o.#....o..#...o...#..o....',
        '#x#xxxxxxx#xxxxxxx#xxxxxxx#xxx',
        '##############################',
        '##############################'
      ],

      /* 5 — the last course, and the checkpoint */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..........................###.',
        '...#.o.....#o.....o#.....oR##.',
        'xxxxxxx#xxxxxxx#xxxxx#########',
        '##############################',
        '..............................',
        '..............................',
        'o....#.o.....#o.....o#.....o.#',
        'x#xxxxxxx#xxxxxxx#xxxxxxx#xxxx',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '#.o..n...o.....no.....o.....o.',
        'xx############################',
        '##############################',
        '##############################'
      ],

      /* 6 — the last of the tithe */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '....o.....o.....o..###........',
        '######xxx#######xxx###########',
        '##############################',
        '..............................',
        '..............................',
        '....o.....o...#.......#.......',
        'xxx#x####x#xxxxxxx#xxxxxxx#x##',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '....4o.....oo.....#o......#...',
        '#############x#xxxxxxx#xxxxxxx',
        '##############################',
        '##############################'
      ],

      /* 7 — the stair out of the ossuary, and the cup */
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
