/**
 * leaderboard.gs — the whole server side of the shared Books of Captains.
 *
 * Paste this into a Google Apps Script project bound to a Sheet, deploy it as a
 * web app, and paste the deployment URL into config.js. Full instructions are
 * in the README under "The shared board".
 *
 * It does three things:
 *   GET  ?board=1   -> { rows: [ ... ] }   every run on the board
 *   GET  ?rebuild=1 -> { ok: true }        redraw the leaderboard tab now
 *   POST <json row> -> { ok: true }        add one run, then redraw
 *
 * TWO TABS, on purpose:
 *   `runs`        every run ever posted, append-only, never sorted or trimmed.
 *                 This is the record. The game reads it, your history lives in
 *                 it, and nothing here ever rewrites a row of it.
 *   `leaderboard` the top five per level and for the whole-game speedrun,
 *                 rebuilt from `runs` after every post. Derived, disposable,
 *                 and safe to delete — it comes straight back.
 *
 * Sorting a log in place would mean the sheet could not answer "what did I
 * actually run last Tuesday", and a bad row could not be found and removed by
 * hand. Deriving a second tab costs one cheap rewrite per post and keeps both.
 *
 * The board carries the time twice: `timeMs` as a raw number, which is what
 * sorts and charts correctly and what the game reads back, and `time` written
 * 00:41.20 for anyone reading the sheet. New columns are always appended, never
 * inserted, so a sheet with rows already in it keeps every value where it is.
 *
 * Notes on why it is shaped like this:
 *
 * - The game POSTs with Content-Type: text/plain so the browser treats it as a
 *   "simple" request and skips the CORS preflight. Apps Script web apps do not
 *   answer OPTIONS, so a preflight would fail and take the request with it.
 *
 * - Rows in `runs` are appended, never edited, so the sheet stays a plain log
 *   you can sort, filter and chart by hand without the game caring.
 *
 * - The top five is five *runs*, not five players, which is what the in-game
 *   board shows too. Having the sheet and the game disagree about who is top
 *   would be worse than one person holding several places.
 *
 * - There is no authentication and no validation worth the name. Anyone with
 *   the URL can add any row. That is the deal with a client-authoritative
 *   board; for a friend group it is fine, and pretending otherwise would just
 *   be theatre.
 */

var SHEET_NAME = 'runs';
var HEADERS = ['date', 'player', 'town', 'level', 'timeMs', 'grog',
               'deaths', 'shards', 'speedrun', 'version', 'time'];

var LB_SHEET = 'leaderboard';
var LB_HEADERS = ['level', 'rank', 'time', 'player', 'mode', 'grog',
                  'deaths', 'build', 'date', 'timeMs'];
var TOP_N = 5;

/**
 * Play order and display names for the leaderboard tab. Cosmetic only: this
 * decides the order levels appear in and what they are called, nothing else.
 * A level id that is not listed here still gets its own top five — it just
 * lands at the bottom under its raw id — so adding a level to the game never
 * silently drops it from the board.
 *
 * Taken from data/towns.js. If you add or rename a level there, update it here
 * too, or live with the raw id.
 */
var LEVEL_ORDER = [
  ['full-game',            'Drunken Speedrun (whole game)'],
  ['shantytown-1',         'Shanty Town I - The Crash Cliffs'],
  ['shantytown-2',         'Shanty Town II - The Bone Stair'],
  ['shantytown-3',         'Shanty Town III - The Drowning Tide'],
  ['aleforge-1',           'Aleforge I - Brewers Lane'],
  ['aleforge-2',           'Aleforge II - Wolendi Wind Farm'],
  ['aleforge-3',           'Aleforge III - The Rolling Boil'],
  ['providence-1',         'Providence I - The Ordered Stair'],
  ['providence-2',         'Providence II - The Tithe Walk'],
  ['providence-3',         'Providence III - The Half Beat'],
  ['providence-oweblock',  'Providence * - Owe Block (bonus)'],
  ['fenwick-1',            'Fenwick I - Brandywine Brush'],
  ['fenwick-2',            'Fenwick II - The Overturned Wood'],
  ['roto-1',               'Roto Kaiishi I - The Long Pier'],
  ['roto-2',               "Roto Kaiishi II - Netmenders' Row"],
  ['roto-3',               'Roto Kaiishi III - The Undertow'],
  ['tavern-1',             "Sackbeard's Tavern (finale)"]
];

/** Milliseconds as 00:41.20, for rows posted before the game sent `time`. */
function clock_(ms) {
  ms = Math.max(0, Math.floor(Number(ms) || 0));
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  return p2(Math.floor(ms / 60000)) + ':' +
         p2(Math.floor((ms % 60000) / 1000)) + '.' +
         p2(Math.floor((ms % 1000) / 10));
}

/**
 * The runs sheet, created with headers the first time it is needed and brought
 * up to date if this script has grown a column since it was made. Only the
 * header row is rewritten — existing rows keep every value in place, because
 * new columns go on the end rather than being inserted.
 */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    return sh;
  }
  if (sh.getLastColumn() < HEADERS.length) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Every run in the log, as objects. Shared by doGet and the rebuild. */
function readRuns_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];

  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!v[3]) continue;                         // no level id, not a run
    rows.push({
      date: String(v[0]),
      player: String(v[1]),
      town: String(v[2]),
      level: String(v[3]),
      timeMs: Number(v[4]) || 0,
      grog: Number(v[5]) || 0,
      deaths: Number(v[6]) || 0,
      shards: Number(v[7]) || 0,
      speedrun: v[8] === true || String(v[8]).toLowerCase() === 'true',
      version: String(v[9] || ''),
      time: String(v[10] || '')
    });
  }
  return rows;
}

/** GET ?board=1 for the whole log, ?rebuild=1 to redraw the leaderboard tab. */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.rebuild) {
      rebuildLeaderboard_();
      return json_({ ok: true });
    }
    return json_({ rows: readRuns_() });
  } catch (err) {
    return json_({ rows: [], error: String(err) });
  }
}

/** POST one run as JSON. */
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.level) return json_({ ok: false, error: 'no level' });

    // Trim the two free-text fields; everything else is coerced to a number or
    // a boolean, so a malformed submission cannot put junk in a typed column.
    sheet_().appendRow([
      String(body.date || new Date().toISOString()).slice(0, 40),
      String(body.player || 'anonymous').slice(0, 24),
      String(body.town || '').slice(0, 40),
      String(body.level || '').slice(0, 40),
      Number(body.timeMs) || 0,
      Number(body.grog) || 0,
      Number(body.deaths) || 0,
      Number(body.shards) || 0,
      body.speedrun === true,
      String(body.version || '').slice(0, 16),
      String(body.time || '').slice(0, 16)
    ]);
    rebuildLeaderboard_();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// =========================================================== leaderboard tab

/** The derived tab, created on demand. */
function lbSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(LB_SHEET) || ss.insertSheet(LB_SHEET);
}

/**
 * Redraw the leaderboard tab from the log: the top five runs on every level,
 * and on the whole-game speedrun, in play order.
 *
 * The whole tab is cleared and rewritten rather than patched. It is derived
 * data — there is nothing in it worth preserving, and a full rewrite cannot
 * drift out of step with the log the way an incremental update can.
 */
function rebuildLeaderboard_() {
  var runs = readRuns_();

  var byLevel = {};
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i];
    (byLevel[r.level] = byLevel[r.level] || []).push(r);
  }

  // Known levels in play order, then anything unrecognised so a level added to
  // the game still gets a board here without this file being touched.
  var order = [], seen = {}, k;
  for (var o = 0; o < LEVEL_ORDER.length; o++) {
    order.push(LEVEL_ORDER[o]);
    seen[LEVEL_ORDER[o][0]] = true;
  }
  var extra = [];
  for (k in byLevel) if (!seen[k]) extra.push(k);
  extra.sort();
  for (var x = 0; x < extra.length; x++) order.push([extra[x], extra[x]]);

  var out = [LB_HEADERS];
  for (var j = 0; j < order.length; j++) {
    var id = order[j][0], label = order[j][1];
    var list = byLevel[id];
    if (!list || !list.length) continue;

    list.sort(function (a, b) {
      return (a.timeMs - b.timeMs) || String(a.date).localeCompare(String(b.date));
    });

    var n = Math.min(TOP_N, list.length);
    for (var p = 0; p < n; p++) {
      var e = list[p];
      out.push([
        label,
        p + 1,
        e.time || clock_(e.timeMs),
        e.player,
        e.speedrun ? 'SPEEDRUN' : 'single',
        e.grog,
        e.deaths,
        e.version ? 'v' + e.version : '',
        String(e.date).slice(0, 10),
        e.timeMs
      ]);
    }
  }

  var sh = lbSheet_();
  sh.clear();
  sh.getRange(1, 1, out.length, LB_HEADERS.length).setValues(out);
  sh.setFrozenRows(1);
  return out.length - 1;
}

/**
 * Run this by hand from the Apps Script editor to fill the tab in immediately,
 * rather than waiting for the next run to be posted. Select it in the function
 * dropdown and press Run.
 */
function rebuildLeaderboard() {
  var n = rebuildLeaderboard_();
  SpreadsheetApp.getActiveSpreadsheet().toast(n + ' rows written to ' + LB_SHEET);
}
