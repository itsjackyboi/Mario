/* A run the search found has to reproduce in the game the search is not
 * driving. The beam plays under its own readable generator; the game and the
 * replay screen play under theirs. Same arithmetic and same seed, but that is
 * an argument, not a measurement — so measure it.
 */
const B = require('./beam');
const R = require('./runner');
const id = process.argv[2] || 'aleforge-2';
const r = B.search(id, { beam: +(process.argv[3] || 40), chunk: +(process.argv[4] || 6), maxFrames: 3000 });
if (!r.ok) { console.log(id + ': no finish to check'); process.exit(0); }
const e = R.evaluate(id, r.log);
const same = e.finished && e.frames === r.frames;
console.log(id + ': search says ' + r.frames + ' frames, the game says ' +
  (e.finished ? e.frames : 'did not finish') + '  →  ' + (same ? 'REPRODUCES' : 'DOES NOT REPRODUCE'));
process.exit(same ? 0 : 1);
