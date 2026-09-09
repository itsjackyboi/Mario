#!/usr/bin/env node
/* bundle.js — the whole game as one HTML file.
 *
 *   node tools/bundle.js [out.html] [--title="Name in the tab"] [--dev]
 *
 * Reads index.html, inlines every local stylesheet and script in the order the
 * page loads them, and writes a single self-contained page. Nothing is
 * compiled, bundled in the npm sense, or minified: the scripts are concatenated
 * exactly as written, in exactly the order the tags give, because that order is
 * the dependency graph and there is no module system to work it out for us.
 *
 * It exists so the game can be handed to somebody as one file — a preview link,
 * an artifact, an email attachment — while the real thing stays a directory of
 * plain files you can open, read and edit one at a time. The bundle is an
 * output, never a source: nothing in the repo is generated from it, and it is
 * rebuilt from scratch every time.
 *
 * --dev ALSO UNLOCKS EVERYTHING: every level playable from the first screen,
 * every shelf in the Beer Bank owned, and a purse that will not run out. It is
 * a build for walking the game end to end without playing it end to end first,
 * and it is deliberately loud about being one — the title screen says DEV
 * BUILD, so a dev bundle cannot be mistaken for a real one or handed to a
 * player by accident. Times set in it are meaningless and the board is off, so
 * nothing it produces can reach anybody else.
 *
 * THE SHARED BOARD IS SWITCHED OFF in the bundle. A preview build has no
 * business posting times to the live sheet, a page served from somewhere else
 * usually cannot reach it anyway, and a board that half-works is worse than one
 * that is plainly absent. The bundled page keeps local records only.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var args = process.argv.slice(2).filter(function (a) { return a.indexOf('--') !== 0; });
var out = args[0] || path.join(root, 'dist', 'pintland.html');

/* --title="..." renames the page for one build. A preview handed round on a
 * link wants to say what it is in the tab and the link card; the game in the
 * repo keeps its own name. */
var title = (process.argv.slice(2).filter(function (a) {
  return a.indexOf('--title=') === 0;
})[0] || '').slice(8).replace(/^"|"$/g, '');

var dev = process.argv.slice(2).indexOf('--dev') >= 0;

var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function read(rel) {
  return fs.readFileSync(path.join(root, rel.split('?')[0]), 'utf8');
}

/* A local URL is one with no scheme and no leading slash — everything this
 * project ships. Anything else is left exactly as it is. */
function isLocal(url) {
  return url && !/^[a-z]+:/i.test(url) && url.indexOf('//') !== 0;
}

var scripts = 0, styles = 0;

html = html.replace(/<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  function (tag, href) {
    if (!isLocal(href)) return tag;
    styles++;
    return '<style>\n' + read(href) + '</style>';
  });

html = html.replace(/<script src="([^"]+)"><\/script>/g, function (tag, src) {
  if (!isLocal(src)) return tag;
  scripts++;
  var code = read(src);
  // config.js is the one file the bundle rewrites rather than copies.
  if (/config\.js/.test(src)) {
    code = code.replace(/leaderboardUrl:\s*'[^']*'/, "leaderboardUrl: ''");
  }
  return '<script>\n/* ---- ' + src.split('?')[0] + ' ---- */\n' + code + '</script>';
});

/* The dev patch goes in last, after main.js has booted, because everything it
 * replaces is read live rather than captured at start-up. It only ever widens
 * access — no level, item or record is changed, so a dev build plays the same
 * game as a real one, just with all of it open. */
var DEV_PATCH = [
  '<script>',
  '/* ---- dev build: nothing is locked ---- */',
  '(function (PL) {',
  "  'use strict';",
  '  PL.DEV = true;',
  '  // Every level open from the first screen, and no red note explaining why',
  '  // one is not.',
  '  PL.Towns.isUnlocked = function () { return true; };',
  '  PL.Towns.unlockNote = function () { return \'\'; };',
  '  // Every shelf in the Beer Bank owned, and a purse that stays full.',
  '  PL.Store.owns = function () { return true; };',
  '  var bank = PL.Store.bank;',
  '  PL.Store.bank = function () {',
  '    var b = bank.apply(PL.Store, arguments);',
  '    b.grog = Math.max(b.grog | 0, 99999);',
  '    return b;',
  '  };',
  '  // Say so, on the screen everybody sees first.',
  '  if (PL.TitleScene) {',
  '    var draw = PL.TitleScene.prototype.draw;',
  '    PL.TitleScene.prototype.draw = function (ctx) {',
  '      draw.apply(this, arguments);',
  '      PL.gfx.text(ctx, \'DEV BUILD — everything unlocked, times mean nothing\',',
  '        PL.VIEW_W / 2, 12,',
  '        { font: PL.FONT.tiny, align: \'center\', color: PL.C.coral });',
  '    };',
  '  }',
  '}(window.PL));',
  '</script>'
].join('\n');

if (dev) html = html.replace('</body>', DEV_PATCH + '\n</body>');

if (title) html = html.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');

var stamp = (read('src/game.js').match(/PL\.VERSION = '([^']+)'/) || [])[1] || '?';
html = html.replace('</head>',
  '<!-- Bundled by tools/bundle.js from v' + stamp + ' on ' +
  new Date().toISOString().slice(0, 10) +
  '. One file: every script inlined in load order, shared board switched off.' +
  (dev ? ' DEV BUILD: nothing is locked.' : '') + ' -->\n</head>');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

var kb = Math.round(fs.statSync(out).size / 1024);
console.log('bundled v' + stamp + (dev ? ' [DEV — nothing locked]' : '') +
            ' — ' + scripts + ' scripts, ' + styles +
            ' stylesheet(s), ' + kb + 'KB -> ' + path.relative(root, out));
if (/<script src="/.test(html) || /rel="stylesheet"/.test(html)) {
  console.log('NOTE: some tags were left external (not local URLs).');
}
