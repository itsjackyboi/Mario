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
 */
window.PL = window.PL || {};
window.PL.CONFIG = {
  leaderboardUrl: 'https://script.google.com/macros/s/AKfycbwahTOUij2DBvA1bTeCJk4UKsNci991JZvat3eOhmKXmmR5q8xVjHmBYRbbk8hAsLbf/exec'
};
