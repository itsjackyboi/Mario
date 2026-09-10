/* How far can Corb actually jump? Measured, not remembered.
 *
 * map.js prices every move with this table, and a table that is wrong by one
 * tile is a map that declares a real route impossible — which is exactly what
 * happened: the number on file said a jump rises 2.85 tiles, the game says
 * 3.10, and every three-tile climb in the game was therefore off the map.
 *
 * The arc is flown in the real game with jump held, from a running start, and
 * every frame of it recorded. For a ledge `r` tiles up, the reach is the
 * furthest across Corb is still at least that high — which is the question the
 * map is actually asking.
 */
const R = require('./runner');
const win = R.sharedWorld(), PL = win.PL;

function arc(runUp, hold, second) {
  const sc = R.makeScene(PL, 'shantytown-2', 20260904);
  const p = sc.player;
  /* A wind pouch is one extra jump, spent by pressing again in mid-air. Handing
   * Corb one here measures the mechanic rather than guessing at it — the
   * previous assisted table was invented, and an invented table is how the base
   * one came to be wrong by a whole tile. */
  if (second) p.pouch = (p.pouch || 0) + 1;
  let x0 = 0, y0 = 0, airborne = false;
  const pts = [];
  for (let f = 0; f < 200; f++) {
    const held = (f >= runUp && f < runUp + hold) ||
                 (second && f >= second && f < second + hold);
    R.stepTop(PL, sc, { l: 0, r: 1, u: 0, d: 0, j: held ? 1 : 0, i: 0 });
    if (f === runUp - 1) { x0 = p.x; y0 = p.y; }
    if (f < runUp) continue;
    pts.push([p.x - x0, y0 - p.y]);
    /* Stop at the FIRST touchdown. Left running, Corb goes on covering ground
     * at the same height for as long as the level is flat, and an arc measured
     * to the end of the level says a jump carries eight tiles. */
    if (!p.grounded) airborne = true;
    else if (airborne) break;
  }
  PL.util.restoreRandom();
  return pts;
}

function envelope(name, sets) {
  const best = new Array(9).fill(-1);
  let peak = 0;
  for (const pts of sets) {
    for (const [dx, dy] of pts) {
      if (dy > peak) peak = dy;
      for (let r = 0; r <= 8; r++) if (dy >= r * 32 && dx > best[r]) best[r] = dx;
    }
  }
  const table = [];
  console.log('\n' + name + ':  peak rise ' + (peak / 32).toFixed(2) + ' tiles (' + peak.toFixed(1) + 'px)');
  for (let r = 0; r <= 8; r++) {
    if (best[r] < 0) break;
    table.push(+(best[r] / 32).toFixed(2));
    console.log('  ledge +' + r + ' tiles: ' + (best[r] / 32).toFixed(2) + ' tiles across');
  }
  console.log('  → [' + table.join(', ') + ']');
  return table;
}

envelope('bare', [arc(30, 24)]);
/* The best second press is not obvious and is not worth guessing: try them all
 * and keep the furthest each ledge can be reached from. */
const withPouch = [];
for (let s2 = 32; s2 <= 70; s2++) withPouch.push(arc(30, 24, s2));
envelope('with a wind pouch', withPouch);
