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
FOOTING = set('LHVsheto()')
FLOOR = SOLID | set('=') | FOOTING
DEADLY = set('~x')

# Lanes, as body rows — the row Corb's body occupies while standing.
SKY_LO, SKY_HI = 0, 6
LAND_LO, LAND_HI = 8, 11
TUN_LO, TUN_HI = 14, 17


def reach_tiles(rise, roof=PEAK):
    """How far a jump carries, in tiles, gaining `rise` rows under `roof`.

    Derived, then trimmed by 3% because the derivation runs a percent or two
    over what the game actually does — and a generator that rounds towards
    "possible" builds levels that are not.
    """
    h = min(PEAK, roof)
    if h < rise:
        return None
    up = math.sqrt(2 * h * T / GRAV)
    down = math.sqrt(2 * max(0.0, h - rise) * T / GRAV)
    return (up + down) * MAXRUN / T * 0.97


def slack_frames(dc, rise, roof=PEAK):
    """Frames of take-off window for a step of `dc` columns.

    What has to be crossed is the VOID, not the column difference. Standing on
    the last column of a platform, Corb's right edge is already at that
    platform's far edge; landing on the first column of the next needs only his
    right edge inside it. So a step from column a to column b asks for b-a-1
    tiles of travel, not b-a — one tile less than it looks, and getting that
    wrong makes every gap in the level a tile smaller than intended.

    One frame of running is 4.3 pixels, so that is what a frame of slack means.
    """
    r = reach_tiles(rise, roof)
    if r is None:
        return None
    return (r - (dc - 1)) * T / MAXRUN


class Lane:
    def __init__(self, name, lo, hi, c0, c1):
        self.name, self.lo, self.hi, self.c0, self.c1 = name, lo, hi, c0, c1


def standing(g, cols, c, r):
    if not (0 <= c < cols and 0 <= r < ROWS - 1):
        return False
    if g[r][c] in SOLID or g[r][c] in DEADLY:
        return False
    return g[r + 1][c] in FLOOR


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
            for rb in places[b]:
                s = slack_frames(dc, ra - rb, roof)
                if s is not None and s >= 0 and (best is None or s < best[0]):
                    best = (s, ra, rb, roof)
        steps.append((a, b, dc, best, places[a], places[b]))
    return places, steps


def report(canvas, lanes, label, tight_at=3.0):
    print(label)
    broken = 0
    for lane in lanes:
        places, steps = lane_check(canvas, lane)
        impossible = [s for s in steps if s[3] is None]
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
        for a, b, dc, _, ra, rb in impossible[:8]:
            print('          IMPOSSIBLE  col %d rows %s -> col %d rows %s  (%d across)'
                  % (a, ra, b, rb, dc))
        broken += len(impossible)
    return broken
