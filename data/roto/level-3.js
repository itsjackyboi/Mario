/* Roto Kaiishi III — "The Undertow"
 *
 * THE MECHANIC: the water is doing something to you. `current` runs a tidal
 * race through the market — it shoves you sideways every single frame, holds
 * for a third of the cycle, goes slack, then runs the other way. On the boards
 * you can lean into it and still walk; in the air you cannot, so every jump
 * becomes a wager on where the water will have put you by the time you land.
 *
 * Which way it is running is written across the top of the screen and drawn in
 * the spray, so it is never a guess. Landing on a bobber that has drifted four
 * feet from where you aimed still is.
 *
 * Mossbound Boots hold against it on the ground — the one counter in the game,
 * and it is two towns back.
 *
 * The taboo market under the boards is still down there, and it is still the
 * only place with a Goldcoral Chit lying about. Ends with the Haggle.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('roto', {
    id: 'roto-3',
    name: 'The Undertow',
    blurb: 'The race runs one way, then the other. You are in it either way.',
    trial: 'theHaggle',
    diff: 1.6,

    // px per frame at full strength, and the length of one full reversal.
    current: { push: 1.3, period: 7.5 },

    quips: {
      '1': '@rt1', '2': '@rt2', '3': '@six2', '4': '@?ru', '5': '@?in,cr'
    },

    segments: [

      /* 0 — the top of the row. Feel it before it matters. */
      [
        '.@...o....u.......o...1.......',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — floats over the deep channel, in a race. */
      [
        '.....o....o....o....o....o....',
        '.....s....s....s....s....s....',
        '.......c...........c..........',
        '#####~~~~~~~~~~~~~~~~~~~~~~###',
        '#####~~~~~~~~~~~~~~~~~~~~~~###',
        '#####~~~~~~~~~~~~~~~~~~~~~~###'
      ],

      /* 2 — hooks in the boards. The race decides which one you land on. */
      [
        '.......o.......o.......o......',
        '......====....====....====....',
        '..p.........p...........p.....',
        '###xxx##xxx###xxx###xxx#######',
        '##############################',
        '##############################'
      ],

      /* 3 — the flag above the trapdoor. */
      [
        '..............................',
        '...F...^..u....O..o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — THE TABOO MARKET. Drop through, or float over on the bobbers. */
      [
        '..o.....s..s.............o....',
        '#######.......##########...###',
        '........................CCC...',
        '..........D.............CCC...',
        '..p.....o....R....p.....CCC...',
        '#####xx###############xx######',
        '##############################',
        '##############################'
      ],

      /* 5 — back on top, and the race is at its worst here. */
      [
        '....o....o....o....o....o.....',
        '....s....s....s....s....s.....',
        '.....c.........c.........c....',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 6 — nothing fixed for the whole crossing, and the water in charge. */
      [
        '...o....o....o....o....o..4...',
        '...s....s....H....s....s......',
        '......c.......c.......c.......',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~~~~~~~~~~~###'
      ],

      /* 7 — the Haggle, on ground that is not going anywhere. */
      [
        '..........o.......o...........',
        '.......G....^..u.....W....3...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 8 — the cup, and the end of the market. */
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
