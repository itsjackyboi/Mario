/* Sackbeard's Tavern — the capstone.
 *
 * THE MECHANIC: the beast is not as dead as the sign outside says. `pulse`
 * gives the room a heartbeat — the whole shell throbs red — and every `,` on
 * the map is a socket in the bone that a spine comes out of on the beat. The
 * sockets are drawn all the time, so the map tells you where; the throb tells
 * you when. Being on the wrong tile at the wrong moment costs you grog, and an
 * empty purse in here costs you the run.
 *
 * Everything else is still the whole isles at once: Shanty Town's loose planks
 * and wretches, Aleforge's kegs and gears, Providence's Apostles, Fenwick's
 * vines and phantoms, Roto's bobbers, and an Owe Block pair still settling
 * their argument in the corner. The pulse runs under all of it.
 *
 * `ending: true` sends the results to the ending screen instead of the usual
 * level-complete card; `tankardScale` makes the last cup the biggest in the
 * game.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('tavern', {
    id: 'tavern-1',
    name: "Sackbeard's Tavern",
    blurb: 'The great shell, the whole isles, and a heartbeat under the floor.',
    ending: true,
    tankardScale: 1.7,
    diff: 1.8,

    // The only level in its area, so the in-town shard chain has nothing to
    // hang it on. It hangs off the end of the previous area instead — the
    // whole point of the chain is that the finale is walked to, not jumped to.
    unlockAfter: 'roto-3',
    unlockAfterTown: 'roto',
    unlockNote: "Bring back The Undertow's Red-Earth Shard.",

    // seconds per heartbeat, and how long a spine stays out.
    pulse: { period: 2.5, up: 0.6 },

    quips: {
      '1': '@tv1', '2': '@tv4', '3': '@tv2', '4': '@tv3', '5': '@tv5',
      '6': '@?ru', '7': '@?ru'
    },

    segments: [

      /* 0 — in under the ribs, and the first thing the floor does. */
      [
        '..............................',
        '.@.,.o..,.o..,.l...,..1...,...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — Shanty Town's welcome: loose boards over the grog-sea. */
      [
        '.....o...o...o...o...o...o....',
        '....LL..LL..LL..LL..LL..LL....',
        '...c......c.......c.......c...',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 2 — Aleforge sends the kegs down a table that bites back. */
      [
        '..p.,...o..,.p,..q..o...,..k..',
        '#######...#########...########',
        '#######...#########...########',
        '#######...#########...########'
      ],

      /* 3 — the flag by the hearth. The only quiet boards in the room. */
      [
        '..............................',
        '...F...$..o....l..o.....b...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — Providence marches through, on Aleforge's gearing. */
      [
        '.......o.........o............',
        '.......e.........e............',
        '............==................',
        '..a......................a.6..',
        '.,..........................,.',
        '####.....................#####',
        '####.....................#####',
        '####.....................#####'
      ],

      /* 5 — Fenwick's half of the room, and the shard in the rafters. */
      [
        '..............R...............',
        '.............hhh..............',
        '......o....o...o...o......3...',
        '.....t.....h.h.h.h......t.....',
        '..i...........................',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####',
        '#####~~~~~~~~~~~~~~~~~~~~#####'
      ],

      /* 6 — Roto's floats, and an argument from the Block still running. */
      [
        '....o....o....o....o....o.....',
        '....s....s....s....s....s.....',
        '..m..................c....j...',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~~~~~~~~~~~####'
      ],

      /* 7 — the long table. Kegs one way, a clock hand the other, bone under. */
      [
        '.....o.....o.....o.....o......',
        '.....==....==....==....==..k..',
        '..a,.....,..n....,.......a,7..',
        '####....####....####....######',
        '####....####....####....######',
        '####....####....####....######'
      ],

      /* 8 — the last floor. A rib shelf overhead, and spines off both. */
      [
        '##############################',
        '.....,.....,.....,.....,......',
        '..............................',
        '.......o......o.......o.......',
        '......====...====....====.....',
        '..a...,U....,p.....z,..n...,4.',
        '###xxx###xxx###xxx############',
        '##############################',
        '##############################'
      ],

      /* 9 — the biggest tankard in the eleven seas. */
      [
        '........====..................',
        '.....o.....o....5.Z...........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
