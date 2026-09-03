/* level.js — turns a level *definition* (plain data, see data/) into a live
 * World: a tile grid plus a list of entities.
 *
 * LEVEL DEFINITION FORMAT
 * -----------------------
 * {
 *   id: 'shantytown-1',        // unique, "<town>-<n>"
 *   town: 'shantytown',
 *   name: 'The Crash Cliffs',
 *   blurb: 'one line of flavour for the level-select screen',
 *   segments: [ seg, seg, ... ],   // each seg = array of equal-length strings,
 *                                  // one string per row, top row first.
 *                                  // Every segment must have the same row count.
 *   quips: { '1': 'spoken line', ... },  // digits 1-9 place a one-liner trigger
 *   trial: 'plankPour'          // optional: trial gate glyph 'G' opens this
 * }
 *
 * Terrain glyphs live in tiles.js (PL.Tiles.LEGEND). Every other glyph is an
 * entity marker listed in MARKERS below. Segments are concatenated left to
 * right, which keeps each chunk narrow enough to author and eyeball by hand.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE;
  var Tiles = PL.Tiles;

  /* glyph -> entity type. Add new markers here when adding new entity types. */
  var MARKERS = {
    '@': 'spawn',
    'o': 'grog',
    'U': 'urn',
    'T': 'tonic',
    'W': 'pouch',
    'S': 'seed',
    'R': 'shard',
    'p': 'patroller',
    'c': 'wretch',
    'L': 'loosePlank',
    'H': 'moverH',
    'V': 'moverV',
    'F': 'checkpoint',
    'Z': 'tankard',
    'G': 'trialGate',
    'l': 'lantern',
    'd': 'post'
  };

  function World(def) {
    this.def = def;
    this.id = def.id;
    this.town = def.town;
    this.name = def.name;

    var rows = flatten(def);
    this.rows = rows.length;
    this.cols = rows[0].length;
    this.w = this.cols * T;
    this.h = this.rows * T;
    this.grid = new Uint8Array(this.cols * this.rows);

    this.entities = [];
    this.platforms = [];
    this.quipZones = [];
    this.spawn = { x: 2 * T, y: (this.rows - 4) * T };
    this.tankard = null;
    this.checkpoints = [];
    this.time = 0;

    var shardIndex = 0;
    for (var ty = 0; ty < this.rows; ty++) {
      var line = rows[ty];
      for (var tx = 0; tx < this.cols; tx++) {
        var ch = line.charAt(tx);
        if (Tiles.isTerrainChar(ch)) {
          this.grid[ty * this.cols + tx] = Tiles.LEGEND[ch];
          continue;
        }
        if (ch >= '1' && ch <= '9') {
          var text = def.quips && def.quips[ch];
          if (text) {
            this.quipZones.push({
              id: def.id + ':q' + ch + ':' + tx,
              x: (tx - 1) * T, y: (ty - 3) * T, w: T * 3, h: T * 7,
              text: text, fired: false
            });
          }
          continue;
        }
        var type = MARKERS[ch];
        if (!type) {
          if (ch !== ' ' && ch !== '.') {
            console.warn('[' + def.id + '] unknown glyph "' + ch + '" at ' + tx + ',' + ty);
          }
          continue;
        }
        if (type === 'spawn') {
          this.spawn = { x: tx * T + 6, y: ty * T + 4 };
          continue;
        }
        var opts = { tx: tx, ty: ty, x: tx * T, y: ty * T, world: this, def: def };
        if (type === 'shard') opts.shardId = def.id + ':' + (shardIndex++);
        if (type === 'trialGate') opts.trial = def.trial;
        var ent = PL.Entities.create(type, opts);
        this.add(ent);
        if (type === 'tankard') this.tankard = ent;
        if (type === 'checkpoint') this.checkpoints.push(ent);
      }
    }
    this.shardTotal = shardIndex;
  }

  /** Concatenate segments horizontally, validating that everything lines up. */
  function flatten(def) {
    if (def.rows) return def.rows.slice();
    var segs = def.segments;
    if (!segs || !segs.length) throw new Error('Level ' + def.id + ' has no segments');
    var nRows = segs[0].length;
    var out = [];
    for (var r = 0; r < nRows; r++) out.push('');
    for (var s = 0; s < segs.length; s++) {
      var seg = segs[s];
      if (seg.length !== nRows) {
        throw new Error('Level ' + def.id + ': segment ' + s + ' has ' + seg.length +
                        ' rows, expected ' + nRows);
      }
      var wSeg = seg[0].length;
      for (var r2 = 0; r2 < nRows; r2++) {
        if (seg[r2].length !== wSeg) {
          throw new Error('Level ' + def.id + ': segment ' + s + ' row ' + r2 +
                          ' is ' + seg[r2].length + ' chars, expected ' + wSeg);
        }
        out[r2] += seg[r2];
      }
    }
    return out;
  }

  World.prototype.add = function (e) {
    this.entities.push(e);
    if (e.isPlatform) this.platforms.push(e);
    return e;
  };

  World.prototype.tileAt = function (tx, ty) {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return 0;
    return this.grid[ty * this.cols + tx];
  };

  World.prototype.solidAt = function (tx, ty) {
    // Invisible walls at the level edges; the void below is a killing fall.
    if (tx < 0 || tx >= this.cols) return true;
    if (ty < 0 || ty >= this.rows) return false;
    return Tiles.isSolid(this.grid[ty * this.cols + tx]);
  };

  World.prototype.oneWayAt = function (tx, ty) {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return false;
    return Tiles.isOneWay(this.grid[ty * this.cols + tx]);
  };

  World.prototype.lethalAt = function (tx, ty) {
    if (tx < 0 || tx >= this.cols || ty < 0 || ty >= this.rows) return false;
    return Tiles.isLethal(this.grid[ty * this.cols + tx]);
  };

  World.prototype.drawTerrain = function (ctx, cam) {
    var x0 = Math.max(0, Math.floor(cam.x / T) - 1);
    var x1 = Math.min(this.cols - 1, Math.ceil((cam.x + PL.VIEW_W) / T));
    var y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    var y1 = Math.min(this.rows - 1, Math.ceil((cam.y + PL.VIEW_H) / T));
    var ox = cam.ox(), oy = cam.oy();
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        var id = this.grid[ty * this.cols + tx];
        if (!id) continue;
        Tiles.drawTile(ctx, id, tx * T - ox, ty * T - oy, tx, ty,
                       this.tileAt(tx, ty - 1), this.time);
      }
    }
  };

  PL.World = World;
  PL.Level = {
    build: function (def) { return new World(def); },
    MARKERS: MARKERS
  };

})(window.PL = window.PL || {});
