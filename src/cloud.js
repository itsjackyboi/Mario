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
 *   { player, town, level, timeMs, grog, deaths, shards, speedrun, version,
 *     date }
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
        grog: rec.grog | 0,
        deaths: rec.deaths | 0,
        shards: rec.shards | 0,
        speedrun: !!rec.speedrun,
        version: PL.VERSION,
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
          self.state = 'ready';
          self.error = '';
          self.fetchedAt = Date.now();
          self.flush();
        })['catch'](function (e) {
          self.state = 'error';
          self.error = (e && e.message) || 'could not reach the board';
        });
    },

    /** Group by level and sort each group by time. Ties break on the earlier date. */
    index: function () {
      var by = {};
      for (var i = 0; i < this.rows.length; i++) {
        var r = this.rows[i];
        if (!r || !r.level) continue;
        r.timeMs = Number(r.timeMs) || 0;
        r.speedrun = r.speedrun === true || r.speedrun === 'true' || r.speedrun === 1;
        (by[r.level] = by[r.level] || []).push(r);
      }
      for (var k in by) {
        by[k].sort(function (a, b) {
          return (a.timeMs - b.timeMs) || String(a.date).localeCompare(String(b.date));
        });
      }
      this.byLevel = by;
    },

    /** Every submitted run for one level, best first. */
    runsFor: function (townId, levelId) {
      return this.byLevel[levelId] || [];
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
