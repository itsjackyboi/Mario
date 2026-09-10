#!/usr/bin/env python3
"""Build a Pintland level file from a full-width canvas.

Levels ship as segments of 30 columns, which is the right size to read and edit
by hand but the wrong size to design in: a route that runs the length of the
level is easier to get right on one 240-column canvas than as eight separate
pictures that have to line up at the seams. So the canvas is the source, and
the segments are sliced out of it at the end.

The generated file is ordinary hand-editable data — this is a starting point,
not a build step. Nothing in the game reads this script.
"""

ROWS = 20


class Canvas:
    def __init__(self, cols, rows=ROWS):
        self.cols = cols
        self.rows = rows
        self.g = [['.'] * cols for _ in range(rows)]

    def put(self, c, r, ch):
        if 0 <= c < self.cols and 0 <= r < self.rows:
            self.g[r][c] = ch

    def row(self, r, c0, c1, ch):
        """Fill row r from c0 to c1 inclusive."""
        for c in range(c0, c1 + 1):
            self.put(c, r, ch)

    def rect(self, c0, r0, c1, r1, ch):
        for r in range(r0, r1 + 1):
            self.row(r, c0, c1, ch)

    def text(self, c, r, s):
        for i, ch in enumerate(s):
            if ch != '\0':
                self.put(c + i, r, ch)

    def segments(self, width=30):
        out = []
        for s in range(0, self.cols, width):
            seg = [''.join(self.g[r][s:s + width]) for r in range(self.rows)]
            out.append(seg)
        return out


def emit(path, header, fields, canvas, notes=None, width=30):
    """Write the level file. `notes` maps segment index -> comment line."""
    notes = notes or {}
    segs = canvas.segments(width)
    lines = [header, "(function (PL) {", "  'use strict';", '']
    lines.append("  PL.Towns.addLevel('%s', {" % fields.pop('town'))
    for k, v in fields.items():
        if k == 'quips':
            lines.append('    quips: {')
            items = list(v.items())
            for i, (qk, qv) in enumerate(items):
                lines.append("      '%s': '%s'%s" % (qk, qv, ',' if i < len(items) - 1 else ''))
            lines.append('    },')
        elif isinstance(v, str):
            lines.append("    %s: '%s'," % (k, v.replace("'", "\\'")))
        else:
            lines.append('    %s: %s,' % (k, v))
    lines.append('')
    lines.append('    segments: [')
    for i, seg in enumerate(segs):
        lines.append('')
        if i in notes:
            lines.append('      /* %d — %s */' % (i, notes[i]))
        else:
            lines.append('      /* %d */' % i)
        lines.append('      [')
        for j, r in enumerate(seg):
            lines.append("        '%s'%s" % (r, ',' if j < len(seg) - 1 else ''))
        lines.append('      ]%s' % (',' if i < len(segs) - 1 else ''))
    lines.append('')
    lines.append('    ]')
    lines.append('  });')
    lines.append('')
    lines.append('})(window.PL = window.PL || {});')
    with open(path, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    return segs
