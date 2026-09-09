/* What actually stops the bot on The Drowning Tide? */
const R = require('./runner');
const S = require('./search');
const win = R.sharedWorld(), PL = win.PL;

const info = R.levelInfo('shantytown-3', { win });
console.log('level width ' + info.width + 'px (' + (info.width/32) + ' tiles), cup at x=' + info.tankardX);
console.log('spawn x=' + info.spawnX + ', trial=' + info.trial + ', diff=' + info.diff);

// the tide system, straight off the def
const def = PL.Towns.allLevels().find(l => l.def.id === 'shantytown-3').def;
console.log('tide def   ' + JSON.stringify(def.tide));

// Play the crudest possible "run right" and watch the tide against the player.
const g = [];
for (let f = 0; f < 900; f++) g.push({l:0,r:1,u:0,d:0,j:(f%26<10)?1:0,i:0});

const scene = R.makeScene(PL, 'shantytown-3');
const p = scene.player;
let tideEnt = null;
for (const e of scene.world.entities) if (e.constructor.name === 'Tide') tideEnt = e;
console.log('tide entity found: ' + !!tideEnt);

const rows = [];
for (let f = 0; f < 900; f++) {
  R.stepTop(PL, scene, g[f]);
  if (f % 15 === 0 || p.dead) {
    rows.push({ f, x: +p.x.toFixed(0), y: +p.y.toFixed(0),
                col: Math.floor(p.x/32), row: Math.floor((p.y+p.h)/32),
                tideY: scene.world.tideY === undefined ? null : +scene.world.tideY.toFixed(0),
                dead: !!p.dead, grounded: !!p.grounded });
  }
  if (p.dead) break;
}
console.log('\n  frame     x    y   col,row   tideY  grounded');
for (const r of rows.slice(-14)) {
  console.log(String(r.f).padStart(7) + String(r.x).padStart(6) + String(r.y).padStart(5) +
    ('  ' + r.col + ',' + r.row).padStart(10) + String(r.tideY).padStart(8) +
    (r.grounded ? '   yes' : '   no') + (r.dead ? '   <-- DIED' : ''));
}
PL.util.restoreRandom();
