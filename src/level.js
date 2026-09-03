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
 *   height: 20,                 // rows per segment (default 20)
 *   segWidth: 30,               // columns per segment (default 30)
 *   segments: [ seg, seg, ... ],   // each seg = array of strings, one per row.
 *   quips: { '1': 'spoken line', ... },  // digits 1-9 place a one-liner trigger
 *   diff: 1.25,                 // hazard tempo (1.0 = Shanty Town). See below.
 *   trial: 'plankPour'          // optional: trial gate glyph 'G' opens this
 * }
 *
 * Segments are BOTTOM-ALIGNED and RIGHT-PADDED: a segment with fewer than
 * `height` rows gets empty sky added above it, and a row shorter than
 * `segWidth` gets empty space added after it. Level content lives at the
 * bottom of the frame, so this lets a segment be written as just the rows that
 * actually contain something. A segment that is too tall, or a row that is too
 * long, is an error — those are always mistakes, never intent.
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
    'd': 'post',

    // Aleforge
    'k': 'kegChute',      // rolls a keg downhill at the player on a cycle
    'g': 'windGust',      // Wolendi updraft column
    'e': 'gearPlatform',  // clockwork platform on a circular track
    'n': 'clockArm',      // sweeping clock hand, lethal

    // Providence
    'a': 'apostle',       // marches in strict time with the chime
    'f': 'friar',         // fines you grog if you cross his sightline
    'b': 'bell',          // chime tower (scenery + the visible beat)

    // Owe Block
    'm': 'cutter',        // Crimson Cutters (red)
    'j': 'circus',        // Seaside Circus (blue)
    'y': 'bandanaRed',
    'v': 'bandanaBlue',
    'Y': 'stankTank',     // safe-house checkpoint

    // Fenwick
    't': 'vine',          // living vine that extends and retracts
    'i': 'spiritLight',   // reveals phantom footing for a while
    'h': 'phantom',       // footing that only exists in spirit-light

    // Roto Kaiishi
    's': 'bobber',        // stilt platform that sinks under your weight
    'u': 'stall'          // merchant stall (scenery / paid shortcut)
  };

  /* The fourteen town items register their own glyphs (see items-town.js), so
   * adding one never means editing this table. */
  if (PL.TownItems) {
    for (var ig in PL.TownItems.glyphs) MARKERS[ig] = PL.TownItems.glyphs[ig];
  }

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
    // Difficulty knob: hazards run faster and hold shorter as it rises.
    // Set per level with `diff` (1.0 = Shanty Town pace).
    this.diff = def.diff || 1;
    // Named world-wide countdowns, ticked once per frame by the play scene.
    // Fenwick's spirit-light uses one; any town-wide timed effect can.
    this.timers = {};

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
        // Any entity that flags itself a checkpoint joins the respawn set, so a
        // town can dress one as something other than a flag.
        if (ent.isCheckpoint) this.checkpoints.push(ent);
      }
    }
    this.shardTotal = shardIndex;
  }

  function repeat(ch, n) {
    var s = '';
    while (s.length < n) s += ch;
    return s;
  }

  /**
   * Concatenate segments horizontally. Short segments gain empty sky on top;
   * short rows gain empty space on the right. Anything oversized is an error.
   */
  function flatten(def) {
    if (def.rows) return def.rows.slice();
    var segs = def.segments;
    if (!segs || !segs.length) throw new Error('Level ' + def.id + ' has no segments');

    var height = def.height || 20;
    var segWidth = def.segWidth || 30;
    var out = [];
    for (var r = 0; r < height; r++) out.push('');

    for (var s = 0; s < segs.length; s++) {
      var seg = segs[s];
      if (seg.length > height) {
        throw new Error('Level ' + def.id + ': segment ' + s + ' has ' + seg.length +
                        ' rows, more than the level height of ' + height);
      }
      var pad = height - seg.length;      // sky above; content is bottom-aligned
      var blank = repeat('.', segWidth);
      for (var r2 = 0; r2 < height; r2++) {
        var row = r2 < pad ? blank : seg[r2 - pad];
        if (row.length > segWidth) {
          throw new Error('Level ' + def.id + ': segment ' + s + ' row ' + (r2 - pad) +
                          ' is ' + row.length + ' chars, wider than segWidth ' + segWidth);
        }
        if (row.length < segWidth) row += repeat('.', segWidth - row.length);
        out[r2] += row;
      }
    }
    return out;
  }

  /** Start or restart a named world timer (seconds). */
  World.prototype.setTimer = function (name, secs) { this.timers[name] = secs; };

  /** Seconds left on a named world timer, or 0. */
  World.prototype.timer = function (name) { return this.timers[name] || 0; };

  World.prototype.tickTimers = function (dt) {
    for (var k in this.timers) {
      if (this.timers[k] > 0) this.timers[k] = Math.max(0, this.timers[k] - dt);
    }
  };

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
