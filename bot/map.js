/* map.js — what the level looks like to something that has to cross it.
 *
 * The old search knew one thing about a level: the player's x. Everything else
 * — that the ground ends here, that this gap needs a jump and that one does
 * not, that the tonic is eight tiles off the direct line — it had to rediscover
 * by dying, thousands of times, on every run. That is why it never finished.
 *
 * This builds the level's own answer to "how far is it from here", once, before
 * any searching:
 *
 *   FRAMES[c][r] = the fewest frames it could take to get from standing at
 *                  column c, body row r, to the cup.
 *
 * It is computed by walking a graph of the places Corb can actually stand, with
 * edges for the moves he can actually make, so it routes around a wall instead
 * of through it and it knows a sky bridge is a real alternative rather than a
 * detour. A search that scores states with this is looking at the level; one
 * that scores them with distance-to-the-right is looking at a number.
 *
 * IT IS A LOWER BOUND, DELIBERATELY. Every cost here is the best case: full
 * speed, no waiting for a platform to come round, no enemy in the way. A
 * heuristic that under-promises makes the beam explore the routes that could be
 * fast; one that over-promises quietly writes them off. Where the model cannot
 * be sure a move exists it errs towards allowing it, for the same reason.
 *
 * WHAT IT DOES NOT KNOW. Timing. A phase block that is solid half the time
 * counts as solid, a gear counts as being where it is right now, the tide
 * counts as absent. That is the correct division of labour: the map says which
 * way is worth trying, and the simulation — the real game, frame by frame —
 * says whether it works today. Nothing here is ever trusted to decide that a
 * run is possible; only to rank the ones being tried.
 */
'use strict';

const T = 32;
const MAXRUN = 4.3;                 // px per frame, measured, no item
const WALK = T / MAXRUN;            // ≈ 7.44 frames to cross one tile
const GRAV = 0.62;

/* How many tiles across Corb clears for each tile he gains, flown in the real
 * game by bot/envelope.js and copied here. Re-run that if the physics change.
 *
 * The first version of this table was written from memory and was wrong by a
 * whole row — it had 4.30 as the flat reach when 4.30 is what a jump clears
 * arriving ONE tile up, and it stopped at two tiles of rise when a bare jump
 * reaches three. Every three-tile climb in the game was therefore off the map,
 * which is a quiet way of telling a search that a level has no route. Numbers
 * that price every move in the game are measured now, not remembered. */
const REACH_UP = [4.84, 4.30, 3.76, 2.82];

/* And with a wind pouch: one extra jump, spent by pressing again in mid-air.
 * Also measured, and nearly double what was guessed for it. */
const REACH_ASSISTED = [9.27, 8.87, 8.33, 7.79, 7.26, 6.32];

/** Falling: how far across you drift while dropping `d` tiles, and how long. */
function fallFrames(d) { return Math.sqrt(2 * d * T / GRAV); }
function fallReach(d) { return 4.30 + (fallFrames(d) * MAXRUN) / T; }

/**
 * Where the level GOES, not where it happens to be sitting.
 *
 * The gap that stopped the first version of this map was four tiles of open
 * water with a mover shuttling across it. Pinned to its spawn position the
 * platform bridged nothing, the field went to infinity twenty columns short of
 * the cup, and the map declared eleven of sixteen levels impossible.
 *
 * Nor is terrain fixed. A phase block writes itself straight into world.grid
 * and takes itself out again, so Providence's floor is 163 tiles that are only
 * sometimes there — and the first version of this map, reading the grid once,
 * saw an eight-column void where the route is.
 *
 * Rather than teach this file what a MoverH is, what a gear arc looks like and
 * when a phase block fades — six classes to keep in step with six files that
 * will change — it watches. A throwaway copy of the level runs forward with
 * nobody at the controls, and it records what is EVER ground and what is ALWAYS
 * a wall. The distinction is the point: a tile that is solid half the time can
 * be stood on, and cannot be relied on to block anything. The game is the
 * authority on its own terrain.
 *
 * Fifteen seconds is enough to see a full cycle of everything in this game and
 * costs about a quarter of a second per level, once.
 */
function sweep(PL, def, frames) {
  const scene = new PL.PlayScene(def, { practice: true });
  PL.Game.reset(scene);
  scene.introT = 0; scene.fadeIn = 0;
  const w = scene.world, N = w.cols * w.rows;
  const everFloor = new Uint8Array(N);    // ground at any moment
  const everSolid = new Uint8Array(N);    // a wall at any moment
  const alwaysSolid = new Uint8Array(N).fill(1);
  const everLethal = new Uint8Array(N);

  const sample = () => {
    for (let i = 0; i < N; i++) {
      const id = w.grid[i];
      const isSolid = PL.Tiles.isSolid(id);
      if (isSolid) { everSolid[i] = 1; everFloor[i] = 1; } else alwaysSolid[i] = 0;
      if (PL.Tiles.isOneWay(id)) everFloor[i] = 1;
      if (PL.Tiles.isLethal(id)) everLethal[i] = 1;
    }
    for (const p of w.platforms) {
      /* Active or not. A phantom in the bog is only solid when somebody is
       * near enough to make it so, and the sweep has nobody at the controls —
       * skipping the inactive ones left tavern-1 with a twelve-tile hole in
       * the middle of its only route. Where a platform sits is where ground
       * can be; whether it is there today is the simulation's business. */
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 1) / T);
      const r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + Math.max(1, p.h || 1) - 1) / T);
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++)
          if (c >= 0 && c < w.cols && r >= 0 && r < w.rows) everFloor[r * w.cols + c] = 1;
    }
  };

  sample();
  /* Nobody at the controls, and the player frozen where he stands: a cycle is
   * its own, and a run that wandered off and drowned would take the observation
   * with it. */
  scene.player.frozen = true;
  for (let f = 0; f < frames; f++) {
    try { scene.step(PL.STEP); } catch (err) { break; }
    if (PL.Game.scenes.length !== 1) break;   // a trial gate took over
    sample();
  }
  return { everFloor, everSolid, alwaysSolid, everLethal };
}

/**
 * A level, read as terrain.
 *
 * Platforms count as ground everywhere they travel, per `sweep` above. A gear
 * that swings through a gap makes that gap crossable, and a map that ignored it
 * would rule out the route the level was built around — so it counts, and the
 * simulation decides whether the timing works.
 */
function build(world, swept, opts) {
  opts = opts || {};
  const cols = world.cols, rows = world.rows, N = cols * rows;
  const solid = swept ? swept.alwaysSolid : new Uint8Array(N);
  const lethal = swept ? swept.everLethal : new Uint8Array(N);
  const floor = swept ? swept.everFloor : new Uint8Array(N);

  if (!swept) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (world.solidAt(c, r)) { solid[i] = 1; floor[i] = 1; }
        else if (world.oneWayAt(c, r)) floor[i] = 1;
        if (world.lethalAt(c, r)) lethal[i] = 1;
      }
    }
    for (const p of world.platforms || []) {
      const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 1) / T);
      const r = Math.floor(p.y / T);
      for (let c = c0; c <= c1; c++) if (c >= 0 && c < cols && r >= 0 && r < rows) floor[r * cols + c] = 1;
    }
  }

  /* Where Corb can be. He is 28 tall in a 32 tile, so standing on the surface
   * at row r puts his whole body in row r-1 and nowhere else — one cell per
   * standing place, which is what makes this graph small enough to solve. */
  const stand = new Uint8Array(N);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (solid[i] || lethal[i]) continue;
      if (r + 1 < rows && floor[(r + 1) * cols + c]) stand[i] = 1;
      /* Fenwick's veil gates turn gravity over, and a body under inverted
       * gravity lands on ceilings — which is not a special case in the engine
       * and must not be one here either, or half of The Hollow Mile reads as
       * unreachable void. */
      else if (opts.inverts && r > 0 && floor[(r - 1) * cols + c]) stand[i] = 1;
    }
  }
  return { world, cols, rows, solid, lethal, floor, stand };
}

/**
 * Is the straight line between two standing places clear of solid rock?
 *
 * The destination's own column is never counted. A step onto a ledge one column
 * along and two rows up is a real move — you rise, then go over — but its
 * straight line clips the corner of the very block you are landing on, and the
 * check would rule out every short climb in the game. Two of the rebuilt levels
 * came back "no way through" on exactly that.
 */
function clear(m, c0, r0, c1, r1) {
  const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
  for (let k = 1; k < n; k++) {
    const c = Math.round(c0 + (c1 - c0) * k / n);
    if (c === c1) continue;
    const r = Math.round(r0 + (r1 - r0) * k / n);
    const i = r * m.cols + c;
    if (m.solid[i] || m.lethal[i]) return false;
  }
  return true;
}

/** Every move out of one standing place, as (destination, frames). */
function moves(m, c, r, out) {
  out.length = 0;
  const cols = m.cols, rows = m.rows;

  // a step either way
  for (const d of [-1, 1]) {
    const c2 = c + d;
    if (c2 >= 0 && c2 < cols && m.stand[r * cols + c2]) out.push([r * cols + c2, WALK]);
  }

  // a jump: up to two tiles of rise, less reach the higher you go
  /* The bigger envelope applies where the item can actually be in hand: from
   * the pouch onwards, or near a gust that throws you. Granting it level-wide
   * would have the map promising a five-tile climb in an opening whose pouch is
   * a hundred and seventy columns further on. */
  const table = (m.assistFrom !== undefined && c >= m.assistFrom) ? REACH_ASSISTED : REACH_UP;
  for (let rise = 0; rise < table.length; rise++) {
    const r2 = r - rise;
    if (r2 < 0) break;
    const span = Math.ceil(table[rise]);
    for (let dc = -span; dc <= span; dc++) {
      if (!dc && !rise) continue;
      const c2 = c + dc;
      if (c2 < 0 || c2 >= cols) continue;
      if (!m.stand[r2 * cols + c2]) continue;
      if (!clear(m, c, r, c2, r2)) continue;
      /* The cost of an arc is whichever takes longer: covering the ground, or
       * gaining the height. Charging for both would make jumping look worse
       * than it is and bias the map towards the floor — a staircase would come
       * out twice the price of the flat run beside it, when in truth you take
       * one at very nearly full speed.
       *
       * Height is priced as the time to rise that far under this gravity,
       * which is the same arithmetic as falling it. Nothing is charged for the
       * jump itself: horizontal speed is untouched by leaving the ground. */
      const f = Math.max(Math.abs(dc) * WALK, rise ? fallFrames(rise) : 0, 1);
      out.push([r2 * cols + c2, f]);
    }
  }

  /* A veil gate turns gravity over, and what was the floor eight tiles down is
   * now the ceiling eight tiles up. It is the only move in the game that is not
   * a jump, a step or a fall, and without it The Hollow Mile has no route at
   * all past its middle: the ground simply stops and the way on is along a
   * ceiling. So a gate's columns connect every standing place above to every
   * standing place below, at the cost of the fall between them. */
  if (m.flips && m.flips[c]) {
    for (let r2 = 0; r2 < rows; r2++) {
      if (r2 === r || !m.stand[r2 * cols + c]) continue;
      out.push([r2 * cols + c, fallFrames(Math.abs(r2 - r)) + 12]);
    }
  }

  // a drop: off the edge, onto the first thing under you
  for (let drop = 1; r + drop < rows; drop++) {
    const span = Math.ceil(fallReach(drop));
    let any = false;
    for (let dc = -span; dc <= span; dc++) {
      const c2 = c + dc, r2 = r + drop;
      if (c2 < 0 || c2 >= cols) continue;
      if (!m.stand[r2 * cols + c2]) continue;
      if (!clear(m, c, r, c2, r2)) continue;
      out.push([r2 * cols + c2, Math.max(Math.abs(dc) * WALK, fallFrames(drop))]);
      any = true;
    }
    if (any && drop > 6) break;
  }
  return out;
}

/**
 * Frames-to-the-cup for every standing place, by Dijkstra outward from the cup
 * over the graph run backwards.
 *
 * Backwards matters: the moves are not symmetric. You can drop eight tiles and
 * never climb back up them, and a field built by searching forwards from the
 * spawn would happily promise a route that only exists downhill.
 */
function field(m, goals) {
  const N = m.cols * m.rows;
  const rev = new Array(N);
  const buf = [];
  for (let r = 0; r < m.rows; r++) {
    for (let c = 0; c < m.cols; c++) {
      const i = r * m.cols + c;
      if (!m.stand[i]) continue;
      moves(m, c, r, buf);
      for (const [j, f] of buf) (rev[j] || (rev[j] = [])).push([i, f]);
    }
  }

  const dist = new Float64Array(N).fill(Infinity);
  /* Every standing place that touches the cup is a finish, not just one. The
   * cup is three tiles wide and is a prop with no floor of its own, so a field
   * anchored on a single guessed cell is a field of infinities the moment that
   * guess lands on the wrong side of a lip. */
  const heap = [];
  const push = (d, i) => {
    heap.push([d, i]);
    let k = heap.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = k * 2 + 1, rr = l + 1; let s = k;
        if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
        if (rr < heap.length && heap[rr][0] < heap[s][0]) s = rr;
        if (s === k) break;
        [heap[s], heap[k]] = [heap[k], heap[s]]; k = s;
      }
    }
    return top;
  };
  for (const g of goals) if (m.stand[g] && dist[g] > 0) { dist[g] = 0; push(0, g); }
  if (!heap.length) return dist;

  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const es = rev[i];
    if (!es) continue;
    for (const [j, f] of es) {
      const nd = d + f;
      if (nd < dist[j]) { dist[j] = nd; push(nd, j); }
    }
  }
  return dist;
}

/**
 * The whole read of one level: terrain, the cost field, and where the things
 * worth going near are.
 */
function analyse(scene, PL) {
  const world = scene.world;
  /* What the level hands out decides how far Corb can jump in it. A pouch is a
   * second jump in mid-air and a lagerhorn is a third more height; a map that
   * assumed the bare envelope on a level built around them would call the route
   * impossible and send the search at a wall. */
  let inverts = false, assistFrom;
  for (const e of world.entities) {
    if (e.type === 'veilGate') inverts = true;
    if (e.type === 'pouch' || e.type === 'lagerhorn') {
      const c = Math.floor(e.x / T);
      if (assistFrom === undefined || c < assistFrom) assistFrom = c;
    }
    if (e.type === 'windGust') {
      const c = Math.max(0, Math.floor(e.x / T) - 2);
      if (assistFrom === undefined || c < assistFrom) assistFrom = c;
    }
  }
  const m = build(world, PL ? sweep(PL, scene.def, 900) : null, { inverts });
  m.assistFrom = assistFrom;
  if (inverts) {
    m.flips = new Uint8Array(m.cols);
    for (const e of world.entities) {
      if (e.type !== 'veilGate') continue;
      const c0 = Math.floor(e.x / T), c1 = Math.floor((e.x + (e.w || T) - 1) / T);
      for (let c = c0 - 1; c <= c1 + 1; c++) if (c >= 0 && c < m.cols) m.flips[c] = 1;
    }
  }
  const cup = world.tankard;
  const goals = [];
  const gc0 = Math.floor(cup.x / T), gc1 = Math.floor((cup.x + cup.w - 1) / T);
  const gr0 = Math.floor(cup.y / T), gr1 = Math.floor((cup.y + cup.h - 1) / T);
  for (let r = gr0; r <= gr1; r++)
    for (let c = gc0; c <= gc1; c++)
      if (c >= 0 && c < m.cols && r >= 0 && r < m.rows && m.stand[r * m.cols + c]) goals.push(r * m.cols + c);
  const goalCol = Math.floor((cup.x + cup.w / 2) / T);
  const goalRow = gr1;
  const dist = field(m, goals);

  const items = [];
  for (const e of world.entities) {
    if (!e.type) continue;
    if (SPEED_ITEMS[e.type] === undefined) continue;
    items.push({ type: e.type, x: e.x, y: e.y, worth: SPEED_ITEMS[e.type], ent: e });
  }

  return {
    m, dist, goals, goalCol, goalRow, cols: m.cols, rows: m.rows, items,
    /** Frames from here to the cup, for a body at pixel (x, y). */
    costAt(x, y) {
      const c = Math.floor((x + 10) / T);
      const r = Math.floor((y + 14) / T);
      return lookup(m, dist, c, r);
    },
    /** How long the map thinks the whole level takes at best. */
    floorFrames() {
      const s = world.spawn;
      return this.costAt(s.x, s.y);
    },
    reachable() {
      let n = 0;
      for (let i = 0; i < dist.length; i++) if (m.stand[i] && isFinite(dist[i])) n++;
      return n;
    },
    standable() {
      let n = 0;
      for (let i = 0; i < m.stand.length; i++) if (m.stand[i]) n++;
      return n;
    }
  };
}

/**
 * Read the field at a cell, and if that cell has no answer, take the best one
 * nearby.
 *
 * Corb spends most of a run in the air, where by definition he is not standing
 * anywhere, and a heuristic that returns Infinity every time his feet leave the
 * ground is a heuristic that only scores the boring half of the level.
 *
 * The width of the scan is the part that matters. Mid-jump over four tiles of
 * water, the only standing places are the plank behind and the plank ahead; a
 * scan that reaches two columns sees only the one behind, quotes the cost of
 * going back, and so prices every jump across the gap as worse than not
 * jumping. The search then sits on the near plank for the length of the level.
 * So it reaches as far as a jump does, and charges honestly for the distance.
 */
function lookup(m, dist, c, r) {
  if (c < 0) c = 0; if (c >= m.cols) c = m.cols - 1;
  if (r < 0) r = 0; if (r >= m.rows) r = m.rows - 1;
  const i = r * m.cols + c;
  if (isFinite(dist[i])) return dist[i];
  let best = Infinity;
  for (let dr = -4; dr <= 8; dr++) {
    for (let dc = -6; dc <= 6; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= m.rows || cc < 0 || cc >= m.cols) continue;
      const d = dist[rr * m.cols + cc];
      if (!isFinite(d)) continue;
      // charge for the gap between where he is and the place being quoted
      const extra = Math.abs(dc) * WALK + (dr < 0 ? -dr * 9 : 0);
      if (d + extra < best) best = d + extra;
    }
  }
  return best;
}

/** What a pickup is worth, in the only currency that matters here: frames. */
const SPEED_ITEMS = {
  tonic: 9 * 60 * (1 - 1 / 1.45),     // 1.45x for nine seconds
  marrow: Infinity,                    // permanent 1.22x — priced at pickup time
  bellows: 0,                          // a dash: worth what the route makes of it
  lagerhorn: 0,                        // higher jumps, not faster ground
  pouch: 0,                            // an extra air jump: reach, not speed
  spiritweed: 0,                       // lighter gravity
  ballast: 0                           // glide
};

module.exports = { analyse, build, field, sweep, WALK, MAXRUN, REACH_UP, REACH_ASSISTED, SPEED_ITEMS };
