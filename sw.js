/* sw.js — the game, kept on the device, so it opens with no network at all.
 *
 * THE CASE THIS EXISTS FOR: load the page once on wifi, get on a plane, play
 * for four hours with the radio off, land, and have the times go up. Two
 * halves, and this is the first one — the page and its seventy-odd scripts
 * have to be on the phone already, because at 35,000 feet there is nobody to
 * ask for them. The second half is the outbox in src/cloud.js, which keeps
 * runs in localStorage until a post succeeds.
 *
 * THE PRECACHE LIST IS READ OUT OF index.html, not written down here. This
 * project has no build step: the script tags in that file ARE the manifest,
 * and any list kept alongside them is a list that will be wrong the first time
 * somebody adds a file. So install fetches index.html, pulls every local
 * src/href out of it, and caches those. One source of truth, and it is the one
 * the browser already uses.
 *
 * WHAT IS NOT CACHED, deliberately:
 *   - anything cross-origin. The leaderboard is an Apps Script URL, and a
 *     cached leaderboard is a WRONG leaderboard. It is left to the network and
 *     allowed to fail, which is what the outbox is for.
 *   - anything that is not a GET. A POST is a run being filed; replaying one
 *     out of a cache would file it twice.
 *
 * CACHE FIRST, because the files are versioned by ?v= in index.html — a new
 * build asks for different URLs, so a stale hit is impossible for anything
 * stamped. index.html itself is the exception and is refreshed in the
 * background, which is how a new build ever gets noticed.
 */
'use strict';

var CACHE = 'pintland-v2.2.5';
var PAGE = './';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return fetch(new Request(PAGE, { cache: 'reload' }))
        .then(function (res) {
          if (!res.ok) throw new Error('index unavailable');
          return cache.put(PAGE, res.clone()).then(function () { return res.text(); });
        })
        .then(function (html) {
          /* Every src= and href= in the page that is not somebody else's
           * server. The ?v= stamps come along as written, so what is cached is
           * exactly what the page will ask for. */
          var urls = [];
          var re = /(?:src|href)\s*=\s*"([^"]+)"/g, m;
          while ((m = re.exec(html))) {
            var u = m[1];
            if (/^(https?:)?\/\//.test(u) || u.indexOf('data:') === 0) continue;
            urls.push(u);
          }
          return Promise.all(urls.map(function (u) {
            // One failure must not take the whole install down with it: a
            // missing file should cost that file, not the entire offline mode.
            return cache.add(u)['catch'](function () {});
          }));
        });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        return n === CACHE ? null : caches['delete'](n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* THE PAGE IS FETCHED FROM THE NETWORK FIRST. Everything else is not.
 *
 * This was the other way round and it was a trap that could not be escaped
 * from. index.html is the one file with no ?v= on it, and it is the file that
 * NAMES the version of everything else — so serving it from the cache first
 * means a browser keeps asking for the old build's scripts for ever, and no
 * amount of refreshing changes anything, because the refresh is answered out
 * of the cache too.
 *
 * It was worse than one stale visit, because the background update that was
 * supposed to fix it was never waited on. `respondWith` settles the moment the
 * cached page is found, and a service worker with nothing left to do may be
 * terminated on the spot — which Safari does eagerly. So the fetch that would
 * have refreshed the cached page was routinely killed before it finished, and
 * the stale page stayed stale. Cache-first plus an update that never lands is
 * a version somebody is stuck on permanently.
 *
 * So: the page comes from the network whenever there is one, and from the
 * cache only when there is not — which is the whole point of the cache and
 * costs one small request per open. Everything else keeps cache-first, because
 * everything else carries a ?v= and a stale hit is impossible: a new build
 * asks for URLs the cache has never heard of.
 */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // a run being filed
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // the leaderboard

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          // waitUntil, not a bare promise: this is the write that keeps the
          // offline copy current, and it has to outlive the response.
          e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(PAGE, copy); }));
        }
        return res;
      })['catch'](function () {
        return caches.match(PAGE).then(function (hit) {
          return hit || new Response('Offline, and this page was never cached.',
                                     { status: 503, headers: { 'Content-Type': 'text/plain' } });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(function (c) { return c.put(req, copy); }));
        }
        return res;
      });
    })
  );
});
