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
                         check, SKY, LAND, TUN, SKYF, LANDF, TUNF)

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
CHAINS_FAST = [(32, 8), (91, 6, 2, 5), (151, 9), (190, 5)]
CHAINS_SLOW = [[(58, 7), (128, 8)], [(96, 8), (168, 7)]]


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
    fast = decks[spec['fast']]
    slow = [decks[n] for n in ('sky', 'land', 'tunnel') if n != spec['fast']]
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

    # --- the fast route: four chains, and nothing to stop for ---------------
    for chain in CHAINS_FAST:
        if len(chain) == 4:
            start, n, w, step = chain
            fast.chain(start, n, w=w, step=step)
            taken[spec['fast']].append((start - 1, start + (n - 1) * step + w))
        else:
            start, n = chain
            fast.chain(start, n)
            taken[spec['fast']].append((start - 1, start + (n - 1) * 4 + 1))
    for col, glyph, up in spec['fast_things']:
        safe(spec['fast'], col, glyph, up)

    # --- the two slow routes: two chains each, and everything that costs ----
    shift = spec['shift']
    for k, deck in enumerate(slow):
        for start, n in CHAINS_SLOW[k]:
            at = start + shift * (k + 1)
            deck.chain(at, n)
            taken[deck.name].append((at - 1, at + (n - 1) * 4 + 1))
        cols = spread(taken[deck.name], 9, start=k)
        for col in cols[0::3]:
            deck.step(col)
        for col in cols[1::3]:
            deck.gap(col)
        for col in cols[2::3]:
            deck.gap_up(col)

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

    for name, things in spec['things'].items():
        for col, glyph, up in things:
            safe(name, col, glyph, up)

    ramp_out(c)
    c.text(234, LAND, 'Z')
    safe('land', 130, 'F')
    for i, (col, row) in enumerate(spec['quip_at']):
        safe({5: 'sky', 10: 'land', 16: 'tunnel'}[row], col, str(i + 1))

    segs = emit(os.path.join(ROOT, spec['file']), spec['header'], {
        'town': spec['town'], 'id': spec['id'], 'name': spec['name'],
        'blurb': spec['blurb'], 'diff': spec['diff'], 'quips': spec['quips'],
    }, c, spec['notes'])
    bad = check(c, segs, spec['id'], spec['fast'])
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


SPECS = [
    dict(
        town='shantytown', id='shantytown-2', shift=0, name='The Bone Stair',
        file='data/shantytown/level-2.js', diff=1.0, fast='tunnel',
        blurb='Over the boards, along them, or under them. All three will drown you.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': '~'},
        fast_things=[(76, 'o', 3), (166, 'o', 3), (120, 'o', 0)],
        things={'sky': [(46, 'R', 0), (100, 'o', 0), (170, 'o', 0)],
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
        town='aleforge', id='aleforge-2', shift=7, name='Wolendi Wind Farm',
        file='data/aleforge/level-2.js', diff=1.15, fast='sky',
        blurb='Through the beams, across the yard, or under the whole mill.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': 'x'},
        fast_things=[(46, 'o', 2), (104, 'o', 2), (166, 'R', 2)],
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
        town='providence', id='providence-2', shift=13, name='The Tithe Walk',
        file='data/providence/level-2.js', diff=1.3, fast='land',
        blurb='Over the leads, under the vault, or down among the paid-for dead.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': 'x'},
        fast_things=[(46, 'o', 2), (104, 'K', 2), (166, 'o', 2)],
        things={'sky': [(66, 'b', -2), (120, 'o', 0), (176, 'R', 0)],
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
        town='fenwick', id='fenwick-2', shift=4, name='The Overturned Wood',
        file='data/fenwick/level-2.js', diff=1.5, fast='tunnel',
        blurb='Under the roots, through the bog, or up where the light is.',
        hazard={'sky': 'x', 'land': '~', 'tunnel': '~'},
        fast_things=[(46, 'o', 2), (104, 'w', 2), (166, 'o', 2)],
        things={'sky': [(66, 'R', 0), (120, 'o', 0), (176, 'o', 0)],
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
        town='roto', id='roto-2', shift=10, name="Netmenders' Row",
        file='data/roto/level-2.js', diff=1.45, fast='sky',
        blurb='Over the frames, along the stalls, or under the whole pier.',
        hazard={'sky': 'x', 'land': 'x', 'tunnel': '~'},
        fast_things=[(46, 'o', 2), (104, '^', 2), (166, 'R', 2)],
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
