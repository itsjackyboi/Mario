/* Providence I — "The Ordered Stair"
 *
 * Cut stone terraces. Apostles march exactly one tile per chime and turn on
 * every fourth, so every patrol in this town is a countable pattern rather
 * than a wandering hazard. The bells are the metronome.
 *
 * This is where the tryout stops being forgiving: the terraces are broken by
 * four-tile drops with nothing under them, and the iron in the floor is laid
 * in threes rather than pairs.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('providence', {
    id: 'providence-1',
    name: 'The Ordered Stair',
    blurb: 'Everything here moves on the bell. Learn the bell.',
    diff: 1.25,

    quips: { '1': '@pv4', '2': '@pv1', '3': '@?ru', '4': '@?ru' },

    segments: [

      /* 0 — the lower terrace, and the first bell. */
      [
        '..............................',
        '.@...o....b....o......1.......',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — one step up, an Apostle on each level, iron in the risers. */
      [
        '..............a...o...........',
        '..........#########...........',
        '..a...o...#########....a...o..',
        '#####xx##################xx###',
        '##############################',
        '##############################'
      ],

      /* 2 — the terrace breaks. Three drops, ledges over two of them. */
      [
        '......o...o...................',
        '......==..==..................',
        '....o.............a...==..o...',
        '#####....####....####....#####',
        '#####....####....####....#####',
        '#####....####....####....#####'
      ],

      /* 3 — the flag between two bells. */
      [
        '..............................',
        '...F....b.o....+..o..b..2.....',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — iron in the floor, laid in threes, Apostles on top of it. */
      [
        '.......o.......o.......o......',
        '..a....a...........a..........',
        '###xxx###xxx###xxx###xxx######',
        '##############################',
        '##############################'
      ],

      /* 5 — up the ledges for the shard. A Scarab, if you can reach it. */
      [
        '..................R...........',
        '................====..........',
        '..........====................',
        '.....====..........K..........',
        '..U.....o.....o......f...3....',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 6 — the ledger run: step, iron, step, and three of the Order. */
      [
        '.........o..........o.........',
        '.........==.........==........',
        '...a..........a...........a...',
        '####xx####xx####xx####xx######',
        '##############################',
        '##############################'
      ],

      /* 7 — the cup at the head of the stair. */
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
