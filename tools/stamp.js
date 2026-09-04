/* stamp.js — put the build number on every asset URL in index.html.
 *
 *   node tools/stamp.js
 *
 * Run it after changing PL.VERSION and before pushing a release. It rewrites
 * every local <script src> and <link href> to carry ?v=<PL.VERSION>, so a new
 * release changes every asset URL and no browser can serve a player a stale
 * copy of a file it fetched last week.
 *
 * WHY THIS AND NOT A BUILD STEP. Nothing here compiles, bundles or minifies:
 * the output is the same plain files with a query string on the tags. The game
 * still opens from file:// (query strings are fine on file:// — checked), still
 * has no dependencies, and someone who never runs this script still gets a
 * working game, just one that caches the old way.
 *
 * The one thing it cannot fix is index.html itself, which has no URL to stamp.
 * GitHub Pages serves HTML with a short max-age, so a stale index resolves on
 * its own within minutes — and the moment it is fetched, every asset it points
 * at is guaranteed fresh, which is the part that was actually biting.
 *
 * Idempotent: an existing ?v= is stripped before the new one goes on, so it is
 * safe to run twice, or on an already-stamped file.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML = path.join(ROOT, 'index.html');
var GAME = path.join(ROOT, 'src', 'game.js');

function version() {
  var src = fs.readFileSync(GAME, 'utf8');
  var m = src.match(/PL\.VERSION\s*=\s*'([^']+)'/);
  if (!m) {
    console.error('Could not find PL.VERSION in src/game.js');
    process.exit(1);
  }
  return m[1];
}

function stamp() {
  var v = version();
  var html = fs.readFileSync(HTML, 'utf8');
  var before = html;
  var touched = 0;

  // Local files only, which here means a plain relative path and nothing else.
  // An absolute URL belongs to somebody else and is not ours to rewrite, and a
  // data: URI has no cache to bust — the inline favicon is one, and appending
  // to it puts "?v=1.2.3" after </svg>, which is a parse error and a lost icon.
  html = html.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"]+)(")/g,
    function (all, head, url, tail) {
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return all;   // any scheme
      if (url.slice(0, 2) === '//' || url.charAt(0) === '#') return all;
      var clean = url.replace(/\?v=[^"&]*$/, '');
      touched++;
      return head + clean + '?v=' + encodeURIComponent(v) + tail;
    });

  if (html === before) {
    console.log('nothing to stamp');
    return;
  }
  fs.writeFileSync(HTML, html);
  console.log('stamped ' + touched + ' asset URLs with v=' + v);
}

stamp();
