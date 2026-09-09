const B = require('./beam');
const id = process.argv[2] || 'aleforge-2';
const t0 = Date.now();
const r = B.search(id, { beam: +(process.argv[3]||40), chunk: +(process.argv[4]||6),
                         verbose: true, log: s => console.log(s), maxFrames: 3000 });
console.log(id, JSON.stringify({ ok: r.ok, frames: r.frames, s: +(r.frames/60).toFixed(2),
  expanded: r.expanded, died: r.died, offMap: r.offMap, secs: +((Date.now()-t0)/1000).toFixed(1) }));
