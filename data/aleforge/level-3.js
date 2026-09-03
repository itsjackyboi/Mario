/* Aleforge III — "The Rolling Boil"
 *
 * THE MECHANIC: something in the mash house let go, and a wall of live steam is
 * coming down the lane behind you. `boil` puts it in the level at a constant
 * speed from before the spawn point. It does not slow down, it does not care
 * what you are standing on, and there is nothing you can do about it — it even
 * scours the rival crews off the boards as it passes.
 *
 * Everything else here is deliberately familiar. Gears, hands and chutes are
 * all Aleforge's own furniture; what is new is that you cannot stand and read
 * any of them. Hesitate at one gear and the steam decides the rest.
 *
 * It does stop for the Trial — a Trial is a scene of its own, so the level is
 * not ticking — and it picks up exactly where it left off afterwards, which is
 * why the Golden Taps gate has a long clear run before it.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('aleforge', {
    id: 'aleforge-3',
    name: 'The Rolling Boil',
    blurb: 'A wall of steam down Brewers Lane. It is not going to stop.',
    trial: 'goldenTaps',
    diff: 1.3,

    // px per second, and how far behind the spawn it starts.
    boil: { speed: 33, start: -260 },

    quips: {
      '1': '@af6', '2': '@af3', '3': '@six2', '4': '@ru14', '5': '@in5'
    },

    segments: [

      /* 0 — the only flat ground in the level, and it is already going. */
      [
        '.@...o....o....N....1.........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — first gear. You get one swing of it, not three. */
      [
        '...........o.o................',
        '...........e..................',
        '..............................',
        '.......==........==...........',
        '.....o................o.......',
        '######..............##########',
        '######..............##########',
        '######..............##########'
      ],

      /* 2 — two hands over a run you cannot afford to wait out. */
      [
        '......n.......n...............',
        '..............................',
        '..............................',
        '..o.......o....4....o.........',
        '#####....#####....############',
        '#####....#####....############',
        '#####....#####....############'
      ],

      /* 3 — the flag. Take it at a run; there is no standing here. */
      [
        '..............................',
        '...F......o.......o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — three gears and a plank, over nothing at all. */
      [
        '.......o.........o.......o....',
        '.......e.........e.......e....',
        '............==................',
        '..............................',
        '..............................',
        '####.....................#####',
        '####.....................#####',
        '####.....................#####'
      ],

      /* 5 — the shard is off the line. It costs you about a second. */
      [
        '........R.....................',
        '......................n.......',
        '.......e......................',
        '..............................',
        '....................==...==...',
        '.....o..........oE............',
        '#####..........####..........#',
        '#####..........####..........#',
        '#####..........####..........#'
      ],

      /* 6 — chutes into the last gap, with the steam still coming. */
      [
        '..k.....o....k......o......k..',
        '#####....#####....############',
        '#####....#####....############',
        '#####....#####....############'
      ],

      /* 7 — the clear run at the Golden Taps. Earned, and short. */
      [
        '..........o.......o...........',
        '.......G......&......l....3...',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 8 — the cup at the top of the lane. */
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
