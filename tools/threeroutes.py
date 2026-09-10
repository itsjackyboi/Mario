#!/usr/bin/env python3
"""The three-deck skeleton every rebuilt second level is cut from.

WHAT THE ENGINE ACTUALLY REWARDS, measured rather than assumed. Three drafts of
these levels were thrown away learning it, so it is written down here:

  1. A jump costs no horizontal speed. An obstacle course and a flat run of the
     same length take the same time, so obstacles make a route HARD, not SLOW.
     The first draft paid for its slow routes in climbing and the search timed
     two of them at exactly the same frame.

  2. You can always fall and never climb. Height is an asset you spend by
     dropping out of it, so a route that is higher than another dominates it
     unless being up there costs something.

  3. An UNROOFED lane is an escape hatch. In the second draft the sky lane was
     open to the air, so its jumps had the full 4.84-tile envelope while the
     roofed fast route underneath had 3.86 — and a perfect run took the easy
     lane for 58% of the level and dropped into the hard one only to pick up
     the tonic sitting there. The fast route was not a route, it was a shop.

  4. The Clockheart Tonic makes a level EASIER to time, not harder. At 1.45x
     each frame covers 6.2 pixels instead of 4.3, so the same nine-pixel window
     stops being a frame and a half and becomes three. There is no tonic in any
     of these levels.

So: three decks, and all three of them capped.

    rows 0-2    the upper roof         — caps the sky deck
    rows 3-4    sky headroom
    row  5      sky body row
    rows 6-7    the deck               — sky's floor, land's ceiling
    rows 8-9    land headroom
    row  10     land body row
    row  11     land floor
    rows 12-13  the crust              — land's floor, tunnel's ceiling
    rows 14-15  tunnel headroom
    row  16     tunnel body row
    row  17     tunnel floor
    rows 18-19  bedrock

Two tiles of roof over every lane, so every jump anywhere in the level carries
3.86 tiles instead of 4.84 and every gap is cut against the smaller number.
There is nowhere easy to go.

WHAT MAKES THE FAST ROUTE FAST is then the only thing left that costs time: a
standing stop. A `step` puts the floor two tiles up directly in front of you
with nothing to run at, which is about twenty frames of going nowhere. The slow
routes get five or six of those each; the fast route gets none.

WHAT MAKES IT HARD is the alternating chain: islands four columns apart,
switching between the floor and one tile above it. Going up, the capped jump
carries 3.20 tiles against the 3.00 needed — nine pixels, a frame and a half.
Coming down off the raised island there is one tile of roof left and it is the
same frame and a half. They alternate, so there is nothing ordinary in between.
"""

import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mklevel import Canvas, emit
from lanes import Lane, report

W = 240

SKY, SKYF, SKY_UP = 5, 6, 5        # body row, floor, raised-island floor
LAND, LANDF, LAND_UP = 10, 11, 10
TUN, TUNF, TUN_UP = 16, 17, 16

DECKS = {
    'sky':    (SKY, SKYF, SKY_UP, 3, 5),
    'land':   (LAND, LANDF, LAND_UP, 8, 10),
    'tunnel': (TUN, TUNF, TUN_UP, 14, 16),
}


def skeleton(c, roof_from=24, roof_to=219):
    """Bedrock, the three floors, and the two roofs that cap the lanes."""
    c.rect(0, 18, W - 1, 19, '#')
    c.row(TUNF, 0, W - 1, '#')
    c.rect(0, 12, W - 1, 13, '#')      # crust: land's floor, tunnel's ceiling
    c.row(LANDF, 0, W - 1, '#')
    c.rect(0, 6, W - 1, 7, '#')        # deck: sky's floor, land's ceiling
    # The upper roof. Three courses thick so nothing can stand on top of it and
    # make a fourth lane out of the open air.
    c.rect(roof_from, 0, roof_to, 2, '#')


class Deck:
    """One lane, and the vocabulary for drawing on it."""

    def __init__(self, canvas, name, hazard='x'):
        self.c = canvas
        self.name = name
        self.body, self.floor, self.up, self.lo, self.hi = DECKS[name]
        self.hazard = hazard

    def clear(self, c0, c1):
        """Take the floor away and put the lane's own death in its place."""
        self.c.row(self.floor, c0, c1, self.hazard)

    def island(self, col, w=1, high=False):
        self.c.row(self.floor - 1 if high else self.floor, col, col + w - 1, '#')

    def chain(self, start, n, w=1, step=4):
        """The frame-and-a-half staircase. Returns the columns it used."""
        self.clear(start - 1, start + (n - 1) * step + w)
        for k in range(n):
            self.island(start + k * step, w, high=bool(k % 2))
        return [start + k * step for k in range(n)]

    def gap(self, c0, w=3):
        """Three columns of nothing: 3.86 against 3.00, five and a half frames.

        Three, not four. Under a roof the jump carries 3.86 tiles, so four
        columns of void asks for 4.00 and is not a hard jump, it is an
        impossible one. Everything in a capped level is a tile smaller than it
        would be in the open, and forgetting that puts a wall across the road.
        """
        self.clear(c0, c0 + w - 1)

    def gap_up(self, c0, w=3):
        """Three of nothing and the far lip a tile up: a frame and a half."""
        self.clear(c0, c0 + w - 1)
        self.c.row(self.floor - 1, c0 + w, c0 + w + 2, '#')

    def step(self, col, w=3):
        """The floor comes up two tiles, with nothing to run at.

        This is the only thing in these levels that costs time: you arrive at
        full speed, stop dead against it, and the jump that puts you on top of
        it carries you almost nowhere while it lasts. About twenty frames of
        going nowhere, and the slow routes are slow because they have five or
        six of them.
        """
        self.c.rect(col, self.floor - 2, col + w - 1, self.floor, '#')

    def put(self, col, glyph, up=0):
        self.c.put(col, self.body - up, glyph)


def hole(c, c0, c1):
    """A hole through the land floor and the crust: the way down, one way.

    Three columns wide, like every other gap under a roof — four is past what a
    capped jump reaches, and a hole you cannot clear is not a choice.
    """
    c.row(LANDF, c0, c1, '.')
    c.rect(c0, 12, c1, 13, '.')


def deck_hole(c, c0, c1):
    """A hole through the sky's floor: the way down from the roof."""
    c.rect(c0, 6, c1, 7, '.')


def fork(c, sky_climb=(20, 29)):
    """The opening: spawn on the land, with all three ways in sight.

    The way up is inside the join zone where no lane cap applies, so the climb
    to the sky deck is the only unroofed jumping in the level.
    """
    c.text(2, LAND, '@')
    c.text(8, LAND, 'l')
    hole(c, 12, 14)
    a, b = sky_climb
    deck_hole(c, a, b)
    c.row(9, a, a + 2, '=')
    c.row(SKYF + 1, a + 3, a + 5, '=')


def ramp_out(c, at=210):
    """The rejoin. The tunnel walks up a stair, the sky falls off the end."""
    c.rect(at, 12, 239, 13, '.')
    for k in range(6):
        c.rect(at + k * 3, 17 - k, 239, 17 - k, '#')
    # the land floor opens over the top of the stair, or the stair climbs into
    # its underside and ends somewhere you can reach and not leave
    c.row(11, at + 14, at + 16, '.')
    c.rect(at, 6, 239, 7, '.')


def check(canvas, segs, label, fast):
    lanes = [Lane('sky', 3, 5, 30, 209),
             Lane('land', 8, 10, 30, 209),
             Lane('tunnel', 14, 16, 30, 209)]
    bad = report(canvas, lanes, '\n' + label + ' — geometry, on the measured envelope')
    for i, s in enumerate(segs):
        for r in s:
            if len(r) != 30:
                print('  segment %d has a row of the wrong width' % i)
    print('  fast route: %s' % fast)
    print('  %d impossible steps' % bad)
    return bad
