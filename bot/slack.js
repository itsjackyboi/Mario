/* slack.js — how much room is there, before spending a minute searching?
 *
 * Corb's ground speed is a constant. MAXRUN is 4.3px a frame and there is no
 * momentum to build, no dash, no bunny-hop that carries further than running
 * does — a jump keeps whatever vx you had, it does not add any. So the fastest
 * conceivable run of a level that is "go right until the cup" is
 *
 *     (cup x - spawn x) / 4.3   frames, plus the handful the ramp-up costs
 *
 * and no input sequence in the universe beats it. That number is the floor. A
 * human record sitting on the floor means there is nothing for a search to
 * find; one sitting well above it means the level makes you wait, climb or
 * backtrack, and the waiting is where a tool-assisted run wins.
 *
 * The one thing that moves the floor is the Clockheart Tonic: 1.45x speed for
 * nine seconds. On a level that has one on the route, the floor is lower than
 * the plain distance says, and the fast route is "fetch the tonic first".
 *
 * This is the whole reason to look before searching. Ranking the levels by
 * slack costs one second and says exactly where a genetic search can and
 * cannot win.
 */
'use strict';

const R = require('./runner');
const records = require('./human-records.json');

const MAXRUN = 4.3;          // px per frame, from player.js
const TONIC_MUL = 1.45;
const TONIC_TIME = 9.0;      // seconds
const RAMP = 6;              // frames to reach top speed from a standstill

function fmt(ms) {
  const s = ms / 1000;
  return (s < 10 ? ' ' : '') + s.toFixed(2) + 's';
}
const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

function main() {
  const win = R.sharedWorld();
  const PL = win.PL;
  const rows = [];

  for (const entry of PL.Towns.allLevels()) {
    const def = entry.def;
    const info = R.levelInfo(def.id, { win });
    const world = PL.Level.build(def);

    // Anything on the level that changes the speed cap, and where it sits.
    // Entities keep a `type`, not the map glyph they were spawned from.
    let tonicX = null, marrow = false, dash = false;
    for (const e of world.entities) {
      if (e.type === 'tonic' && tonicX === null) tonicX = e.x;
      if (e.type === 'marrow') marrow = true;
      if (e.type === 'bellows') dash = true;
    }

    const dist = info.tankardX - info.spawnX;
    const capBase = MAXRUN * (marrow ? 1.22 : 1);
    let floor = dist / capBase + RAMP;
    // With a tonic on the way, nine seconds of the run go 45% faster.
    let floorTonic = null;
    if (tonicX !== null) {
      const fast = capBase * TONIC_MUL;
      const boosted = Math.min(TONIC_TIME * 60 * fast, dist);
      floorTonic = (dist - boosted) / capBase + boosted / fast + RAMP;
    }
    const best = floorTonic !== null ? Math.min(floor, floorTonic) : floor;

    const rec = records.levels[def.id];
    const recFrames = rec ? rec.timeMs * 60 / 1000 : null;
    rows.push({
      id: def.id, name: def.name, trial: !!def.trial,
      dist: dist, floor: best, plainFloor: floor, tonic: tonicX !== null,
      marrow: marrow, dash: dash,
      recFrames: recFrames, recMs: rec ? rec.timeMs : null,
      slack: recFrames === null ? null : recFrames - best
    });
  }

  rows.sort((a, b) => (b.slack || 0) - (a.slack || 0));

  console.log('\nWhere the room is. "floor" is the fastest the level could possibly be run:');
  console.log('straight-line distance at top speed, nothing in the way, no waiting.\n');
  console.log(pad('level', 22) + rpad('human', 9) + rpad('floor', 9) +
              rpad('slack', 9) + rpad('slack %', 9) + '  notes');
  console.log('-'.repeat(80));
  for (const r of rows) {
    const notes = [];
    if (r.trial) notes.push('trial gate');
    if (r.tonic) notes.push('tonic on route (floor assumes it is taken)');
    if (r.marrow) notes.push('marrow (x1.22)');
    if (r.dash) notes.push('bellows dash');
    console.log(
      pad(r.id, 22) +
      rpad(fmt(r.recMs), 9) +
      rpad(fmt(r.floor / 60 * 1000), 9) +
      rpad(fmt(r.slack / 60 * 1000), 9) +
      rpad((100 * r.slack / r.recFrames).toFixed(1) + '%', 9) +
      '  ' + notes.join(', '));
  }
  console.log('\nslack is what a perfect tool-assisted run could take off the human record');
  console.log('at the very most — the part of the record that is not pure travel time.\n');
}

main();
