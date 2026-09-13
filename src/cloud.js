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
  /* Big enough for a flight. A row is about two hundred bytes, so even full
   * this is a few tens of kilobytes of localStorage — and the alternative is
   * that the forty-first level of a long journey silently pushes the first
   * one out of the outbox. */
  var MAX_QUEUE = 120;
  var TIMEOUT_MS = 15000;        // a request that has not answered by now will not
  var RETRY_MS = 60000;          // how often a stuck outbox tries again by itself

  /**
   * WHY THIS IS NOT `r.json()`.
   *
   * `r.json()` on a body that is not JSON throws the browser's own parser
   * message, and that message went straight onto the leaderboard header:
   *
   *     Shared board unreachable: JSON.parse: unexpected character at line 1
   *     column 1 of the JSON data
   *
   * which tells a player nothing except that something inside the game broke.
   * Nothing inside the game had broken. A body starting with `<` is an HTML
   * page, and from this endpoint an HTML page means Google answered instead of
   * the script — a sign-in wall, a quota page, or the script running past its
   * execution limit. That is worth saying in those words.
   *
   * It matters more than the wording, though. `r.json()` was the ONLY thing
   * looking at the reply: the POST that files a run ignored the response
   * entirely and treated any answer at all as success, so a run could be
   * dropped from the outbox on the strength of Google's error page. Reading
   * the body properly is what makes it possible to tell a filed run from a
   * refused one — see flush().
   */
  function parseBody(text) {
    // A byte-order mark ahead of the JSON is legal for the sender and fatal
    // for JSON.parse, and it is invisible in every log you would look at.
    var t = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    t = t.replace(/^\s+|\s+$/g, '');
    if (!t) return { bad: 'the reply was empty' };
    if (t.charAt(0) === '<') return { bad: 'Google answered instead of the sheet' };
    try { return { data: JSON.parse(t) }; }
    catch (e) { return { bad: 'the reply was not a board' }; }
  }

  /**
   * One request, with a deadline, answering in this game's words.
   *
   * `done(data, bad)` — exactly one of them. `bad` is a short phrase that
   * reads correctly after "Shared board unreachable: ".
   *
   * THE DEADLINE IS NOT DECORATION. `load()` refuses to start while one is in
   * flight and `flush()` refuses to send while one is sending, so a request
   * that never settles — a captive portal answering nothing at all, which is
   * every hotel and half the airports — would wedge both for the rest of the
   * session: no board, and an outbox that never empties. AbortController is
   * used where it exists and the timer is the backstop where it does not, so
   * the worst case is one abandoned request rather than a dead feature.
   */
  function send(url, opts, done) {
    if (!window.fetch) { done(null, 'this browser cannot reach it'); return; }
    var settled = false, ctl = null;
    try { if (window.AbortController) ctl = new window.AbortController(); } catch (e) {}
    if (ctl) opts.signal = ctl.signal;
    var timer = window.setTimeout(function () {
      if (settled) return;
      settled = true;
      if (ctl) { try { ctl.abort(); } catch (e2) {} }
      done(null, 'no answer in time');
    }, TIMEOUT_MS);
    function finish(data, bad) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      done(data, bad);
    }
    window.fetch(url, opts).then(function (r) {
      return r.text().then(function (text) {
        if (!r.ok) { finish(null, 'it answered ' + r.status); return; }
        var out = parseBody(text);
        if (out.bad) finish(null, out.bad);
        else finish(out.data, '');
      });
    })['catch'](function () {
      // A rejected fetch is the network, an abort, or CORS. None of those is
      // something a player can act on beyond "you are not online".
      finish(null, 'no route to it');
    });
  }

  function readQueue() {
    try {
      var raw = window.localStorage.getItem(QUEUE_KEY);
      var q = raw ? JSON.parse(raw) : [];
      return q instanceof Array ? q : [];
    } catch (e) { return []; }
  }

  /* How many times a row may be refused before it is given up on. */
  var REFUSE_LIMIT = 5;

  /**
   * The row as the sheet should see it.
   *
   * `refused` is the outbox's own bookkeeping — how many times this row has
   * been turned away — and it has no business being written into a column of
   * somebody's spreadsheet.
   */
  function payload(row) {
    var out = {}, k;
    for (k in row) if (k !== 'refused') out[k] = row[k];
    return out;
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
    /* Rows from THIS era only — what the boards below actually show. `rows`
     * holds everything the sheet sent back, v1 times included, because the
     * archive still wants them; this is the number a player is looking at. */
    eraRows: 0,
    fetchedAt: 0,
    sending: 0,
    /* The outbox's own state, kept apart from the board's. Fetching the board
     * and filing a run fail for different reasons and at different times, and
     * a player whose runs are stacking up needs to be told that whether or not
     * the board itself happens to be readable. */
    tries: 0,
    retryAt: 0,
    sendError: '',

    enabled: function () { return !!this.endpoint; },

    init: function () {
      this.endpoint = (PL.CONFIG && PL.CONFIG.leaderboardUrl) || '';
      this.state = this.enabled() ? 'idle' : 'off';

      /* THE FLIGHT CASE. Runs set with no network go into the outbox in
       * localStorage and stay there — that part always worked. What did not is
       * that the outbox was only ever emptied by submit(), so the times from a
       * whole flight sat there until you happened to finish one more level
       * after landing. Now the outbox is pushed the moment the browser says
       * the network is back, and again on every load, so opening the game on
       * the airport wifi is enough.
       *
       * navigator.onLine is famously only half-trustworthy — it reports a
       * connection, not a route to anything in particular — which is exactly
       * why the queue survives a failed post rather than emptying optimistically.
       * A false alarm costs one request that fails and changes nothing. */
      var self = this;
      if (this.enabled()) {
        window.addEventListener('online', function () {
          /* Coming back is the one moment worth forgetting a backoff for: the
           * wait was for a network that has just arrived. The board is marked
           * stale too, so whatever screen is opened next fetches rather than
           * showing what was true before the flight. */
          self.tries = 0;
          self.retryAt = 0;
          self.fetchedAt = 0;
          self.flush();
        });
        /* AND A HEARTBEAT, because `online` is not enough on its own. It fires
         * on a transition, and the interesting case has no transition in it:
         * the game was already open and "online" when a post failed, which is
         * every sheet hiccup and every quota minute. Without this the run sat
         * in the outbox until the player happened to finish another level.
         * One call a minute that returns immediately when the queue is empty.
         */
        window.setInterval(function () { self.flush(); }, RETRY_MS);
        this.flush();
      }
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

    /**
     * Post the outbox, oldest first, dropping each row ONLY once the sheet has
     * said it has it.
     *
     * THIS USED TO DROP A RUN ON ANY ANSWER AT ALL. The old version ignored
     * the response — `.then(function () { left.shift(); })` — so a 500, a
     * quota page, a sign-in wall, anything that was not an outright network
     * failure, deleted the run from the outbox as if it had been filed. The
     * run was gone: not on the sheet, not in the queue, and nothing anywhere
     * said so. That is the whole reason this function is now twenty lines
     * instead of eight.
     *
     * There are three answers and they are not the same:
     *
     *   FILED — valid JSON that is not a refusal. The row goes.
     *
     *   REFUSED — valid JSON saying `ok: false`. The sheet read the row and
     *     said no. It goes to the BACK of the queue rather than being deleted,
     *     and is only given up on after five refusals.
     *
     *     Both halves of that matter. It cannot stay at the head, or one row
     *     the sheet will never accept blocks every run behind it for ever. It
     *     must not be deleted on the first no either, because `ok: false` is
     *     not always permanent: an older deployment answers every internal
     *     error that way, including ones that had nothing to do with the row,
     *     and the sheet says it exactly once when two people finish a level at
     *     the same instant and one of them loses the lock. Five tries is the
     *     difference between "this row is malformed" and "ask again later",
     *     and costs four requests to find out. A deployment that knows the
     *     difference says `retry: true`, and then it is not counted at all.
     *
     *   NOT ANSWERED — no network, a timeout, an HTML page, a 5xx. Nothing is
     *     known about whether the sheet has it. The row stays and the next
     *     attempt backs off, because hammering a service that is failing is
     *     how a temporary failure becomes a quota ban.
     *
     * A row re-sent after an answer went missing is not a duplicate on the
     * board: a run is keyed by its own timestamp, which is generated once when
     * it is queued and does not change on a retry, and the sheet collapses
     * repeats of that key when it reads the log back.
     */
    flush: function () {
      if (!this.enabled() || this.sending) return;
      if (Date.now() < this.retryAt) return;
      var q = readQueue();
      if (!q.length) return;
      var self = this;
      var row = q[0];
      this.sending = 1;
      // text/plain keeps this a "simple" request, so the browser does not send
      // a CORS preflight — Apps Script does not answer OPTIONS.
      send(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload(row))
      }, function (data, bad) {
        self.sending = 0;
        if (bad) {
          self.tries++;
          self.sendError = bad;
          // 15s, 30s, 60s, 60s… far enough apart to be polite, close enough
          // that landing and opening the game posts the flight.
          self.retryAt = Date.now() + Math.min(RETRY_MS, 15000 * self.tries);
          return;
        }
        self.tries = 0;
        self.retryAt = 0;
        var left = readQueue();
        var head = left.shift();
        var refusal = data && data.ok === false;
        if (refusal && data.retry !== true) {
          var n = ((head && head.refused) || 0) + 1;
          self.sendError = 'a run was refused: ' + (data.error || 'no reason given');
          if (n < REFUSE_LIMIT && head) { head.refused = n; left.push(head); }
        } else if (refusal) {
          // The sheet said "not now" rather than "no". Straight back in line.
          self.sendError = String(data.error || 'the sheet was busy');
          if (head) left.unshift(head);
          self.retryAt = Date.now() + 15000;
        } else {
          self.sendError = '';
        }
        writeQueue(left);
        self.fetchedAt = 0;          // the board has moved on
        if (left.length && !refusal) self.flush();
      });
    },

    /** Pull the whole board. Cheap enough to hold in memory and index once. */
    load: function (force) {
      if (!this.enabled()) return;
      if (this.state === 'loading') return;
      if (!force && this.state === 'ready' && Date.now() - this.fetchedAt < FRESH_MS) return;
      var self = this;
      this.state = 'loading';
      send(this.endpoint + '?board=1', { method: 'GET' }, function (data, bad) {
        if (bad) { self.state = 'error'; self.error = bad; return; }
        /* The script answers its own failures in JSON rather than falling over
         * — `{ rows: [], error: '...' }` — and an empty board that came with a
         * reason attached is not an empty board. Taking it as one would put
         * "No runs on the board yet" over a sheet that is simply broken. */
        var rows = data && data.rows;
        if (!(rows instanceof Array)) {
          self.state = 'error';
          self.error = (data && data.error) ? String(data.error).slice(0, 80)
                                            : 'the reply had no board in it';
          return;
        }
        if (data.error && !rows.length) {
          self.state = 'error';
          self.error = String(data.error).slice(0, 80);
          return;
        }
        self.rows = rows;
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
      var by = {}, tas = {}, kept = 0;
      for (var i = 0; i < this.rows.length; i++) {
        var r = this.rows[i];
        if (!r || !r.level) continue;
        // Only this era's runs. v2 changed the levels, so a v1 time is a time
        // on a different game — it is kept in the sheet's log and shown on the
        // pre-release board, and it does not belong in a ranking anyone is
        // still racing. The era is the build's major version, which every row
        // has always carried, so nothing had to be added to say so.
        if (era(r.version) < currentEra()) continue;
        kept++;
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
      this.eraRows = kept;
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

    /**
     * One line describing where the board stands, for the leaderboard header.
     *
     * THE OUTBOX IS ON EVERY LINE, not only the happy one. Runs waiting to be
     * sent used to be mentioned only when the board had loaded — so the state
     * where it matters most, the board being unreachable, was exactly the
     * state that hid it. Somebody with four times stuck on their machine could
     * read this line and have no idea they were there.
     */
    status: function () {
      if (!this.enabled()) return 'Shared board not configured — see the README.';
      /* Short, because this line is drawn beside the board tabs and a long one
       * runs under them — and because the fact is the whole message. Nothing
       * is lost while it says this: a waiting run is on the machine and stays
       * there until the sheet takes it. */
      var n = this.pending();
      var mine = n ? '  ·  ' + n + (n === 1 ? ' run' : ' runs') + ' waiting to send' : '';
      if (this.state === 'loading') return 'Fetching the shared board…' + mine;
      if (this.state === 'error') return 'Shared board unreachable: ' + this.error + mine;
      if (this.state === 'ready') {
        /* This era's runs, not every row in the sheet. v2 changed the levels,
         * so a v1 time is a time on a different game: it is kept in the log
         * and shown on the pre-release board, and it is not something anyone
         * is still racing. Counting all 601 of them under a board showing
         * none of them was the headline disagreeing with the table under it. */
        var head = this.eraRows
          ? this.eraRows + (this.eraRows === 1 ? ' run' : ' runs') + ' on the shared board'
          : 'No runs on the board yet — v2 starts clean.';
        // A refusal is the one thing worth saying over the count: it means a
        // run is gone rather than waiting.
        if (this.sendError && this.sendError.indexOf('refused') === 0) {
          return head + '  ·  ' + this.sendError;
        }
        return head + mine;
      }
      return 'Shared board ready to load.' + mine;
    }
  });

})(window.PL = window.PL || {});
