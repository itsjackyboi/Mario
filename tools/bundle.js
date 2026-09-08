#!/usr/bin/env node
/* bundle.js — the whole game as one HTML file.
 *
 *   node tools/bundle.js [out.html] [--title="Name in the tab"]
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

if (title) html = html.replace(/<title>[^<]*<\/title>/, '<title>' + title + '</title>');

var stamp = (read('src/game.js').match(/PL\.VERSION = '([^']+)'/) || [])[1] || '?';
html = html.replace('</head>',
  '<!-- Bundled by tools/bundle.js from v' + stamp + ' on ' +
  new Date().toISOString().slice(0, 10) +
  '. One file: every script inlined in load order, shared board switched off. -->\n</head>');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

var kb = Math.round(fs.statSync(out).size / 1024);
console.log('bundled v' + stamp + ' — ' + scripts + ' scripts, ' + styles +
            ' stylesheet(s), ' + kb + 'KB -> ' + path.relative(root, out));
if (/<script src="/.test(html) || /rel="stylesheet"/.test(html)) {
  console.log('NOTE: some tags were left external (not local URLs).');
}
