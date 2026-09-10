#!/usr/bin/env python3
"""Providence II — The Tithe Walk, rebuilt for v2 as three routes."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240
c = Canvas(W)

SKY, SKYF = 5, 6          # the leads: body row / the arcade roof
LAND, LANDF = 10, 11      # inside the arcade
TUN, TUNF = 16, 17        # the ossuary

c.rect(0, 18, W - 1, 19, '#')
c.row(TUNF, 0, W - 1, '#')
c.rect(0, 12, W - 1, 13, '#')
c.row(LANDF, 0, W - 1, '#')
# The arcade roof: the sky route's floor and the walk's ceiling at once. Two
# tiles thick so nothing can stand between the two lanes.
c.rect(26, 6, 217, 7, 'B')


# ============================================================ THE TITHE WALK
# The fast route, and the only covered one. Inside the arcade the roof sits two
# tiles over your head, which caps every jump at 3.86 tiles instead of 4.84 —
# and the floor is cut against the smaller number the whole way. Nothing to
# climb, nothing on a cycle, and no room at all.

def gap(c0, c1):
    c.row(LANDF, c0, c1, 'x')

def slab_low(col, w=1):
    c.row(LANDF, col, col + w - 1, '#')

def slab_high(col, w=1):
    c.row(LANDF - 1, col, col + w - 1, '#')

def stair(start, n, w=1, step=4):
    """Slabs alternating between the floor and one course above it."""
    for k in range(n):
        (slab_high if k % 2 else slab_low)(start + k * step, w)

c.text(2, LAND, '@')
c.text(9, LAND, 'l')
c.text(18, LAND, 'o')

# 30-59 — the first course. Six exact jumps under the vault.
gap(31, 59)
stair(32, 8)
c.text(45, LAND - 2, 'o')

# 60-89 — the friars. The floor is whole here; what is in the way is a man who
# fines you for crossing his eyeline.
c.text(64, LAND, 'f')
c.text(72, LAND, 'a')
c.text(80, LAND, 'f')
c.text(86, LAND, 'o')

# 90-119 — the second course, slabs two wide and five apart.
gap(90, 119)
stair(91, 6, w=2, step=5)
c.text(104, LAND - 2, 'K')      # the scarab, in the middle of the worst of it

# 120-149 — the apostles, marching in strict time down a whole floor.
c.text(125, LAND, 'a')
c.text(133, LAND, 'a')
c.text(141, LAND, 'a')
c.text(129, LAND, 'o')
c.text(137, LAND, 'U')

# 150-179 — the third and longest course: nine slabs, eight exact jumps.
gap(150, 179)
stair(151, 8)
c.text(166, LAND - 2, 'o')

# 180-209 — the last of the tithe. Friars either side of a short course.
c.text(184, LAND, 'f')
gap(190, 202)
stair(191, 4)
c.text(206, LAND, 'a')

c.text(214, LAND, 'o')
c.text(230, LAND, 'o')


# ================================================================ THE LEADS
# Over the roof. Open sky, no cap on the jump — and half of it built out of
# tithe-blocks, which are only there on every other chime. That is the slow
# route's cost: the blocks keep their own time and you keep theirs.

def lead(c0, c1):
    c.row(SKYF, c0, c1, '=')

def roof_hole(c0, w=4):
    """A hole clean through the arcade roof.

    The roof is two courses thick and doing two jobs: it is the leads' road and
    the walk's ceiling. Left whole it makes the leads a flat pavement with
    nothing in it, so it is cut — but only where the walk below has whole floor,
    because a hole here lifts the walk's ceiling and hands back the very cap
    that makes the walk hard.
    """
    c.rect(c0, SKYF, c0 + w - 1, SKYF + 1, '.')

def phase_run(c0, n, odd_first=False):
    """Alternating tithe-blocks: half the causeway at a time, on the beat."""
    for k in range(n):
        c.put(c0 + k, SKYF, ')' if (k % 2) == (0 if odd_first else 1) else '(')

# up onto the roof out of the fork
c.row(9, 20, 22, '=')
c.row(SKYF + 1, 23, 25, '=')

# 30-59 — solid leads, then the first tithe causeway.
lead(30, 39)
phase_run(41, 10)
lead(52, 59)
c.text(56, SKY, 'o')
roof_hole(35)

# 60-89 — the walk below has whole floor here, so the roof can be cut. Four
# columns of nothing, and the far lip a course higher: 1.9 frames, in the open
# with the whole city underneath.
lead(60, 89)
roof_hole(63)
c.row(SKYF - 1, 67, 69, '=')
roof_hole(74)
c.row(SKYF - 1, 78, 80, '=')
c.text(85, SKY, 'o')

# 90-119 — the long tithe causeway. Fourteen blocks, and only seven of them at
# any one moment.
phase_run(92, 14, odd_first=True)
lead(108, 119)
c.text(113, SKY, 'o')

# 120-149 — the bell tower splits the roof, and two more cuts either side of it.
lead(120, 149)
roof_hole(122)
# Three courses, not five. A tower you cannot get on top of is a wall, and a
# wall across the only road is a route that does not exist.
c.rect(130, SKYF - 3, 131, SKYF - 1, 'B')
c.text(130, SKYF - 4, 'b')
roof_hole(135)
c.row(SKYF - 1, 139, 141, '=')
roof_hole(145)

# 150-179 — leads and one more causeway.
lead(152, 160)
phase_run(162, 10)
lead(173, 179)
c.text(176, SKY, 'R')

# 180-209 — three cuts in a row, each with the far lip a course higher. The
# walk below is whole through all of it.
lead(180, 209)
roof_hole(182)
c.row(SKYF - 1, 186, 187, '=')
roof_hole(203)
c.text(197, SKY, 'o')
lead(210, 214)

c.row(9, 219, 221, '=')


# ============================================================= THE OSSUARY
# Under the walk, among the paid-for dead. The slowest of the three, and
# entirely because of the ledges: eight times the floor comes up two courses
# with nothing to run at, and every one of those is a standing stop.

def wall(col, w=2):
    c.rect(col, TUNF - 2, col + w - 1, TUNF, '#')

def pit(c0, c1):
    c.row(TUNF, c0, c1, 'x')

def pit_up(c0):
    pit(c0, c0 + 2)
    c.row(TUNF - 1, c0 + 3, c0 + 5, '#')

def hole(c0, c1):
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')

hole(12, 14)
c.text(6, TUN, 'o')
c.text(19, TUN, 'l')

for k, col in enumerate((36, 58, 80, 102, 124, 146, 168, 190)):
    wall(col)
    c.text(col + 6, TUN, 'o' if k % 2 else 'c')
pit(46, 48)
pit_up(68)
pit(90, 92)
pit_up(112)
pit(134, 136)
pit_up(156)
pit(178, 180)
pit_up(198)
c.text(150, TUN, 'Q')           # a Draught of Purity, kept with the bones

# the stair out
c.rect(210, 12, 239, 13, '.')
for k in range(6):
    c.rect(210 + k * 3, 17 - k, 239, 17 - k, '#')
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
c.text(185, LAND, 'T')


# ================================================================ the finish
c.text(234, LAND, 'Z')
c.text(22, LAND, '1')
c.text(88, SKY, '2')
c.text(148, LAND, '3')
c.text(184, TUN, '4')
c.text(228, LAND, '5')


HEADER = """/* Providence II — "The Tithe Walk"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and the fast one is the middle one — which
 * is the point. Providence charges for everything; the covered walk is the
 * cheapest thing in the city and it is still the hardest.
 *
 *   THE WALK — inside the arcade, and the quick way. The vault sits two tiles
 *   over your head for its whole length, and a jump that cannot rise past two
 *   tiles carries 3.86 tiles instead of 4.84. Every course of slabs down there
 *   is cut against the smaller number: four columns apart, alternating between
 *   the floor and one course above it, which is 3.20 against the 3.00 you
 *   need. Nine pixels. A frame and a half, seven times, then five, then eight.
 *   Nothing to climb and nothing on a cycle — the walk's only cost is that it
 *   does not forgive.
 *
 *   THE LEADS — over the roof. No cap on the jump up there, and the gaps are
 *   ordinary. What it costs is the tithe-blocks: three causeways built out of
 *   stone that is only present on every other chime, so half the road is
 *   missing at any moment and you go at the bells' pace rather than your own.
 *
 *   THE OSSUARY — under the walk, among the paid-for dead. Flat, and slow for
 *   one reason: eight times the floor comes up two courses with nothing to run
 *   at. A standing jump is the only thing in this engine that really costs
 *   time, and there are eight of them down there.
 *
 * The numbers are measured, not felt: bot/envelope.js flies the arc and reads
 * the reach off it, bot/reach.js proves all three go through, bot/routes.js
 * times them against each other, bot/tightness.js counts the presses in the
 * fast run with exactly one frame that works.
 */"""

segs = emit(os.path.join(ROOT, 'data/providence/level-2.js'), HEADER, {
    'town': 'providence',
    'id': 'providence-2',
    'name': 'The Tithe Walk',
    'blurb': 'Under the vault, over the leads, or down among the paid-for dead.',
    'diff': 1.3,
    'quips': {'1': '@buke4', '2': '@guinnie1', '3': '@jp1', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the fork: into the arcade, up to the leads, or down to the bones',
    1: 'the first course — eight slabs, seven exact jumps',
    2: 'friars and an apostle on a whole floor; the first tithe causeway',
    3: 'the second course, two-wide slabs; the long causeway above',
    4: 'the apostles march; the bell tower splits the roof',
    5: 'the longest course: nine slabs, eight exact jumps',
    6: 'the last of the tithe, and the ossuary’s eighth ledge',
    7: 'the stair out of the bones, and the cup'
})

lanes = [
    Lane('leads', 0, 5, 30, 209),
    Lane('walk', 8, 11, 30, 209),
    Lane('ossuary', 14, 17, 30, 209),
]
bad = report(c, lanes, '\nprovidence-2 — geometry, on the measured envelope')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
