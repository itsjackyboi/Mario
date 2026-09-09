/* tas-replays.js — the input logs behind the TAS board, so a run can be watched.
 *
 * DATA ONLY. The screen that plays these is src/replay.js; this file holds
 * nothing but the logs and who set them, so it can be regenerated or hand-
 * edited without touching any behaviour.
 *
 * A log is one character per frame: the six buttons pack into six bits
 * (l, r, u, d, jump, item — in that order, bit 0 first) and six bits is one
 * character out of A-Z a-z 0-9 + /. So 'A' is nothing held, 'C' is left+right,
 * 'Q' is jump alone. Thirty seconds of play is about 1800 characters.
 *
 * To add one, play or find the run, then in the browser console:
 *
 *     PL.Replay.encode(PL.Game.top().inputLog)
 *
 * on a PlayScene whose TAS log holds the run — or run
 * `node bot/export-replay.js <levelId>` against a bot result, which prints an
 * entry ready to paste in here.
 *
 * `seed` must match the tasSeed the run was found under, or the world will not
 * be the same world and the replay will not reproduce it. 20260904 is the
 * default TAS seed and what the bot uses.
 */
window.PL = window.PL || {};
window.PL.TasReplays = {
  // 'shantytown-1': {
  //   player: 'Jack_Anqoak',
  //   build: '1.18.0',
  //   timeMs: 25917,
  //   seed: 20260904,
  //   log: '...one character per frame...'
  // }
};
