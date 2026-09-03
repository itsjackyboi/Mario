/* data/towns.js — the town registry the level-select screen reads.
 *
 * Adding a town later:
 *   1. Add an entry to `list` below (id, name, tagline, sealedNote).
 *   2. Create data/<town>/level-1.js etc. and call
 *      PL.Towns.addLevel('<town>', def) at the bottom of each file.
 *   3. Add the <script> tags to index.html.
 *   4. Optionally register a backdrop: PL.Backdrops.register('<town>', fn).
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
        tagline: 'Brewing capital. The real Trials.',
        sealedNote: 'The Gilded Tankard is not taking newcomers yet.',
        levels: []
      },
      {
        id: 'providence',
        name: 'Providence',
        tagline: 'Order, tonic, prayer. Joyless.',
        sealedNote: 'The Apostles have not opened the lake port.',
        levels: []
      },
      {
        id: 'roto',
        name: 'Roto Kaiishi',
        tagline: 'Trade hub. Everything has a price.',
        sealedNote: 'No berth booked. No coin to book one.',
        levels: []
      },
      {
        id: 'fenwick',
        name: 'Fenwick',
        tagline: 'Mud magic and moss monks.',
        sealedNote: 'The woods have not agreed to let you in.',
        levels: []
      },
      {
        id: 'oweblock',
        name: 'Owe Block',
        tagline: 'Debt, gangs, and cheap rum.',
        sealedNote: 'Your name is not on anybody\'s ledger yet.',
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

    /** The level after this one, or null if it is the last built level. */
    nextLevel: function (townId, levelId) {
      var t = this.get(townId);
      var i = this.indexOf(townId, levelId);
      if (!t || i < 0 || i + 1 >= t.levels.length) return null;
      var def = t.levels[i + 1];
      return { def: def, meta: this.metaFor(townId, def.id) };
    }
  });

})(window.PL = window.PL || {});
