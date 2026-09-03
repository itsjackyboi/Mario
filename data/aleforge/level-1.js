/* Aleforge I — "Brewers Lane"
 *
 * Rooftop platforming. The roofs are three tiles thick and the gaps between
 * them go all the way down to the lane, so a miss is a fall. Kegs come off the
 * chutes rolling left, straight into your path.
 *
 * Segments are bottom-aligned (see level.js), so a four-row segment is a flat
 * roof at row 17 with the marker row at 16.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('aleforge', {
    id: 'aleforge-1',
    name: 'Brewers Lane',
    blurb: 'Over the tile and slate, with the kegs coming down at you.',
    diff: 1.1,

    quips: { '1': '@af1', '2': '@af2', '3': '@af3', '4': '@ru1', '5': '@in3' },

    segments: [

      /* 0 — the ridge line. Flat, safe, and a first look at the town. */
      [
        '.@...o....o.....5....1........',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — the first gaps, bridged by brewery catwalks. */
      [
        '.......o........o.............',
        '.......==.......==............',
        '....o.......o.......o.........',
        '#####.....#####....######.####',
        '#####.....#####....######.####',
        '#####.....#####....######.####'
      ],

      /* 2 — first chute. The keg gets to the gap before you do. */
      [
        '..p.....o....p...&..4......k..',
        '########..####################',
        '########..####################',
        '########..####################'
      ],

      /* 3 — a flat stretch, and the flag over the mayor's tavern. */
      [
        '..............................',
        '...F......o.......o.....l...2.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — two chutes over two gaps. Time the rolls, not the jumps. */
      [
        '............k......p..o..k....',
        '#####....#####....############',
        '#####....#####....############',
        '#####....#####....############'
      ],

      /* 5 — up the catwalks for the shard, or straight on for the tonic. */
      [
        '..........R...................',
        '.........====.................',
        '....==...........==...........',
        '..T..N..o.......o........W....',
        '####.....########.....########',
        '####.....########.....########',
        '####.....########.....########'
      ],

      /* 6 — the long roof to the cup. */
      [
        '........====..................',
        '.....o.....o....3..Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
