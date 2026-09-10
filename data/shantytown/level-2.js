/* Shanty Town II — "The Bone Stair"
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
 *   UNDER THE BOARDS — the tunnel.
 *      THE FAST ONE. Four staircases: islands four columns apart,
 *   alternating between the floor and one tile above it. Going up, the
 *   capped jump carries 3.20 tiles against the 3.00 you need — nine
 *   pixels, a frame and a half. Coming down off the raised island there
 *   is one tile of roof left and it is the same frame and a half. They
 *   alternate, so there is nothing ordinary in between to breathe on:
 *   seven of them, then five, then eight, then four. And nothing to stop
 *   for anywhere along it, which is the only reason it is quick.
 *
 *   ALONG THEM — the land, the middle road.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 *   OVER THE TOP — the sky, under the bone scaffolding.
 *      Two staircases of its own — twelve exact jumps, because no road
 *   here is a rest — and between them the things that cost time: gaps of
 *   three, lips a tile up, and three or four places where the floor comes
 *   up two tiles with nothing to run at. A standing stop is the only
 *   thing in this engine that really costs time, and that is why this
 *   road is the slower one.
 *
 * The old Bone Stair was a climb with one way up it, and a
 * tool-assisted search finished it one frame under the human record.
 * That is what a level looks like when there is nothing in it to decide.

 * Measured, not felt. bot/envelope.js flies the arc in the game and reads the
 * reach off it; tools/lanes.py refuses to draw a gap that cannot be crossed;
 * bot/reach.js proves all three routes go through; bot/pick.js searches the
 * level with nothing confined and reports which route a perfect run actually
 * takes; bot/tightness.js counts the presses in that run with exactly one
 * frame that works.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('shantytown', {
    id: 'shantytown-2',
    name: 'The Bone Stair',
    blurb: 'Over the boards, along them, or under them. All three will drown you.',
    diff: 1.0,
    quips: {
      '1': '@jager1',
      '2': '@buke1',
      '3': '@jp2',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: over the boards, along them, or under them */
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

      /* 1 — the first staircase — eight islands, seven exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '......#.......#.R.....#.......',
        '#x#xxxxxxx#xxxxxxx#xxxxxxx#xxx',
        '##############################',
        '..............................',
        '..............................',
        '......#.......#.......#.......',
        '#x#xxxxxxx#xxxxxxx#xxxxxxx#xxx',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '......#.......#.......#.......',
        '#~#~~~~~~~#~~~~~~~#~~~~~~~#~~~',
        '##############################',
        '##############################'
      ],

      /* 2 — the two-wide staircase; the crew on the boards above */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '......###.....................',
        '#.....###..................###',
        'xx##########xxx#########xxx###',
        '##############################',
        '..............................',
        '..................###.........',
        '#...........p.....###.........',
        'xx############################',
        '##############################',
        '################o#############',
        '..............................',
        '..............................',
        '#...........................2.',
        '~~############################',
        '##############################',
        '##############################'
      ],

      /* 3 — the third and longest: nine islands, eight exact jumps */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '........###...................',
        '........##o...................',
        '##############...#xxx#########',
        '##############...#############',
        '..............................',
        '..............................',
        '...........................###',
        'xxx###########...#######xxx###',
        '##############...#############',
        '##############...#############',
        '..............................',
        '..............................',
        '......##........##........##..',
        '~##~~~~~~~~##~~~~~~~~##~~~~~~#',
        '##############################',
        '##############################'
      ],

      /* 4 — tolls on both slow roads */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '............###...............',
        '............###...............',
        '##################xxx#########',
        '##############################',
        '..............................',
        '###.....................###...',
        '###.....c.F.............###...',
        '######xxx#####################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        'o.............................',
        '##############################',
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
        '.....#.......#......o#.......#',
        'x#xxxxxxx#xxxxxxx#xxxxxxx#xxxx',
        '##############################',
        '..............................',
        '..............................',
        '3....#.......#.......#......p#',
        'x#xxxxxxx#xxxxxxx#xxxxxxx#xxxx',
        '##############################',
        '################o#############',
        '..............................',
        '..............................',
        '.....#.......#.......#.......#',
        '~#~~~~~~~#~~~~~~~#~~~~~~~#~~~~',
        '##############################',
        '##############################'
      ],

      /* 6 — the last of the tolls */
      [
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        '..............................',
        '....................4.........',
        'xxx#x#########...#############',
        '##############...#############',
        '..............................',
        '..............................',
        '..........................W...',
        'xxx#x#########...###xxx#######',
        '##############...#############',
        '##############...#############',
        '..............................',
        '..............................',
        '..............#.......#.......',
        '~~~#~####~#~~~~~~~#~~~~~~~#~##',
        '##############################',
        '##############################'
      ],

      /* 7 — the stair out from under the boards, and the cup */
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
