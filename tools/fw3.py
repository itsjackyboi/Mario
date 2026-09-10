#!/usr/bin/env python3
"""Fenwick III — The Lantern of Roots. A new level, built to hold the trial.

fenwick-2 was Fenwick's second level AND the town's only trial. Rebuilding it
for v2 as a three-route technical level would have taken the Lantern of Roots
out of the game altogether, so the trial gets a level of its own instead. This
is that level: one road, Fenwick's own furniture, and the gate two thirds of
the way along it.
"""
import os
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 270
c = Canvas(W)

GND, GNDF = 16, 17

c.rect(0, 18, W - 1, 19, '#')
c.row(GNDF, 0, W - 1, '#')


def rot(c0, c1):
    c.row(GNDF, c0, c1, '~')

def ledge(c0, c1, row):
    c.row(row, c0, c1, '=')

def knot(c0, c1, row=GNDF - 1):
    c.row(row, c0, c1, 'B')


# 0-29 — the edge of the wood.
c.text(2, GND, '@')
c.text(8, GND, 'l')
c.text(14, GND, 'o')
ledge(20, 23, 13)
c.text(21, 12, 'o')
c.text(27, GND, ',')

# 30-59 — the first rot, crossed on vines and one knot.
rot(31, 58)
c.text(34, GND, 't')
knot(38, 39)
c.text(43, GND, 't')
knot(47, 48)
c.text(52, GND, 't')
knot(55, 56)
c.text(43, GND - 3, 'o')

# 60-89 — spirit-light and the phantoms it wakes.
c.text(62, GND, 'i')
rot(66, 86)
c.text(68, GND, 'h'); c.text(72, GND, 'h'); c.text(76, GND, 'h')
c.text(80, GND, 'h'); c.text(84, GND, 'h')
# One course lower than it wants to be: from a phantom at body 15 a ledge at
# row 12 is a four-row climb, and three is all there is.
ledge(70, 72, 13)
c.text(71, 12, 'o')

# 90-165 — THE VEIL GATES, and the reason to come here.
#
# The gate is a touch trigger, so it goes on the FLOOR and the flip does the
# lifting: you run into it at ground level, gravity turns over, and you fall
# seven tiles UP onto the underside of the canopy. The first version made you
# jump up to the canopy and touch the gate in mid-air, and the search spent six
# million states failing to do it — a flip is enough to ask for on its own
# without also asking for the jump that sets it up.
c.rect(90, 8, 165, 8, 'B')        # the canopy: the floor you are about to get
c.text(112, GND, '%')             # in, at a run, on the ground
rot(120, 157)                     # what is under you once you are over it
c.text(127, 9, ',')               # spines hanging from the canopy — now the floor
c.text(136, 9, ',')
c.text(145, 9, ',')
c.text(131, 9, 'o')
c.text(141, 9, 'o')
c.text(154, 9, ',')
c.text(162, 9, '%')               # and out again, onto solid ground
c.text(103, GND, 'o')

# 166-179 — landing, and a breath before the gate of the trial.
c.text(170, GND, 'o')
c.text(176, GND, ',')

# 180-209 — the gate of the trial, on solid ground so nobody arrives at it in
# mid-air. The Lantern of Roots is played here.
c.text(186, GND, 'F')             # checkpoint first: a trial you can retry
c.text(196, GND, 'G')
c.text(204, GND, 'o')

# 210-239 — past the trial, the deep wood: vines, spines, and one long rot.
rot(212, 236)
c.text(214, GND, 't')
knot(219, 220)
c.text(224, GND, 't')
knot(229, 230)
c.text(234, GND, 't')
ledge(222, 225, 13)
c.text(223, 12, 'R')              # the shard, out over the worst of it

# 240-269 — the last of it, and the cup.
c.text(244, GND, ',')
# Four of rot, not five: five is one more than a flat jump reaches, and the
# knot on the far side is a course up, which is 1.9 frames as it stands.
rot(248, 251)
knot(253, 254)
c.text(258, GND, 'o')
c.text(264, GND, 'Z')

# --- the purse ---------------------------------------------------------------
#
# Ten barrels was what this level shipped with and it is nowhere near enough:
# grog is the life pool, a death costs five, and every other level in the game
# carries between twenty-one and thirty-two. So the rest go down the road
# wherever the road has room, placed after everything else and only where the
# body row is still empty — a barrel written over a knot or a ledge does not
# decorate this level, it deletes a piece of it.
placed = 0
for col in range(6, W - 8):
    if placed >= 22:
        break
    if col % 8:
        continue
    if c.g[GND][col] != '.':
        continue
    # only where there is something under it, so nothing floats over the rot
    if c.g[GNDF][col] not in '#=B':
        continue
    c.put(col, GND, 'o')
    placed += 1

c.text(24, GND, '1')
c.text(88, GND, '2')
c.text(148, 9, '3')
c.text(208, GND, '4')
c.text(256, GND, '5')


HEADER = """/* Fenwick III — "The Lantern of Roots"
 *
 * A NEW LEVEL FOR v2, and it exists to hold a trial.
 *
 * The Overturned Wood used to be two things at once: Fenwick's second level and
 * the only trial in the town. Rebuilding it as a three-route technical level —
 * which is what v2 does to every second level — would have taken the Lantern of
 * Roots out of the game entirely. So the trial gets a level of its own, and
 * fenwick-2 gets to be about jumping.
 *
 * One road, and Fenwick's own furniture on it: vines that reach and withdraw,
 * phantoms that are only footing while a spirit-light burns, spines in the mud,
 * and the veil gates. The gates are the middle of the level and the reason to
 * come here — the first turns gravity over and hands you the underside of the
 * canopy to run along, with holes in it and the whole rotted floor a long way
 * below; the second turns you back and drops you.
 *
 * The trial gate itself sits on solid ground with a checkpoint in front of it,
 * so nobody arrives at it in mid-air and nobody has to cross the wood twice to
 * try it again.
 *
 * It unlocks behind The Overturned Wood's shard and gives up its own, so it
 * sits in the chain where the old level did and Roto opens off the end of it
 * exactly as before.
 */"""

segs = emit(os.path.join(ROOT, 'data/fenwick/level-3.js'), HEADER, {
    'town': 'fenwick',
    'id': 'fenwick-3',
    'name': 'The Lantern of Roots',
    'blurb': 'The wood turns over, and then it asks you a question.',
    'trial': 'lanternOfRoots',
    'diff': 1.55,
    'quips': {'1': '@buke7', '2': '@guinnie4', '3': '@six4', '4': '@?ru', '5': '@?in,cr'},
}, c, {
    0: 'the edge of the wood',
    1: 'the first rot, on vines',
    2: 'a spirit-light, and the phantoms it wakes',
    3: 'the climb to the veil gate',
    4: 'upside down, on the underside of the canopy',
    5: 'the second gate turns you back and drops you',
    6: 'the gate of the trial, on solid ground',
    7: 'past it: the deep wood, and the shard',
    8: 'the last of the rot, and the cup'
})

# Two lanes because the level has two gravities. The checker knows nothing
# about veil gates, so the upside-down stretch is measured on its own terms and
# bot/reach.js — which does know — is what proves the two halves join up.
lanes = [Lane('right way up', 10, 17, 20, 118),
         Lane('overturned', 8, 12, 120, 168),
         Lane('right way up again', 10, 17, 169, 250)]
bad = report(c, lanes, '\nfenwick-3 — geometry (one road, so one lane)')
for i, s in enumerate(segs):
    for r in s:
        if len(r) != 30:
            print('  segment %d has a row of the wrong width' % i)
print('\n%d impossible steps' % bad)
