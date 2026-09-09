/* Where does a level stop the search, and what does it stop on?
 *
 * "No finish" is not a diagnosis. This reports the two things that tell them
 * apart: how far the beam ever got, and whether it ran out of positions or ran
 * out of frames. A beam that empties is dying; a beam that is still full at the
 * end of the budget is stuck.
 */
const B = require('./beam');
const R = require('./runner');
const M = require('./map');
const id = process.argv[2];
const beam = +(process.argv[3] || 60);
const win = R.sharedWorld(), PL = win.PL;
const map = B.mapFor(PL, id);
let furthest = 0, lastFull = 0, lines = [];
const r = B.search(id, {
  beam, map, maxFrames: +(process.argv[4] || 4200), verbose: true,
  log: s => {
    const m = /frame\s+(\d+)\s+band\s+(\d+)\s+furthest\s+(\d+)/.exec(s);
    if (m) { furthest = Math.max(furthest, +m[3]); if (+m[2] > 1) lastFull = +m[1]; lines.push(s.trim()); }
    else lines.push(s.trim());
  }
});
console.log(id + ':  furthest column ' + furthest + ' of ' + map.cols +
  '  (' + Math.round(furthest * 100 / map.cols) + '% across)   beam last had positions at frame ' + lastFull +
  '   ' + r.expanded + ' tried, ' + r.died + ' died, ' + r.offMap + ' off the map' +
  (r.ok ? '   FINISHED ' + (r.frames / 60).toFixed(2) + 's' : ''));
console.log(lines.slice(-4).map(s => '    ' + s).join('\n'));
