/* tiles.js — the terrain vocabulary.
 *
 * Terrain is a character grid (see data/ for level files). Every glyph maps to
 * a tile id here; anything not listed as terrain is treated as an *entity
 * marker* by level.js and stripped out of the grid.
 *
 * To add terrain for a future town: add an id, add it to LEGEND, decide
 * whether it is solid/oneway/lethal, and give it a case in drawTile().
 */
(function (PL) {
  'use strict';

  var T = (PL.Tiles = {});

  T.EMPTY = 0;
  T.HULL  = 1;  // salvaged ship-hull planking — the main ground
  T.BONE  = 2;  // beast rib block
  T.CRATE = 3;  // lashed cargo crate
  T.PLANK = 4;  // one-way platform (jump up through, hold Down + Jump to drop)
  T.WATER = 5;  // lethal
  T.SPIKE = 6;  // rusted harpoon rack, lethal
  T.MAST  = 7;  // upright mast / piling, solid
  T.ROPE  = 8;  // decorative rigging, no collision

  T.LEGEND = {
    '.': T.EMPTY, ' ': T.EMPTY,
    '#': T.HULL,
    'B': T.BONE,
    'C': T.CRATE,
    '=': T.PLANK,
    '~': T.WATER,
    'x': T.SPIKE,
    'I': T.MAST,
    ':': T.ROPE
  };

  var SOLID = {}; SOLID[T.HULL] = SOLID[T.BONE] = SOLID[T.CRATE] = SOLID[T.MAST] = true;
  var LETHAL = {}; LETHAL[T.WATER] = LETHAL[T.SPIKE] = true;

  T.isSolid = function (id) { return !!SOLID[id]; };
  T.isOneWay = function (id) { return id === T.PLANK; };
  T.isLethal = function (id) { return !!LETHAL[id]; };
  T.isTerrainChar = function (ch) { return Object.prototype.hasOwnProperty.call(T.LEGEND, ch); };

  var C = PL.C;

  /* Per-tile pseudo-random so grain and barnacles are stable across frames. */
  function hash(tx, ty) {
    var h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /**
   * Draw one tile in screen space.
   * `above` is the tile id directly above, used to cap exposed surfaces.
   */
  T.drawTile = function (ctx, id, x, y, tx, ty, above, time) {
    var S = PL.TILE;
    var r = hash(tx, ty);
    switch (id) {
      case T.HULL: {
        PL.gfx.rect(ctx, x, y, S, S, C.woodDark);
        // Three horizontal strakes with slightly different tones.
        var tones = [C.wood, C.woodLite, C.wood];
        for (var i = 0; i < 3; i++) {
          var ty2 = y + i * 11;
          var tone = tones[(i + ((tx + ty) % 3)) % 3];
          PL.gfx.rect(ctx, x + 1, ty2 + 1, S - 2, 9, tone);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y, 1, S);
        if (r > 0.72) { // iron nail plate
          ctx.fillStyle = 'rgba(20,12,10,0.5)';
          ctx.fillRect(x + 6 + Math.floor(r * 12), y + 6, 3, 3);
        }
        if (!T.isSolid(above)) {
          PL.gfx.rect(ctx, x, y, S, 4, C.woodPale);
          ctx.fillStyle = 'rgba(255,200,140,0.30)';
          ctx.fillRect(x, y, S, 1);
          if (r > 0.62) { // clinging barnacles
            ctx.fillStyle = C.seaFoam;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x + 4 + Math.floor(r * 18), y + 4, 3, 2);
            ctx.globalAlpha = 1;
          }
        }
        break;
      }
      case T.BONE: {
        PL.gfx.rect(ctx, x, y, S, S, C.boneDark);
        PL.gfx.rect(ctx, x + 2, y + 2, S - 4, S - 4, C.bone);
        ctx.fillStyle = 'rgba(90,74,48,0.45)';
        ctx.fillRect(x + 5, y + 6, S - 10, 2);
        ctx.fillRect(x + 5, y + S - 10, S - 10, 2);
        if (!T.isSolid(above)) {
          PL.gfx.rect(ctx, x + 1, y, S - 2, 3, '#efe0bb');
        }
        break;
      }
      case T.CRATE: {
        PL.gfx.rect(ctx, x, y, S, S, C.woodDark);
        PL.gfx.rect(ctx, x + 2, y + 2, S - 4, S - 4, C.woodLite);
        ctx.strokeStyle = C.woodDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + S - 3, y + S - 3);
        ctx.moveTo(x + S - 3, y + 3); ctx.lineTo(x + 3, y + S - 3);
        ctx.stroke();
        break;
      }
      case T.PLANK: {
        PL.gfx.plank(ctx, x, y, S, 10, C.wood, C.woodDark);
        PL.gfx.rect(ctx, x, y, S, 2, C.woodPale);
        // rope loops hanging off the underside
        ctx.strokeStyle = C.rope;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 10); ctx.lineTo(x + 6, y + 15);
        ctx.moveTo(x + S - 6, y + 10); ctx.lineTo(x + S - 6, y + 15);
        ctx.stroke();
        break;
      }
      case T.MAST: {
        PL.gfx.rect(ctx, x + 9, y, 14, S, C.wood);
        PL.gfx.rect(ctx, x + 9, y, 3, S, C.woodLite);
        ctx.fillStyle = C.rope;
        ctx.fillRect(x + 7, y + 8 + ((ty % 2) * 12), 18, 2);
        break;
      }
      case T.SPIKE: {
        // Rusted harpoon heads jammed point-up into a rail.
        PL.gfx.rect(ctx, x, y + S - 7, S, 7, C.woodDark);
        ctx.fillStyle = C.coralDark;
        for (var s = 0; s < 3; s++) {
          var sx = x + 4 + s * 9;
          ctx.beginPath();
          ctx.moveTo(sx, y + S - 6);
          ctx.lineTo(sx + 4, y + 3);
          ctx.lineTo(sx + 8, y + S - 6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = C.coral;
        for (var s2 = 0; s2 < 3; s2++) {
          var sx2 = x + 4 + s2 * 9;
          ctx.fillRect(sx2 + 3, y + 5, 2, S - 12);
        }
        break;
      }
      case T.WATER: {
        var topWater = above !== T.WATER;
        PL.gfx.rect(ctx, x, y, S, S, C.seaMid);
        ctx.fillStyle = C.seaDeep;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y + 12, S, S - 12);
        ctx.globalAlpha = 1;
        if (topWater) {
          var wob = Math.sin((tx * 0.7) + time * 2.2) * 2;
          PL.gfx.rect(ctx, x, y + 2 + wob, S, 4, C.seaSurf);
          ctx.fillStyle = C.seaFoam;
          ctx.globalAlpha = 0.65;
          ctx.fillRect(x, y + 2 + wob, S, 1);
          if (r > 0.6) ctx.fillRect(x + 6, y + 5 + wob, 8, 1);
          ctx.globalAlpha = 1;
        } else if (r > 0.85) {
          ctx.fillStyle = 'rgba(207,230,228,0.14)';
          ctx.fillRect(x + 8, y + 10, 6, 2);
        }
        break;
      }
      case T.ROPE: {
        ctx.strokeStyle = C.rope;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + S / 2, y);
        ctx.lineTo(x + S / 2 + Math.sin(ty * 1.3) * 3, y + S);
        ctx.stroke();
        break;
      }
    }
  };

})(window.PL = window.PL || {});
