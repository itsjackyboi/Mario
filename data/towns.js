/* data/towns.js — the area registry the level-select screen reads.
 *
 * Six areas, in the order the tryout is meant to be taken. The first level of
 * every area is open from the start; every level after it needs the *Red-Earth
 * Shard* out of the level before it, so a town has to be walked rather than
 * skipped around. Clearing a level is not enough — you have to have found the
 * shard in it.
 *
 * Owe Block is the same rule wearing a different hat: it sits last in
 * Providence's list, so it wants Providence III's shard, and it is additionally
 * flagged `bonus` so the level-select draws it as a branch rather than a step.
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
        short: 'SHANTY',   // for the run's split board, where the column is narrow
        name: 'Shanty Town',
        tagline: 'Crashed hulls, bone, grog for coin.',
        levels: []
      },
      {
        id: 'aleforge',
        short: 'ALEFORGE',   // for the run's split board, where the column is narrow
        name: 'Aleforge',
        tagline: 'Brick, copper and steam. The real Trials.',
        levels: []
      },
      {
        id: 'providence',
        short: 'PROV',   // for the run's split board, where the column is narrow
        name: 'Providence',
        tagline: 'Order, tonic, prayer. All on the beat.',
        levels: []
      },
      {
        id: 'fenwick',
        short: 'FENWICK',   // for the run's split board, where the column is narrow
        name: 'Fenwick',
        tagline: 'Mud magic and moss monks.',
        levels: []
      },
      {
        id: 'roto',
        short: 'ROTO',   // for the run's split board, where the column is narrow
        name: 'Roto Kaiishi',
        tagline: 'A market on stilts. Everything has a price.',
        levels: []
      },
      {
        id: 'tavern',
        short: 'TAVERN',   // for the run's split board, where the column is narrow
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

    /**
     * The level whose shard this one is gated behind, or null for the first
     * level of an area. Bonus levels are skipped when looking backwards, so a
     * branch can never become a step on the main road.
     */
    gatedBehind: function (def) {
      var t = this.get(def.town);
      var i = this.indexOf(def.town, def.id);
      if (!t || i <= 0) return null;
      for (var j = i - 1; j >= 0; j--) {
        if (!t.levels[j].bonus) return t.levels[j];
      }
      return null;
    },

    /**
     * The level this one's shard is the key to, or null. Used by the play
     * scene to say so on the way in rather than on the results card, by which
     * point it is too late to go back for it.
     */
    opensWith: function (def) {
      var flat = this.allLevels();
      for (var i = 0; i < flat.length; i++) {
        var other = flat[i].def;
        if (other === def) continue;
        if (this.gatedBehind(other) === def) return other;
        if (other.unlockAfter === def.id &&
            (other.unlockAfterTown || other.town) === def.town) return other;
      }
      return null;
    },

    /** Open only once the previous level in this area has given up its shard. */
    isUnlocked: function (def) {
      var prev = this.gatedBehind(def);
      if (prev && !PL.Store.hasShardFrom(def.town, prev.id)) return false;
      // An explicit `unlockAfter` gates on its own — `bonus` only decides how
      // the level-select draws the row. Owe Block uses both; the finale uses
      // just this, to hang itself off the end of the previous area.
      if (def.unlockAfter &&
          !PL.Store.hasShardFrom(def.unlockAfterTown || def.town, def.unlockAfter)) {
        return false;
      }
      return true;
    },

    unlockNote: function (def) {
      if (this.isUnlocked(def)) return '';
      if (def.unlockNote) return def.unlockNote;
      var prev = this.gatedBehind(def);
      return prev ? 'Bring back the Red-Earth Shard from ' + prev.name + '.'
                  : 'Locked.';
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
