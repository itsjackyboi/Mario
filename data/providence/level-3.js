/* Providence III — "The Half Beat"
 *
 * THE MECHANIC: half the floor is not there. `(` is stone that exists on even
 * chimes; `)` is stone that exists on odd ones. They are written straight into
 * the tile grid, so they are real terrain while they are there — walls, floors,
 * ceilings — and empty air when they are not.
 *
 * The town's whole promise is that its hazards are countable, and this keeps
 * it: a block flashes for the last third of a beat before it leaves, and the
 * ghost of the one coming back is drawn the whole time. Nothing is hidden. What
 * is hard is that the ground you want is never the ground you are on, and
 * standing where a block returns is a death.
 *
 * Clearing this still opens the Owe Block road — which now wants the shard out
 * of it, not just the clear.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('providence', {
    id: 'providence-3',
    name: 'The Half Beat',
    blurb: 'Half the floor is on the beat. The other half is on the next one.',
    trial: 'orderOfChimes',
    diff: 1.45,

    quips: {
      '1': '@pv1', '2': '@pv5', '3': '@six1', '4': '@?ru', '5': '@?in,cr'
    },

    segments: [

      /* 0 — the vault door, and one block of each, side by side. */
      [
        '..............................',
        '..............................',
        '.@...o....b........o......1...',
        '#################(((()))######',
        '##############################',
        '##############################'
      ],

      /* 1 — the first crossing. Two steps, and only one of them is now. */
      [
        '.......o.......o.......o......',
        '..............................',
        '..............................',
        '####((((####))))####((((######',
        '####((((####))))####((((######',
        '####((((####))))####((((######'
      ],

      /* 2 — alternating piers over a drop with no bottom. */
      [
        '.....o.....o.....o.....o......',
        '..............................',
        '..f...........................',
        '####(((.))))(((.))))(((.))####',
        '####(((.))))(((.))))(((.))####',
        '####(((.))))(((.))))(((.))####'
      ],

      /* 3 — the flag, on stone that is always there. */
      [
        '..............................',
        '..............................',
        '...F....b.o...K...o..b..2.....',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — a stair you can only climb on the half beat. */
      [
        '......................((......',
        '..................))))........',
        '..............((((............',
        '.....o....))))......o.........',
        '.....==.......................',
        '#####....................#####',
        '#####....................#####',
        '#####....................#####'
      ],

      /* 5 — an Apostle on the ledge, and the ledge is not always a ledge. */
      [
        '..............R...............',
        '............))))..............',
        '.....((((.........a...........',
        '..f.....o.....o..Q....f.......',
        '###xx######xx######xx#####xx##',
        '##############################',
        '##############################'
      ],

      /* 6 — the ceiling comes down on the off beat. Do not be under it. */
      [
        '######))))######((((##########',
        '..............................',
        '.......o......o.......o.......',
        '......====...====....====.....',
        '..a..........a............a...',
        '###xx#####xx#####xx####xx#####',
        '##############################',
        '##############################'
      ],

      /* 7 — the long half-beat walk. Four piers, three of the Order. */
      [
        '....o.....o.....o.....o.......',
        '..a.......a.....a.........3...',
        '####)))####(((####)))####((###',
        '####)))####(((####)))####((###',
        '####)))####(((####)))####((###'
      ],

      /* 8 — the Order of Chimes. */
      [
        '..........o.......o...........',
        '.......G....+..b.....l....4...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 9 — the cup in the vault. */
      [
        '........====..................',
        '.....o.....o....5..Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
