/* Shanty Town III — "The Drowning Tide"
 *
 * THE MECHANIC: the sea comes in. `tide` puts a moving waterline across the
 * whole level — it rests below the boards, floods to row 12, holds, and goes
 * back out on a fourteen-second cycle. Ground that was fine ten seconds ago is
 * twelve feet under. The dashed line drawn while the tide is out is the mark it
 * will reach, so the flood is never a surprise; the timing of the run is.
 *
 * Every perch that survives a flood is on row 11, reached by the same
 * three-plank ladder each time (rows 15, 13, 11). Learn the ladder once and the
 * level becomes a question of whether you can get to the next one.
 *
 * The last two segments sit on raised rock above the tide line, so the Trial
 * and the cup are never underwater — a Trial that could drown you on the way
 * out of it would be a coin toss, not a test.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('shantytown', {
    id: 'shantytown-3',
    name: 'The Drowning Tide',
    blurb: 'The sea comes in on a count of fourteen. Be somewhere else.',
    trial: 'plankPour',
    diff: 1.15,

    // low/high are tile rows. 20 is the floor of the world, so at rest the
    // tide is out of sight and the level plays as ordinary ground.
    tide: { low: 20, high: 12, period: 14, hold: 0.2 },

    quips: {
      '1': '@bonehardy2', '2': '@guinnie2', '3': '@six1',
      '4': '@anqoak2', '5': '@buke2', '6': '@?ru', '7': '@?in,cr'
    },

    segments: [

      /* 0 — the beach, and one ladder, with all the time in the world. */
      [
        '..........o...................',
        '.......=======................',
        '..............................',
        '.....==.......................',
        '..............................',
        '..........==..................',
        '..........o...................',
        '.@...l....o.........1.........',
        '##############################',
        '##############################'
      ],

      /* 1 — the first real run: one ladder, and it is not near the middle. */
      [
        '..............................',
        '.............=======..........',
        '..............................',
        '...........==.................',
        '..............................',
        '................==............',
        '.......o.......o..............',
        '..p.........p........P........',
        '##############################',
        '##############################'
      ],

      /* 2 — the Captain's Flag, planted where the water cannot reach it. */
      [
        '......F....o..................',
        '......=========...............',
        '..............................',
        '....==........................',
        '..............................',
        '..........==.....==...........',
        '..............................',
        '.....o.........o.......2......',
        '##############################',
        '##############################'
      ],

      /* 3 — the channel. The low road is already water; the ladder is late. */
      [
        '..............o...............',
        '...........=======............',
        '..............................',
        '.........==...................',
        '..............................',
        '......==.........==...==......',
        '..............................',
        '....c.....o.......o......c....',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 4 — two ladders, one flood between them, and their crew on the boards. */
      [
        '....o.................o.......',
        '...=====.........=========....',
        '..............................',
        '.......==..........==.........',
        '..............................',
        '...==.........==........==....',
        '..............................',
        '..p.....o...p......o....p..3..',
        '##############################',
        '##############################'
      ],

      /* 5 — the loose boards. They will not hold you for a whole flood. */
      [
        '..............................',
        '.........=========............',
        '..............................',
        '......==..........==..........',
        '..............................',
        '....o....o....o....o....o.....',
        '...LL...LL...LL...LL...LL.....',
        '..............................',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###'
      ],

      /* 6 — the shard is on the highest board on the coast. */
      [
        '............R.................',
        '..........=======.............',
        '..............................',
        '.......==.........==..........',
        '..............................',
        '....==.......==.......==......',
        '.......o......o.......o.......',
        '..W......A.......S.......4....',
        '####xx#########xx#############',
        '##############################'
      ],

      /* 7 — up onto the rock, above the mark, and the Trial of the Plank. */
      [
        '..............................',
        '.........G.......l.......5....',
        '........######################',
        '........######################',
        '...==...######################',
        '........######################',
        '.....==.######################',
        '.....o..######################',
        '##############################',
        '##############################'
      ],

      /* 8 — the cup, on dry rock, well above the mark. */
      [
        '..............................',
        '.....o.....o....7..Z...6......',
        '##############################',
        '##############################',
        '##############################',
        '##############################',
        '##############################',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
