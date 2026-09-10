/* Shanty Town II — "The Bone Stair"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and they are not equal.
 *
 * The old Bone Stair was a climb with one way up it. A tool-assisted search
 * finished it one frame under the human record, which is what a level looks
 * like when there is nothing in it to decide.
 *
 *   UNDER THE BOARDS — the tunnel, and the fast way. Flat the whole length, so
 *   nothing is spent climbing and there is no forced stop anywhere in it. What
 *   it costs instead is room for error. The crust sits two tiles over your
 *   head, and a jump that cannot rise past two tiles carries 3.86 tiles
 *   instead of 4.84 — so every pit down there is cut against the smaller
 *   number. Twice it becomes a staircase of islands four columns apart,
 *   alternating between the floor and one tile above it: going up, the jump
 *   carries 3.20 against the 3.00 you need, which is nine pixels and a frame
 *   and a half; coming back down off the raised island there is only one tile
 *   of roof left and it is the same frame and a half. Six of those in a row,
 *   twice, with no ordinary jump in between to breathe on.
 *
 *   ALONG THEM — the land, the middle road. Crates, the crew, urns, spikes set
 *   into the boards, and holes that drop you into the tunnel whether you meant
 *   it or not. It is slower than the tunnel by one thing only: the chimney at
 *   the halfway mark, where the ledges are stacked straight overhead and
 *   nothing carries you forward while you climb.
 *
 *   OVER THE TOP — the sky, and the slowest. The way up is three ledges almost
 *   directly above one another, climbed at a standstill before the route has
 *   even started, and there is a second standstill at the dip in the middle.
 *   Up there the boards are one and two tiles wide with gaps of five onto
 *   ledges a tile higher, which is 1.9 frames apiece.
 *
 * Every number above is measured rather than felt. bot/envelope.js flies the
 * arc in the game and reads the reach off it; bot/reach.js checks all three
 * routes actually go through; bot/tightness.js counts how many presses in the
 * fast run have exactly one frame that works. If the physics change, those
 * three say so rather than leaving the level quietly impossible.
 */
(function (PL) {
  'use strict';

  PL.Towns.addLevel('shantytown', {
    id: 'shantytown-2',
    name: 'The Bone Stair',
    blurb: 'Over the boards, along them, or under them. Choose before the drop.',
    diff: 1.0,
    quips: {
      '1': '@jager1',
      '2': '@buke1',
      '3': '@jp2',
      '4': '@?ru',
      '5': '@?in,cr'
    },

    segments: [

      /* 0 — the fork: climb the chimney, run the boards, or drop through them */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '........................======',
        '..............................',
        '.......................===....',
        '........................o.....',
        '......................===.....',
        '..@.....l..........o1.........',
        '############...###############',
        '############...###############',
        '############...###############',
        '..............................',
        '..............................',
        '......o..........l............',
        '##############################',
        '##############################',
        '##############################'
      ],

      /* 1 — the tunnel warms up on threes; crates and a patroller above */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '.......==....o.....==.........',
        '===..........==..........==...',
        '..............................',
        '..............................',
        '..............................',
        '...CC.........................',
        '...CC...p....CCC....o.........',
        '#######################....###',
        '#######################....###',
        '#######################....###',
        '..............................',
        '..............................',
        '..........o...................',
        '####xxx#######xxx#######xxx###',
        '##############################',
        '##############################'
      ],

      /* 2 — the first staircase — six exact jumps, alternating up and down */
      [
        '..............................',
        '..............................',
        '..............................',
        '.....I..........I.............',
        '.....I........R.I.............',
        '.====.==....====.==....======.',
        '..............................',
        '..............................',
        '..............................',
        '....................CC........',
        '...c............c...CC....o...',
        '########....##################',
        '########....##################',
        '########....####o#############',
        '..............................',
        '..............................',
        '......#.......#.......#.....2.',
        '#x#xxxxxxx#xxxxxxx#xxxxxxx#xxx',
        '##############################',
        '##############################'
      ],

      /* 3 — the plank crossing over water, and the long hole on the land road */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '.............o................',
        '...=....=....=....=....=....=.',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '...............o..............',
        '###..=....=....=....=....=.###',
        '###........................###',
        '###........................###',
        '..............................',
        '..............................',
        '...LL..LL..LL..LL..LL..LL..LL.',
        '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
        '##############################',
        '##############################'
      ],

      /* 4 — the pinch: one tile of roof, and the land road's chimney */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '...==...===...............===.',
        '.....................o........',
        '....o.........===...===.......',
        '....CC.....CC.....CC.....CC...',
        '....CC.....CC.....CC.....CC...',
        '....CC.p...CC.U...CC.U...CC...',
        '##############################',
        '##############################',
        '##############################',
        '##############################',
        '..............................',
        'o.......c.............c.......',
        '####xx#####xx#####xx#####xx###',
        '##############################',
        '##############################'
      ],

      /* 5 — the second staircase, wider islands, the same frame and a half */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............o...............',
        '..==....==....==....==....====',
        '..............................',
        '..............................',
        '.......F......................',
        '.......CC.....................',
        '3..CC..CC....o...........c....',
        '#################....#########',
        '#################....#########',
        '################o....#########',
        '..............................',
        '..............................',
        '.......##........##........##.',
        '#x##xxxxxxxx##xxxxxxxx##xxxxxx',
        '##############################',
        '##############################'
      ],

      /* 6 — water and boards again; the harpoon run above */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '.........==.....o...4==.......',
        '...==..........==..........===',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '.......o......p........W......',
        '###xxx####xxx####xxx#####....#',
        '#########################....#',
        '#########################....#',
        '..............................',
        '..............................',
        'T.L..L..L..L..L..L..L..L..L...',
        '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
        '##############################',
        '##############################'
      ],

      /* 7 — the ramp out of the tunnel, and the cup */
      [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '....===.......................',
        '..............................',
        '............o.................',
        '...........===................',
        '..............................',
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
