/* tightness.js — how many of a run's presses have to land on an exact frame?
 *
 * "Frame perfect" is a claim about a level, and until it is measured it is only
 * a hope about one. This measures it, and the test is the one a player feels:
 * press a frame early, or a frame late, and see whether the run survives.
 *
 * WHAT IS MEASURED, AND WHY IT IS THE EDGES.
 *
 * The obvious test — insert one wasted frame and replay — does not localise.
 * A hesitation anywhere before a hard jump breaks that jump, so every frame
 * before it reads as tight and the report says "97% of the run is critical" on
 * a level with one hard jump in it. That number is true and useless.
 *
 * What a player actually does is press and release. So the unit here is an
 * EDGE: a frame where a button changes state. Each edge is moved one frame
 * earlier and one frame later, with the whole rest of the run left exactly
 * where it was, and the level replayed. If either move loses the run, that
 * press had one frame to land on and no other.
 *
 * WHAT MATTERS IS THE CHAINS. One exact press in a level is a trick, and a
 * player will land it eventually by repetition. Five exact presses in a row,
 * with no ordinary input between them to breathe on, is a passage that has to
 * be learned as one unbroken motion, because there is nowhere in the middle to
 * correct. That is the number this leads with, and it is what "back to back"
 * means in a way that can be checked rather than asserted.
 *
 *   node bot/tightness.js <levelId>            measure the stored replay
 *   node bot/tightness.js <levelId> --search   search for a run first
 *
 * One caveat. This measures the run it is given. A route that is tight all the
 * way and a route with a single hard jump can only be told apart if what is
 * measured is the fast route — so measure the fast one.
 */
'use strict';

const R = require('./runner');
const win = R.sharedWorld();
const PL = win.PL;

const id = process.argv[2];
if (!id) { console.error('usage: node bot/tightness.js <levelId> [--search]'); process.exit(1); }

const BUTTONS = [['l', '←'], ['r', '→'], ['d', '↓'], ['j', 'JUMP'], ['i', 'ITEM']];

function storedLog(levelId) {
  const rec = PL.TasReplays && PL.TasReplays[levelId];
  return rec && rec.log ? PL.Replay.decode(rec.log) : null;
}
function searchLog(levelId) {
  const r = require('./beam').search(levelId, { beam: +(process.env.BEAM || 60), maxFrames: 5400 });
  return r.ok ? r.log : null;
}

let log = process.argv.includes('--search') ? searchLog(id) : (storedLog(id) || searchLog(id));
if (!log) { console.error(id + ': no run to measure — nothing finishes this level yet.'); process.exit(1); }

const base = R.evaluate(id, log, { win });
if (!base.finished) { console.error(id + ': the run does not finish.'); process.exit(1); }
const N = base.frames;
log = log.slice(0, N).map(h => Object.assign({}, h));

/** Every frame where a button changes state. */
const edges = [];
for (let f = 1; f < N; f++) {
  for (const [b, label] of BUTTONS) {
    if ((log[f][b] ? 1 : 0) !== (log[f - 1][b] ? 1 : 0)) {
      edges.push({ f, b, label, to: log[f][b] ? 1 : 0 });
    }
  }
}

/** The run with one edge moved by `shift` frames, everything else untouched. */
function moved(e, shift) {
  const out = log.map(h => Object.assign({}, h));
  const at = e.f + shift;
  if (at < 1 || at >= N) return null;
  if (shift < 0) out[e.f - 1][e.b] = e.to;          // press a frame early
  else out[e.f][e.b] = e.to ? 0 : 1;                // hold the old state one frame longer
  return out;
}

let exact = 0;
for (const e of edges) {
  let ok = 0, tried = 0;
  for (const shift of [-1, 1]) {
    const g = moved(e, shift);
    if (!g) continue;
    tried++;
    if (R.evaluate(id, g, { win, maxFrames: N + 300 }).finished) ok++;
  }
  e.exact = tried > 0 && ok < tried;
  if (e.exact) exact++;
}

/* Chains: exact presses with no forgiving press between them. */
const chains = [];
for (let i = 0; i < edges.length; i++) {
  if (!edges[i].exact) continue;
  let j = i;
  while (j + 1 < edges.length && edges[j + 1].exact) j++;
  chains.push({ at: edges[i].f, n: j - i + 1, end: edges[j].f });
  i = j;
}
chains.sort((u, v) => v.n - u.n);

console.log(id + '  —  ' + N + ' frames (' + (N / 60).toFixed(2) + 's), ' + edges.length + ' presses and releases');
console.log('  ' + exact + ' of them (' + (exact * 100 / Math.max(1, edges.length)).toFixed(0) +
            '%) have exactly one frame that works.');
if (!chains.length) { console.log('  none of them are consecutive — every hard input has an easy one either side.'); }
else {
  console.log('  longest unbroken chains of them:');
  for (const c of chains.slice(0, 8)) {
    console.log('    ' + String(c.n).padStart(3) + ' in a row   from frame ' + String(c.at).padStart(4) +
                ' (' + (c.at / 60).toFixed(2) + 's) to ' + c.end);
  }
  const long = chains.filter(c => c.n >= 3).length;
  console.log('  ' + chains.length + ' chains in all, ' + long + ' of them three or more deep.');
}
