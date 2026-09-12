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

var CACHE = 'pintland-v2.2.0';
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

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                       // a run being filed
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // the leaderboard

  var navigating = req.mode === 'navigate';
  e.respondWith(
    caches.match(navigating ? PAGE : req).then(function (hit) {
      var live = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(navigating ? PAGE : req, copy);
          });
        }
        return res;
      })['catch'](function () { return hit; });
      // The page is refreshed in the background so a new build is picked up on
      // the next open; everything else is stamped, so the cache is the truth.
      return hit || live;
    })
  );
});
