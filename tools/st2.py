#!/usr/bin/env python3
"""Shanty Town II — The Bone Stair, rebuilt for v2 as three routes."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240
c = Canvas(W)

SKY, SKYF = 4, 5          # sky body row / its floor
LAND, LANDF = 10, 11      # land body row / its floor
TUN, TUNF = 16, 17        # tunnel body row / its floor
STEP = 15                 # tunnel body row when standing on a raised island

# ------------------------------------------------------------- the base rock
c.rect(0, 18, W - 1, 19, '#')
c.row(TUNF, 0, W - 1, '#')
c.rect(0, 12, W - 1, 13, '#')      # the crust — and the tunnel's roof
c.row(LANDF, 0, W - 1, '#')


# ============================================================== THE TUNNEL
# Flat all the way, so nothing is spent climbing: this is the fast route, and
# the only one with no forced stop in it. What it costs instead is room for
# error. The crust two tiles overhead caps every jump at 3.86 tiles instead of
# 4.84, and the whole corridor is cut against that smaller number.

def spikes(c0, c1):
    c.row(TUNF, c0, c1, 'x')

def island_low(col, w=1):
    """Footing on the tunnel floor: body row 16, two tiles of roof."""
    c.row(TUNF, col, col + w - 1, '#')

def island_high(col, w=1):
    """Footing one tile up: body row 15, and now only ONE tile of roof."""
    c.row(TUNF - 1, col, col + w - 1, '#')

def staircase(start, n, w=1, step=4):
    """The tunnel's signature, and the reason this route is the hard one.

    Islands four columns apart, alternating between the floor and one tile
    above it. Going up, the roof allows two tiles of rise and the jump carries
    3.20 tiles against the 3.00 needed: nine pixels, a frame and a half. Coming
    back down, standing on the raised island leaves only ONE tile of roof, the
    jump carries 3.20 again, and it is the same frame and a half.

    So both directions are exact, and they alternate — which is what makes this
    a chain rather than a trick. There is no ordinary jump in the middle of it
    to breathe on.
    """
    cols = []
    for k in range(n):
        col = start + k * step
        (island_high if k % 2 else island_low)(col, w)
        cols.append(col)
    return cols

# 0-29 — the fork. Solid floor under the drop-in, and the tunnel's own lantern.
c.text(6, TUN, 'o')
c.text(17, TUN, 'l')

# 30-59 — the warm-up: three flat pits of three, which the capped arc clears
# with five frames in hand. Enough to learn what the roof does.
spikes(34, 36); spikes(44, 46); spikes(54, 56)
c.text(40, TUN, 'o')

# 60-89 — the first staircase. Seven islands, six exact jumps back to back.
spikes(61, 89)
staircase(62, 7)
c.text(76, TUN - 3, 'o')

# 90-119 — the plank crossing. Loose boards shake for six tenths of a second
# and then go, so the whole span is one motion, and every take-off after the
# first is from a board already on its way down.
c.row(TUNF, 91, 118, '~')
for k in range(7):
    c.put(93 + k * 4, TUN, 'L')
    c.put(94 + k * 4, TUN, 'L')
c.text(120, TUN, 'o')

# 120-149 — the pinch. A second roof drops to one tile, which cuts the jump to
# 2.71 tiles, and the pits are cut to two. The crawlers live in here.
c.row(14, 120, 149, '#')
spikes(124, 125); spikes(131, 132); spikes(138, 139); spikes(145, 146)
c.text(128, TUN, 'c')
c.text(142, TUN, 'c')

# 150-179 — the second staircase. The islands are two tiles wide, which would
# make every jump a tile shorter and hand back seven frames — so they are five
# columns apart instead of four, and the window is the same frame and a half.
spikes(151, 179)
staircase(152, 6, w=2, step=5)
c.text(166, TUN - 3, 'o')

# 180-209 — water again, and this time the boards are single. One tile wide
# means there is nowhere to stand and think: you land on a board that is
# already shaking and the only thing to do with it is leave.
c.row(TUNF, 181, 208, '~')
for k in range(9):
    c.put(182 + k * 3, TUN, 'L')

# 210-239 — the ramp out, and the point of the whole route: the tunnel pays
# NOTHING to rejoin. A step every three columns, the crust opened overhead so
# no jump is fighting a roof, and it walks straight up onto the land and into
# the cup. The sky route, by contrast, has already spent its climb.
c.rect(210, 12, 239, 13, '.')
for k in range(6):
    c.rect(210 + k * 3, 17 - k, 239, 17 - k, '#')
# The boards open over the top of the ramp. Without this the ramp climbs into
# their underside, the roof over the last step is zero tiles, and the tunnel
# ends in a place you can walk to and not leave.
c.row(11, 224, 226, '.')
c.text(216, 13, 'o')


# ================================================================ THE LAND
# The middle road. Crates, the crew, urns, spikes set into the boards, and
# holes that drop you into the tunnel whether you meant it or not. It pays for
# itself with one chimney at the halfway mark, where the only way on is
# straight up and nothing carries you forward while you climb it.

def hole(c0, c1):
    """A hole clean through the boards and the crust: the way down."""
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')

# 0-29 — the fork itself.
c.text(2, LAND, '@')
c.text(8, LAND, 'l')
hole(12, 14)                 # three columns: a decision, not an accident
c.text(19, LAND, 'o')

# 30-59 — crates and a patroller between them.
c.rect(33, LANDF - 2, 34, LANDF - 1, 'C')
c.text(38, LAND, 'p')
c.rect(43, LANDF - 1, 45, LANDF - 1, 'C')
c.text(50, LAND, 'o')
hole(53, 56)

# 60-89 — the wretch shelf.
c.text(63, LAND, 'c')
hole(68, 71)
c.text(76, LAND, 'c')
c.rect(80, LANDF - 2, 81, LANDF - 1, 'C')
c.text(86, LAND, 'o')

# 90-119 — the long hole, bridged by boards with four columns of nothing
# between them. Four is the flat maximum with five frames in it.
hole(93, 116)
for k in range(5):
    c.row(LANDF, 95 + k * 5, 95 + k * 5, '=')
c.text(105, LAND, 'o')

# 120-149 — the walls, and the land route's whole cost. Four stacks of crates
# three tiles high with nothing to run up: you hit each one at full speed, stop
# dead against it, and the jump that gets you on top of it carries you almost
# nowhere while it lasts. Four of those is where the land road loses its
# second and a half to the tunnel.
for wc in (124, 131, 138, 145):
    c.rect(wc, 8, wc + 1, 10, 'C')
c.text(127, LAND, 'p')
c.text(134, LAND, 'U')
c.text(141, LAND, 'U')
c.text(124, 7, 'o')

# 150-179 — the crate stair, and the checkpoint on top of it.
c.rect(153, LANDF - 1, 154, LANDF - 1, 'C')
c.rect(157, LANDF - 2, 158, LANDF - 1, 'C')
c.text(157, LANDF - 3, 'F')
c.text(163, LAND, 'o')
hole(167, 170)
c.text(175, LAND, 'c')

# 180-209 — the harpoon run: spikes set into the boards themselves.
c.row(LANDF, 183, 185, 'x')
c.row(LANDF, 190, 192, 'x')
c.row(LANDF, 197, 199, 'x')
c.text(187, LAND, 'o')
c.text(194, LAND, 'p')
c.text(203, LAND, 'W')          # a pouch, for whoever wants the sky late
hole(205, 208)

# 210-239 — the run-in and the cup.
c.text(214, LAND, 'o')
c.text(230, LAND, 'o')


# ================================================================= THE SKY
# The slowest, and the meanest to get onto. The way up is a chimney of three
# ledges stacked almost straight over each other, so you climb it at a
# standstill — that climb is where the sky route's time goes, and it is spent
# before the route has started.

def board(c0, c1):
    c.row(SKYF, c0, c1, '=')

# 0-29 — the chimney up out of the fork. Ledges at body 8, 6 and 4, none of
# them more than a column along from the one below: nothing carries you
# forward while you are climbing this.
c.row(9, 22, 24, '=')
c.row(7, 23, 25, '=')
board(24, 29)
c.text(24, 8, 'o')

# 30-59 — boards of one and two, gaps of five onto a ledge a tile higher.
# Five columns arriving one tile up is 1.9 frames — the surface's own version
# of what the tunnel does under its roof.
board(30, 32)
c.row(SKYF - 1, 37, 38, '=')
board(43, 44)
c.row(SKYF - 1, 49, 50, '=')
board(55, 56)
c.text(43, SKY, 'o')

# 60-89 — the rigging. Masts break the line so the run has to be interrupted.
board(61, 64)
c.rect(65, SKYF - 2, 65, SKYF - 1, 'I')     # two tall, hard against the board
board(66, 67)
board(72, 75)
c.rect(76, SKYF - 2, 76, SKYF - 1, 'I')
board(77, 78)
board(83, 88)
c.text(74, SKY, 'R')            # the shard, for whoever came up here on purpose

# 90-119 — the long span: single boards, five columns apart, and the whole
# level underneath.
for k in range(6):
    board(93 + k * 5, 93 + k * 5)
board(123, 124)
c.text(103, SKY, 'o')

# 120-149 — a dip to the lower boards and back. This is the sky route's second
# cost: the climb out of the dip is another standstill.
board(128, 130)
c.row(7, 134, 136, '=')
c.row(7, 140, 142, '=')
c.text(141, 6, 'o')
c.row(SKYF, 146, 148, '=')

# 150-179 — boards of two, gaps of five, over the crate stair below.
board(152, 153)
board(158, 159)
board(164, 165)
board(170, 171)
board(176, 179)
c.text(164, SKY, 'o')

# 180-209 — the last of the boards, over the harpoon run.
board(183, 184)
c.row(SKYF - 1, 189, 190, '=')
board(195, 196)
c.row(SKYF - 1, 201, 202, '=')
board(207, 209)
c.text(196, SKY, 'o')

# 210-239 — down to the cup. Falling is free; the sky route pays on the way up,
# never on the way down.
board(214, 216)
c.row(8, 221, 223, '=')
c.text(222, 7, 'o')



# ---------------------------------------------------------------- the tonic
# THE ONE THING THAT ACTUALLY MAKES THIS ROUTE FASTER.
#
# Climbing costs almost nothing in this engine: a jump carries no horizontal
# penalty, so an obstacle course and a flat run of the same length take the
# same time. Measured, the three routes of the first draft of this level came
# out within a frame of each other, which meant there was no fast route — only
# a hard one and two easy ones.
#
# A Clockheart Tonic is 1.45x for nine seconds, and that is real: it turns the
# last fifty tiles from four hundred frames into two hundred and eighty. It
# sits AFTER the last exact chain on purpose — a Corb moving at 1.45x jumps
# half again as far, and a bottle before the chains would hand back the very
# tolerance they are built out of.
c.text(180, TUN, 'T')


# ================================================================ the finish
c.text(234, LAND, 'Z')

# quips
c.text(20, LAND, '1')
c.text(88, TUN, '2')
c.text(150, LAND, '3')
c.text(200, SKY, '4')
c.text(228, LAND, '5')


HEADER = """/* Shanty Town II — "The Bone Stair"
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
 */"""

segs = emit(os.path.join(ROOT, 'data/shantytown/level-2.js'), HEADER, {
    'town': 'shantytown',
    'id': 'shantytown-2',
    'name': 'The Bone Stair',
    'blurb': 'Over the boards, along them, or under them. Choose before the drop.',
    'diff': 1.0,
    'quips': {'1': '@jager1', '2': '@buke1', '3': '@jp2', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the fork: climb the chimney, run the boards, or drop through them',
    1: 'the tunnel warms up on threes; crates and a patroller above',
    2: 'the first staircase — six exact jumps, alternating up and down',
    3: 'the plank crossing over water, and the long hole on the land road',
    4: "the pinch: one tile of roof, and the land road's chimney",
    5: 'the second staircase, wider islands, the same frame and a half',
    6: 'water and boards again; the harpoon run above',
    7: 'the ramp out of the tunnel, and the cup'
})

# The lanes, as body rows. They do not overlap: row 7 is the land route's own
# ceiling (the top of a crate wall) and the sky route's floor when it dips, and
# those never share a column.
lanes = [
    Lane('sky', 0, 6, 30, 209),
    Lane('land', 7, 11, 30, 209),
    Lane('tunnel', 14, 17, 30, 209),
]
bad = report(c, lanes, '\nshantytown-2 — geometry, on the measured envelope')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
