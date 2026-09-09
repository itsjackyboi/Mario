/* Does pricing the items into fitness actually make the search take them?
 * Same level, same seed, same budget — the only difference is whether the
 * mobility bonus is switched on. Anything else would not be an answer. */
const R = require('./runner');
const S = require('./search');
const win = R.sharedWorld(), PL = win.PL;

const levels = process.argv.slice(2).length ? process.argv.slice(2)
             : ['roto-1', 'providence-2', 'aleforge-1'];

const realFitness = S.fitnessOf;
function noItems(res, width) {
  if (res.finished) return 1 + 100000 / res.frames;
  const reach = Math.min(1, res.bestX / width);
  const alive = Math.min(0.05, (res.deadAt < 0 ? res.frames : res.deadAt) / 20000);
  return reach * reach + alive;          // the fitness before this change
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('level', 16) + pad('fitness', 14) + pad('reach', 9) +
            pad('tonic s', 10) + pad('pouch spent', 13) + 'dashes');
console.log('-'.repeat(72));

for (const id of levels) {
  for (const mode of ['distance only', 'items priced']) {
    const out = S.run(id, { pop: 70, gens: 30, seed: 3, log: false,
      fitness: mode === 'items priced' ? realFitness : noItems });
    const chk = R.evaluate(id, out.genome, { win });
    console.log(pad(id, 16) + pad(mode, 14) +
      pad((100 * chk.bestX / out.width).toFixed(1) + '%', 9) +
      pad((chk.tonicFrames / 60).toFixed(2), 10) +
      pad(chk.pouchSpent, 13) + chk.dashes);
  }
}
