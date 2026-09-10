/* Where can you stand and not drown? The tide peaks at row 12 and kills
 * anything whose feet are more than 6px below it, so "safe" means a foothold
 * with feet at row <= 12.19. This prints, for the first stretch of the level,
 * the highest foothold in every column — which is the difference between "the
 * opening is a climb" and "the opening is a sprint to somewhere else". */
const R = require('./runner');
const win = R.sharedWorld(), PL = win.PL;
const id = process.argv[2] || 'shantytown-3';
const upto = Number(process.argv[3] || 80);

const def = PL.Towns.allLevels().find(l => l.def.id === id).def;
const w = PL.Level.build(def);
const T = PL.TILE;

// tide timeline
const tide = w.entities.find(e => e.constructor.name === 'Tide');
if (tide) {
  const per = tide.period;
  console.log('tide: period ' + per.toFixed(2) + 's, low row ' + (tide.lowY/T) +
              ', high row ' + (tide.highY/T));
  const marks = [];
  for (let s = 0; s <= per; s += per / 12) {
    tide.t = s;
    const f = tide.phase(); const lvl = f*f*(3-2*f);
    marks.push(s.toFixed(1) + 's:row' + ((tide.lowY + (tide.highY-tide.lowY)*lvl)/T).toFixed(1));
  }
  console.log('       ' + marks.join('  '));
  tide.t = 0;
}
const SAFE = 12.19;

function stand(c, r) {
  if (c < 0 || c >= w.cols || r < 1 || r >= w.rows - 1) return false;
  if (w.solidAt(c, r) || w.oneWayAt(c, r) || w.lethalAt(c, r)) return false;
  return w.solidAt(c, r + 1) || w.oneWayAt(c, r + 1);
}
let line = '', firstSafe = -1;
for (let c = 0; c < upto; c++) {
  let hi = 99;
  for (let r = 1; r < w.rows - 1; r++) if (stand(c, r)) { hi = r; break; }
  if (hi <= SAFE && firstSafe < 0) firstSafe = c;
  line += (hi === 99 ? '.' : (hi <= SAFE ? '#' : String(hi % 10)));
}
console.log('\nhighest standable row per column (0-' + (upto-1) + '), # = above the tide:');
for (let base = 0; base < upto; base += 60) {
  console.log('  col ' + String(base).padStart(3) + ' ' + line.slice(base, base + 60));
}
console.log('\nfirst column with dry footing: ' + (firstSafe < 0 ? 'none in this stretch' : firstSafe) +
            '  (' + (firstSafe * 32) + 'px, ' + (firstSafe * 32 / 4.3).toFixed(0) + ' frames of running away)');
