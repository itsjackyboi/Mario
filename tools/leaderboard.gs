/**
 * leaderboard.gs — the whole server side of the shared Books of Captains.
 *
 * Paste this into a Google Apps Script project bound to a Sheet, deploy it as a
 * web app, and paste the deployment URL into config.js. Full instructions are
 * in the README under "The shared board".
 *
 * It does two things:
 *   GET  ?board=1   -> { rows: [ ... ] }   every run on the board
 *   POST <json row> -> { ok: true }        add one run
 *
 * Notes on why it is shaped like this:
 *
 * - The game POSTs with Content-Type: text/plain so the browser treats it as a
 *   "simple" request and skips the CORS preflight. Apps Script web apps do not
 *   answer OPTIONS, so a preflight would fail and take the request with it.
 *
 * - Rows are appended, never edited. Sorting and trimming to a top five happen
 *   in the game, so the sheet stays a plain append-only log you can sort,
 *   filter and chart by hand without the game caring.
 *
 * - There is no authentication and no validation worth the name. Anyone with
 *   the URL can add any row. That is the deal with a client-authoritative
 *   board; for a friend group it is fine, and pretending otherwise would just
 *   be theatre.
 */

var SHEET_NAME = 'runs';
var HEADERS = ['date', 'player', 'town', 'level', 'timeMs', 'grog',
               'deaths', 'shards', 'speedrun', 'version'];

/** The runs sheet, created with headers the first time it is needed. */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET ?board=1 — the whole board, newest sheet order, as objects. */
function doGet(e) {
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return json_({ rows: [] });

    var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
    var rows = [];
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (!v[3]) continue;                       // no level id, not a run
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
        version: String(v[9] || '')
      });
    }
    return json_({ rows: rows });
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
      String(body.version || '').slice(0, 16)
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
