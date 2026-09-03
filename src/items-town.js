/* items-town.js — the town-specific items.
 *
 * Three per area, each one only found in its own town and each one a different
 * verb. They are all built from the same table: a glyph, a look, and either a
 * timed buff (`buff` + `secs`, read anywhere via `player.has(name)`) or a
 * carried single-use item (`carry`, spent with the ITEM key).
 *
 * Each area's third item answers that area's own hazard, which is why the
 * effects do not overlap: Shanty Town's boards stop dropping, Aleforge's kegs
 * burst on you, Providence's Order stands still, Fenwick's phantom footing
 * holds without a light, Roto's wretches stay under, the Block lets you take a
 * beating on an empty purse, and the Tavern pours you a spare life.
 *
 * Adding one is a single entry here — level.js reads the glyph table straight
 * off `PL.TownItems`, so its MARKERS map never needs editing for an item.
 *
 * Everything is pulled from the lore: Old Salty's tobacco, the Windsunk
 * Council's colours law, the Wolendi wind farm's bellows trade, the Fortunate
 * Scarab and Glyph of Purity relics, Fenwick's spiritweed, Goldcoral Inc's
 * chits, Stormveil's sky ship the Albatross, the two Owe Block gangs, and the
 * Pour Eternal brewed from the Leviathan Sackbeard killed.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE, C = PL.C, E = PL.Entity;

  // Each `draw` paints into a size-s box at (x, y) so the world sprite and the
  // HUD icon are the same artwork.
  var ITEMS = [

    // ---------------------------------------------------------- Shanty Town
    {
      type: 'pipe', glyph: 'P', area: 'shantytown',
      name: "OLD SALTY'S PIPE", hud: 'PIPE',
      buff: 'pipe', secs: 10, colour: '#c9a24a',
      blurb: 'anything that touches you goes over',
      draw: function (ctx, x, y, s, t) {
        ctx.strokeStyle = '#5a3a1e';
        ctx.lineWidth = s * 0.13;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.10, y + s * 0.42);
        ctx.lineTo(x + s * 0.62, y + s * 0.42);
        ctx.quadraticCurveTo(x + s * 0.86, y + s * 0.46, x + s * 0.84, y + s * 0.76);
        ctx.stroke();
        PL.gfx.rect(ctx, x + s * 0.04, y + s * 0.26, s * 0.24, s * 0.24, '#7a4a2c');
        ctx.fillStyle = '#ff8b42';
        ctx.fillRect(x + s * 0.09, y + s * 0.28, s * 0.14, s * 0.08);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#d8c69c';
        for (var i = 0; i < 3; i++) {
          ctx.fillRect(x + s * 0.14 + Math.sin(t * 3 + i) * s * 0.1,
                       y + s * 0.18 - i * s * 0.13, s * 0.1, s * 0.07);
        }
        ctx.globalAlpha = 1;
      }
    },
    {
      type: 'colours', glyph: 'A', area: 'shantytown',
      name: 'WINDSUNK COLOURS', hud: 'COLOURS',
      carry: 'colours', colour: '#d4574e',
      blurb: 'plant your own flag anywhere',
      draw: function (ctx, x, y, s, t) {
        PL.gfx.rect(ctx, x + s * 0.16, y, s * 0.1, s, '#7a5130');
        ctx.fillStyle = '#d4574e';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.26, y + s * 0.06);
        ctx.lineTo(x + s * 0.94, y + s * 0.12 + Math.sin(t * 5) * s * 0.06);
        ctx.lineTo(x + s * 0.26, y + s * 0.52);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2e3c4';
        ctx.fillRect(x + s * 0.44, y + s * 0.18, s * 0.16, s * 0.13);
      }
    },

    {
      type: 'whistle', glyph: 'r', area: 'shantytown',
      name: 'WINDSUNK WHISTLE', hud: 'WHISTLE',
      buff: 'whistle', secs: 10, colour: '#cfd8dd',
      blurb: 'the crews turn and run',
      draw: function (ctx, x, y, s, t) {
        ctx.fillStyle = '#b8bec4';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.06, y + s * 0.34);
        ctx.lineTo(x + s * 0.62, y + s * 0.28);
        ctx.quadraticCurveTo(x + s * 0.9, y + s * 0.5, x + s * 0.62, y + s * 0.72);
        ctx.lineTo(x + s * 0.06, y + s * 0.66);
        ctx.closePath(); ctx.fill();
        PL.gfx.rect(ctx, x + s * 0.02, y + s * 0.3, s * 0.1, s * 0.4, '#7d848a');
        ctx.fillStyle = '#5a4436';
        ctx.fillRect(x + s * 0.3, y + s * 0.26, s * 0.06, s * 0.08);
        // the note, going out
        ctx.strokeStyle = '#cfd8dd';
        ctx.lineWidth = Math.max(1, s * 0.05);
        for (var i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.7 - i * 0.2;
          var r = s * (0.2 + ((t * 1.4 + i * 0.33) % 1) * 0.4);
          ctx.beginPath();
          ctx.arc(x + s * 0.72, y + s * 0.5, r, -0.9, 0.9);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    },

    // ------------------------------------------------------------- Aleforge
    {
      type: 'lagerhorn', glyph: 'N', area: 'aleforge',
      name: 'LAGERHORN', hud: 'HORN',
      buff: 'lagerhorn', secs: 9, colour: '#e2c07a',
      blurb: 'jump a third again as high',
      draw: function (ctx, x, y, s) {
        ctx.fillStyle = '#e2c07a';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.08, y + s * 0.18);
        ctx.quadraticCurveTo(x + s * 0.95, y + s * 0.25, x + s * 0.72, y + s * 0.92);
        ctx.quadraticCurveTo(x + s * 0.55, y + s * 0.62, x + s * 0.08, y + s * 0.46);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#a8863f';
        ctx.fillRect(x + s * 0.04, y + s * 0.16, s * 0.16, s * 0.32);
        ctx.fillStyle = '#e09a2c';
        ctx.beginPath();
        ctx.ellipse(x + s * 0.13, y + s * 0.32, s * 0.09, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      type: 'bellows', glyph: 'E', area: 'aleforge',
      name: 'BELLOWS-BREATH', hud: 'BELLOWS',
      carry: 'dash', colour: '#f6cf82',
      blurb: 'one hard shove of bought wind',
      draw: function (ctx, x, y, s, t) {
        ctx.fillStyle = '#7a4a2c';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.06, y + s * 0.26);
        ctx.lineTo(x + s * 0.58, y + s * 0.12);
        ctx.lineTo(x + s * 0.58, y + s * 0.82);
        ctx.lineTo(x + s * 0.06, y + s * 0.68);
        ctx.closePath(); ctx.fill();
        PL.gfx.rect(ctx, x + s * 0.10, y + s * 0.40, s * 0.44, s * 0.12, '#b87333');
        PL.gfx.rect(ctx, x + s * 0.56, y + s * 0.42, s * 0.22, s * 0.1, '#5a3a1e');
        ctx.strokeStyle = '#f6cf82';
        ctx.lineWidth = Math.max(1, s * 0.07);
        for (var i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x + s * 0.78, y + s * (0.42 + i * 0.06));
          ctx.lineTo(x + s * (0.96 + Math.sin(t * 8 + i) * 0.04), y + s * (0.34 + i * 0.14));
          ctx.stroke();
        }
      }
    },

    {
      type: 'hoop', glyph: '&', area: 'aleforge',
      name: "COOPERS' HOOP", hud: 'HOOP',
      buff: 'hoop', secs: 10, colour: '#b87333',
      blurb: 'kegs burst on you instead of the other way round',
      draw: function (ctx, x, y, s, t) {
        ctx.save();
        ctx.translate(x + s * 0.5, y + s * 0.5);
        ctx.rotate(Math.sin(t * 1.4) * 0.25);
        ctx.strokeStyle = '#b87333';
        ctx.lineWidth = Math.max(2, s * 0.13);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#e0a758';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.36, -2.4, -1.1); ctx.stroke();
        ctx.fillStyle = '#7a4a2c';
        ctx.fillRect(-s * 0.05, -s * 0.44, s * 0.1, s * 0.12);
        ctx.restore();
      }
    },

    // ----------------------------------------------------------- Providence
    {
      type: 'scarab', glyph: 'K', area: 'providence',
      name: 'FORTUNATE SCARAB', hud: 'SCARAB',
      buff: 'scarab', secs: 8, colour: '#7fd0e8',
      blurb: 'every hazard slows to a crawl',
      draw: function (ctx, x, y, s, t) {
        var wing = Math.abs(Math.sin(t * 4)) * s * 0.16;
        ctx.fillStyle = '#2c6a86';
        ctx.beginPath();
        ctx.ellipse(x + s * 0.5 - s * 0.22 - wing, y + s * 0.44, s * 0.2, s * 0.14, -0.5, 0, Math.PI * 2);
        ctx.ellipse(x + s * 0.5 + s * 0.22 + wing, y + s * 0.44, s * 0.2, s * 0.14, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7fd0e8';
        ctx.beginPath();
        ctx.ellipse(x + s * 0.5, y + s * 0.56, s * 0.24, s * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8ecf3';
        ctx.beginPath();
        ctx.ellipse(x + s * 0.5, y + s * 0.22, s * 0.16, s * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b2c48';
        ctx.fillRect(x + s * 0.48, y + s * 0.3, s * 0.04, s * 0.5);
      }
    },
    {
      type: 'purity', glyph: 'Q', area: 'providence',
      name: 'GLYPH OF PURITY', hud: 'PURITY',
      buff: 'purity', secs: 10, colour: '#e8ecf3',
      blurb: 'nothing can take your grog',
      draw: function (ctx, x, y, s, t) {
        ctx.strokeStyle = '#e8ecf3';
        ctx.lineWidth = Math.max(1.5, s * 0.08);
        ctx.beginPath();
        ctx.arc(x + s * 0.5, y + s * 0.5, s * 0.38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffd77a';
        ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.beginPath();
        for (var i = 0; i < 3; i++) {
          var a = t * 0.6 + i * Math.PI * 2 / 3;
          ctx.moveTo(x + s * 0.5, y + s * 0.5);
          ctx.lineTo(x + s * 0.5 + Math.cos(a) * s * 0.34, y + s * 0.5 + Math.sin(a) * s * 0.34);
        }
        ctx.stroke();
        ctx.fillStyle = '#ffd77a';
        ctx.beginPath();
        ctx.arc(x + s * 0.5, y + s * 0.5, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    {
      type: 'indulgence', glyph: '+', area: 'providence',
      name: "CARDINAL'S INDULGENCE", hud: 'PARDON',
      buff: 'stilled', secs: 8, colour: '#ffd77a',
      blurb: 'the Order stops dead where it stands',
      draw: function (ctx, x, y, s, t) {
        PL.gfx.rect(ctx, x + s * 0.14, y + s * 0.1, s * 0.68, s * 0.8, '#f2e8d2');
        PL.gfx.rect(ctx, x + s * 0.14, y + s * 0.1, s * 0.68, s * 0.1, '#cbb98f');
        ctx.strokeStyle = '#8a7a58';
        ctx.lineWidth = Math.max(1, s * 0.04);
        for (var i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + s * 0.22, y + s * (0.34 + i * 0.13));
          ctx.lineTo(x + s * (0.62 - (i % 2) * 0.14), y + s * (0.34 + i * 0.13));
          ctx.stroke();
        }
        // the seal, still warm
        ctx.fillStyle = '#ffd77a';
        ctx.globalAlpha = 0.7 + Math.sin(t * 3) * 0.3;
        ctx.beginPath();
        ctx.arc(x + s * 0.68, y + s * 0.74, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    // -------------------------------------------------------------- Fenwick
    {
      type: 'spiritweed', glyph: 'w', area: 'fenwick',
      name: 'SPIRITWEED', hud: 'WEED',
      buff: 'spiritweed', secs: 10, colour: '#9fe8d8',
      blurb: 'you barely weigh anything',
      draw: function (ctx, x, y, s, t) {
        ctx.strokeStyle = '#4e6b2e';
        ctx.lineWidth = Math.max(1.5, s * 0.09);
        ctx.beginPath();
        ctx.moveTo(x + s * 0.5, y + s);
        ctx.quadraticCurveTo(x + s * 0.36, y + s * 0.5, x + s * 0.5, y + s * 0.12);
        ctx.stroke();
        ctx.fillStyle = '#9fe8d8';
        for (var i = 0; i < 4; i++) {
          var ly = y + s * (0.75 - i * 0.18);
          var side = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.ellipse(x + s * 0.5 + side * s * (0.2 + Math.sin(t * 2 + i) * 0.04), ly,
                      s * 0.17, s * 0.08, side * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    {
      type: 'mossboots', glyph: 'M', area: 'fenwick',
      name: 'MOSSBOUND BOOTS', hud: 'BOOTS',
      buff: 'grip', secs: 12, colour: '#a8d152',
      blurb: 'nothing gives way under you',
      draw: function (ctx, x, y, s) {
        ctx.fillStyle = '#3a2a1e';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.24, y + s * 0.12);
        ctx.lineTo(x + s * 0.56, y + s * 0.12);
        ctx.lineTo(x + s * 0.6, y + s * 0.66);
        ctx.lineTo(x + s * 0.94, y + s * 0.72);
        ctx.lineTo(x + s * 0.94, y + s * 0.9);
        ctx.lineTo(x + s * 0.2, y + s * 0.9);
        ctx.closePath(); ctx.fill();
        PL.gfx.rect(ctx, x + s * 0.2, y + s * 0.86, s * 0.74, s * 0.12, '#241a14');
        ctx.fillStyle = '#a8d152';
        for (var i = 0; i < 5; i++) {
          ctx.fillRect(x + s * (0.24 + i * 0.14), y + s * (0.06 + (i % 2) * 0.05), s * 0.09, s * 0.1);
        }
      }
    },

    {
      type: 'draught', glyph: '*', area: 'fenwick',
      name: "VEILWALKER'S DRAUGHT", hud: 'DRAUGHT',
      buff: 'veil', secs: 10, colour: '#c9a8f0',
      blurb: 'the phantom road holds with no light on it',
      draw: function (ctx, x, y, s, t) {
        PL.gfx.rect(ctx, x + s * 0.34, y + s * 0.04, s * 0.32, s * 0.16, '#5a4436');
        ctx.fillStyle = 'rgba(210,196,230,0.55)';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.34, y + s * 0.2);
        ctx.lineTo(x + s * 0.66, y + s * 0.2);
        ctx.lineTo(x + s * 0.88, y + s * 0.94);
        ctx.lineTo(x + s * 0.12, y + s * 0.94);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9a8f0';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.2, y + s * 0.56);
        ctx.lineTo(x + s * 0.8, y + s * 0.56);
        ctx.lineTo(x + s * 0.88, y + s * 0.94);
        ctx.lineTo(x + s * 0.12, y + s * 0.94);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#f2e3ff';
        for (var i = 0; i < 3; i++) {
          ctx.fillRect(x + s * (0.28 + i * 0.2),
                       y + s * (0.62 + Math.sin(t * 2.4 + i) * 0.06), s * 0.07, s * 0.07);
        }
        ctx.globalAlpha = 1;
      }
    },

    // --------------------------------------------------------- Roto Kaiishi
    {
      type: 'chit', glyph: 'D', area: 'roto',
      name: 'GOLDCORAL CHIT', hud: 'CHIT',
      buff: 'magnet', secs: 12, colour: '#f2dc9a',
      blurb: 'grog comes to you',
      draw: function (ctx, x, y, s, t) {
        var sq = Math.abs(Math.cos(t * 1.6));
        ctx.save();
        ctx.translate(x + s * 0.5, y + s * 0.5);
        ctx.scale(0.35 + sq * 0.65, 1);
        ctx.fillStyle = '#b8a887';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f2dc9a';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8515f';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.2); ctx.lineTo(s * 0.16, s * 0.06);
        ctx.lineTo(0, s * 0.2); ctx.lineTo(-s * 0.16, s * 0.06);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    },
    {
      type: 'ballast', glyph: 'O', area: 'roto',
      name: 'ALBATROSS BALLAST', hud: 'BALLAST',
      buff: 'glide', secs: 12, colour: '#d6f5ec',
      blurb: 'hold JUMP to fall like a feather',
      draw: function (ctx, x, y, s, t) {
        ctx.fillStyle = '#d6f5ec';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.5, y + s * 0.04);
        ctx.quadraticCurveTo(x + s * 0.94, y + s * 0.5, x + s * 0.52, y + s * 0.96);
        ctx.quadraticCurveTo(x + s * 0.1, y + s * 0.5, x + s * 0.5, y + s * 0.04);
        ctx.fill();
        ctx.strokeStyle = '#2fa8a0';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(x + s * 0.5, y + s * 0.06);
        ctx.lineTo(x + s * 0.52, y + s * 0.94);
        ctx.stroke();
        for (var i = 0; i < 4; i++) {
          var fy = y + s * (0.24 + i * 0.17);
          ctx.beginPath();
          ctx.moveTo(x + s * 0.51, fy);
          ctx.lineTo(x + s * (0.78 + Math.sin(t * 2 + i) * 0.03), fy + s * 0.1);
          ctx.stroke();
        }
      }
    },

    {
      type: 'tideglass', glyph: '^', area: 'roto',
      name: "TIDE-READER'S GLASS", hud: 'GLASS',
      buff: 'tideglass', secs: 12, colour: '#8fd6c8',
      blurb: 'the wretches stay under',
      draw: function (ctx, x, y, s, t) {
        ctx.strokeStyle = '#b8862f';
        ctx.lineWidth = Math.max(2, s * 0.1);
        ctx.beginPath();
        ctx.arc(x + s * 0.4, y + s * 0.38, s * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(143,214,200,0.75)';
        ctx.beginPath();
        ctx.arc(x + s * 0.4, y + s * 0.38, s * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(242,246,255,0.55)';
        ctx.beginPath();
        ctx.arc(x + s * 0.31, y + s * 0.29, s * 0.09, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7a5130';
        ctx.lineWidth = Math.max(2, s * 0.12);
        ctx.beginPath();
        ctx.moveTo(x + s * 0.6, y + s * 0.6);
        ctx.lineTo(x + s * 0.9, y + s * 0.92);
        ctx.stroke();
        ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
        ctx.strokeStyle = '#e8fbf5';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath();
        ctx.moveTo(x + s * 0.22, y + s * 0.44);
        ctx.quadraticCurveTo(x + s * 0.4, y + s * 0.36, x + s * 0.58, y + s * 0.44);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },

    // ------------------------------------------------------------ Owe Block
    {
      type: 'shiv', glyph: 'X', area: 'oweblock',
      name: "CUTTER'S SHIV", hud: 'SHIV',
      buff: 'shiv', secs: 10, colour: '#e0703f',
      blurb: 'anything you touch drops',
      draw: function (ctx, x, y, s) {
        ctx.fillStyle = '#cfd8dd';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.46, y + s * 0.02);
        ctx.lineTo(x + s * 0.62, y + s * 0.2);
        ctx.lineTo(x + s * 0.58, y + s * 0.66);
        ctx.lineTo(x + s * 0.42, y + s * 0.66);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8f8478';
        ctx.fillRect(x + s * 0.46, y + s * 0.06, s * 0.05, s * 0.58);
        PL.gfx.rect(ctx, x + s * 0.3, y + s * 0.64, s * 0.42, s * 0.09, '#3f3b44');
        PL.gfx.rect(ctx, x + s * 0.42, y + s * 0.72, s * 0.18, s * 0.24, '#e0703f');
      }
    },
    {
      type: 'greasepaint', glyph: 'J', area: 'oweblock',
      name: 'CIRCUS GREASEPAINT', hud: 'PAINT',
      buff: 'greasepaint', secs: 12, colour: '#5b95c9',
      blurb: 'neither gang can see you',
      draw: function (ctx, x, y, s) {
        PL.gfx.rect(ctx, x + s * 0.16, y + s * 0.3, s * 0.68, s * 0.6, '#3f3b44');
        PL.gfx.rect(ctx, x + s * 0.12, y + s * 0.22, s * 0.76, s * 0.12, '#5c5661');
        ctx.fillStyle = '#5b95c9';
        ctx.fillRect(x + s * 0.24, y + s * 0.42, s * 0.2, s * 0.4);
        ctx.fillStyle = '#e0703f';
        ctx.fillRect(x + s * 0.56, y + s * 0.42, s * 0.2, s * 0.4);
        ctx.fillStyle = '#b8ae9e';
        ctx.fillRect(x + s * 0.46, y + s * 0.02, s * 0.08, s * 0.24);
      }
    },

    {
      type: 'firewater', glyph: '!', area: 'oweblock',
      name: 'CRIMSON FIREWATER', hud: 'FIREWATER',
      buff: 'firewater', secs: 10, colour: '#e04b3a',
      blurb: 'an empty purse stops being a death sentence',
      draw: function (ctx, x, y, s, t) {
        PL.gfx.rect(ctx, x + s * 0.36, y + s * 0.06, s * 0.28, s * 0.2, '#3f3b44');
        ctx.fillStyle = '#5c3a3a';
        ctx.beginPath();
        ctx.moveTo(x + s * 0.36, y + s * 0.26);
        ctx.lineTo(x + s * 0.64, y + s * 0.26);
        ctx.lineTo(x + s * 0.84, y + s * 0.96);
        ctx.lineTo(x + s * 0.16, y + s * 0.96);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e04b3a';
        ctx.fillRect(x + s * 0.22, y + s * 0.6, s * 0.56, s * 0.34);
        ctx.globalAlpha = 0.5 + Math.sin(t * 5) * 0.4;
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(x + s * 0.22, y + s * (0.6 + Math.sin(t * 3) * 0.03), s * 0.56, s * 0.06);
        ctx.globalAlpha = 1;
      }
    },

    // --------------------------------------------------- Sackbeard's Tavern
    {
      type: 'pour', glyph: 'q', area: 'tavern',
      name: 'THE POUR ETERNAL', hud: 'THE POUR',
      buff: 'pour', secs: 7, colour: '#ffe2a8',
      blurb: 'nothing in the isles can touch you',
      draw: function (ctx, x, y, s, t) {
        var hue = ['#ffe2a8', '#d4574e', '#4fb8a5'][Math.floor(t * 8) % 3];
        PL.gfx.rect(ctx, x + s * 0.14, y + s * 0.16, s * 0.72, s * 0.72, '#4a3324');
        for (var i = 0; i < 3; i++) {
          PL.gfx.rect(ctx, x + s * (0.18 + i * 0.23), y + s * 0.2, s * 0.19, s * 0.64,
                      i % 2 ? '#7d5a3c' : '#a8825a');
        }
        PL.gfx.rect(ctx, x + s * 0.1, y + s * 0.32, s * 0.8, s * 0.1, hue);
        PL.gfx.rect(ctx, x + s * 0.1, y + s * 0.62, s * 0.8, s * 0.1, hue);
        ctx.fillStyle = hue;
        ctx.beginPath();
        ctx.arc(x + s * 0.5, y + s * 0.52, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      type: 'marrow', glyph: 'z', area: 'tavern',
      name: 'LEVIATHAN MARROW', hud: 'MARROW',
      buff: 'marrow', secs: 12, colour: '#f0e2bd',
      blurb: 'grog counts double, and you run',
      draw: function (ctx, x, y, s, t) {
        ctx.fillStyle = '#f0e2bd';
        ctx.beginPath();
        ctx.arc(x + s * 0.22, y + s * 0.2, s * 0.16, 0, Math.PI * 2);
        ctx.arc(x + s * 0.34, y + s * 0.14, s * 0.13, 0, Math.PI * 2);
        ctx.arc(x + s * 0.78, y + s * 0.8, s * 0.16, 0, Math.PI * 2);
        ctx.arc(x + s * 0.66, y + s * 0.86, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f0e2bd';
        ctx.lineWidth = s * 0.22;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.28, y + s * 0.24);
        ctx.lineTo(x + s * 0.72, y + s * 0.76);
        ctx.stroke();
        ctx.strokeStyle = '#e0603e';
        ctx.lineWidth = s * 0.07;
        ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.3, y + s * 0.28);
        ctx.lineTo(x + s * 0.7, y + s * 0.72);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
    {
      type: 'ownCup', glyph: '$', area: 'tavern',
      name: "SACKBEARD'S OWN CUP", hud: 'HIS CUP',
      carry: 'spareUrn', colour: '#ffd77a',
      blurb: 'drink it for a spare life',
      draw: function (ctx, x, y, s, t) {
        PL.gfx.rect(ctx, x + s * 0.16, y + s * 0.24, s * 0.56, s * 0.7, '#c6d3d8');
        PL.gfx.rect(ctx, x + s * 0.16, y + s * 0.24, s * 0.56, s * 0.12, '#f2f6ff');
        ctx.fillStyle = '#e0a03c';
        ctx.fillRect(x + s * 0.2, y + s * 0.42, s * 0.48, s * 0.48);
        ctx.fillStyle = '#fff2cf';
        ctx.fillRect(x + s * 0.2, y + s * (0.38 + Math.sin(t * 3) * 0.02), s * 0.48, s * 0.08);
        ctx.strokeStyle = '#c6d3d8';
        ctx.lineWidth = Math.max(2, s * 0.1);
        ctx.beginPath();
        ctx.arc(x + s * 0.74, y + s * 0.58, s * 0.16, -1.2, 1.2);
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffd77a';
        for (var i = 0; i < 3; i++) {
          ctx.fillRect(x + s * (0.26 + i * 0.18),
                       y + s * (0.2 - ((t * 0.7 + i * 0.3) % 1) * 0.18), s * 0.06, s * 0.06);
        }
        ctx.globalAlpha = 1;
      }
    }
  ];

  // ------------------------------------------------------------- the entity

  function makeItem(cfg) {
    function Item(opts) {
      E.call(this, opts);
      this.w = 24; this.h = 24;
      this.x = opts.x + (T - this.w) / 2;
      this.baseY = opts.y + (T - this.h) / 2;
      this.y = this.baseY;
      this.phase = ((opts.tx * 0.7 + opts.ty * 1.3) % 6.28);
      this.taken = false;
      this.cfg = cfg;
    }
    PL.extend(Item, E);

    Item.prototype.update = function (dt) {
      this.t += dt;
      this.y = this.baseY + Math.sin(this.t * 2.4 + this.phase) * 3;
    };

    Item.prototype.touch = function (player, world) {
      if (this.taken) return;
      this.taken = true;
      this.remove = true;
      if (cfg.buff) player.buff(cfg.buff, cfg.secs);
      else if (cfg.carry) player.giveItem(cfg.carry);
      world.fx.ring(this.cx(), this.cy(), cfg.colour, 52);
      world.fx.burst(this.cx(), this.cy(), cfg.colour, 12, { speed: 2.4, life: 0.6 });
      world.fx.label(this.cx(), this.y - 8, cfg.name, cfg.colour);
      PL.Audio.sfx(cfg.carry ? 'powerup' : 'urn');
    };

    Item.prototype.draw = function (ctx, cam) {
      var x = this.x - cam.ox(), y = this.y - cam.oy();
      PL.gfx.glow(ctx, x + 12, y + 12, 24, cfg.colour, 0.35);
      cfg.draw(ctx, x + 2, y + 2, 20, this.t);
    };

    return Item;
  }

  var byBuff = {}, byCarry = {}, glyphs = {};
  for (var i = 0; i < ITEMS.length; i++) {
    var cfg = ITEMS[i];
    PL.Entities.define(cfg.type, makeItem(cfg));
    glyphs[cfg.glyph] = cfg.type;
    if (cfg.buff) byBuff[cfg.buff] = cfg;
    if (cfg.carry) byCarry[cfg.carry] = cfg;
  }

  PL.TownItems = {
    list: ITEMS,
    glyphs: glyphs,
    byBuff: byBuff,
    byCarry: byCarry,
    /** Paint any item's icon at a given size — used by the HUD. */
    icon: function (ctx, cfg, x, y, s, t) { cfg.draw(ctx, x, y, s, t || 0); }
  };

})(window.PL = window.PL || {});
