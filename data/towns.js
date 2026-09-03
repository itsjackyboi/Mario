/* data/towns.js — the area registry the level-select screen reads.
 *
 * Six areas, in the order the tryout is meant to be taken. Everything is
 * selectable from the start except Owe Block, which is a *bonus branch* off
 * Providence: it unlocks once Providence's final level has been cleared
 * (documented in the README — the alternative rule, all Providence shards,
 * would have let a player lock themselves out of the game's hardest level by
 * missing a collectible, which is a worse deal).
 *
 * Adding an area later:
 *   1. Add an entry to `list` below.
 *   2. Create data/<area>/level-1.js calling PL.Towns.addLevel('<area>', def).
 *   3. Add the <script> tags to index.html.
 *   4. Register a theme (src/themes.js) and a backdrop (src/town-<area>.js).
 * Nothing in src/ needs to change.
 */
(function (PL) {
  'use strict';

  var Towns = (PL.Towns = {
    ROMAN: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],

    list: [
      {
        id: 'shantytown',
        name: 'Shanty Town',
        tagline: 'Crashed hulls, bone, grog for coin.',
        levels: []
      },
      {
        id: 'aleforge',
        name: 'Aleforge',
        tagline: 'Brick, copper and steam. The real Trials.',
        levels: []
      },
      {
        id: 'providence',
        name: 'Providence',
        tagline: 'Order, tonic, prayer. All on the beat.',
        levels: []
      },
      {
        id: 'fenwick',
        name: 'Fenwick',
        tagline: 'Mud magic and moss monks.',
        levels: []
      },
      {
        id: 'roto',
        name: 'Roto Kaiishi',
        tagline: 'A market on stilts. Everything has a price.',
        levels: []
      },
      {
        id: 'tavern',
        name: "Sackbeard's Tavern",
        tagline: 'Inside the beast. Where all of it ends.',
        levels: []
      }
    ],

    get: function (id) {
      for (var i = 0; i < this.list.length; i++) if (this.list[i].id === id) return this.list[i];
      return null;
    },

    addLevel: function (townId, def) {
      var t = this.get(townId);
      if (!t) throw new Error('No such town: ' + townId);
      def.town = townId;
      def.shardCount = this.shardCount(def);
      t.levels.push(def);
      return def;
    },

    /** How many Red-Earth Shards are hidden in this level's data. */
    shardCount: function (def) {
      if (def.shardCount != null) return def.shardCount;
      var n = 0;
      var segs = def.segments || [def.rows || []];
      for (var s = 0; s < segs.length; s++) {
        var seg = segs[s];
        for (var r = 0; r < seg.length; r++) {
          for (var c = 0; c < seg[r].length; c++) if (seg[r].charAt(c) === 'R') n++;
        }
      }
      return n;
    },

    /** Every level in every area, in play order. */
    allLevels: function () {
      var out = [];
      for (var i = 0; i < this.list.length; i++) {
        var town = this.list[i];
        for (var l = 0; l < town.levels.length; l++) {
          out.push({ town: town, def: town.levels[l], index: l });
        }
      }
      return out;
    },

    indexOf: function (townId, levelId) {
      var t = this.get(townId);
      if (!t) return -1;
      for (var i = 0; i < t.levels.length; i++) if (t.levels[i].id === levelId) return i;
      return -1;
    },

    metaFor: function (townId, levelId) {
      var t = this.get(townId);
      var i = this.indexOf(townId, levelId);
      return {
        townId: townId,
        townName: t ? t.name : townId,
        index: i,
        count: t ? t.levels.length : 0
      };
    },

    /** A bonus level stays shut until its prerequisite level is cleared. */
    isUnlocked: function (def) {
      if (!def.bonus || !def.unlockAfter) return true;
      return PL.Store.cleared(def.unlockAfterTown || def.town, def.unlockAfter);
    },

    unlockNote: function (def) {
      if (this.isUnlocked(def)) return '';
      return def.unlockNote || 'Clear this town first.';
    },

    /**
     * The level to offer next. Rolls over into the following area at the end
     * of a town, and skips a bonus level that has not been unlocked.
     */
    nextLevel: function (townId, levelId) {
      var flat = this.allLevels();
      var at = -1;
      for (var i = 0; i < flat.length; i++) {
        if (flat[i].town.id === townId && flat[i].def.id === levelId) { at = i; break; }
      }
      if (at < 0) return null;
      for (var j = at + 1; j < flat.length; j++) {
        var row = flat[j];
        if (!this.isUnlocked(row.def)) continue;
        return { def: row.def, meta: this.metaFor(row.town.id, row.def.id) };
      }
      return null;
    }
  });

})(window.PL = window.PL || {});
