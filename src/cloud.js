/* cloud.js — the shared Books of Captains.
 *
 * A Google Sheet, reached through an Apps Script web app: one URL that takes a
 * POST to add a run and answers a GET with every run on the board. There is no
 * server to run and no key to leak — see tools/leaderboard.gs and the README
 * for the ten minutes of setup.
 *
 * THE GAME STILL WORKS WITH NONE OF THIS. `config.js` ships with an empty
 * endpoint, and with no endpoint every call here is a no-op: no requests are
 * made, the leaderboard shows local records only, and the game remains the
 * offline, file://-openable thing it has always been. Everything the cloud adds
 * is on top of the local board, never instead of it — a run is written to
 * localStorage first and posted second, so losing the network loses nothing.
 *
 * A ROW IS:
 *   { player, town, level, timeMs, time, grog, deaths, shards, speedrun, tas,
 *     version, date }
 * `time` is `timeMs` written 00:41.20, so the sheet is readable without doing
 * arithmetic in your head. The raw milliseconds stay alongside it because that
 * is what sorts and charts correctly, and what the game reads back.
 * `version` is PL.VERSION at the time the run was set. It is on every row
 * because the timer and damage rules have changed between builds and a board
 * that silently mixed them would be wrong in a way nobody could see.
 *
 * These times are honour-system. Anything a browser submits can be forged from
 * the console in ten seconds, and the only real fix — replaying and verifying
 * inputs server-side — is far more machinery than a board for friends is worth.
 */
(function (PL) {
  'use strict';

  var QUEUE_KEY = 'pintland-drunken-trials:outbox';
  /* Appended to the build string on a tool-assisted row, so the flag survives a
   * sheet whose script predates the `tas` column. Stripped again on the way in,
   * so nothing downstream ever sees it. */
  var TAS_MARK = '+tas';

  /* The era a row belongs to is the major version of the build it was set on,
   * and the current era is this build's own. It needs no column and no
   * migration: every row ever posted carries its build, so 1.8 and 1.16.0 sort
   * themselves as era 1 the moment 2.0.0 exists. A row with no build at all is
   * old by definition. The sheet's script splits its derived tabs the same way
   * — see tools/leaderboard.gs. */
  function era(version) {
    var n = parseInt(String(version || '').replace(/^v/, ''), 10);
    return isNaN(n) ? 1 : n;
  }
  /* Read at call time, not at load: this file is loaded before game.js, so
   * PL.VERSION does not exist yet while these lines are running. Caching it
   * here would have quietly pinned the era at 1 and let every old row back
   * onto the board. */
  function currentEra() { return era(PL.VERSION); }
  var FRESH_MS = 45000;          // how long a fetched board is considered current
  var MAX_QUEUE = 40;

  function readQueue() {
    try {
      var raw = window.localStorage.getItem(QUEUE_KEY);
      var q = raw ? JSON.parse(raw) : [];
      return q instanceof Array ? q : [];
    } catch (e) { return []; }
  }

  function writeQueue(q) {
    try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); }
    catch (e) { /* full or unavailable — the local board still has the run */ }
  }

  var Cloud = (PL.Cloud = {
    /* Set in config.js. Empty means every call here does nothing. */
    endpoint: '',

    /* 'off' | 'idle' | 'loading' | 'ready' | 'error' */
    state: 'off',
    error: '',
    rows: [],
    byLevel: {},
    tasByLevel: {},
    fetchedAt: 0,
    sending: 0,

    enabled: function () { return !!this.endpoint; },

    init: function () {
      this.endpoint = (PL.CONFIG && PL.CONFIG.leaderboardUrl) || '';
      this.state = this.enabled() ? 'idle' : 'off';
    },

    /**
     * Add a run to the board. Written to the outbox first, so a run set with no
     * network is posted the next time the game manages to reach the sheet
     * rather than being lost.
     */
    submit: function (rec) {
      if (!this.enabled()) return;
      var row = {
        player: (PL.Store.playerName() || 'anonymous').slice(0, 24),
        town: rec.town,
        level: rec.level,
        timeMs: Math.round(rec.timeMs),
        time: PL.util.formatClock(rec.timeMs),
        grog: rec.grog | 0,
        deaths: rec.deaths | 0,
        shards: rec.shards | 0,
        speedrun: !!rec.speedrun,
        // Set by TAS mode, and the reason a frame-stepped time can be posted at
        // all: flagged, it lives on its own board instead of drowning the
        // level's.
        tas: !!rec.tas,
        /* The flag goes out TWICE, and the second copy is not redundant.
         *
         * `tas` is a column the sheet only has if its script has been updated,
         * and an older deployment builds its row from a fixed list of fields —
         * so an unknown one is not stored badly, it is dropped silently, and a
         * tool-assisted time lands looking exactly like a played one. The
         * marker on the end of the build string rides in a column every
         * version of the script has always written, so the flag survives
         * whatever is deployed. It is read back off either. */
        version: PL.VERSION + (rec.tas ? TAS_MARK : ''),
        date: new Date().toISOString()
      };
      var q = readQueue();
      q.push(row);
      writeQueue(q);
      this.flush();
    },

    /** Post everything in the outbox, oldest first, dropping what lands. */
    flush: function () {
      if (!this.enabled() || this.sending) return;
      var q = readQueue();
      if (!q.length) return;
      var self = this;
      var row = q[0];
      this.sending = 1;
      // text/plain keeps this a "simple" request, so the browser does not send
      // a CORS preflight — Apps Script does not answer OPTIONS.
      window.fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(row)
      }).then(function () {
        var left = readQueue();
        left.shift();
        writeQueue(left);
        self.sending = 0;
        self.fetchedAt = 0;          // the board has moved on
        if (left.length) self.flush();
      })['catch'](function () {
        self.sending = 0;            // stays in the outbox for next time
      });
    },

    /** Pull the whole board. Cheap enough to hold in memory and index once. */
    load: function (force) {
      if (!this.enabled()) return;
      if (this.state === 'loading') return;
      if (!force && this.state === 'ready' && Date.now() - this.fetchedAt < FRESH_MS) return;
      var self = this;
      this.state = 'loading';
      window.fetch(this.endpoint + '?board=1', { method: 'GET' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          self.rows = (data && data.rows) || [];
          self.index();
          // The split board may have been comparing against a stale copy of
          // this, or against nothing at all.
          if (PL.Speedrun) PL.Speedrun.invalidate();
          // Keep the pre-release archive's safety copy current until the day it
          // is frozen. No-op after that.
          if (PL.Archive) PL.Archive.remember(self.rows);
          self.state = 'ready';
          self.error = '';
          self.fetchedAt = Date.now();
          self.flush();
        })['catch'](function (e) {
          self.state = 'error';
          self.error = (e && e.message) || 'could not reach the board';
        });
    },

    /**
     * Group by level and sort each group by time. Ties break on the earlier
     * date.
     *
     * TAS rows are indexed apart from everything else. A tool-assisted time is
     * a real answer to "how fast can this level go" and a meaningless answer to
     * "how fast can it be played", so it gets its own board rather than the top
     * of the human one — a frame-stepped 19.84 sitting above everybody would
     * make the level's board useless to the people running it.
     */
    index: function () {
      var by = {}, tas = {};
      for (var i = 0; i < this.rows.length; i++) {
        var r = this.rows[i];
        if (!r || !r.level) continue;
        // Only this era's runs. v2 changed the levels, so a v1 time is a time
        // on a different game — it is kept in the sheet's log and shown on the
        // pre-release board, and it does not belong in a ranking anyone is
        // still racing. The era is the build's major version, which every row
        // has always carried, so nothing had to be added to say so.
        if (era(r.version) < currentEra()) continue;
        r.timeMs = Number(r.timeMs) || 0;
        r.speedrun = r.speedrun === true || r.speedrun === 'true' || r.speedrun === 1;
        // Either signal counts, and the marker is taken off the build string
        // here so no screen ever has to know it was there.
        r.version = String(r.version == null ? '' : r.version);
        var marked = r.version.indexOf(TAS_MARK) >= 0;
        if (marked) r.version = r.version.split(TAS_MARK).join('');
        r.tas = marked || r.tas === true || r.tas === 'true' || r.tas === 1;
        var into = r.tas ? tas : by;
        (into[r.level] = into[r.level] || []).push(r);
      }
      function order(group) {
        for (var k in group) {
          group[k].sort(function (a, b) {
            return (a.timeMs - b.timeMs) || String(a.date).localeCompare(String(b.date));
          });
        }
      }
      order(by);
      order(tas);
      this.byLevel = by;
      this.tasByLevel = tas;
    },

    /** Every submitted run for one level, best first. Never TAS rows. */
    runsFor: function (townId, levelId) {
      return this.byLevel[levelId] || [];
    },

    /** The TAS board for one level, best first. */
    tasFor: function (levelId) {
      return (this.tasByLevel && this.tasByLevel[levelId]) || [];
    },

    /**
     * The fastest posted time on a level in ms, or 0. `kind` narrows it to
     * 'level' or 'speedrun' the same way the local board does — see
     * PL.Store.bestFor for why those are two different records.
     */
    bestMs: function (levelId, kind) {
      var rows = this.byLevel && this.byLevel[levelId];
      if (!rows || !rows.length) return 0;
      if (!kind || kind === 'any') return rows[0].timeMs || 0;
      var want = kind === 'speedrun';
      for (var i = 0; i < rows.length; i++) {
        if (!!rows[i].speedrun === want && rows[i].timeMs) return rows[i].timeMs;
      }
      return 0;
    },

    /** How many runs are waiting to be posted. */
    pending: function () { return readQueue().length; },

    /** One line describing where the board stands, for the leaderboard header. */
    status: function () {
      if (!this.enabled()) return 'Shared board not configured — see the README.';
      if (this.state === 'loading') return 'Fetching the shared board…';
      if (this.state === 'error') return 'Shared board unreachable: ' + this.error;
      if (this.state === 'ready') {
        var n = this.pending();
        return this.rows.length + ' runs on the shared board' +
               (n ? '  ·  ' + n + ' of yours still to send' : '');
      }
      return 'Shared board ready to load.';
    }
  });

})(window.PL = window.PL || {});
