/* Does save/restore actually put the world back?
 *
 * Play to a point, save, play on and record what happened, then restore and
 * play the SAME inputs again. If one field is missing from the snapshot the two
 * runs diverge, and this says on which frame.
 *
 * A search built on an unverified snapshot explores a world its own replay will
 * not reproduce — the worst kind of wrong, because everything looks fine until
 * a finished run refuses to play back. So this is deliberately harder than the
 * search needs:
 *
 *   - three save points, early, middle and late, because the state a level
 *     holds at frame 60 is not the state it holds at frame 600;
 *   - three different input patterns, because a pattern that never presses
 *     down never exercises dropping through a plank;
 *   - a restore from a stale snapshot after a newer one has been taken, which
 *     is what a beam search does constantly and what a naive dirty-tracking
 *     scheme would get wrong;
 *   - and the same run with the scenery left out, to prove that the one
 *     optimisation in state.js is invisible to the game.
 *
 * The last one earns its place: the bug this file exists to catch was a
 * snapshot silently declining to save `player.buffs`, and a snapshot that
 * silently declines to save things is exactly what an optimisation is.
 */
const R = require('./runner');
const S = require('./state');

const win = R.sharedWorld(), PL = win.PL;
const SEED = 20260904;

function fingerprint(scene) {
  const p = scene.player, w = scene.world;
  let h = p.x.toFixed(6) + ',' + p.y.toFixed(6) + ',' + p.vx.toFixed(6) + ',' +
          p.vy.toFixed(6) + ',' + (p.grounded ? 1 : 0) + ',' + p.grog + ',' +
          (p.dead ? 1 : 0) + ',' + (p.tonic || 0).toFixed(4) + ',' +
          Object.keys(p.buffs).sort().join('+') + ',' +
          w.entities.length + ',' + (w.tideY || 0).toFixed(4) + ',' +
          scene.tasFrame + ',' + (scene.finished ? 1 : 0) + ',' + PL.Game.scenes.length;
  for (let i = 0; i < w.entities.length; i++) {
    const e = w.entities[i];
    h += '|' + (e.x || 0).toFixed(3) + ',' + (e.y || 0).toFixed(3) +
         ',' + (e.t || 0).toFixed(4) + ',' + (e.remove ? 1 : 0) + ',' + (e.active ? 1 : 0);
  }
  return h;
}

/* Three vocabularies. The first runs and hops, the second is jumpier and uses
 * the item button, the third holds down (planks) and turns around. */
const PATTERNS = [
  f => ({ l: 0, r: 1, u: 0, d: f % 53 === 0 ? 1 : 0, j: (f % 27 < 9) ? 1 : 0, i: f % 91 === 0 ? 1 : 0 }),
  f => ({ l: 0, r: 1, u: 0, d: 0, j: (f % 13 < 6) ? 1 : 0, i: f % 31 === 0 ? 1 : 0 }),
  f => ({ l: f % 97 < 12 ? 1 : 0, r: f % 97 < 12 ? 0 : 1, u: 0,
          d: f % 23 < 3 ? 1 : 0, j: (f % 41 < 11) ? 1 : 0, i: f % 67 === 0 ? 1 : 0 })
];

function fresh(def, rng) {
  const scene = new PL.PlayScene(def, { practice: true });
  PL.Game.reset(scene);
  scene.introT = 0; scene.fadeIn = 0;
  scene.inputLog = []; scene.tasFrame = 0; scene.tas = true;
  return scene;
}

/** One save point, one pattern: play A, rewind, play B, demand they agree. */
function trial(def, at, held, horizon, lean) {
  const rng = S.installRandom(win, SEED);
  const scene = fresh(def, rng);
  for (let f = 0; f < at; f++) R.stepTop(PL, scene, held(f));

  const snap = S.snapshot(scene, rng, PL, { lean: lean });
  const a = [];
  for (let f = at; f < at + horizon; f++) { R.stepTop(PL, scene, held(f)); a.push(fingerprint(scene)); }

  /* Take a second snapshot from where run A ended and throw it away unused.
   * A beam search holds many snapshots at once and restores old ones after new
   * ones exist; anything that quietly assumes the newest is the live one fails
   * here rather than in the middle of a twelve-hour search. */
  S.snapshot(scene, rng, PL, { lean: lean });

  S.restore(scene, snap, rng);
  const b = [];
  for (let f = at; f < at + horizon; f++) { R.stepTop(PL, scene, held(f)); b.push(fingerprint(scene)); }

  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return at + i;
  return -1;
}

/** And: does leaving the scenery out change the game at all? */
function sceneryBlind(def, held, n) {
  const play = (lean) => {
    const rng = S.installRandom(win, SEED);
    const scene = fresh(def, rng);
    const out = [];
    for (let f = 0; f < n; f++) {
      R.stepTop(PL, scene, held(f));
      if (f === 120 || f === 300) {
        const s = S.snapshot(scene, rng, PL, { lean: lean });
        S.restore(scene, s, rng);       // a no-op restore must also be a no-op
      }
      out.push(fingerprint(scene));
    }
    return out;
  };
  const open = play(false), shut = play(true);
  for (let i = 0; i < open.length; i++) if (open[i] !== shut[i]) return i;
  return -1;
}

const only = process.argv.slice(2);
let bad = 0, n = 0, trials = 0;
for (const entry of PL.Towns.allLevels()) {
  const def = entry.def, id = def.id;
  if (only.length && only.indexOf(id) < 0) continue;
  const fails = [];
  for (const at of [60, 200, 450]) {
    for (let p = 0; p < PATTERNS.length; p++) {
      for (const lean of [true, false]) {
        trials++;
        const d = trial(def, at, PATTERNS[p], 240, lean);
        if (d >= 0) fails.push('save@' + at + ' pattern' + p + (lean ? ' lean' : ' full') + ' → frame ' + d);
      }
    }
  }
  const sb = sceneryBlind(def, PATTERNS[0], 500);
  if (sb >= 0) fails.push('scenery is NOT invisible — differs at frame ' + sb);
  n++;
  if (fails.length) bad++;
  console.log((id + '                    ').slice(0, 22) +
    (fails.length ? 'DIVERGES\n    ' + fails.join('\n    ')
                  : 'restores exactly — 18 trials, 3 save points, 3 vocabularies'));
}
console.log('\n' + trials + ' restore trials across ' + n + ' levels: ' +
  (bad ? bad + ' LEVELS FAIL' : 'all clean — the search can branch safely'));
