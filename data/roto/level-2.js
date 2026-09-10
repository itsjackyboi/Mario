/* Roto Kaiishi II — "Netmenders' Row"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and the fast one is over the stalls.
 *
 *   THE LOFTS — up among the drying frames, and the quick way. Two ordinary
 *   ledges gets you there, which is deliberate: the lofts must not pay to be
 *   entered. What they cost is room. The frames sit three courses over the
 *   walkway and cap every jump at two tiles of rise, turning a 4.84-tile jump
 *   into a 3.86-tile one, and the racks are cut against the smaller number —
 *   four columns apart, alternating between the walk and one course above it,
 *   which is 3.20 against the 3.00 you need. Nine pixels, a frame and a half,
 *   seven times, then five, then eight, with nothing ordinary in between.
 *   After the last rack there is a Clockheart Tonic, and that is what makes
 *   this route faster rather than merely harder.
 *
 *   THE ROW — the middle. Bobbers that sink the moment you weight them, stalls
 *   leaning across the path, and four stacks of creels you stop dead against.
 *
 *   UNDER THE PIER — the slow one. Flat and dark, and eight times the pilings
 *   come up two courses with nothing to run at.
 *
 * The numbers are measured, not felt: bot/envelope.js flies the arc in the
 * game and reads the reach off it, bot/reach.js proves all three go through,
 * bot/routes.js times them, bot/tightness.js counts the presses in the fast
 * run that have exactly one frame that works.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('roto', {
    id: 'roto-2',
    name: 'Netmenders\' Row',
    blurb: 'Over the frames, along the stalls, or under the whole pier.',
    diff: 1.45,
    quips: {
      '1': '@buke6',
      '2': '@anqoak1',
      '3': '@jager3',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: up to the lofts, along the row, or down under the pier */
      [
        '........................IIIIII',
        '........................IIIIII',
        '........................IIIIII',
        '..............................',
        '..............................',
        '..............................',
        '............................==',
        '.........................===..',
        '..............................',
        '....................===.......',
        '..@.....l.........o...1.......',
        '############...###############',
        '############...###############',
        '############...###############',
        '..............................',
        '..............................',
        '......o............l..........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — the first rack — eight racks, seven exact jumps */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '................o.............',
        '..............................',
        '.......#.......#.......#......',
        '==.#.......#.......#.......#..',
        '..............................',
        '..................CC..........',
        '..................CC..........',
        '.....s..s.........CC..........',
        '######.....###############....',
        '######.....###############....',
        '######.....###############....',
        '..............................',
        '......##....................##',
        '......##....c...............##',
        '################~~~###########',
        '##############################',
        '##############################'
      ],

      /* 2 — stalls over the walkway; bobbers in the row */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '..............................',
        '..............................',
        '.#........u....o....u.........',
        '....==========================',
        '..............................',
        '..........................CC..',
        '..........................CC..',
        'C.....u....s..s...........CC..',
        '############......############',
        '############......############',
        '############......############',
        '..............................',
        '....................##........',
        '....o......###......##....c...',
        '########~~~###################',
        '##############################',
        '##############################'
      ],

      /* 3 — the second rack, two-wide and five apart */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '..............^...............',
        '..............................',
        '..2...##........##........##..',
        '.##........##........##.......',
        '..............................',
        '..............................',
        '..............................',
        '........C.....u....s..s.......',
        '####....############......####',
        '####....############......####',
        '####....############......####',
        '..............................',
        '............##................',
        '............##....o......###..',
        '~~~###################~~~#####',
        '##############################',
        '##############################'
      ],

      /* 4 — whole walkway, and the third stack of creels */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '..............................',
        '..............................',
        '............u.......o.........',
        '==============================',
        '..............................',
        '....CC........................',
        '....CC........................',
        '....CC..........C.....D...3...',
        '############....##############',
        '############....##############',
        '############....##############',
        '..............................',
        '....##....................##..',
        '....##....c...............##..',
        '##############~~~#############',
        '##############################',
        '##############################'
      ],

      /* 5 — the longest rack: nine racks, eight exact jumps */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '................R.............',
        '..............................',
        '.....#.......#.......#.......#',
        '.#.......#.......#.......#....',
        '..............................',
        '......................CC......',
        '......................CC......',
        '.F.....s..s...........CC......',
        '########......################',
        '########......################',
        '########......################',
        '..............................',
        '..................##..........',
        '..o......###......##....c.....',
        '######~~~###################~~',
        '##############################',
        '##############################'
      ],

      /* 6 — the run out, and the eighth piling below */
      [
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        'IIIIIIIIIIIIIIIIIIIIIIIIIIIIII',
        '..............................',
        '..............................',
        '.T........u.........o.........',
        '==============================',
        '..............................',
        '..............................',
        '..............................',
        '....C.....u....s..s........O..',
        '....############......########',
        '....############......########',
        '....############......########',
        '..............................',
        '..........##..................',
        '......4...##....o....###......',
        '~#################~~~#########',
        '##############################',
        '##############################'
      ],

      /* 7 — the stair out from under the pier, and the cup */
      [
        'IIIIIIIIII....................',
        'IIIIIIIIII....................',
        'IIIIIIIIII....................',
        '..............................',
        '..............................',
        '..............................',
        '=====.........................',
        '..............................',
        '..............................',
        '.........===..................',
        '....o.............5.o...Z.....',
        '##############...#############',
        '...............###############',
        '......o.....##################',
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
