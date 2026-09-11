#!/usr/bin/env python3
"""Build the five rebuilt second levels.

They share a skeleton (tools/threeroutes.py) because the thing that makes them
hard is the same in all five and is a property of the engine, not of a town:
two tiles of roof over every lane, and footing cut against what a capped jump
actually reaches. What differs — which lane is the fast one, where the chains
fall, what is trying to kill you, and what the town calls its roof — is what
this file holds.

    python3 tools/second-levels.py
"""

import os
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)

from mklevel import Canvas, emit
from threeroutes import (W, Deck, skeleton, fork, ramp_out, hole, deck_hole,
                         chimney, check, SKY, LAND, TUN, SKYF, LANDF, TUNF)

# ============================================================== THE MACHINERY
#
# WHY THIS SECTION EXISTS. The five levels above this line are all cut from one
# idea — a roof two tiles overhead turns a 4.84-tile jump into a 3.86-tile one,
# and footing set against the smaller number leaves nine pixels to take off in.
# It is a good idea. It is also, on its own, ONE idea, and five levels built
# out of nothing else are five pictures of the same corridor. Screenshots of
# the first version showed exactly that.
#
# So each level now gets one thing that no other level has, and every one of
# them changes a DIFFERENT term in the same equation rather than adding another
# spike somewhere:
#
#   SHANTY TOWN — BELTS.        How long a stretch of ground TAKES, which is
#     the one term nothing else in this engine touches. Running with a capstan
#     rope is 5.40 px a frame, against one is 3.20, against a bare floor's
#     4.30 — and the ropes run through crawlways four pixels taller than Corb,
#     so there is no jumping over them. The fast road gets two ropes running
#     its way and the two slow roads get one each running the other, which is
#     the first time in these five levels that one route is actually QUICKER
#     rather than merely harder.
#
#     A rope also decides the hardest jump in the game, though not the way it
#     was first written down here: see belt_gate below, where a claim that
#     turned out to be false is kept next to the measurement that replaced it.
#
#   ALEFORGE — PRESSES, AND THE POUCH.    When you may be somewhere, and what
#     you are allowed to bring. Measured under two tiles of headroom by
#     sweeping every take-off frame and hold length: legs cross a void of four
#     columns and a wind pouch crosses seven. So a void of SIX is a locked door
#     with the key sixty columns behind it, and the key itself is out on a
#     one-column spur that has to be jumped to and jumped back off.
#
#   PROVIDENCE — CLOCK ARMS, AND THE LIFT.    What time it is. The city runs on
#     a chime and now the level does too: sweeping arms across the walk, and a
#     tithe-lift on an eleven-second cycle that is only at the top of its
#     travel for about two of them. It is the only way across the walk's one
#     impossible gap. Miss it and you do not die — you fall into the ossuary,
#     which is the slow road, and that is the whole penalty for being late.
#
#   FENWICK — SPRINGS.          How high, and who decides. A spring sets the
#     rise for you: 4.79 tiles against your own legs' 3.10, and you cannot cut
#     it short. Two and a half tiles more than the lane has overhead, so every
#     one of them needs a hole in the roof over it — and through that hole is
#     the only climbing anywhere in these five levels.
#
#   ROTO KAIISHI — THE HOIST, AND THE BOBBERS.    Where the ground is. A
#     horizontal hoist on the same eleven-second swell, sized so that both hops
#     only make it while it is near the middle of its sweep — which is where it
#     is moving fastest and therefore where it spends the least time. And a
#     rack of net-floats that sink while you stand on them, so the one thing
#     you may not do is hesitate.
#
# Every number quoted above was measured in the running game, not derived:
# scratch scripts flew the arcs, and tools/lanes.py refuses to draw a step that
# the measured envelope cannot make.


def room(taken, width, after=32, hi=206):
    """The first column where `width` clear columns fit on this road.

    The machinery used to carry hand-picked columns, which worked exactly as
    long as nothing else moved. Shortening the chains from four to three moved
    all of them, and Fenwick's first sprung root landed inside a staircase —
    the pillar and the chain's third island writing over each other, which is
    not a hard jump, it is a hole where a level used to be.

    So nothing picks a column by hand any more. It asks what is free.
    """
    col = after
    while col + width <= hi:
        clash = next((b for a, b in taken if a - 2 <= col + width and b + 2 >= col), None)
        if clash is None:
            return col
        col = clash + 3
    return None


def shard_spot(deck, taken, want=118):
    """A column for the shard: clear of everything, and near the middle.

    Near the middle on purpose. At the start it is free, at the end it is a
    victory lap; two thirds of the way along a road you have already committed
    to is where going and getting it is a decision.
    """
    g = deck.c.g
    free = [c for c in range(40, 200)
            if g[deck.body][c] == '.' and g[deck.body - 1][c] == '.'
            and all(not (a - 3 <= c <= b + 3) for a, b in taken)]
    return min(free, key=lambda c: abs(c - want)) if free else None


def easy_road(deck, taken):
    """The road that asks nothing of you, and can never be the quick one.

    WHY THIS ROAD EXISTS. Three roads that are all punishing is not three
    choices, it is the same choice printed three times — and it leaves a player
    who is stuck with nowhere to go but the thing they are stuck on. So one
    road on each of these levels is passable by anybody: no chains, no jump
    wider than two columns, nothing on a cycle, nothing that kills you for
    being a frame late.

    WHY IT CANNOT WIN, which is the harder half. Almost nothing in this engine
    costs time. A jump costs no horizontal speed, so an obstacle course and a
    flat run of the same length come in within a frame of each other; even a
    two-tile step, which reads like a dead stop, turns out to cost a handful of
    frames because you bonk the ceiling and slide over it. Three things really
    do cost time, and only one of them can be laid down by the yard:

        a rope running against you.

    Four crawlways of twenty-four columns, at 3.20 pixels a frame instead of
    4.30. That is 768 pixels covered in 240 frames rather than 179, four times
    over: about four seconds, on a road the others run in twenty-nine. The roof
    is four pixels above his head for the whole length, so there is no jumping
    over it and no way round it — that was the lesson from the first version,
    where a perfect run simply walked along the top of the crawlway and paid
    nothing at all.

    Two-tile steps between them, which cost little but read as effort, and one
    detour up onto a shelf and back down: the road visibly doubling back on
    itself, so that it looks as slow as it is.
    """
    ropes = [(40, 24), (86, 24), (132, 24), (178, 24)]
    for col, run in ropes:
        deck.belt(col, col + run - 1, back=True)
        taken.append((col - 1, col + run))
    for col in spread(taken, 3, lo=34, hi=200, pad=3, apart=30):
        deck.step(col)
    return len(ropes)


def grog_run(deck, n=24, lo=32, hi=206):
    """Barrels down the length of a lane, wherever the lane has room for one.

    GROG IS THE LIFE POOL, not a score: a death costs five barrels and dying
    with an empty purse ends the run. So a level with four barrels in it is not
    a level that is stingy, it is a level with no margin for error at all —
    and the first cut of these five had between two and five, against
    twenty-one to thirty-two in every other level in the game. On the hardest
    levels in the game. A bot run came out of them with one barrel.

    Placed LAST, after the chains, the machinery, the tolls and the holes, and
    only where the lane's body row is still empty. That is the one rule that
    makes this safe to do late: a raised chain island sits ON the body row, and
    so does the top of a two-tile step, so anything written there without
    looking does not decorate the level, it deletes a piece of it. Checking the
    canvas is cheaper than trying to predict it.
    """
    g = deck.c.g
    free = [c for c in range(lo, hi) if g[deck.body][c] == '.']
    if not free:
        return 0
    step = max(1, len(free) // n)
    cols = free[::step][:n]
    for c in cols:
        deck.put(c, 'o')
    return len(cols)


def belt_gate(deck, col, taken, back=False, run=26, void=4):
    """A belt run, and at the end of it the hardest jump in the game.

    THE FIRST VERSION OF THIS COMMENT WAS WRONG and it is worth saying how,
    because the truth turned out to be better. The claim was that a belt lets
    you cross a gap legs cannot: air time is set by the roof, so leaving faster
    must carry further. But you do not leave faster — a belt drags whatever is
    STANDING on it and never touches the player's own vx, and doJump drops the
    ride on the take-off frame. The instant you are airborne you are doing 4.30
    like everybody else.

    What a belt really changes is WHEN you may jump. Coyote time gives six
    frames after the lip in which the jump still counts, and those six frames
    are worth 26 pixels of run-up on a bare floor — which is most of why a void
    of four columns is crossable under a two-tile roof at all. On a forward
    belt the ground is moving him at 5.40, so he crosses that same band of
    useful take-off positions in fewer whole frames.

    Measured, sweeping every take-off frame and every hold length — the number
    of distinct ways over a void of four under a two-tile roof:

            bare floor   20 ways
            forward belt  1 way
            back belt     0 ways — it cannot be done at all

    One way. That is the frame-perfect jump these levels were asking for, and
    it is the belt that makes it so, just not for the reason first written down.
    """
    deck.belt(col, col + run - 1, back=back)
    deck.clear(col + run, col + run + void - 1)
    taken.append((col - 1, col + run + void))


def press_row(deck, cols, taken):
    """Stamps hanging over the road, each phased off the column it stands in.

    Not a wall and not a wait: the cycle is short enough to be a rhythm, and
    the phases are far enough apart that a runner who does not break stride is
    threading a pattern rather than queueing at each one.
    """
    for col in cols:
        deck.press(col)
    taken.append((cols[0] - 2, cols[-1] + 2))


def pouch_spur(deck, col, taken):
    """One column of footing, one tile up, three columns of nothing either side.

    Everything else in these levels is a jump you have to make. This is a jump
    you have to make TWICE, out and back, for a thing you will not need for
    another hundred columns — and under a one-tile roof, which is where the
    nine-pixel window comes from.
    """
    deck.clear(col - 3, col + 3)
    deck.island(col, 1, high=True)
    deck.put(col, 'W', up=1)
    taken.append((col - 5, col + 5))


def pouch_gate(deck, col, taken, void=6):
    """Six columns of nothing under a full roof.

    Measured by sweeping every take-off frame and hold length under two tiles
    of headroom: legs cross four columns and no more, and a wind pouch crosses
    seven. Six therefore has no version that is done on foot and is not at the
    pouch's limit either — the lock turns, and it turns with room to be played
    rather than only to be solved.
    """
    deck.clear(col, col + void - 1)
    taken.append((col - 2, col + void + 1))


def spring_well(c, deck, col, taken):
    """A pillar, a spring on top of it, and three columns of open ceiling.

    THE ONE PLACE IN THESE LEVELS WHERE YOU GO UP. Everywhere else height is an
    asset you spend by falling out of it and never get back, which is the rule
    that makes three stacked routes a choice rather than a ladder. A well is
    the deliberate exception, and it costs two exact jumps to use.

    It takes two stages because one will not do it, and the arithmetic is why:
    a spring rises 4.79 tiles, and from a lane's own body row that peak is a
    fifth of a tile SHORT of standing on the deck above. So the spring goes on
    top of a two-tile pillar, which is itself a landing two tiles up — 3.76
    tiles of reach against three columns of nothing to get onto it.

    THE HOLE IS THREE COLUMNS AND NOT ONE MORE. It is a hole in the floor of
    the lane above as well, and that lane is somebody's road: three columns is
    exactly the standard capped jump, so the route up there crosses its own
    well without noticing. Four would cut that road in half.
    """
    deck.step(col - 2, w=3)                        # the pillar: floor-2..floor
    c.put(col, deck.floor - 2, '/')                # the spring, on top of it
    chimney(c, deck.name, col - 1, col + 1)
    taken.append((col - 6, col + 4))


def lift(c, col, taken_land, taken_tun, void=6):
    """The tithe-lift: a vertical mover in a gap the walk cannot jump.

    The gap is six columns under a full roof and legs cross three, so there is
    no version of this that is done on foot. The mover swings three tiles
    either side of its anchor on an eleven-and-a-half second cycle, and at the
    top of that swing its deck is exactly the walk's own floor — for about two
    seconds in eleven.

    The crust is opened under it so the thing has somewhere to swing, which
    means the penalty for arriving at the wrong moment is not death. You drop
    into the ossuary and finish on the slow road. Providence charges for
    everything, and what it charges here is the time you did not have.
    """
    c.row(LANDF, col, col + void - 1, '.')
    c.rect(col, 12, col + void - 1, 13, '.')
    c.put(col + 2, 14, 'V')          # two tiles wide, so it spans col+2..col+3
    taken_land.append((col - 2, col + void + 1))
    taken_tun.append((col - 2, col + void + 1))


def hoist(deck, col, taken, void=6):
    """A horizontal hoist, sized so only the middle of its sweep will do.

    Seven columns of nothing, lips either side, and a two-tile platform that
    slides three tiles each way. To board it from the near lip its left edge
    has to be within three columns; to leave it for the far lip its right edge
    has to be within three of that. Both at once is a window about a tile and a
    half wide in the middle of the sweep — which is exactly where it is moving
    fastest, so it is the part of the cycle it spends the least time in.

    Miss it and nothing kills you. You wait, and waiting is the point.
    """
    deck.clear(col, col + void - 1)
    # A mover's deck sits ten pixels below the row its marker is on, so the
    # marker goes on the BODY row and what you stand on is the row above that
    # — the same convention every bobber in Roto Kaiishi already uses.
    deck.c.put(col + 2, deck.body, 'H')
    taken.append((col - 2, col + void + 1))


def bobber_rack(deck, start, n, taken, step=4):
    """Net-floats: footing that sinks twenty pixels while you stand on it.

    The rack is cut at five columns apart, which is a void of three — the same
    jump the staircases use. What is different is that the take-off is falling
    while you are deciding to make it, so the window does not sit still.
    """
    deck.clear(start - 1, start + (n - 1) * step + 2)
    for k in range(n):
        deck.c.put(start + k * step, deck.body, 's')
    taken.append((start - 2, start + (n - 1) * step + 3))

# WHERE THE CHAINS GO, AND WHY THEY GO ON ALL THREE ROUTES.
#
# The first plan was chains on the fast route only. Then the search was let
# loose on the level with nothing confined, and it picked the intended route on
# two levels out of five — every route came in within eighteen frames of every
# other, because a jump costs no horizontal speed and there is very little in
# this engine that can make one road slower than another. Which road is
# "optimal" is therefore decided by a tie-break too small to design against.
#
# So the requirement is met a way that does not depend on winning that
# tie-break: EVERY route has chains in it. Whichever one a player settles on as
# the fast one, it cannot be run without back-to-back exact presses. The
# intended fast route has twice as many — four chains against two — and the
# tolls still fall on the other two, so it should also be the quickest; but the
# level does not rely on that being true.
# The chains occupy 30-61 and 149-185 on EVERY route, so everything else has to
# live in the three windows between and after them. A toll dropped on the last
# island of a chain leaves a two-tile step with no run-up to it, which is four
# pixels past what a capped jump reaches — a wall, not a jump.
# AND WHY NO TWO OF THEM LINE UP. The first version put every lane's chains at
# the same columns, so a level read as one motif stacked three times — the floor
# of all three decks opening into spikes at once, over and over — and all five
# levels were the same picture. The chains are staggered now: each deck has its
# own columns, and each level shifts them again, so what is under you is never
# doing what you are doing.
#
# Everything that is not a chain is placed by `spread` below, into whatever
# columns that deck has left. Hand-picked constants for that could not survive
# the staggering: a toll dropped on the last island of a chain leaves a
# two-tile step with no run-up, which is four pixels past what a capped jump
# reaches — a wall, not a jump.
# THREE ROADS WITH THREE DIFFERENT JOBS, which is the shape the second draft
# did not have. Every road used to carry chains — the reasoning was that
# whichever one a player settled on, it could not be run without back-to-back
# exact presses, and the level would be hard whatever happened. It was, and it
# was also exhausting and samey: twenty-four exact jumps down the fast road
# with tolls in the gaps, and no stretch anywhere on any road where a player
# could simply run.
#
# A hard level is not one with no easy parts in it. It is one where the easy
# parts are what let you see the hard parts coming. So:
#
#   THE HARD ROAD   three chains and nothing else. Between them, thirty and
#                   forty columns of ordinary running, which is where the
#                   speed and the nerve come from — you arrive at a chain at a
#                   full run having had time to know it is coming, and then
#                   there are six exact presses with nowhere to breathe.
#
#   THE MIDDLE ROAD one chain, and the tolls: gaps, raised lips, and the
#                   two-tile steps. Hard in places, never for long.
#
#   THE EASY ROAD   no chains at all, nothing above a two-column gap, and long
#                   crawlways with the rope running the wrong way. It asks for
#                   no skill whatever and it cannot win: see easy_road below.
#
# The chains are shorter than they were — six, seven and five against eight,
# six, nine and four — and there are three instead of four, so a hard road is
# now about a quarter chain and three quarters running.
CHAINS_HARD = [(62, 6), (120, 7), (178, 5)]
CHAINS_MID = [(96, 5)]


def spread(taken, n, lo=32, hi=206, pad=5, start=0, apart=10):
    """`n` columns in this deck's own free space, clear of its chains and of
    each other.

    `apart` is not decoration. A gap is three columns of nothing and a gap with
    a raised lip is six, so two of them landing four columns apart merge into
    seven columns of void — and seven is three past what a capped jump reaches.
    Picking evenly and hoping is how four of those got built; the spacing is a
    rule now.
    """
    free = [c for c in range(lo, hi)
            if all(not (a - pad <= c <= b + pad) for a, b in taken)]
    if not free or n <= 0:
        return []
    out = []
    for c in free[start:]:
        if all(abs(c - o) >= apart for o in out):
            out.append(c)
            if len(out) == n:
                break
    return out


def build(spec):
    c = Canvas(W)
    skeleton(c)
    fork(c)

    decks = {name: Deck(c, name, hazard=spec['hazard'][name])
             for name in ('sky', 'land', 'tunnel')}
    hard = decks[spec['fast']]
    easy = decks[spec['easy']]
    mid = decks[[n for n in ('sky', 'land', 'tunnel')
                 if n not in (spec['fast'], spec['easy'])][0]]
    taken = {name: [] for name in decks}

    def safe(name, col, glyph, up=0):
        """Put something on a deck, but never on top of one of its islands.

        A raised island sits on the deck's own body row — the row everything is
        placed at — so a grog coin or a quip marker dropped inside a chain does
        not decorate the island, it deletes it. Two whole islands went missing
        out of one chain that way and the route simply stopped. Anything placed
        inside a chain slides out to the nearest column that is not one.
        """
        ivs = taken[name]
        if any(a <= col <= b for a, b in ivs):
            for d in range(1, 60):
                for cand in (col - d, col + d):
                    if 31 < cand < 208 and not any(a <= cand <= b for a, b in ivs):
                        col = cand
                        d = 999
                        break
                if d == 999:
                    break
        decks[name].put(col, glyph, up)
        return col

    # --- the hard road: three chains, and long clear runs between them ------
    shift = spec['shift']
    for start, n in CHAINS_HARD:
        at = start + shift
        hard.chain(at, n)
        taken[hard.name].append((at - 1, at + (n - 1) * 4 + 1))

    # --- the middle road: one chain, and the tolls further down -------------
    for start, n in CHAINS_MID:
        at = start + shift * 2
        mid.chain(at, n)
        taken[mid.name].append((at - 1, at + (n - 1) * 4 + 1))

    # --- this level's own machinery ----------------------------------------
    #
    # Placed BEFORE the tolls below, not after, and that ordering is the whole
    # reason the tolls know to go around it. Everything a machine occupies is
    # written into `taken`, and `spread` picks the slow routes' gaps and steps
    # out of what is left — so a belt run can never have a two-tile step
    # dropped into the middle of it, and a lift can never share a column with a
    # hole cut for something else.
    intents = []
    spec['machines'](c, decks, taken,
                     {'hard': hard.name, 'mid': mid.name, 'easy': easy.name},
                     intents)

    # --- the middle road's tolls -------------------------------------------
    cols = spread(taken[mid.name], 9)
    for col in cols[0::3]:
        mid.step(col)
        taken[mid.name].append((col - 1, col + 3))
    for col in cols[1::3]:
        mid.gap(col)
        taken[mid.name].append((col - 1, col + 3))
    for col in cols[2::3]:
        mid.gap_up(col)
        taken[mid.name].append((col - 1, col + 6))
    # The tolls go into `taken` like everything else. They did not, and the
    # things placed afterwards had no idea they were there: Aleforge's keg
    # chute is written on the FLOOR row, and it landed one column from a
    # three-column gap, taking the lip out and turning the gap into four.

    # --- and the easy road, which is not a road you can hurry --------------
    easy_road(easy, taken[easy.name])

    # --- the shard, on all three roads -------------------------------------
    #
    # It is ONE shard: src/level.js gives every shard in a level the same id, so
    # whichever road you are on you can have it, and meeting another copy later
    # is nothing. Choosing the tunnel should not be choosing to go without.
    #
    # Out of the way on each road, though, not on the racing line — one tile up
    # on a lip you have to go and get. On the easy road that lip is reachable
    # by walking; on the other two it is a jump, which is as it should be.
    for deck in (hard, mid, easy):
        col = shard_spot(deck, taken[deck.name])
        if col is not None:
            deck.c.row(deck.floor - 1, col - 1, col + 1, '=')
            deck.put(col, 'R', up=1)
            taken[deck.name].append((col - 3, col + 3))

    # Holes down through the decks, so the choice can still be changed —
    # downwards only, because you can always fall and never climb. They are cut
    # only in the SLOW lanes: a hole through the fast route's floor is a hole in
    # the route, and on Providence, where the fast route is the middle one, the
    # first version of this put four of them straight through it.
    # Two of them, at the only columns that are clear of every toll and gap on
    # both slow routes. A hole overlapping a gap makes five columns of void out
    # of two lots of three, and five is two past what a capped jump reaches.
    # The two ways down, put wherever both slow decks have room for them.
    both = []
    for ivs in taken.values():
        both.extend(ivs)
    drops = spread(both, 2, lo=40, hi=200, pad=6)
    for col in drops:
        if spec['fast'] != 'land':
            hole(c, col, col + 2)
        if spec['fast'] != 'sky':
            deck_hole(c, col, col + 2)

    for col, glyph, up in spec['fast_things']:
        safe(spec['fast'], col, glyph, up)
    for name, things in spec['things'].items():
        for col, glyph, up in things:
            safe(name, col, glyph, up)

    ramp_out(c)
    c.text(234, LAND, 'Z')
    safe('land', 130, 'F')
    for i, (col, row) in enumerate(spec['quip_at']):
        safe({5: 'sky', 10: 'land', 16: 'tunnel'}[row], col, str(i + 1))

    # The purse, last of all — every road gets its own, because a player who
    # picks the tunnel should not be poorer for it than one who picks the sky.
    barrels = sum(grog_run(decks[n]) for n in ('sky', 'land', 'tunnel'))

    segs = emit(os.path.join(ROOT, spec['file']), spec['header'], {
        'town': spec['town'], 'id': spec['id'], 'name': spec['name'],
        'blurb': spec['blurb'], 'diff': spec['diff'], 'quips': spec['quips'],
    }, c, spec['notes'])
    bad = check(c, segs, spec['id'], spec['fast'], intents)
    print('  %d barrels of grog, across all three roads' % barrels)
    return bad


def header(title, fast_name, fast_blurb, mid_name, mid_blurb, low_name, low_blurb,
           extra=''):
    return ('''/* %s
 *
 * REBUILT FOR v2 AS THREE ROUTES, and all three of them are capped.
 *
 * THE ONE FACT THE WHOLE LEVEL IS BUILT ON. Corb runs at a constant 4.3 pixels
 * a frame, so how far a jump carries is decided entirely by how long it stays
 * in the air — and that is decided by how high it gets. A roof two tiles over
 * his head turns a 4.84-tile jump into a 3.86-tile one. On a grid of 32-pixel
 * tiles that is the only way to ask for exact timing: the ROOF sets the
 * tolerance, not the gap.
 *
 * So there is a roof over all three decks and no open air anywhere to escape
 * into. Every gap in the level is cut against 3.86 tiles.
 *
 *   %s
 *   %s
 *
 *   %s
 *   %s
 *
 *   %s
 *   %s
 *%s
 * Measured, not felt. bot/envelope.js flies the arc in the game and reads the
 * reach off it; tools/lanes.py refuses to draw a gap that cannot be crossed;
 * bot/reach.js proves all three routes go through; bot/pick.js searches the
 * level with nothing confined and reports which route a perfect run actually
 * takes; bot/tightness.js counts the presses in that run with exactly one
 * frame that works.
 */''' % (title,
         fast_name, fast_blurb,
         mid_name, mid_blurb,
         low_name, low_blurb,
         extra))


FAST = ('   THE FAST ONE. Four staircases: islands four columns apart,\n'
        ' *   alternating between the floor and one tile above it. Going up, the\n'
        ' *   capped jump carries 3.20 tiles against the 3.00 you need — nine\n'
        ' *   pixels, a frame and a half. Coming down off the raised island there\n'
        ' *   is one tile of roof left and it is the same frame and a half. They\n'
        ' *   alternate, so there is nothing ordinary in between to breathe on:\n'
        ' *   seven of them, then five, then eight, then four. And nothing to stop\n'
        ' *   for anywhere along it, which is the only reason it is quick.')

SLOW = ('   Two staircases of its own — twelve exact jumps, because no road\n'
        ' *   here is a rest — and between them the things that cost time: gaps of\n'
        ' *   three, lips a tile up, and three or four places where the floor comes\n'
        ' *   up two tiles with nothing to run at. A standing stop is the only\n'
        ' *   thing in this engine that really costs time, and that is why this\n'
        ' *   road is the slower one.')


# ------------------------------------------- what each level's machinery is
#
# The columns are hand-picked and they have to be: everything here has to land
# in the windows the chains leave free (62-89, 119-149, 184-188 on the fast
# route, and whatever each slow route's own staggered chains leave), and the
# whole point of the staggering is that those windows are different on every
# deck and every level. `check` at the bottom of build() is what proves it.


def shantytown_machines(c, decks, taken, road, intents):
    """CAPSTAN ROPES. The tide turns them and they never stop turning.

    The fast road gets two of them running its way, and at the end of each, a
    void of four columns. Four is one more than legs cross under a roof — that
    was measured, not assumed — so the belt is not a slope to enjoy, it is the
    only reason the far lip is reachable. Step off the rope early and the jump
    is simply not there.

    The two slow roads get a rope running the other way, and that is the rarer
    thing: something in this engine that genuinely costs TIME. Twenty columns
    against the belt is 3.20 pixels a frame instead of 4.30, which is fifty
    frames neither of them gets back.
    """
    hard, mid = decks[road['hard']], decks[road['mid']]
    for _ in range(2):
        at = room(taken[hard.name], 31)
        if at is not None:
            belt_gate(hard, at, taken[hard.name])
    # One rope the wrong way on the middle road. The easy road gets four of
    # them from easy_road() and does not need any help from here.
    at = room(taken[mid.name], 29)
    if at is not None:
        mid.belt(at, at + 27, back=True)
        taken[mid.name].append((at - 1, at + 28))


def aleforge_machines(c, decks, taken, road, intents):
    """THE MILL STAMPS, AND ONE POUCH THREE HUNDRED COLUMNS EARLY.

    The gantry is threaded between falling stamps twice, and somewhere in the
    middle of it the road simply stops for five columns. Legs cross three. The
    pouch that crosses five is out on a one-column spur forty columns back,
    across a gap with a tile of roof on it — nine pixels — and it has to be
    jumped twice, because there is no way off the spur except the way on.

    Nothing warns you. That is the point: the first run through, the gap at 124
    is where you find out what the thing on the spur was for.
    """
    hard, mid = decks[road['hard']], decks[road['mid']]
    at = room(taken[hard.name], 18)
    if at is not None:
        press_row(hard, [at + 2, at + 7, at + 12], taken[hard.name])
    at = room(taken[hard.name], 12)
    if at is not None:
        pouch_spur(hard, at + 5, taken[hard.name])
    at = room(taken[hard.name], 11)
    if at is not None:
        pouch_gate(hard, at + 2, taken[hard.name])
        intents.append((hard.name, at + 1, at + 8,
                        'the pouch gate — measured: legs cross 4 columns, '
                        'a pouch crosses 7'))
    at = room(taken[hard.name], 14)
    if at is not None:
        press_row(hard, [at + 2, at + 7], taken[hard.name])
    at = room(taken[mid.name], 12)
    if at is not None:
        press_row(mid, [at + 2, at + 7], taken[mid.name])
    # Nothing on the easy road. A stamp on a cycle is a thing you have to read,
    # and the whole point of that road is that it asks you to read nothing.


def providence_machines(c, decks, taken, road, intents):
    """THE CHIME, WHICH IS THE ONLY THING IN THIS CITY THAT IS NOT FOR SALE.

    Four sweeping arms across the covered walk and two on each of the other
    roads — the same clockwork that runs the crossing in providence-3, brought
    down to street level where you have to run past it.

    And the tithe-lift. Six columns of nothing in the middle of the walk, which
    is twice what legs cross, and a lift on an eleven-and-a-half second swing
    that is level with the walk for about two of them. Being late is not fatal
    and it is not meant to be: the crust is open under it, so you drop into the
    ossuary and finish on the slow road. The city takes the time instead.
    """
    hard, mid = decks[road['hard']], decks[road['mid']]
    at = room(taken[hard.name], 28)
    if at is not None:
        for k in range(3):
            hard.put(at + 4 + k * 10, 'n')
        taken[hard.name].append((at, at + 27))
    at = room(taken[hard.name], 11)
    if at is not None:
        lift(c, at + 2, taken[hard.name], taken[mid.name])
        intents.append((hard.name, at + 1, at + 8,
                        'the tithe-lift — crossed by the mover on its own clock'))
    at = room(taken[mid.name], 18)
    if at is not None:
        for k in range(2):
            mid.put(at + 4 + k * 10, 'n')
        taken[mid.name].append((at, at + 17))
    # The easy road runs under no arms at all — see easy_road().


def fenwick_machines(c, decks, taken, road, intents):
    """SPRUNG ROOTS, AND THE ONLY WAY UP IN ANY OF THESE FIVE LEVELS.

    The Overturned Wood is the level about the ground and the canopy changing
    places, so it is the one that gets to break the rule the other four are
    built on. Three wells: two out of the roots and one out of the bog. Each is
    a two-tile pillar you have to land on — three columns of nothing and 3.76
    tiles of reach — with a root coiled on top that throws you the rest of the
    way, whether you wanted the whole of it or not.

    The holes they open are three columns wide, which is exactly the jump the
    road above already asks for everywhere else. So the bog crosses the roots'
    chimneys without knowing they are there, and the canopy crosses the bog's.
    """
    hard, mid = decks[road['hard']], decks[road['mid']]
    for _ in range(2):
        at = room(taken[hard.name], 12)
        if at is None:
            break
        spring_well(c, hard, at + 6, taken[hard.name])
        taken[mid.name].append((at + 3, at + 9))   # the hole it opens above
    # There was a third well, out of the bog and up into the canopy. It is gone:
    # the canopy is the easy road now, and a well punches a three-column hole in
    # the floor of the road above it. Three columns is the standard capped jump
    # — fine on a road that is meant to ask for jumps, and not fine on the one
    # road in this level that is meant to ask for none.


def roto_machines(c, decks, taken, road, intents):
    """THE SWELL. Nothing on this pier is standing still and neither are you.

    Racks of net-floats, which are footing that sinks twenty pixels while your
    weight is on it — so the take-off is dropping away underneath you while you
    are deciding to make it, and the one thing you cannot do on a rack is
    hesitate. Three racks, one on each road.

    And the tide-hoist. Six columns of nothing in the lofts, and a hoist that
    slides three tiles either side of its anchor on the same eleven-and-a-half
    second swell. Getting on needs its near edge within three columns; getting
    off needs its far edge within three of the other lip; both at once is about
    a tile and a half in the middle of the sweep, which is the fastest part of
    it and therefore the part it spends least time in. Nothing there kills you.
    You wait, and the waiting is the whole toll.
    """
    hard, mid = decks[road['hard']], decks[road['mid']]
    at = room(taken[hard.name], 26)
    if at is not None:
        bobber_rack(hard, at + 2, 5, taken[hard.name])
    at = room(taken[hard.name], 11)
    if at is not None:
        hoist(hard, at + 2, taken[hard.name])
    at = room(taken[mid.name], 20)
    if at is not None:
        bobber_rack(mid, at + 2, 4, taken[mid.name])
    # No rack on the easy road: footing that sinks while you stand on it is the
    # one thing on this pier that punishes hesitating, and hesitating is
    # exactly what that road is for.


SPECS = [
    dict(
        town='shantytown', id='shantytown-2', easy='sky', machines=shantytown_machines, shift=0, name='The Bone Stair',
        file='data/shantytown/level-2.js', diff=1.0, fast='tunnel',
        blurb='Over the boards, along them, or under them. All three will drown you.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': '~'},
        fast_things=[(76, 'o', 3), (166, 'o', 3), (120, 'o', 0)],
        things={'sky': [(100, 'o', 0), (170, 'o', 0)],
                'land': [(72, 'p', 0), (128, 'c', 0), (178, 'p', 0), (206, 'W', 0)]},
        quips=[('1', '@jager1'), ('2', '@buke1'), ('3', '@jp2'), ('4', '@?ru'), ('5', '@?in,cr')],
        quip_at=[(22, LAND), (88, TUN), (150, LAND), (200, SKY), (228, LAND)],
        notes={0: 'the fork: over the boards, along them, or under them',
               1: 'the first staircase — eight islands, seven exact jumps',
               2: 'the two-wide staircase; the crew on the boards above',
               3: 'the third and longest: nine islands, eight exact jumps',
               4: 'tolls on both slow roads',
               5: 'the last staircase, and the checkpoint',
               6: 'the last of the tolls',
               7: 'the stair out from under the boards, and the cup'},
        header=header('Shanty Town II — "The Bone Stair"',
                      'UNDER THE BOARDS — the tunnel.', FAST,
                      'ALONG THEM — the land, the middle road.', SLOW,
                      'OVER THE TOP — the sky, under the bone scaffolding.', SLOW,
                      '\n * The old Bone Stair was a climb with one way up it, and a\n'
                      ' * tool-assisted search finished it one frame under the human record.\n'
                      ' * That is what a level looks like when there is nothing in it to decide.\n')),

    dict(
        town='aleforge', id='aleforge-2', easy='tunnel', machines=aleforge_machines, shift=7, name='Wolendi Wind Farm',
        file='data/aleforge/level-2.js', diff=1.15, fast='sky',
        blurb='Through the beams, across the yard, or under the whole mill.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': 'x'},
        fast_things=[(46, 'o', 2), (104, 'o', 2)],
        things={'land': [(66, 'k', -1), (114, 'p', 0), (142, 'k', -1), (196, 'N', 0)],
                'tunnel': [(72, 'c', 0), (130, 'o', 0), (192, 'E', 0)]},
        quips=[('1', '@buke3'), ('2', '@jager2'), ('3', '@six2'), ('4', '@?ru'), ('5', '@?in,cr')],
        quip_at=[(22, LAND), (90, SKY), (148, LAND), (186, TUN), (228, LAND)],
        notes={0: 'the fork: up into the beams, across the yard, or down the cellar',
               1: 'the gantry’s first staircase — eight decks, seven exact jumps',
               2: 'the two-wide staircase; a keg chute in the yard',
               3: 'the third and longest: nine decks, eight exact jumps',
               4: 'tolls in the yard and the cellar',
               5: 'the last staircase, and the checkpoint',
               6: 'the Bellows, down where nobody looks',
               7: 'the cellar stair, and the cup'},
        header=header('Aleforge II — "Wolendi Wind Farm"',
                      'THE GANTRY — up in the mill’s beams.', FAST,
                      'THE YARD — the middle, under the chutes.', SLOW,
                      'THE CELLAR — under the whole mill.', SLOW)),

    dict(
        town='providence', id='providence-2', easy='sky', machines=providence_machines, shift=13, name='The Tithe Walk',
        file='data/providence/level-2.js', diff=1.3, fast='land',
        blurb='Over the leads, under the vault, or down among the paid-for dead.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': 'x'},
        fast_things=[(46, 'o', 2), (104, 'K', 2), (166, 'o', 2)],
        things={'sky': [(66, 'b', -2), (120, 'o', 0)],
                'tunnel': [(72, 'c', 0), (130, 'Q', 0), (192, 'o', 0)]},
        quips=[('1', '@buke4'), ('2', '@guinnie1'), ('3', '@jp1'), ('4', '@?ru'), ('5', '@?in,cr')],
        quip_at=[(22, LAND), (88, SKY), (150, LAND), (184, TUN), (228, LAND)],
        notes={0: 'the fork: into the arcade, up to the leads, or down to the bones',
               1: 'the first course — eight slabs, seven exact jumps',
               2: 'the two-wide course; the bell tower on the leads',
               3: 'the third and longest: nine slabs, eight exact jumps',
               4: 'tolls on the leads and among the bones',
               5: 'the last course, and the checkpoint',
               6: 'the last of the tithe',
               7: 'the stair out of the ossuary, and the cup'},
        header=header('Providence II — "The Tithe Walk"',
                      'THE WALK — inside the arcade, and the quick way.', FAST,
                      'THE LEADS — over the roof.', SLOW,
                      'THE OSSUARY — among the paid-for dead.', SLOW,
                      '\n * The fast route being the middle one is the point: Providence charges\n'
                      ' * for everything, and the covered walk is the cheapest thing in the city\n'
                      ' * and still the hardest.\n')),

    dict(
        town='fenwick', id='fenwick-2', easy='sky', machines=fenwick_machines, shift=4, name='The Overturned Wood',
        file='data/fenwick/level-2.js', diff=1.5, fast='tunnel',
        blurb='Under the roots, through the bog, or up where the light is.',
        hazard={'sky': 'x', 'land': '~', 'tunnel': '~'},
        fast_things=[(46, 'o', 2), (104, 'w', 2), (166, 'o', 2)],
        things={'sky': [(120, 'o', 0), (176, 'o', 0)],
                'land': [(72, 'i', 0), (76, 'h', 0), (80, 'h', 0), (130, 't', 0),
                         (176, 'M', 0), (206, '*', 0)]},
        quips=[('1', '@buke5'), ('2', '@guinnie3'), ('3', '@six3'), ('4', '@?ru'), ('5', '@?in,cr')],
        quip_at=[(24, LAND), (90, TUN), (150, LAND), (200, SKY), (228, LAND)],
        notes={0: 'the fork: down among the roots, into the bog, or up the branches',
               1: 'the first tangle — eight knots, seven exact jumps',
               2: 'the two-wide tangle; a spirit-light in the bog',
               3: 'the third and longest: nine knots, eight exact jumps',
               4: 'tolls in the bog and the canopy',
               5: 'the last tangle, and the checkpoint',
               6: 'the Draught, and the last of the rot',
               7: 'the root stair out, and the cup'},
        header=header('Fenwick II — "The Overturned Wood"',
                      'THE ROOTS — under the bog, and the fast way.', FAST,
                      'THE BOG — the middle, where the phantoms are.', SLOW,
                      'THE CANOPY — up where the light is.', SLOW,
                      '\n * The Lantern of Roots that used to gate the middle of this level has\n'
                      ' * moved to fenwick-3, which is its own level and exists to hold it.\n'
                      ' * Nothing here is a minigame any more.\n')),

    dict(
        town='roto', id='roto-2', easy='land', machines=roto_machines, shift=10, name="Netmenders' Row",
        file='data/roto/level-2.js', diff=1.45, fast='sky',
        blurb='Over the frames, along the stalls, or under the whole pier.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': '~'},
        fast_things=[(46, 'o', 2), (104, '^', 2)],
        things={'land': [(66, 'u', 0), (114, 's', 0), (142, 'u', 0), (196, 'O', 0)],
                'tunnel': [(72, 'c', 0), (130, 'o', 0), (192, 'D', 0)]},
        quips=[('1', '@buke6'), ('2', '@anqoak1'), ('3', '@jager3'), ('4', '@?ru'), ('5', '@?in,cr')],
        quip_at=[(22, LAND), (92, SKY), (146, LAND), (186, TUN), (228, LAND)],
        notes={0: 'the fork: up to the lofts, along the row, or under the pier',
               1: 'the first rack — eight racks, seven exact jumps',
               2: 'the two-wide rack; the stalls along the row',
               3: 'the third and longest: nine racks, eight exact jumps',
               4: 'tolls along the row and under the pier',
               5: 'the last rack, and the checkpoint',
               6: 'the Ballast, and the last of the swell',
               7: 'the stair out from under the pier, and the cup'},
        header=header('Roto Kaiishi II — "Netmenders\' Row"',
                      'THE LOFTS — up among the drying frames.', FAST,
                      'THE ROW — the middle, past the stalls.', SLOW,
                      'UNDER THE PIER — the swell, and the pilings.', SLOW)),
]


if __name__ == '__main__':
    total = 0
    for spec in SPECS:
        spec['quips'] = dict(spec['quips'])
        total += build(spec)
    print('\n%d impossible steps across all five' % total)
