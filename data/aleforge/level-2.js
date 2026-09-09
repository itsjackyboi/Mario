/* Aleforge II — "Wolendi Wind Farm"
 *
 * The Derecho family's East Wind farm, sold by the pouch and the barrel. The
 * gust columns run on a fixed cycle: a rising phase that carries you up, then
 * a lateral SHEAR that throws anyone still hanging in the air. Every column
 * has a perch plank at the bottom so you can stand and count it out.
 *
 * THE LOW LINE. At the first two columns there is one loose board lying across
 * the alley at deck height — segment 1 at column 39, segment 2 at column 69 —
 * and a runner who does not want to stand and count can go under the wind
 * instead of up it: ledge, board, far side, without ever touching the perch.
 *
 * It is deliberately at the edge of what the legs can do. The board sits 4.5
 * tiles out and a flat jump carries 4.84, so the take-off window is about four
 * frames wide; short of it is the pit, and the pit has no floor. The flight
 * also crosses the column itself, so the line only exists while that column is
 * quiet — a lift catches you mid-air and puts you back on the perch, a shear
 * throws you out of the alley. Two things to get right, both of them the
 * player's to find.
 *
 * The intended route is untouched: perch, wait for the lift, ride it to the
 * plank above. The board adds a second answer without taking the first away.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('aleforge', {
    id: 'aleforge-2',
    name: 'Wolendi Wind Farm',
    blurb: 'Ride the updrafts. The shear comes right after.',
    diff: 1.15,

    quips: { '1': '@af5', '2': '@af4', '3': '@af6', '4': '@?ru', '5': '@bonehardy3' },

    segments: [

      /* 0 — a gust with solid ground under it. Learn it for free. */
      [
        '............g.................',
        '.................====.........',
        '.................o..o.........',
        '..............................',
        '..............................',
        '.@....o.......o......1........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — the first column you actually have to trust. */
      [
        '.......g......................',
        '..............................',
        '..........====................',
        '..........o..o................',
        '.......==.................====',
        '....o.....4....o......==......',
        '#####........########....#####',
        '#####........########....#####',
        '#####........########....#####'
      ],

      /* 2 — two in a row, with a tonic on the ledge between them. */
      [
        '.......g....o..E...g....o.k...',
        '.........=========...======...',
        '..====....==..........==......',
        '..........o...........o.......',
        '.......==..........==.........',
        '....o.........T..........N....',
        '#####.......#####.......######',
        '#####.......#####.......######',
        '#####.......#####.......######'
      ],

      /* 3 — the flag, and a shard straight up the column above it. */
      [
        '..........g...................',
        '...........R..................',
        '..............................',
        '..........o...................',
        '.........====.................',
        '..............................',
        '...F......o.......o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — a rigging platform strung between two columns. */
      [
        '...........g..................',
        '...........o.o................',
        '..............................',
        '.........................5....',
        '.....o......o.....o...........',
        '.....==.....H.....==..........',
        '####..................########',
        '####..................########',
        '####..................########'
      ],

      /* 5 — three columns, three shears, one pouch. */
      [
        '....g.......g.......g.........',
        '..............................',
        '..............................',
        '..............................',
        '....==......==......==........',
        '.....o...W.E.o.......o...3....',
        '###.....###.....###.....######',
        '###.....###.....###.....######',
        '###.....###.....###.....######'
      ],

      /* 6 — back on solid ground, and the cup. */
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
