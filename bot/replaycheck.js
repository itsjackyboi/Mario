/* replaycheck.js — does the game's own rewind reproduce what the bot played?
 *
 * The submission route is: open the level in practice, press T, then set
 * `scene.inputLog` to the genome and call `scene.tasRewind(genome.length)`.
 * That is the same code path a human's rewind takes, and it is the only way to
 * get a bot-found log into a real, postable TasResultScene.
 *
 * It is worth checking rather than assuming, because tasRewind replays by
 * calling `this.step()` on the PlayScene — the scene it belongs to — whereas
 * the bot plays by stepping whatever scene is on top of the stack. Those are
 * the same thing right up until a trial gate pushes a TrialScene, and the two
 * would then be playing different games.
 *
 *   node replaycheck.js <levelId> [framesToPlay]
 */
'use strict';

const R = require('./runner');
const S = require('./search');

const levelId = process.argv[2] || 'shantytown-1';
const nFrames = Number(process.argv[3] || 900);

const win = R.sharedWorld();
const PL = win.PL;
const rng = S.mulberry32(4);
const genome = S.randomGenome(nFrames, rng, null);

// 1. how the bot plays it: step the top of the stack
const played = R.trace(levelId, genome, { win });
const lastPlayed = played.path[played.path.length - 1];

// 2. how the game replays it: tasRewind on the PlayScene
const scene = R.makeScene(PL, levelId);
scene.inputLog = genome.slice();
scene.tasFrame = genome.length;
scene.tasRewind(genome.length);
const p = scene.player;
const after = {
  frames: scene.tasFrame, x: +p.x.toFixed(2), y: +p.y.toFixed(2),
  finished: !!scene.finished,
  top: PL.Game.top() === scene ? 'play' : (PL.Game.top() || {}).constructor.name
};
PL.util.restoreRandom();

const pad = (s, n) => String(s).padEnd(n);
console.log('level               : ' + levelId +
            (R.levelInfo(levelId, { win }).trial ? '   (has a trial gate)' : ''));
console.log('bot played          : ' + pad(played.frames + ' frames', 14) +
            'x=' + lastPlayed.x + '  finished=' + played.finished +
            '  ended on scene ' + lastPlayed.scene);
console.log('game rewound to     : ' + pad(after.frames + ' frames', 14) +
            'x=' + after.x + '  finished=' + after.finished +
            '  top of stack ' + after.top);

const same = Math.abs(after.x - lastPlayed.x) < 0.01 && after.finished === played.finished;
console.log('\n' + (same
  ? 'MATCH — this level\'s logs replay through the game\'s own rewind, so a genome'
    + '\nfound here can be turned into a real TAS result in the browser.'
  : 'DIVERGED — the rewind does not reproduce the run. A log for this level cannot'
    + '\nbe posted by pasting it into tasRewind; the two code paths part company'
    + '\n(the bot steps the scene in charge, the rewind steps the play scene).'));
