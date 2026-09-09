/* The Drowning Tide, with the solved opening as generation zero.
 * The opening search proved the ladder is climbable; this asks how far the
 * rest of the level goes once the search starts from the top of it. */
const fs = require('fs');
const S = require('./search');
const R = require('./runner');
const rec = require('./human-records.json');
const seed = JSON.parse(fs.readFileSync('results/_opening2-shantytown-3.json', 'utf8')).genome;
const recFrames = Math.round(rec.levels['shantytown-3'].timeMs * 60 / 1000);
console.log('human record ' + recFrames + ' frames (' + (recFrames/60).toFixed(2) + 's)');
console.log('seeding generation zero with the ' + seed.length + '-frame opening that survives the flood\n');
const out = S.run('shantytown-3', {
  pop: 140, gens: 250, seed: 5, recordFrames: recFrames,
  seeds: [seed], bias: 'climb'
});
out.submissionReady = !!(out.finished && out.frames <= recFrames);
fs.writeFileSync('results/shantytown-3.json', JSON.stringify(out, null, 1));
console.log('\nfinished=' + out.finished + ' frames=' + out.frames +
            ' reach=' + (100*out.bestX/out.width).toFixed(1) + '%' +
            ' submissionReady=' + out.submissionReady);
