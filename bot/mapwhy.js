/* Where does the cost field stop, and what is in the way there? */
const R = require('./runner'); const M = require('./map');
const win = R.sharedWorld(), PL = win.PL;
const id = process.argv[2] || 'shantytown-1';
const e = PL.Towns.allLevels().find(l => l.def.id === id);
const sc = new PL.PlayScene(e.def, { practice: true });
PL.Game.reset(sc); sc.introT = 0;
const a = M.analyse(sc, PL), m = a.m;
const spawnC = Math.floor((sc.world.spawn.x + 10) / 32), spawnR = Math.floor((sc.world.spawn.y + 14) / 32);
console.log(id, 'cols', m.cols, 'spawn cell', spawnC + ',' + spawnR, ' goal cells', a.goals.length,
            'at col', a.goalCol, 'row', a.goalRow);
// reachable columns
let lo = 1e9, hi = -1;
const perCol = new Array(m.cols).fill(0);
for (let r = 0; r < m.rows; r++) for (let c = 0; c < m.cols; c++) {
  const i = r * m.cols + c;
  if (m.stand[i] && isFinite(a.dist[i])) { perCol[c]++; if (c < lo) lo = c; if (c > hi) hi = c; }
}
console.log('field covers columns', lo, '..', hi);
// the first column going left from `lo` that has standable cells but no cost
let gapC = -1;
for (let c = lo - 1; c >= 0; c--) { let s = 0; for (let r = 0; r < m.rows; r++) if (m.stand[r * m.cols + c]) s++; if (s) { gapC = c; break; } }
console.log('nearest standable column outside the field:', gapC);
function col(c) {
  const out = [];
  for (let r = 0; r < m.rows; r++) {
    const i = r * m.cols + c;
    out.push(m.solid[i] ? '#' : m.lethal[i] ? '~' : m.stand[i] ? (isFinite(a.dist[i]) ? 'o' : '?') : '.');
  }
  return out.join('');
}
console.log('\ncolumns around the frontier (# solid, ~ lethal, o costed, ? standable-but-cut-off):');
for (let c = Math.max(0, lo - 8); c <= Math.min(m.cols - 1, lo + 6); c++)
  console.log('  col ' + String(c).padStart(3) + '  ' + col(c));
