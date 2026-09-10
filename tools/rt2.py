#!/usr/bin/env python3
"""Roto Kaiishi II — Netmenders' Row, rebuilt for v2 as three routes."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240
c = Canvas(W)

SKY, SKYF = 5, 6          # the lofts
LAND, LANDF = 10, 11      # the row
TUN, TUNF = 16, 17        # under the pier

c.rect(0, 18, W - 1, 19, '#')
c.row(TUNF, 0, W - 1, '#')
c.rect(0, 12, W - 1, 13, '#')      # the pier decking
c.row(LANDF, 0, W - 1, '#')
# The drying frames. Three courses thick so there is nothing to stand on above
# them, and they are what caps every jump in the lofts to two tiles of rise.
c.rect(24, 0, 219, 2, 'I')


# ================================================================ THE LOFTS
# The fast route. Getting up is two ordinary ledges — the lofts must not pay to
# be entered, that is the whole reason they are quick — and what they cost
# instead is the frames. The drying frames sit three courses over the walk and
# cap the arc at two tiles, so 3.86 across rather than 4.84.

def loft(c0, c1):
    c.row(SKYF, c0, c1, '=')

def rack_low(col, w=1):
    c.row(SKYF, col, col + w - 1, '#')

def rack_high(col, w=1):
    c.row(SKYF - 1, col, col + w - 1, '#')

def stair(start, n, w=1, step=4):
    for k in range(n):
        (rack_high if k % 2 else rack_low)(start + k * step, w)

c.row(9, 20, 22, '=')
c.row(SKYF + 1, 25, 27, '=')
loft(28, 31)

# 30-59 — the first rack: eight racks, seven exact jumps.
c.row(SKYF, 32, 59, '.')
stair(33, 8)
c.text(46, SKY - 2, 'o')

# 60-89 — whole walkway, and the stalls that lean over it.
loft(64, 89)
c.text(70, SKY, 'u')
c.text(80, SKY, 'u')
c.text(75, SKY, 'o')

# 90-119 — the second rack, two-wide and five apart.
c.row(SKYF, 90, 119, '.')
stair(91, 6, w=2, step=5)
c.text(104, SKY - 2, '^')       # tideglass, hung out to dry

# 120-149 — whole walkway again.
loft(120, 149)
c.text(132, SKY, 'u')
c.text(140, SKY, 'o')

# 150-179 — the longest rack: nine, eight exact jumps.
c.row(SKYF, 150, 179, '.')
stair(151, 9)
c.text(166, SKY - 2, 'R')

# 180-209 — the run out.
loft(180, 209)
c.text(190, SKY, 'u')
c.text(200, SKY, 'o')
loft(210, 214)
c.row(9, 219, 221, '=')


# ================================================================== THE ROW
# The middle. Bobbers that sink the moment you put weight on them, stalls in
# the way, and four times the row is blocked by a stack of creels you have to
# stop dead against.

def hole(c0, c1):
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')

def hole_up(c0):
    """Four of nothing, the far lip a course up: 4.30 against 4.00, 2 frames."""
    hole(c0, c0 + 3)
    c.put(c0 + 4, LANDF - 1, 'C')

def creels(col, w=2):
    c.rect(col, 8, col + w - 1, 10, 'C')

c.text(2, LAND, '@')
c.text(8, LAND, 'l')
hole(12, 14)
c.text(18, LAND, 'o')

hole(36, 40)
c.text(38, LAND, 's'); c.text(35, LAND, 's')
creels(48)
hole_up(56)
c.text(66, LAND, 'u')
hole(72, 77)
c.text(74, LAND, 's'); c.text(71, LAND, 's')
creels(86)
hole_up(94)
c.text(104, LAND, 'u')
hole(110, 115)
c.text(112, LAND, 's'); c.text(109, LAND, 's')
creels(124)
hole_up(132)
c.text(142, LAND, 'D')          # a chit, for the stalls
c.text(151, LANDF - 1, 'F')
hole(158, 163)
c.text(160, LAND, 's'); c.text(157, LAND, 's')
creels(172)
hole_up(180)
c.text(190, LAND, 'u')
hole(196, 201)
c.text(198, LAND, 's'); c.text(195, LAND, 's')
c.text(207, LAND, 'O')          # the Albatross Ballast
c.text(214, LAND, 'o')
c.text(230, LAND, 'o')


# ============================================================= UNDER THE PIER
# The slow one. Flat, dark, and eight times the pilings come up two courses
# with nothing to run at. Every one of those is a standing stop, and a standing
# stop is the only thing in this engine that really costs time.

def piling(col, w=2):
    c.rect(col, TUNF - 2, col + w - 1, TUNF, '#')

def swell(c0, c1):
    c.row(TUNF, c0, c1, '~')

def swell_up(c0):
    swell(c0, c0 + 2)
    c.row(TUNF - 1, c0 + 3, c0 + 5, '#')

c.text(6, TUN, 'o')
c.text(19, TUN, 'l')
for k, col in enumerate((36, 58, 80, 102, 124, 146, 168, 190)):
    piling(col)
    c.text(col + 6, TUN, 'o' if k % 2 else 'c')
swell(46, 48)
swell_up(68)
swell(90, 92)
swell_up(112)
swell(134, 136)
swell_up(156)
swell(178, 180)
swell_up(198)

c.rect(210, 12, 239, 13, '.')
for k in range(6):
    c.rect(210 + k * 3, 17 - k, 239, 17 - k, '#')
c.row(11, 224, 226, '.')
c.text(216, 13, 'o')


# ---------------------------------------------------------------- the tonic
# The one thing that actually makes this route faster. Climbing costs almost
# nothing in this engine — a jump carries no horizontal penalty — so the three
# routes of the first draft came out within a frame of one another. A
# Clockheart Tonic is 1.45x for nine seconds and that is real. It sits after
# the last rack on purpose: a Corb at 1.45x jumps half again as far, and a
# bottle before the racks would hand back the tolerance they are made of.
c.text(181, SKY, 'T')


# ================================================================ the finish
c.text(234, LAND, 'Z')
c.text(22, LAND, '1')
c.text(92, SKY, '2')
c.text(146, LAND, '3')
c.text(186, TUN, '4')
c.text(228, LAND, '5')


HEADER = """/* Roto Kaiishi II — "Netmenders' Row"
 *
 * REBUILT FOR v2 AS THREE ROUTES, and the fast one is over the stalls.
 *
 *   THE LOFTS — up among the drying frames, and the quick way. Two ordinary
 *   ledges gets you there, which is deliberate: the lofts must not pay to be
 *   entered. What they cost is room. The frames sit three courses over the
 *   walkway and cap every jump at two tiles of rise, turning a 4.84-tile jump
 *   into a 3.86-tile one, and the racks are cut against the smaller number —
 *   four columns apart, alternating between the walk and one course above it,
 *   which is 3.20 against the 3.00 you need. Nine pixels, a frame and a half,
 *   seven times, then five, then eight, with nothing ordinary in between.
 *   After the last rack there is a Clockheart Tonic, and that is what makes
 *   this route faster rather than merely harder.
 *
 *   THE ROW — the middle. Bobbers that sink the moment you weight them, stalls
 *   leaning across the path, and four stacks of creels you stop dead against.
 *
 *   UNDER THE PIER — the slow one. Flat and dark, and eight times the pilings
 *   come up two courses with nothing to run at.
 *
 * The numbers are measured, not felt: bot/envelope.js flies the arc in the
 * game and reads the reach off it, bot/reach.js proves all three go through,
 * bot/routes.js times them, bot/tightness.js counts the presses in the fast
 * run that have exactly one frame that works.
 */"""

segs = emit(os.path.join(ROOT, 'data/roto/level-2.js'), HEADER, {
    'town': 'roto',
    'id': 'roto-2',
    'name': "Netmenders' Row",
    'blurb': 'Over the frames, along the stalls, or under the whole pier.',
    'diff': 1.45,
    'quips': {'1': '@buke6', '2': '@anqoak1', '3': '@jager3', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the fork: up to the lofts, along the row, or down under the pier',
    1: 'the first rack — eight racks, seven exact jumps',
    2: 'stalls over the walkway; bobbers in the row',
    3: 'the second rack, two-wide and five apart',
    4: 'whole walkway, and the third stack of creels',
    5: 'the longest rack: nine racks, eight exact jumps',
    6: 'the run out, and the eighth piling below',
    7: 'the stair out from under the pier, and the cup'
})

lanes = [
    Lane('lofts', 3, 6, 30, 209),
    Lane('row', 7, 11, 30, 209),
    Lane('pier', 14, 17, 30, 209),
]
bad = report(c, lanes, '\nroto-2 — geometry, on the measured envelope')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
