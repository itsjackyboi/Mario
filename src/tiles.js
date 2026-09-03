/* tiles.js — the terrain vocabulary.
 *
 * Terrain is a character grid (see data/ for level files). Every glyph maps to
 * a tile id here; anything not listed as terrain is treated as an *entity
 * marker* by level.js and stripped out of the grid.
 *
 * Tile ids are shared by every town. What changes per town is the *style* —
 * how the solid, platform and spike tiles are painted — set by themes.js into
 * `PL.Tiles.style`. Colours come from PL.C, which the active theme has already
 * swapped. So a new town needs a palette and (optionally) a style function,
 * never a new tile id.
 *
 * To add terrain: add an id, add it to LEGEND, decide whether it is
 * solid/oneway/lethal, and give it a case in drawTile().
 */
(function (PL) {
  'use strict';

  var T = (PL.Tiles = {});

  T.EMPTY = 0;
  T.HULL  = 1;  // the main ground — painted per town style
  T.BONE  = 2;  // block of bone / dressed stone / crate-stack filler
  T.CRATE = 3;  // lashed cargo crate
  T.PLANK = 4;  // one-way platform (jump up through, hold Down + Jump to drop)
  T.WATER = 5;  // lethal
  T.SPIKE = 6;  // lethal spikes, painted per town style
  T.MAST  = 7;  // upright mast / piling / pipe, solid
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

  /* Set by PL.Theme.apply(). Defaults are Shanty Town's. */
  T.style = { solid: 'salvage', plank: 'board', spike: 'harpoon' };

  var SOLID = {}; SOLID[T.HULL] = SOLID[T.BONE] = SOLID[T.CRATE] = SOLID[T.MAST] = true;
  var LETHAL = {}; LETHAL[T.WATER] = LETHAL[T.SPIKE] = true;

  T.isSolid = function (id) { return !!SOLID[id]; };
  T.isOneWay = function (id) { return id === T.PLANK; };
  T.isLethal = function (id) { return !!LETHAL[id]; };
  T.isTerrainChar = function (ch) { return Object.prototype.hasOwnProperty.call(T.LEGEND, ch); };

  var C = PL.C;
  var G = PL.gfx;

  /* Per-tile pseudo-random so grain and wear are stable across frames. */
  function hash(tx, ty) {
    var h = (tx * 374761393 + ty * 668265263) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ------------------------------------------------------------- solid styles

  var SOLID_STYLES = {

    /* Shanty Town — salvaged hull planking, barnacled where it is exposed. */
    salvage: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      var tones = [C.wood, C.woodLite, C.wood];
      for (var i = 0; i < 3; i++) {
        G.rect(ctx, x + 1, y + i * 11 + 1, S - 2, 9, tones[(i + ((tx + ty) % 3)) % 3]);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y, 1, S);
      if (r > 0.72) {
        ctx.fillStyle = 'rgba(20,12,10,0.5)';
        ctx.fillRect(x + 6 + Math.floor(r * 12), y + 6, 3, 3);
      }
      if (capped) {
        G.rect(ctx, x, y, S, 4, C.woodPale);
        ctx.fillStyle = 'rgba(255,200,140,0.30)';
        ctx.fillRect(x, y, S, 1);
        if (r > 0.62) {
          ctx.fillStyle = C.seaFoam;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x + 4 + Math.floor(r * 18), y + 4, 3, 2);
          ctx.globalAlpha = 1;
        }
      }
    },

    /* Aleforge — fired brick in staggered courses, with copper piping. */
    brick: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      for (var row = 0; row < 4; row++) {
        var by = y + row * 8;
        var offset = ((ty * 4 + row) % 2) ? 0 : 8;
        for (var b = -1; b < 3; b++) {
          var bx = x + offset + b * 16;
          var w = Math.min(15, x + S - bx);
          if (bx < x) { w -= (x - bx); bx = x; }
          if (w <= 0) continue;
          var shade = hash(tx * 7 + b, ty * 5 + row);
          G.rect(ctx, bx, by + 1, w, 6, shade > 0.62 ? C.woodLite : C.wood);
        }
      }
      if (r > 0.86) {  // copper run
        G.rect(ctx, x, y + 12, S, 5, '#b87333');
        G.rect(ctx, x, y + 12, S, 2, '#e0a05a');
      }
      if (capped) {
        G.rect(ctx, x, y, S, 4, C.woodPale);
        ctx.fillStyle = 'rgba(255,220,160,0.25)';
        ctx.fillRect(x, y, S, 1);
      }
    },

    /* Providence — dressed ashlar, one gold seam, nothing out of place. */
    ashlar: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      var big = ((tx + ty) % 2) === 0;
      G.rect(ctx, x + 1, y + 1, S - 2, big ? 14 : 20, C.wood);
      G.rect(ctx, x + 1, y + (big ? 17 : 23), S - 2, big ? 14 : 8, C.woodLite);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x + 1, y + 1, S - 2, 1);
      if (r > 0.9) {
        G.rect(ctx, x + 6, y + 6, S - 12, 2, C.lantern);   // gold inlay
      }
      if (capped) {
        G.rect(ctx, x, y, S, 3, C.bone);
        G.rect(ctx, x, y + 3, S, 1, C.lantern);
      }
    },

    /* Owe Block — cracked concrete, rust weep, somebody's tag. */
    grime: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      G.rect(ctx, x + 1, y + 1, S - 2, S - 2, C.wood);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 3 + r * 20, y);
      ctx.lineTo(x + 8 + r * 14, y + S);
      ctx.stroke();
      if (r > 0.7) {
        ctx.fillStyle = 'rgba(160,70,30,0.35)';   // rust weep
        ctx.fillRect(x + 4 + Math.floor(r * 18), y, 3, S);
      }
      if (r > 0.93) {                              // gang tag
        ctx.fillStyle = ((tx + ty) % 2) ? 'rgba(201,85,46,0.55)' : 'rgba(70,110,170,0.5)';
        ctx.fillRect(x + 6, y + 12, 12, 3);
        ctx.fillRect(x + 6, y + 12, 3, 9);
      }
      if (capped) {
        G.rect(ctx, x, y, S, 3, C.woodLite);
        ctx.fillStyle = 'rgba(255,166,43,0.14)';   // sodium lamp wash
        ctx.fillRect(x, y, S, 6);
      }
    },

    /* Fenwick — packed loam threaded with roots, mossed over on top. */
    loam: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      G.rect(ctx, x + 1, y + 2, S - 2, S - 3, C.wood);
      ctx.strokeStyle = C.woodLite;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 8 + r * 10);
      ctx.quadraticCurveTo(x + S / 2, y + 4 + r * 18, x + S, y + 10 + r * 8);
      ctx.stroke();
      if (r > 0.75) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(x + 8 + r * 14, y + 20, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (capped) {
        G.rect(ctx, x, y, S, 5, '#4e6b2e');
        ctx.fillStyle = C.hazard;
        ctx.globalAlpha = 0.5;
        for (var g = 0; g < 4; g++) {
          var gx = x + 3 + g * 8;
          ctx.fillRect(gx, y - 2 - ((hash(tx + g, ty) * 3) | 0), 2, 4);
        }
        ctx.globalAlpha = 1;
      }
    },

    /* Roto — lashed bamboo decking over the water. */
    deck: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      for (var d = 0; d < 4; d++) {
        var dx = x + d * 8;
        G.rect(ctx, dx + 1, y + 1, 6, S - 2, hash(tx * 3 + d, ty) > 0.5 ? C.wood : C.woodLite);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(dx + 7, y, 1, S);
      }
      G.rect(ctx, x, y + 13, S, 3, C.rope);       // lashing
      if (capped) {
        G.rect(ctx, x, y, S, 3, C.woodPale);
        G.rect(ctx, x, y + 3, S, 1, C.rope);
      }
    },

    /* Sackbeard's Tavern — the beast's own plating. */
    shell: function (ctx, x, y, S, r, tx, ty, capped) {
      G.rect(ctx, x, y, S, S, C.woodDark);
      ctx.fillStyle = C.wood;
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.quadraticCurveTo(x + S / 2, y - 3, x + S, y + 4);
      ctx.lineTo(x + S, y + S);
      ctx.lineTo(x, y + S);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = C.woodLite;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.quadraticCurveTo(x + S / 2, y + 10, x + S, y + 16);
      ctx.stroke();
      if (r > 0.8) {
        G.rect(ctx, x + 12, y + 22, 6, 4, C.boneDark);
      }
      if (capped) {
        G.rect(ctx, x, y, S, 3, C.bone);
        ctx.fillStyle = 'rgba(255,207,138,0.18)';
        ctx.fillRect(x, y, S, 7);
      }
    }
  };

  // ------------------------------------------------------------- plank styles

  var PLANK_STYLES = {
    board: function (ctx, x, y, S) {
      G.plank(ctx, x, y, S, 10, C.wood, C.woodDark);
      G.rect(ctx, x, y, S, 2, C.woodPale);
      ctx.strokeStyle = C.rope;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 10); ctx.lineTo(x + 6, y + 15);
      ctx.moveTo(x + S - 6, y + 10); ctx.lineTo(x + S - 6, y + 15);
      ctx.stroke();
    },
    catwalk: function (ctx, x, y, S) {            // Aleforge: iron grating
      G.rect(ctx, x, y, S, 9, '#4a3128');
      ctx.fillStyle = '#7d5340';
      for (var i = 0; i < 5; i++) ctx.fillRect(x + 2 + i * 6, y + 2, 3, 5);
      G.rect(ctx, x, y, S, 2, '#b87333');
      ctx.fillStyle = '#e0a05a';
      ctx.fillRect(x + 2, y + 8, 2, 2);
      ctx.fillRect(x + S - 4, y + 8, 2, 2);
    },
    marble: function (ctx, x, y, S) {             // Providence: gilded ledge
      G.rect(ctx, x, y, S, 9, C.wood);
      G.rect(ctx, x, y, S, 3, C.bone);
      G.rect(ctx, x, y + 9, S, 2, C.lantern);
    },
    scaffold: function (ctx, x, y, S) {           // Owe Block: welded scaffold
      G.rect(ctx, x, y + 2, S, 6, C.woodLite);
      ctx.fillStyle = 'rgba(160,70,30,0.5)';
      ctx.fillRect(x + 4, y + 2, 3, 6);
      ctx.fillRect(x + S - 8, y + 2, 3, 6);
      G.rect(ctx, x, y, S, 2, C.bone);
      ctx.strokeStyle = '#5a4c3c'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 8); ctx.lineTo(x + S - 3, y + 14);
      ctx.stroke();
    },
    bough: function (ctx, x, y, S) {              // Fenwick: mossed branch
      ctx.fillStyle = C.woodDark;
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.quadraticCurveTo(x + S / 2, y + 1, x + S, y + 4);
      ctx.lineTo(x + S, y + 11);
      ctx.quadraticCurveTo(x + S / 2, y + 8, x, y + 11);
      ctx.closePath(); ctx.fill();
      G.rect(ctx, x, y + 2, S, 3, '#4e6b2e');
      ctx.fillStyle = C.hazard;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x + 5, y - 1, 2, 3);
      ctx.fillRect(x + S - 9, y - 2, 2, 4);
      ctx.globalAlpha = 1;
    },
    awning: function (ctx, x, y, S) {             // Roto: dyed canvas stall roof
      G.rect(ctx, x, y + 4, S, 5, C.woodDark);
      for (var s = 0; s < 4; s++) {
        G.rect(ctx, x + s * 8, y, 8, 5, s % 2 ? '#d94f4f' : C.bone);
      }
      G.rect(ctx, x, y + 9, S, 2, C.rope);
    },
    rib: function (ctx, x, y, S) {                // Tavern: a rib of the beast
      G.rect(ctx, x, y + 2, S, 7, C.boneDark);
      G.rect(ctx, x, y + 2, S, 4, C.bone);
      ctx.fillStyle = 'rgba(90,74,48,0.45)';
      ctx.fillRect(x + 4, y + 6, S - 8, 1);
      ctx.fillRect(x, y + 9, S, 2);
    }
  };

  // ------------------------------------------------------------- spike styles

  var SPIKE_STYLES = {
    harpoon: function (ctx, x, y, S) {
      G.rect(ctx, x, y + S - 7, S, 7, C.woodDark);
      ctx.fillStyle = C.hazardDark;
      for (var s = 0; s < 3; s++) {
        var sx = x + 4 + s * 9;
        ctx.beginPath();
        ctx.moveTo(sx, y + S - 6); ctx.lineTo(sx + 4, y + 3); ctx.lineTo(sx + 8, y + S - 6);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = C.hazard;
      for (var s2 = 0; s2 < 3; s2++) ctx.fillRect(x + 7 + s2 * 9, y + 5, 2, S - 12);
    },
    burner: function (ctx, x, y, S, time) {       // Aleforge: brewery burner jets
      G.rect(ctx, x, y + S - 8, S, 8, '#3a2018');
      G.rect(ctx, x, y + S - 8, S, 2, '#b87333');
      for (var b = 0; b < 3; b++) {
        var bx = x + 6 + b * 10;
        var hgt = 12 + Math.sin(time * 9 + b * 2 + x * 0.1) * 5;
        ctx.fillStyle = C.hazardDark;
        ctx.beginPath();
        ctx.moveTo(bx - 4, y + S - 8);
        ctx.quadraticCurveTo(bx, y + S - 8 - hgt, bx + 4, y + S - 8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.hazard;
        ctx.beginPath();
        ctx.moveTo(bx - 2, y + S - 8);
        ctx.quadraticCurveTo(bx, y + S - 10 - hgt * 0.7, bx + 2, y + S - 8);
        ctx.closePath(); ctx.fill();
      }
    },
    iron: function (ctx, x, y, S) {               // Providence: iron palings
      G.rect(ctx, x, y + S - 6, S, 6, C.woodDark);
      for (var i = 0; i < 4; i++) {
        var ix = x + 3 + i * 8;
        ctx.fillStyle = C.hazardDark;
        ctx.fillRect(ix, y + 4, 3, S - 10);
        ctx.beginPath();
        ctx.moveTo(ix - 1, y + 5); ctx.lineTo(ix + 1.5, y); ctx.lineTo(ix + 4, y + 5);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.hazard;
        ctx.fillRect(ix, y + 6, 1, S - 12);
      }
    },
    rebar: function (ctx, x, y, S) {              // Owe Block: bent rebar
      G.rect(ctx, x, y + S - 6, S, 6, '#1c1a1e');
      ctx.strokeStyle = C.hazardDark;
      ctx.lineWidth = 3;
      for (var r = 0; r < 3; r++) {
        var rx = x + 5 + r * 9;
        ctx.beginPath();
        ctx.moveTo(rx, y + S - 5);
        ctx.lineTo(rx + (r % 2 ? 3 : -3), y + 4);
        ctx.stroke();
      }
      ctx.strokeStyle = C.hazard;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 5, y + S - 5); ctx.lineTo(x + 2, y + 4);
      ctx.stroke();
    },
    thorn: function (ctx, x, y, S) {              // Fenwick: bramble
      ctx.strokeStyle = C.hazardDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + S - 4);
      ctx.quadraticCurveTo(x + S / 2, y + S - 16, x + S, y + S - 4);
      ctx.stroke();
      ctx.fillStyle = C.hazard;
      for (var t = 0; t < 5; t++) {
        var tx2 = x + 2 + t * 7;
        var ty2 = y + S - 8 - Math.sin(t / 4 * Math.PI) * 8;
        ctx.beginPath();
        ctx.moveTo(tx2, ty2 + 6); ctx.lineTo(tx2 + 2, ty2 - 4); ctx.lineTo(tx2 + 4, ty2 + 6);
        ctx.closePath(); ctx.fill();
      }
    },
    hook: function (ctx, x, y, S) {               // Roto: cargo hooks
      G.rect(ctx, x, y, S, 4, C.woodDark);
      ctx.strokeStyle = C.hazardDark;
      ctx.lineWidth = 3;
      for (var h = 0; h < 2; h++) {
        var hx = x + 9 + h * 14;
        ctx.beginPath();
        ctx.moveTo(hx, y + 4);
        ctx.lineTo(hx, y + 18);
        ctx.arc(hx - 4, y + 18, 4, 0, Math.PI * 0.9);
        ctx.stroke();
      }
      ctx.fillStyle = C.hazard;
      ctx.fillRect(x + 8, y + 4, 2, 12);
    },
    fang: function (ctx, x, y, S) {               // Tavern: the beast's teeth
      G.rect(ctx, x, y + S - 5, S, 5, C.woodDark);
      for (var f = 0; f < 3; f++) {
        var fx = x + 4 + f * 9;
        ctx.fillStyle = C.bone;
        ctx.beginPath();
        ctx.moveTo(fx, y + S - 4); ctx.lineTo(fx + 4, y + 2); ctx.lineTo(fx + 8, y + S - 4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.hazardDark;
        ctx.fillRect(fx + 2, y + S - 10, 4, 6);
      }
    }
  };

  /**
   * Draw one tile in screen space.
   * `above` is the tile id directly above, used to cap exposed surfaces.
   */
  T.drawTile = function (ctx, id, x, y, tx, ty, above, time) {
    var S = PL.TILE;
    var r = hash(tx, ty);
    switch (id) {
      case T.HULL:
        (SOLID_STYLES[T.style.solid] || SOLID_STYLES.salvage)(
          ctx, x, y, S, r, tx, ty, !T.isSolid(above), time);
        break;

      case T.BONE:
        G.rect(ctx, x, y, S, S, C.boneDark);
        G.rect(ctx, x + 2, y + 2, S - 4, S - 4, C.bone);
        ctx.fillStyle = 'rgba(90,74,48,0.45)';
        ctx.fillRect(x + 5, y + 6, S - 10, 2);
        ctx.fillRect(x + 5, y + S - 10, S - 10, 2);
        if (!T.isSolid(above)) G.rect(ctx, x + 1, y, S - 2, 3, '#efe0bb');
        break;

      case T.CRATE:
        G.rect(ctx, x, y, S, S, C.woodDark);
        G.rect(ctx, x + 2, y + 2, S - 4, S - 4, C.woodLite);
        ctx.strokeStyle = C.woodDark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + S - 3, y + S - 3);
        ctx.moveTo(x + S - 3, y + 3); ctx.lineTo(x + 3, y + S - 3);
        ctx.stroke();
        break;

      case T.PLANK:
        (PLANK_STYLES[T.style.plank] || PLANK_STYLES.board)(ctx, x, y, S, time);
        break;

      case T.MAST:
        G.rect(ctx, x + 9, y, 14, S, C.wood);
        G.rect(ctx, x + 9, y, 3, S, C.woodLite);
        ctx.fillStyle = C.rope;
        ctx.fillRect(x + 7, y + 8 + ((ty % 2) * 12), 18, 2);
        break;

      case T.SPIKE:
        (SPIKE_STYLES[T.style.spike] || SPIKE_STYLES.harpoon)(ctx, x, y, S, time);
        break;

      case T.WATER: {
        var topWater = above !== T.WATER;
        G.rect(ctx, x, y, S, S, C.seaMid);
        ctx.fillStyle = C.seaDeep;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y + 12, S, S - 12);
        ctx.globalAlpha = 1;
        if (topWater) {
          var wob = Math.sin((tx * 0.7) + time * 2.2) * 2;
          G.rect(ctx, x, y + 2 + wob, S, 4, C.seaSurf);
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

      case T.ROPE:
        ctx.strokeStyle = C.rope;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + S / 2, y);
        ctx.lineTo(x + S / 2 + Math.sin(ty * 1.3) * 3, y + S);
        ctx.stroke();
        break;
    }
  };

})(window.PL = window.PL || {});
