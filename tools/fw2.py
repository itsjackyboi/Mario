#!/usr/bin/env python3
"""Fenwick II — The Overturned Wood, rebuilt for v2 as three routes.

The lanternOfRoots trial that used to live here has moved to its own level,
fenwick-3. This one is pure technical difficulty, as asked.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240
c = Canvas(W)

SKY, SKYF = 4, 5          # the canopy
LAND, LANDF = 10, 11      # the bog
TUN, TUNF = 16, 17        # the roots

c.rect(0, 18, W - 1, 19, '#')
c.row(TUNF, 0, W - 1, '#')
c.rect(0, 12, W - 1, 13, 'B')      # the root ceiling
c.row(LANDF, 0, W - 1, '#')


# ================================================================ THE ROOTS
# The fast route. Under the bog the root-mat is two tiles over your head for
# the whole length of the wood, and a jump that cannot rise past two tiles
# carries 3.86 instead of 4.84. Everything down here is cut against the smaller
# number, and three times it becomes a staircase with nothing in it but exact
# jumps.

def rot(c0, c1):
    c.row(TUNF, c0, c1, '~')

def knot_low(col, w=1):
    c.row(TUNF, col, col + w - 1, '#')

def knot_high(col, w=1):
    c.row(TUNF - 1, col, col + w - 1, '#')

def stair(start, n, w=1, step=4):
    for k in range(n):
        (knot_high if k % 2 else knot_low)(start + k * step, w)

c.text(6, TUN, 'o')
c.text(19, TUN, 'l')

# 30-59 — the first tangle: eight knots, seven exact jumps.
rot(31, 59)
stair(32, 8)
c.text(45, TUN - 2, 'o')

# 60-89 — spines in a whole floor. A timing problem, not a geometry one.
c.text(65, TUN, ',')
c.text(73, TUN, ',')
c.text(81, TUN, ',')
c.text(69, TUN, 'o')

# 90-119 — the second tangle, knots two wide and five apart.
rot(90, 119)
stair(91, 6, w=2, step=5)
c.text(104, TUN - 2, 'w')       # spiritweed, where the light does not reach

# 120-149 — a spine floor with the mat pinched to one tile: the arc drops to
# 2.71 and the rot is cut to two.
# The mat pinches from 124, not 120: the stair above lands at 120, and a roof
# that starts on the landing column is a roof the jump has to pass through.
c.row(14, 124, 149, 'B')
rot(128, 129); rot(135, 136); rot(142, 143)
c.text(132, TUN, ',')
c.text(146, TUN, ',')

# 150-179 — the third and longest tangle: nine knots, eight exact jumps.
rot(150, 179)
stair(151, 9)
c.text(166, TUN - 2, 'o')

# 180-209 — the last of the rot, and a short tangle at the end of it.
rot(181, 195)
stair(182, 4)
c.text(200, TUN, ',')
c.text(205, TUN, 'o')

# 210-239 — the root stair out. No shaft, no wait.
c.rect(210, 12, 239, 13, '.')
for k in range(6):
    c.rect(210 + k * 3, 17 - k, 239, 17 - k, '#')
c.row(11, 224, 226, '.')
c.text(216, 13, 'o')


# ================================================================== THE BOG
# The middle road. Phantoms that are only footing while a spirit-light burns,
# vines that reach and withdraw, and four times a root buttress across the path
# that has to be climbed from a standstill.

def hole(c0, c1):
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')

def hole_up(c0):
    """Four of nothing and the far lip a tile up: 4.30 against 4.00, 2 frames."""
    hole(c0, c0 + 3)
    c.put(c0 + 4, LANDF - 1, 'B')

def buttress(col, w=2):
    c.rect(col, 8, col + w - 1, 10, 'B')

c.text(2, LAND, '@')
c.text(8, LAND, 'l')
hole(12, 14)
c.text(18, LAND, 'o')

c.text(34, LAND, 'i')           # a spirit-light, and the phantoms it wakes
c.text(38, LAND, 'h'); c.text(41, LAND, 'h'); c.text(44, LAND, 'h')
hole(37, 45)
buttress(52)
hole_up(58)

c.text(70, LAND, 't')
hole(68, 72)
c.text(78, LAND, 'i')
c.text(82, LAND, 'h'); c.text(85, LAND, 'h')
hole(81, 86)
buttress(94)
hole_up(100)

c.text(112, LAND, 't')
hole(110, 114)
c.text(120, LAND, 'M')          # mossbound boots, which hold a vine out
buttress(128)
hole_up(134)
c.text(146, LAND, 't')
hole(144, 148)

c.text(155, LANDF - 1, 'F')
buttress(162)
hole_up(168)
c.text(180, LAND, 'i')
c.text(184, LAND, 'h'); c.text(187, LAND, 'h')
hole(183, 188)
hole_up(196)
c.text(206, LAND, '*')          # the Draught

c.text(214, LAND, 'o')
c.text(230, LAND, 'o')


# =============================================================== THE CANOPY
# Over the top, and the slowest. The way up is three branches almost directly
# above one another — climbed at a standstill before the route has begun — and
# there is a second standstill at the break in the middle.

def branch(c0, c1):
    c.row(SKYF, c0, c1, '=')

c.row(9, 21, 23, '=')
c.row(7, 22, 24, '=')
branch(23, 29)
c.text(23, 8, 'o')

branch(30, 33)
c.row(SKYF - 1, 38, 39, '=')
branch(44, 45)
c.row(SKYF - 1, 50, 51, '=')
branch(56, 60)
c.text(44, SKY, 'o')

c.rect(61, SKYF - 2, 61, SKYF - 1, 'I')     # a bole, hard against the branch
branch(62, 66)
branch(71, 75)
c.rect(76, SKYF - 2, 76, SKYF - 1, 'I')
branch(77, 81)
branch(86, 93)
c.text(73, SKY, 'R')

for k in range(5):
    branch(98 + k * 5, 99 + k * 5)
branch(123, 129)
c.text(108, SKY, 'o')

# the break in the middle: down two branches and back up
c.row(7, 134, 137, '=')
c.row(7, 142, 145, '=')
branch(149, 154)
c.text(143, 6, 'o')

branch(159, 161)
c.row(SKYF - 1, 166, 167, '=')
branch(172, 174)
c.row(SKYF - 1, 179, 180, '=')
branch(185, 191)
c.text(173, SKY, 'o')

branch(196, 199)
branch(204, 209)
branch(213, 217)
c.row(9, 222, 224, '=')



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
c.text(198, TUN, 'T')


# ================================================================ the finish
c.text(234, LAND, 'Z')
c.text(24, LAND, '1')
c.text(90, TUN, '2')
c.text(150, LAND, '3')
c.text(200, SKY, '4')
c.text(228, LAND, '5')


HEADER = """/* Fenwick II — "The Overturned Wood"
 *
 * REBUILT FOR v2 AS THREE ROUTES. The Lantern of Roots that used to gate the
 * middle of this level has moved to fenwick-3, which is its own level and
 * exists to hold it; nothing here is a minigame any more.
 *
 *   THE ROOTS — under the bog, and the fast way. The root-mat is two tiles
 *   over your head for the whole length of the wood, and a jump that cannot
 *   rise past two tiles carries 3.86 tiles instead of 4.84. The footing down
 *   there is cut against the smaller number: knots four columns apart,
 *   alternating between the mud and one tile above it, which is 3.20 against
 *   the 3.00 you need — nine pixels, a frame and a half. Seven of those, then
 *   five, then eight, then three, with nothing ordinary in between to breathe
 *   on. Nothing to climb and nothing on a cycle: this route's only cost is
 *   that it does not forgive.
 *
 *   THE BOG — the middle. Phantoms that are only footing while a spirit-light
 *   is burning, vines that reach and withdraw, and four root buttresses across
 *   the path that have to be climbed from a dead stop. A dead stop is the one
 *   thing in this engine that really costs time, and there are four of them.
 *
 *   THE CANOPY — over the top, and the slowest. The way up is three branches
 *   almost directly above one another, climbed at a standstill before the route
 *   has started, and there is a second standstill at the break in the middle.
 *
 * The numbers are measured rather than felt: bot/envelope.js flies the arc in
 * the game and reads the reach off it, bot/reach.js proves all three routes go
 * through, bot/routes.js times them against each other, and bot/tightness.js
 * counts the presses in the fast run that have exactly one frame that works.
 */"""

segs = emit(os.path.join(ROOT, 'data/fenwick/level-2.js'), HEADER, {
    'town': 'fenwick',
    'id': 'fenwick-2',
    'name': 'The Overturned Wood',
    'blurb': 'Under the roots, through the bog, or up where the light is.',
    'diff': 1.5,
    'quips': {'1': '@buke5', '2': '@guinnie3', '3': '@six3', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the fork: down among the roots, into the bog, or up the branches',
    1: 'the first tangle — eight knots, seven exact jumps',
    2: 'spines on a whole floor; the spirit-light and its phantoms above',
    3: 'the second tangle, two-wide knots five apart',
    4: 'the mat pinches to one tile; a buttress across the bog',
    5: 'the longest tangle: nine knots, eight exact jumps',
    6: 'the last of the rot, and the break in the canopy',
    7: 'the root stair out, and the cup'
})

lanes = [
    Lane('canopy', 0, 6, 30, 209),
    Lane('bog', 7, 11, 30, 209),
    Lane('roots', 14, 17, 30, 209),
]
bad = report(c, lanes, '\nfenwick-2 — geometry, on the measured envelope')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
