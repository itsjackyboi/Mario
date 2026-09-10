#!/usr/bin/env python3
"""Shared geometry for the three-route levels, and the check that they hold up.

THE ENVELOPE, measured in the game by bot/envelope.js rather than remembered:

    a bare jump rises 3.10 tiles and carries
        4.84 tiles landing level        (dc <= 4, six frames of slack)
        4.30 landing one tile up        (dc <= 4, TWO frames)
        3.76 landing two up             (dc <= 3, six frames)
        2.82 landing three up           (dc <= 2, six frames)

A CEILING CHANGES ALL OF IT, which is the single most useful fact for building
a hard level in a game with 32-pixel tiles. Horizontal speed is a constant 4.3
pixels a frame, so how far a jump carries is decided entirely by how long it
stays in the air, and how long it stays in the air is decided by how high it
gets. Put a roof two tiles over Corb's head and his four-and-a-half tile jump
becomes a three-and-a-half tile jump. That is how a corridor can demand exact
timing on a grid too coarse to demand it with gaps alone: the roof, not the
gap, sets the tolerance.

    under a two-tile roof:   3.86 level, 3.30 landing one up
    under a one-tile roof:   2.71 level, 1.36 landing one up

so a three-column gap onto a ledge one tile up, under a two-tile roof, has
nine pixels in it — two frames. That is the frame-perfect primitive these
levels are built from, and it is checked here rather than hoped for.

WHY THE ROUTES DIFFER IN TIME. They mostly do not, on geometry alone. A jump
costs no horizontal speed in this engine, so an obstacle course and a flat run
of the same length take the same time — obstacles make a route HARD, not SLOW.
Only three things actually cost time:

    - climbing with no forward progress (a shaft: air time, no ground covered)
    - waiting for something on a cycle
    - not carrying the Clockheart Tonic, which is 1.45x for nine seconds

So the fast route on each of these levels is the one that carries the tonic and
never has to stop, and the slow ones are slow because they climb.
"""

import math

ROWS = 20
T = 32
GRAV = 0.62
MAXRUN = 4.3
PEAK = 3.10          # tiles, measured

SOLID = set('#BCI')

# Things you can stand on that are not terrain. A loose plank, a mover, a
# bobber, a phantom, a gear, a vine and a phase block are all entities, and a
# checker that only reads tiles sees a twenty-nine column hole where the level
# has a plank crossing. They sit at the top of their own row, so standing on
# one puts Corb in the row above it — the same as a tile.
#
# 'o' IS NOT ONE OF THEM. It was in this string for a long time — nine things
# described in the sentence above, ten characters in the set — and a grog
# barrel is not something you can stand on. It went unnoticed while these
# levels had four barrels each; the moment they had seventy-two, the checker
# decided the barrels floating over the pouch gate were a bridge across it and
# reported that the gate was no longer a gate.
FOOTING = set('LHVshet()')
# The machine parts (src/machines.js) REPLACE the floor tile they are written
# on, so they are footing too. A press is not here on purpose: it is a hazard
# on a cycle that hangs in the air, and a checker with no clock has nothing
# true to say about it.
FOOTING |= set('><')
SPRINGS = set('/')
FOOTING |= SPRINGS
FLOOR = SOLID | set('=') | FOOTING
DEADLY = set('~x')

# A spring sets the rise for you and it is a tile and a half more than legs:
# measured 4.79 against 3.10. A roof still clamps it, so a spring only reaches
# this far where the ceiling has been opened over it.
SPRING_PEAK = 4.79

# A BELT DOES NOT CHANGE A JUMP, and the first version of this file said it
# did. The reasoning was that air time is fixed by the roof, so leaving faster
# must carry you further — which is true, but you do not leave faster. A belt
# moves you by dragging whatever is STANDING on it; the player's own vx never
# changes, and Player.doJump drops the ride on the take-off frame. So the
# instant you are airborne you are travelling at 4.3 like everybody else.
#
# It was caught by flying the gap in the real level: a void of four columns at
# the end of a belt, which the arithmetic here said was crossable, is a wall.
#
# What a belt really changes is the only thing nothing else in this engine
# touches — how long a stretch of ground TAKES. 5.40 px a frame with it, 3.20
# against it, against a bare floor's 4.30. That is a route being faster or
# slower rather than harder or easier, which is exactly what these levels had
# no way of expressing.

# Lanes, as body rows — the row Corb's body occupies while standing.
SKY_LO, SKY_HI = 0, 6
LAND_LO, LAND_HI = 8, 11
TUN_LO, TUN_HI = 14, 17


def reach_tiles(rise, roof=PEAK, peak=PEAK, speed=MAXRUN):
    """How far a jump carries, in tiles, gaining `rise` rows under `roof`.

    Derived, then trimmed by 3% because the derivation runs a percent or two
    over what the game actually does — and a generator that rounds towards
    "possible" builds levels that are not.

    `peak` is how high this particular take-off gets: legs by default, more if
    it is off a spring. `roof` still clamps it, because a ceiling does not care
    what threw you at it.
    """
    h = min(peak, roof)
    if h < rise:
        return None
    up = math.sqrt(2 * h * T / GRAV)
    down = math.sqrt(2 * max(0.0, h - rise) * T / GRAV)
    return (up + down) * speed / T * 0.97


def slack_frames(dc, rise, roof=PEAK, peak=PEAK, speed=MAXRUN):
    """Frames of take-off window for a step of `dc` columns.

    What has to be crossed is the VOID, not the column difference. Standing on
    the last column of a platform, Corb's right edge is already at that
    platform's far edge; landing on the first column of the next needs only his
    right edge inside it. So a step from column a to column b asks for b-a-1
    tiles of travel, not b-a — one tile less than it looks, and getting that
    wrong makes every gap in the level a tile smaller than intended.

    One frame of running is 4.3 pixels, so that is what a frame of slack means.
    """
    r = reach_tiles(rise, roof, peak, speed)
    if r is None:
        return None
    return (r - (dc - 1)) * T / speed


# ---------------------------------------------------------- what actually goes
#
# TWO DIFFERENT QUESTIONS, and this file used to answer both with the same
# derivation. They are:
#
#   "can this step be made at all?"   — answered below, from a MEASUREMENT
#   "how much room is in it?"         — answered by slack_frames, derived
#
# The derivation is air time from the roof height times 4.3 pixels a frame, and
# it is systematically pessimistic by most of a tile, because it does not know
# two things the game does. He can stand with his box hanging nineteen pixels
# off a lip; and coyote time gives him six more frames after leaving it in
# which the jump still counts, worth another twenty-six pixels of run-up. Both
# are free reach the arithmetic never sees.
#
# So the possible/impossible verdict comes from this table instead, which was
# built by sweeping every take-off frame and every hold length against real
# gaps in the real engine (scratch script envcap.js). The numbers are the
# WIDEST VOID IN COLUMNS that goes, by headroom over his body row and by how
# many tiles up the far lip is:
MEASURED = {
    (3, 0): 5, (3, 1): 5, (3, 2): 4,        # three tiles of headroom or more
    (2, 0): 4, (2, 1): 3, (2, 2): 2,        # the lanes these levels are built in
    (1, 0): 3, (1, 1): 2, (1, 2): 0,        # under a raised island
    (0, 0): 0, (0, 1): 0, (0, 2): 0,        # a crawlway: no jumping at all
}


def possible(void, rise, roof):
    """Does this step go? Measured, not derived. `void` is columns of nothing.

    STEPPING DOWN IS NOT A JUMP and the table above is a table of jumps. Walk
    off a ledge one tile above the next and you are in the air for ten frames
    on the way down, which carries you a tile and a third with no button
    pressed at all — and it works under a ceiling four pixels over your head,
    where jumping is not a thing that exists. Without this, the mouth of every
    crawlway reads as a wall, because the crawlway's own roof is what the
    checker measures the headroom against.
    """
    if rise < 0:
        drop = math.sqrt(2 * (-rise) * T / GRAV) * MAXRUN / T
        if void <= int(drop):
            return True
        rise = 0
    h = int(min(3, max(0, round(roof))))
    if rise > 2:
        # Off the end of the table, so fall back to the derivation. It is
        # pessimistic, which is the right way to be wrong about a climb this
        # steep — a bare jump rises 3.10 tiles, so three rows is nearly all of
        # it and there is no room left over to be generous with. Returning
        # False here instead was a regression: it called both of Fenwick III's
        # three-row climbs walls, and they are not.
        s = slack_frames(void + 1, rise, roof)
        return s is not None and s >= 0
    return void <= MEASURED[(h, int(rise))]


class Lane:
    def __init__(self, name, lo, hi, c0, c1):
        self.name, self.lo, self.hi, self.c0, self.c1 = name, lo, hi, c0, c1


# Footing that is TWO TILES WIDE, written from its left-hand column: movers,
# bobbers and Aleforge's gear platforms are all 64 pixels across. A checker
# that reads one glyph as one column of footing measures every gap in a rack of
# net-floats as a column wider than it is, and calls a rack that plays fine
# thirteen impossible steps.
WIDE = set('sHVe')


def standing(g, cols, c, r):
    if not (0 <= c < cols and 0 <= r < ROWS - 1):
        return False
    if g[r][c] in SOLID or g[r][c] in DEADLY:
        return False
    if g[r + 1][c] in FLOOR:
        return True
    return c > 0 and g[r + 1][c - 1] in WIDE and g[r][c - 1] not in SOLID


def roof_over(g, cols, c0, c1, body_row):
    """Tiles of clearance above `body_row` across columns c0..c1.

    The lowest roof anywhere over the jump is the one that decides it.
    """
    best = PEAK
    for c in range(max(0, c0), min(cols, c1 + 1)):
        h = 0.0
        r = body_row - 1
        while r >= 0 and g[r][c] not in SOLID:
            h += 1.0
            r -= 1
        best = min(best, h)
    return best


def lane_check(canvas, lane):
    """Every step along a lane: is it reachable, and how much room is in it?"""
    g, cols = canvas.g, canvas.cols
    places = {}
    for c in range(lane.c0, lane.c1 + 1):
        rs = [r for r in range(lane.lo, lane.hi + 1) if standing(g, cols, c, r)]
        if rs:
            places[c] = rs

    steps = []
    have = sorted(places)
    for i in range(len(have) - 1):
        a, b = have[i], have[i + 1]
        if b - a <= 1:
            continue
        dc = b - a
        best = None
        for ra in places[a]:
            roof = roof_over(g, cols, a, b, ra)
            # what is under his feet at the take-off column decides both how
            # high this particular jump gets and how fast he left
            under = g[ra + 1][a]
            spring = under in SPRINGS
            peak = SPRING_PEAK if spring else PEAK
            for rb in places[b]:
                rise = ra - rb
                # A spring is measured separately and is far outside the table.
                ok = (slack_frames(dc, rise, roof, peak) or -1) >= 0 if spring \
                    else possible(dc - 1, rise, roof)
                if not ok:
                    continue
                # The verdict is the measurement's; the NUMBER is the
                # derivation's, and it is only ever used to rank one step
                # against another, so its pessimism costs nothing.
                s = slack_frames(dc, rise, roof, peak)
                if s is None:
                    s = 0.0
                if best is None or s < best[0]:
                    best = (max(0.0, s), ra, rb, roof)
        steps.append((a, b, dc, best, places[a], places[b]))
    return places, steps


def report(canvas, lanes, label, tight_at=3.0, intended=()):
    """`intended` is ((lane, from_col, to_col, why), ...) — gaps no pair of legs
    is supposed to cross. They are printed as what they are and not counted."""
    print(label)
    broken = 0
    want = {(l, a, b): why for l, a, b, why in intended}
    seen = set()
    for lane in lanes:
        places, steps = lane_check(canvas, lane)
        impossible, bydesign = [], []
        for s in steps:
            if s[3] is not None:
                continue
            key = (lane.name, s[0], s[1])
            if key in want:
                seen.add(key)
                bydesign.append((s, want[key]))
            else:
                impossible.append(s)
        tight = [(s[0], s[3][0]) for s in steps if s[3] and s[3][0] < tight_at]
        chains = 0
        run = 0
        for s in steps:
            if s[3] and s[3][0] < tight_at:
                run += 1
                chains = max(chains, run)
            else:
                run = 0
        print('  %-7s %3d standing columns  %2d gaps  %2d under %.0f frames  '
              'longest run of them %d  %d impossible'
              % (lane.name, len(places), len(steps), len(tight), tight_at, chains, len(impossible)))
        if tight:
            print('          tight: ' + ' '.join('c%d(%.1f)' % t for t in tight[:16]))
        for s, why in bydesign:
            print('          BY DESIGN   col %d -> col %d, %d across: %s'
                  % (s[0], s[1], s[2], why))
        for a, b, dc, _, ra, rb in impossible[:8]:
            print('          IMPOSSIBLE  col %d rows %s -> col %d rows %s  (%d across)'
                  % (a, ra, b, rb, dc))
        broken += len(impossible)

    # A declared gate that is no longer there is worse than an undeclared one:
    # it means a column moved and the level quietly stopped having a lock on it.
    for key in want:
        if key not in seen:
            print('          DECLARED BUT NOT THERE: %s col %d -> col %d is '
                  'crossable on foot now — the gate is not a gate' % key)
            broken += 1
    return broken
