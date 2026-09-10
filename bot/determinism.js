/* Before blaming the snapshot: is the game even deterministic here?
 *
 * verify-state runs A and B on the SAME scene object. If a level does not
 * reproduce itself from a FRESH scene on the same seed and inputs, then the
 * snapshot is innocent and the non-determinism is somewhere else entirely.
 */
const R = require('./runner');
const S = require('./state');
const win = R.sharedWorld(), PL = win.PL;
const held = f => ({ l:0, r:1, u:0, d: f%53===0?1:0, j:(f%27<9)?1:0, i: f%91===0?1:0 });

function play(id, n) {
  const rng = S.installRandom(win, 20260904);
  const def = PL.Towns.allLevels().find(l => l.def.id === id).def;
  const scene = new PL.PlayScene(def, { practice: true });
  PL.Game.reset(scene);
  scene.introT = 0; scene.fadeIn = 0; scene.inputLog = []; scene.tasFrame = 0; scene.tas = true;
  const out = [];
  for (let f = 0; f < n; f++) {
    R.stepTop(PL, scene, held(f));
    const p = scene.player;
    out.push(p.x.toFixed(6) + ',' + p.y.toFixed(6) + ',' + p.vy.toFixed(6));
  }
  return out;
}

for (const id of (process.argv.slice(2).length ? process.argv.slice(2)
    : ['fenwick-1', 'fenwick-2', 'aleforge-3', 'tavern-1'])) {
  const a = play(id, 440), b = play(id, 440);
  let d = -1;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { d = i; break; }
  console.log((id + '              ').slice(0, 14) +
    (d < 0 ? 'reproduces itself exactly'
           : 'NOT DETERMINISTIC — differs at frame ' + d + '\n    ' + a[d] + '\n    ' + b[d]));
}
