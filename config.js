/* config.js — the one file you edit to turn on the shared leaderboard.
 *
 * Leave `leaderboardUrl` empty and the game behaves exactly as it always has:
 * no network calls at all, records local to the browser, works from file://.
 *
 * To share a board with friends, follow the setup in the README ("The shared
 * board") — it takes about ten minutes and needs no hosting of your own — then
 * paste the Apps Script web app URL here. It looks like:
 *
 *   https://script.google.com/macros/s/AKfycb.../exec
 *
 * The URL is not a secret: it is in the page source of anything you publish,
 * by design. Anyone with it can add rows to your sheet, which is the point.
 *
 * ---------------------------------------------------------------------------
 *
 * `tasReplay` turns on WATCHING the tool-assisted runs — the V key on the level
 * select, which plays the fastest known run back frame by frame with the held
 * buttons along the bottom.
 *
 * It is OFF for the v2 launch, on purpose. The time still stands on the board;
 * what is withheld is the answer. A route somebody worked out is worth more to
 * a player who has been beaten by it for a week than to one who watched it on
 * the first evening, and there is no way to un-see it.
 *
 * The screen is built and tested and stays in the build. Set this to true to
 * hand it back — one line, no other change, and every way in comes back
 * together: the key, the prompt on the level select, and the screen itself.
 */
window.PL = window.PL || {};
window.PL.CONFIG = {
  leaderboardUrl: 'https://script.google.com/macros/s/AKfycbwahTOUij2DBvA1bTeCJk4UKsNci991JZvat3eOhmKXmmR5q8xVjHmBYRbbk8hAsLbf/exec',
  tasReplay: false
};
