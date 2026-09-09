/* What does branching cost, and what is the snapshot carrying? */
const R = require('./runner'); const S = require('./state');
const win = R.sharedWorld(), PL = win.PL;
const held = f => ({ l:0, r:1, u:0, d:f%53===0?1:0, j:(f%27<9)?1:0, i:f%91===0?1:0 });
for (const id of ['shantytown-3', 'fenwick-2', 'aleforge-3', 'tavern-1']) {
  const rng = S.installRandom(win, 20260904);
  const def = PL.Towns.allLevels().find(l => l.def.id === id).def;
  const scene = new PL.PlayScene(def, { practice: true });
  PL.Game.reset(scene); scene.introT = 0; scene.fadeIn = 0;
  scene.inputLog = []; scene.tasFrame = 0; scene.tas = true;
  for (let f = 0; f < 300; f++) R.stepTop(PL, scene, held(f));
  const c = S.census(S.snapshot(scene, rng, PL));
  let t0 = process.hrtime.bigint();
  const N = 2000; let snap;
  for (let i = 0; i < N; i++) snap = S.snapshot(scene, rng, PL);
  const snapUs = Number(process.hrtime.bigint() - t0) / 1000 / N;
  t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) S.restore(scene, snap, rng);
  const restUs = Number(process.hrtime.bigint() - t0) / 1000 / N;
  t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) R.stepTop(PL, scene, held(300));
  const stepUs = Number(process.hrtime.bigint() - t0) / 1000 / N;
  console.log((id + '            ').slice(0, 14) +
    'snapshot ' + snapUs.toFixed(1) + 'us  restore ' + restUs.toFixed(1) +
    'us  one frame ' + stepUs.toFixed(1) + 'us   |  ' + c.open + ' objects, ' +
    c.fields + ' fields, ' + c.opaque + ' left shut (' +
    Object.keys(c.opaqueKinds).map(k => k + '×' + c.opaqueKinds[k]).join(' ') + ')');
}
