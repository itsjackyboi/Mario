#!/usr/bin/env python3
"""Aleforge II — Wolendi Wind Farm, rebuilt for v2 as three routes."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240
c = Canvas(W)

SKY, SKYF = 5, 6          # gantry body row / its deck
LAND, LANDF = 10, 11
TUN, TUNF = 16, 17

# --------------------------------------------------------------- the fabric
c.rect(0, 18, W - 1, 19, '#')
c.row(TUNF, 0, W - 1, '#')
c.rect(0, 12, W - 1, 13, '#')      # the yard's floor is the cellar's roof
c.row(LANDF, 0, W - 1, '#')
# The mill roof. Three tiles thick so there is nothing to stand on above it,
# and it is what caps every jump on the gantry to two tiles of rise.
c.rect(24, 0, 219, 2, '#')


# =============================================================== THE GANTRY
# The fast route, and the reverse of The Bone Stair: up here is where the
# time is. Nothing to climb, nothing to wait for, and the mill's own roof
# three rows over your head doing exactly what the crust does underground —
# capping the arc at two tiles, so 3.86 across instead of 4.84.

def deck(c0, c1):
    c.row(SKYF, c0, c1, '=')

def gantry_low(col, w=1):
    c.row(SKYF, col, col + w - 1, '#')

def gantry_high(col, w=1):
    c.row(SKYF - 1, col, col + w - 1, '#')

def stair(start, n, w=1, step=4):
    """Alternating deck heights: the frame-and-a-half chain, up in the beams."""
    for k in range(n):
        (gantry_high if k % 2 else gantry_low)(start + k * step, w)

# 0-29 — up onto the gantry. Two easy ledges, because the gantry must not pay
# to be entered: that is the whole reason it is the fast route.
c.row(9, 20, 22, '=')
c.row(SKYF + 1, 25, 27, '=')
deck(28, 31)

# 30-59 — the first chain of six, and the mill roof over all of it.
c.row(SKYF, 32, 59, '.')
stair(33, 7)
c.text(46, SKY - 2, 'o')

# 60-89 — the shear. Clock arms sweep the gantry; the decks between them are
# whole, so this is a timing problem rather than a geometry one.
deck(60, 66)
c.text(63, SKY, 'n')
deck(70, 76)
c.text(73, SKY, 'n')
deck(80, 88)
c.text(84, SKY, 'o')

# 90-119 — the second chain, two-wide decks five columns apart, which is the
# same frame and a half as one-wide decks four apart.
stair(91, 6, w=2, step=5)
c.text(104, SKY - 2, 'o')

# 120-149 — unbroken walkway over the arm floor. The gust that used to gate
# this is now down in the yard, where it is a way UP rather than a toll: a gust
# lifts for less than half its cycle, and waiting on one is precisely the cost
# the gantry is not allowed to have.
deck(120, 133)
deck(135, 143)
c.text(139, SKY, 'o')
deck(147, 149)

# 150-179 — the third chain, and the longest: eight decks, seven exact jumps.
c.row(SKYF, 150, 179, '.')
stair(151, 8)
c.text(166, SKY - 2, 'R')

# 180-209 — the run out, over the kegs.
deck(180, 187)
c.text(190, SKY, 'n')
deck(191, 198)
deck(202, 209)
c.text(205, SKY, 'o')

# 210-239 — off the end of the gantry and down. Falling is free.
deck(210, 214)
c.row(9, 219, 221, '=')


# ================================================================ THE YARD
# The middle road, under the mill. Keg chutes above it feed kegs down the slope
# at you on a three-second count, clock arms sweep it, and twice the yard is
# blocked by a stack you have to stop dead against and climb.

def hole(c0, c1):
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')

def hole_up(c0):
    """Four columns of nothing, and the far side a tile higher.

    Four is what a flat jump clears with five frames in hand. Four ARRIVING one
    tile up is 4.30 against the 4.00 needed — nine pixels, two frames. Same
    hole, a crate on the far lip, and it stops being a formality.
    """
    hole(c0, c0 + 3)
    c.put(c0 + 4, LANDF - 1, 'C')

c.text(2, LAND, '@')
c.text(7, LAND, 'l')
hole(12, 14)
c.text(17, LAND, 'o')

# 30-59 — the first chute, and a keg every three seconds.
c.text(36, 9, 'k')
c.text(44, LAND, 'o')
hole_up(48)
c.rect(55, LANDF - 2, 56, LANDF - 1, 'C')

# 60-89 — two chutes facing each other across a hole.
c.text(64, 9, 'k')
hole(68, 71)
c.text(78, 9, 'k')
c.text(83, LAND, 'p')

# 90-119 — THE FIRST STACK. Three tiles of crate with nothing to run up: you
# hit it at full speed, stop, and the jump onto it carries you nowhere.
c.rect(96, 8, 97, 10, 'C')
c.text(102, LAND, 'o')
hole_up(106)
c.text(114, LAND, 'p')

# 120-149 — the arm floor. A clock hand sweeps at ground level, and the gust
# beside it is the yard's one way up to the gantry if you change your mind.
c.text(126, LAND, 'n')
c.text(130, LAND - 6, 'g')
c.text(132, LAND, 'o')
hole(136, 139)
c.text(144, LAND, 'U')

# 150-179 — THE SECOND STACK, and the checkpoint past it.
c.rect(156, 8, 157, 10, 'C')
c.text(163, LANDF - 1, 'F')
c.text(169, LAND, 'o')
hole_up(172)

# 180-209 — kegs on the run-in.
c.text(184, 9, 'k')
c.text(190, LAND, 'p')
c.text(196, 9, 'k')
hole_up(200)
c.text(207, LAND, 'N')          # the Lagerhorn, thirty percent more jump

c.text(214, LAND, 'o')
c.text(230, LAND, 'o')


# ============================================================== THE CELLAR
# The slow route, and the one that looks safe. It is flat, it is dark, and
# five times the floor steps up two tiles with nothing to run at — every one of
# those is a dead stop, and five dead stops is where the cellar's two seconds
# go. Nothing down here is trying to kill you quickly.

def step_wall(col, w=2):
    """The floor comes up two tiles. No run-up, so it is a standing jump."""
    c.rect(col, TUNF - 2, col + w - 1, TUNF, '#')

def sump(c0, c1):
    c.row(TUNF, c0, c1, 'x')

def sump_up(c0):
    """Three of spikes and the far lip a tile up, under two tiles of roof:
    3.20 against the 3.00 needed, a frame and a half. The cellar is slow, not
    soft."""
    sump(c0, c0 + 2)
    c.row(TUNF - 1, c0 + 3, c0 + 5, '#')

c.text(6, TUN, 'o')
c.text(18, TUN, 'l')

# a wall every thirty columns or so, and spikes between them
sump(38, 40)
step_wall(46)
sump(58, 60)
c.text(52, TUN, 'o')

step_wall(70)
sump_up(78)
c.text(86, TUN, 'c')

step_wall(100)
sump_up(110)
c.text(104, TUN, 'o')

sump(126, 128)
step_wall(136)
c.text(142, TUN, 'c')

sump_up(158)
step_wall(168)
c.text(174, TUN, 'o')

sump(186, 188)
sump_up(196)
c.text(192, TUN, 'E')           # Brewer's Bellows, down where nobody looks

# 210-239 — the stair out of the cellar, one step every three columns.
c.rect(210, 12, 239, 13, '.')
for k in range(6):
    c.rect(210 + k * 3, 17 - k, 239, 17 - k, '#')
# the yard opens over the top of the stair, or it climbs into the underside
c.row(11, 224, 226, '.')
c.text(216, 13, 'o')



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
c.text(181, SKY, 'T')


# ================================================================ the finish
c.text(234, LAND, 'Z')
c.text(21, LAND, '1')
c.text(90, SKY, '2')
c.text(145, LAND, '3')
c.text(180, TUN, '4')
c.text(228, LAND, '5')


HEADER = """/* Aleforge II — "Wolendi Wind Farm"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and the fast one is the opposite of The Bone
 * Stair's: here it is over the top.
 *
 *   THE GANTRY — up in the mill's beams, and the quick way. It costs almost
 *   nothing to get onto, which is the whole point: two ordinary ledges and you
 *   are up. What it costs is room. The mill roof sits three rows over the deck
 *   and caps every jump at two tiles of rise, which turns a 4.84-tile jump into
 *   a 3.86-tile one, and the decks are cut against the smaller number. Three
 *   times the gantry becomes a staircase — decks four columns apart alternating
 *   between the walkway and one tile above it. Going up, the jump carries 3.20
 *   tiles against the 3.00 you need: nine pixels, a frame and a half. Coming
 *   back down there is one tile of roof left and it is the same frame and a
 *   half. Six, then five, then seven of those in a row.
 *
 *   THE YARD — the middle. Chutes overhead feed kegs down at you every three
 *   seconds, clock hands sweep the floor, and twice the yard is blocked by a
 *   stack of crates with nothing to run up. Each of those is a dead stop, and
 *   a dead stop is the only thing in this engine that actually costs time.
 *
 *   THE CELLAR — the slow one, and the one that looks safe. Flat, dark, and
 *   five times the floor comes up two tiles with no run at it. Five dead stops.
 *
 * Every number here is measured rather than felt — bot/envelope.js flies the
 * arc in the game and reads the reach off it, bot/reach.js proves all three
 * routes go through, bot/routes.js times them against each other, and
 * bot/tightness.js counts the presses in the fast run that have exactly one
 * frame that works.
 */"""

segs = emit(os.path.join(ROOT, 'data/aleforge/level-2.js'), HEADER, {
    'town': 'aleforge',
    'id': 'aleforge-2',
    'name': 'Wolendi Wind Farm',
    'blurb': 'Through the beams, across the yard, or under the whole mill.',
    'diff': 1.15,
    'quips': {'1': '@buke3', '2': '@jager2', '3': '@six2', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the fork: two ledges to the gantry, or a hole to the cellar',
    1: 'the gantry’s first chain of six; the first keg chute below',
    2: 'clock hands on the walkway, chutes facing each other in the yard',
    3: 'the second chain, two-wide decks; the yard’s first stack',
    4: 'the gust column, and a clock hand at ground level',
    5: 'the longest chain — eight decks, seven exact jumps',
    6: 'kegs on the run-in, and the Bellows in the dark',
    7: 'off the gantry, up the cellar stair, and the cup'
})

lanes = [
    Lane('gantry', 3, 6, 30, 209),
    Lane('yard', 7, 11, 30, 209),
    Lane('cellar', 14, 17, 30, 209),
]
bad = report(c, lanes, '\naleforge-2 — geometry, on the measured envelope')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
