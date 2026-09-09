/* archive.js — PRE-RELEASE RECORDS: the board as it stood before v2.
 *
 * Everything on the shared board right now was set on the pre-release game.
 * v2 changes the game, so those times stop being comparable — but they are
 * still the record of who did what first, and losing them would be the one
 * unrecoverable thing in this whole project. So they get a room of their own,
 * reached from the book under the version number on the title screen.
 *
 * IT IS NOT FROZEN YET, and until it is this screen simply follows the live
 * board: always current, nothing to maintain, and a wipe today would empty it
 * along with everything else. The freeze is a deliberate step and it is
 * described in data/prerelease.js, which is the file it writes.
 *
 * The belt-and-braces bit: while it is unfrozen, every load of the shared board
 * is also kept in localStorage. That is per-browser, so it is not the archive —
 * but if the sheet is wiped before anyone freezes it, the last board this
 * browser saw is still here to freeze from, which turns a mistake anyone could
 * make into an inconvenience.
 *
 * This file has behaviour and no data, and data/prerelease.js has data and no
 * behaviour, on purpose: the data file is regenerated and pasted over
 * wholesale, and anything that lived in it would be lost the first time.
 */
(function (PL) {
  'use strict';

  var SNAP_KEY = 'pintland-drunken-trials:prerelease';
  var MAX_ROWS = 4000;

  var HEAD = [
    '/* prerelease.js — the PRE-RELEASE RECORDS, frozen.',
    ' *',
    ' * The shared board as it stood at the end of the pre-release game: the',
    ' * record of who did what first, on a game that no longer exists in this',
    ' * form. Nothing outside this file feeds it — the sheet can be wiped,',
    ' * redeployed or pointed somewhere else and this screen will not move.',
    ' *',
    ' * DATA ONLY, and written by PL.Archive.dump(). Do not hand-edit it:',
    ' * regenerate it, or edit a row and know that the next dump overwrites you.',
    ' */'
  ].join('\n');

  var A = (PL.Archive = {
    byLevel: {},
    tasByLevel: {},
    _built: '',
    _snap: null,
    snappedAt: '',

    /** The frozen data, or an empty stand-in if the file is missing. */
    data: function () {
      return PL.PreRelease || { frozen: false, capturedAt: '', rows: [] };
    },

    frozen: function () {
      var d = this.data();
      return !!d.frozen && !!(d.rows && d.rows.length);
    },

    /** 'frozen' | 'live' | 'snapshot' | 'empty' — where the rows come from. */
    source: function () {
      if (this.frozen()) return 'frozen';
      if (PL.Cloud && PL.Cloud.rows && PL.Cloud.rows.length) return 'live';
      if (this.snapshot().length) return 'snapshot';
      return 'empty';
    },

    /** The rows this screen should show, from the best source it has. */
    all: function () {
      switch (this.source()) {
        case 'frozen': return this.data().rows;
        case 'live': return PL.Cloud.rows;
        case 'snapshot': return this.snapshot();
      }
      return [];
    },

    /** Ask for whatever it needs. No-op once frozen — it needs nothing. */
    load: function () {
      if (!this.frozen() && PL.Cloud) PL.Cloud.load();
    },

    // ------------------------------------------------------------- snapshot

    snapshot: function () {
      if (this._snap) return this._snap;
      try {
        var raw = window.localStorage.getItem(SNAP_KEY);
        var obj = raw ? JSON.parse(raw) : null;
        this._snap = (obj && obj.rows instanceof Array) ? obj.rows : [];
        this.snappedAt = (obj && obj.at) || '';
      } catch (e) { this._snap = []; }
      return this._snap;
    },

    /**
     * Keep a copy of the shared board as it stands. Called every time the board
     * loads, until the archive is frozen — after that the file is the record,
     * and a snapshot would only be a way to disagree with it.
     */
    remember: function (rows) {
      if (this.frozen() || !rows || !rows.length) return;
      try {
        window.localStorage.setItem(SNAP_KEY, JSON.stringify({
          at: new Date().toISOString(),
          rows: rows.slice(0, MAX_ROWS)
        }));
        this._snap = null;
        this._built = '';
      } catch (e) { /* full or unavailable — the live board still shows */ }
    },

    // --------------------------------------------------------------- reading

    /** Group by level, TAS rows apart, exactly as the live board does. */
    index: function () {
      var rows = this.all();
      var key = this.source() + ':' + rows.length;
      if (this._built === key) return;
      var by = {}, tas = {};
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r || !r.level) continue;
        var into = r.tas ? tas : by;
        (into[r.level] = into[r.level] || []).push(r);
      }
      function order(group) {
        for (var k in group) {
          group[k].sort(function (a, b) {
            return ((a.timeMs || 0) - (b.timeMs || 0)) ||
                   String(a.date).localeCompare(String(b.date));
          });
        }
      }
      order(by); order(tas);
      this.byLevel = by;
      this.tasByLevel = tas;
      this._built = key;
    },

    runsFor: function (levelId) { this.index(); return this.byLevel[levelId] || []; },
    tasFor: function (levelId) { this.index(); return this.tasByLevel[levelId] || []; },

    /**
     * One line under the title: how many runs are in the book, and the warning
     * that goes with all of them.
     *
     * Where the rows came from — the frozen file, the live board, this
     * browser's last snapshot — is the badge in the top right, not this line.
     * What a reader actually needs to know here is that these times were set on
     * a build that no longer exists, and that a route one of them used may have
     * been changed or closed since. A time you cannot match because the level
     * moved under it is not a time you should be measuring yourself against.
     */
    status: function () {
      var n = this.all().length;
      if (!n) return 'Nothing here yet — open it once with the shared board reachable.';
      return n + ' run' + (n === 1 ? '' : 's') + '  ·  these runs were completed on an ' +
             'old build of the game, some may be obsolete or unattainable in the ' +
             'current version';
    },

    /**
     * data/prerelease.js with the current rows baked into it, ready to paste
     * back over that file. Run `copy(PL.Archive.dump())` in the console.
     *
     * Only the fields the board actually reads are written out, so the archive
     * does not carry whatever else a future sheet might grow.
     */
    dump: function () {
      var rows = this.all(), body = '[\n';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        body += '    ' + JSON.stringify({
          date: r.date, player: r.player, town: r.town, level: r.level,
          timeMs: r.timeMs, grog: r.grog, deaths: r.deaths, shards: r.shards,
          speedrun: !!r.speedrun, tas: !!r.tas, version: r.version, time: r.time
        }) + (i < rows.length - 1 ? ',' : '') + '\n';
      }
      body += '  ]';
      return HEAD + '\n' +
        'window.PL = window.PL || {};\n' +
        'window.PL.PreRelease = {\n' +
        '  frozen: true,\n' +
        '  capturedAt: ' + JSON.stringify(new Date().toISOString()) + ',\n' +
        '  rows: ' + body + '\n' +
        '};\n';
    }
  });

  return A;

})(window.PL = window.PL || {});
