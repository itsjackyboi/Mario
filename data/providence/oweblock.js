/* Owe Block — the bonus branch off Providence, and the hardest level here.
 *
 * A running gang war you are walking through the middle of. Crimson Cutters
 * (red) and Seaside Circus (blue) fight each other on sight; the bandanas
 * decide which half of that war ignores you and which half comes looking.
 *
 * There is no Trial gate: the gauntlet is the trial. The Stank Tank is the
 * only checkpoint, and it is deliberately a long way in.
 *
 * The Block is tuned above everything on the main road: the mine shafts are
 * four tiles wide with nothing at the bottom, both colours are on every
 * screen, and the two things the street will actually sell you — a Cutter's
 * Shiv and a pot of Circus Greasepaint — are both off the safe line.
 *
 * Stored under the `providence` town (so its grog and shards bank there) but
 * themed 'oweblock', which is what `theme:` on a level def is for.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('providence', {
    id: 'providence-oweblock',
    name: 'Owe Block',
    blurb: 'Two gangs, one alley, and nobody on your side.',
    theme: 'oweblock',
    bonus: true,
    difficulty: 'BRUTAL',
    diff: 1.6,
    unlockAfter: 'providence-3',
    unlockNote: "Bring back The Half Beat's Red-Earth Shard to open the road.",

    quips: {
      '1': '@ob1', '2': '@ob4', '3': '@ob2', '4': '@ob3',
      '5': '@ru10', '6': '@ru5', '7': '@in8'
    },

    segments: [

      /* 0 — the mouth of the alley. Colours on the ground, fight already on. */
      [
        '..............................',
        '.@...o....y......m....j.....1.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — first mine shaft. The scaffold is all there is. */
      [
        '......o....o..................',
        '......==...==.................',
        '....o.......j....o.....==.....',
        '#####....#####....#####...####',
        '#####....#####....#####...####',
        '#####....#####....#####...####'
      ],

      /* 2 — up the crates onto the low roofs, where the Cutters sit. */
      [
        '.............m................',
        '............CCC...............',
        '.......CC...CCC.......X.......',
        '..m....CC...CCC.......o....2..',
        '######xx##########xx##########',
        '##############################',
        '##############################'
      ],

      /* 3 — the Stank Tank. Nobody kicks this door in. */
      [
        '..............................',
        '...Y......v....!..o.....l...3.',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 4 — crossfire. Four shafts, both colours, no cover. */
      [
        '.....o.......o.........o......',
        '.....==......==........==.....',
        '..m.......j.......m........j..',
        '####....####....####....######',
        '####....####....####....######',
        '####....####....####....######'
      ],

      /* 5 — a Circus lookout on the ledge with the shard. */
      [
        '...............R..j...........',
        '...............====...........',
        '..........====................',
        '.....====..............J......',
        '..m.....o.....o.......m....5..',
        '####xx#########xx#############',
        '##############################',
        '##############################'
      ],

      /* 6 — the shaft run. An urn, if you fancy walking through it. */
      [
        '....o.....o......o......o.....',
        '..U.==.m...==..o..==.m...==...',
        '###....###....###....###....##',
        '###....###....###....###....##',
        '###....###....###....###....##'
      ],

      /* 7 — the scaffold. Four boards, four bodies, one drop under all of it. */
      [
        '....o.....o.....o.....o.......',
        '....==....==....==....==......',
        '..m....j.......m......j....6..',
        '####...####...####...####..###',
        '####...####...####...####..###',
        '####...####...####...####..###'
      ],

      /* 8 — the long alley. Pick a colour or fight everyone. */
      [
        '.....o.....o.....o....o.......',
        '..y...m...j...m...j...v.....4.',
        '####xx##########xx############',
        '##############################',
        '##############################'
      ],

      /* 9 — out the far end, to the only clean thing on the Block. */
      [
        '........====..................',
        '.....o.....o....7..Z..........',
        '##############################',
        '##############################',
        '##############################'
      ]

    ]
  });

})(window.PL = window.PL || {});
