/**
 * leaderboard.gs — the whole server side of the shared Books of Captains.
 *
 * Paste this into a Google Apps Script project bound to a Sheet, deploy it as a
 * web app, and paste the deployment URL into config.js. Full instructions are
 * in the README under "The shared board".
 *
 * It does three things:
 *   GET  ?board=1   -> { rows: [ ... ] }   every run on the board
 *   GET  ?rebuild=1 -> { ok: true }        redraw this era's board now
 *   POST <json row> -> { ok: true }        add one run, then redraw
 *
 * THE TABS:
 *   `runs`                  every run ever posted, append-only, never sorted or
 *                           trimmed. This is the record. The game reads it,
 *                           your history lives in it, and nothing here ever
 *                           rewrites a row of it.
 *   `Pre Release Records`   the board for era 1 — every v1.x time. Live while
 *                           v1 is what people are playing; frozen the moment
 *                           the first v2 run is posted, and the board the
 *                           in-game PRE-RELEASE RECORDS book is made from.
 *   `leaderboard`           the board for era 2. Empty until v2 ships, then the
 *                           live one, rebuilt after every post.
 *
 * Only the era being played is ever written to, and which era that is comes off
 * the log rather than a constant — see "eras" below. Both boards are derived
 * and disposable: delete either and `rebuildBoards` puts it back.
 *
 * A log tab that has been renamed is still read: any tab whose header row opens
 * `date, player, town, level` counts as a log, so renaming `runs` — which makes
 * the next post create a fresh empty one — no longer hides everything that came
 * before it. Only `runs` is written to.
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
               'deaths', 'shards', 'speedrun', 'version', 'time', 'tas'];

var LB_HEADERS = ['level', 'rank', 'time', 'player', 'mode', 'grog',
                  'deaths', 'build', 'date', 'timeMs'];
var TOP_N = 5;
var TAS_TOP_N = 1;

/* ------------------------------------------------------------------- eras
 *
 * v2 changed the levels, so a time set on v1 and a time set on v2 are times on
 * two different games and belong on two different boards. The log keeps both —
 * `runs` is append-only and nothing here ever deletes a row — and the derived
 * tabs are where they part company: one tab per era, and only the era being
 * played is ever rewritten.
 *
 * THE ERA IS THE BUILD'S MAJOR VERSION, which every row has carried since the
 * first one. Nothing had to be added to the schema to say so: 1.8 and 1.17.0
 * are era 1, 2.0.0 is era 2, and a row with no build at all is old by
 * definition.
 *
 * WHICH ERA IS BEING PLAYED IS READ OFF THE LOG, not set here. It is the
 * highest era anyone has posted a run on, so the day the first v2 time lands,
 * the v2 tab starts filling and the v1 tab freezes exactly as it stood — with
 * no constant to bump, no function to run, and nothing to redeploy at the
 * release. It only ever goes up: a straggler still playing v1 after the
 * release adds to the log and changes no board.
 *
 * An era with no tab named here gets one of its own rather than borrowing
 * somebody else's, so v3 cannot land on top of the v2 board.
 */
var ERA_SHEET = {
  1: 'Pre Release Records',   // every v1.x run — the board the book is made from
  2: 'leaderboard'            // v2.x, live from the moment the first v2 run lands
};
function eraSheetName_(n) { return ERA_SHEET[n] || ('leaderboard v' + n); }

/** Which era a row belongs to: the major version of the build it was set on. */
function era_(version) {
  var n = parseInt(String(version || '').replace(/^v/, ''), 10);
  return isNaN(n) ? 1 : n;
}

/** The era being played: the highest anyone has posted a run on. */
function currentEra_(runs) {
  var top = 1;
  for (var i = 0; i < runs.length; i++) top = Math.max(top, era_(runs[i].version));
  return top;
}

/* The game marks a tool-assisted row twice — the `tas` column, and this on the
 * end of the build string. The second copy is what survives a sheet whose
 * script is older than the column: that script builds its row from a fixed list
 * of fields and drops anything it does not know, so without a marker in a
 * column it does write, a frame-stepped time arrives looking played. */
var TAS_MARK = '+tas';

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
  ['full-game',            'Drunken Speedrun (whole game, shards)'],
  ['full-game-any',        'Drunken Speedrun (whole game, Any%)'],
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
    // A sheet trimmed to exactly the old column count has nowhere to put the
    // new one, and every read would throw. Make room before writing.
    var max = sh.getMaxColumns();
    if (max < HEADERS.length) sh.insertColumnsAfter(max, HEADERS.length - max);
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

/**
 * Every tab that is a run log: `runs` first, then any other tab whose header
 * row opens with the same four columns.
 *
 * There is normally exactly one, and reading by shape would be a pointless
 * generalisation — except that a log is easy to lose by accident. Rename the
 * `runs` tab, for any good reason, and the next posted run finds no tab by that
 * name, makes a fresh empty one, and the board starts again from nothing: every
 * old row is still in the sheet, sitting in a tab that nothing reads any more.
 * That is exactly what happened to this one, and the history came back the
 * moment the script stopped going by name alone.
 *
 * Only `runs` is ever written to. The rest are read.
 */
function logSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [sheet_()];                          // creates `runs` if it is gone
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    var sh = all[i];
    if (sh.getSheetName() === SHEET_NAME) continue;
    if (sh.getLastRow() < 2 || sh.getLastColumn() < 4) continue;
    var head = sh.getRange(1, 1, 1, 4).getValues()[0];
    var isLog = true;
    for (var c = 0; c < 4 && isLog; c++) {
      if (String(head[c]).toLowerCase().replace(/\s+/g, '') !== HEADERS[c]) isLog = false;
    }
    if (isLog) out.push(sh);
  }
  return out;
}

/** Every run in every log, as objects. Shared by doGet and the rebuild. */
function readRuns_() {
  var logs = logSheets_();
  var rows = [], seen = {};
  for (var s = 0; s < logs.length; s++) readLog_(logs[s], rows, seen);
  // Back into the order they were run in, so ?board=1 still reads as a log
  // rather than as one tab followed by another.
  rows.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  return rows;
}

/** Add one log tab's runs to `rows`, skipping any already seen. */
function readLog_(sh, rows, seen) {
  var last = sh.getLastRow();
  if (last < 2) return;
  // An archived tab can be narrower than this script's column list — it was
  // written before a column existed. Read what is there; the rest comes back
  // undefined and falls through to the same defaults as an empty cell.
  var wide = Math.min(HEADERS.length, sh.getLastColumn());
  var values = sh.getRange(2, 1, last - 1, wide).getValues();
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    if (!v[3]) continue;                         // no level id, not a run
    // A tool-assisted row says so twice: in the `tas` column, and with a
    // marker on the build string. The second copy is what makes a time posted
    // to a sheet running an older script still read as tool-assisted — that
    // script dropped the unknown column, but it wrote the build. The marker is
    // stripped here so the tab shows a clean version.
    var version = String(v[9] || '');
    var marked = version.indexOf(TAS_MARK) >= 0;
    if (marked) version = version.split(TAS_MARK).join('');
    var row = {
      date: String(v[0]),
      player: String(v[1]),
      town: String(v[2]),
      level: String(v[3]),
      timeMs: Number(v[4]) || 0,
      grog: Number(v[5]) || 0,
      deaths: Number(v[6]) || 0,
      shards: Number(v[7]) || 0,
      speedrun: v[8] === true || String(v[8]).toLowerCase() === 'true',
      version: version,
      time: String(v[10] || ''),
      tas: marked || v[11] === true || String(v[11]).toLowerCase() === 'true'
    };
    // Two tabs can hold the same run — a log copied rather than renamed is the
    // usual way. A run is one player finishing one level at one instant, so
    // that is the key, and a duplicate of it is not a second run.
    var key = row.date + '|' + row.player + '|' + row.level + '|' + row.timeMs;
    if (seen[key]) continue;
    seen[key] = 1;
    rows.push(row);
  }
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
      String(body.time || '').slice(0, 16),
      body.tas === true
    ]);
    rebuildLeaderboard_();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// =========================================================== leaderboard tab

/** The derived tab for one era, created on demand. */
function lbSheet_(n) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = eraSheetName_(n);
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/**
 * Redraw the board for the era being played: the top five runs on every level,
 * and on the whole-game speedrun, in play order.
 *
 * The whole tab is cleared and rewritten rather than patched. It is derived
 * data — there is nothing in it worth preserving, and a full rewrite cannot
 * drift out of step with the log the way an incremental update can.
 *
 * Only this era's tab is touched. Every earlier one keeps whatever it held the
 * last time its era was the one being played, which is what makes it an
 * archive rather than a second copy of the same board.
 */
function rebuildLeaderboard_() {
  var all = readRuns_();
  var eraNow = currentEra_(all);

  var runs = [];
  for (var e = 0; e < all.length; e++) {
    if (era_(all[e].version) === eraNow) runs.push(all[e]);
  }

  // Tool-assisted times are split off into their own section at the bottom.
  // A frame-stepped run would sit on top of every level's top five for reasons
  // that have nothing to do with how well anyone played, and the board people
  // actually run against would stop being worth reading.
  var byLevel = {}, tasLevel = {};
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i];
    var into = r.tas ? tasLevel : byLevel;
    (into[r.level] = into[r.level] || []).push(r);
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

  // ---- the TAS section, under everything else -----------------------------
  var tasRows = [];
  for (var q = 0; q < order.length; q++) {
    var tid = order[q][0], tlabel = order[q][1];
    var tlist = tasLevel[tid];
    if (!tlist || !tlist.length) continue;
    tlist.sort(function (a, b) {
      return (a.timeMs - b.timeMs) || String(a.date).localeCompare(String(b.date));
    });
    // One row per level: the record, and nothing else. There is exactly one
    // interesting tool-assisted time on a level — the fastest anyone has proved
    // possible — and a list of near-misses under it is noise.
    var tn = Math.min(TAS_TOP_N, tlist.length);
    for (var tp = 0; tp < tn; tp++) {
      var te = tlist[tp];
      tasRows.push([
        tlabel, tp + 1, te.time || clock_(te.timeMs), te.player, 'TAS',
        te.grog, te.deaths, te.version ? 'v' + te.version : '',
        String(te.date).slice(0, 10), te.timeMs
      ]);
    }
  }
  if (tasRows.length) {
    out.push(['', '', '', '', '', '', '', '', '', '']);
    out.push(['TAS RECORDS — tool-assisted, set frame by frame in practice mode',
              '', '', '', '', '', '', '', '', '']);
    for (var tr = 0; tr < tasRows.length; tr++) out.push(tasRows[tr]);
  }

  var sh = lbSheet_(eraNow);
  sh.clear();
  sh.getRange(1, 1, out.length, LB_HEADERS.length).setValues(out);
  sh.setFrozenRows(1);
  return { era: eraNow, sheet: eraSheetName_(eraNow), rows: out.length - 1 };
}

/**
 * Run this by hand from the Apps Script editor to fill the board in
 * immediately, rather than waiting for the next run to be posted. Select it in
 * the function dropdown and press Run.
 */
function rebuildLeaderboard() {
  var r = rebuildLeaderboard_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    r.rows + ' rows written to "' + r.sheet + '" (era ' + r.era + ').');
}

/**
 * ONCE, after the tabs have been renamed by hand. Redraws the board for the era
 * being played and empties the tab waiting for the next one, so nothing is left
 * over from before the rename.
 *
 * The waiting tab is emptied, not deleted: a tab with its header row and
 * nothing under it reads as a board nobody has set a time on yet, which is what
 * it is. Deleting it would only mean the first run of the new era had to make
 * it again.
 *
 * `runs` is untouched. Every row ever posted stays in the log.
 */
function rebuildBoards() {
  var r = rebuildLeaderboard_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var emptied = [];
  for (var k in ERA_SHEET) {
    if (Number(k) <= r.era) continue;                  // this era's, or archived
    var sh = ss.getSheetByName(ERA_SHEET[k]);
    if (!sh || sh.getLastRow() < 2) continue;          // already empty or absent
    sh.clear();
    sh.getRange(1, 1, 1, LB_HEADERS.length).setValues([LB_HEADERS]);
    sh.setFrozenRows(1);
    emptied.push(ERA_SHEET[k]);
  }
  ss.toast(r.rows + ' rows on "' + r.sheet + '" (era ' + r.era + ')' +
           (emptied.length ? '; emptied "' + emptied.join('", "') + '" for the next one.'
                           : '.'));
}
