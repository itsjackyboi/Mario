/* themes.js — per-town visual identity.
 *
 * `PL.C` is the single palette object every drawing routine reads. A theme is
 * a set of overrides applied *into* that object when a level loads, so nothing
 * downstream has to know about towns: tiles, props and backdrops keep reading
 * PL.C exactly as before and simply come out a different colour.
 *
 * A theme also picks tile *styles* — how the solid, platform and spike tiles
 * are actually drawn (brick vs. plank vs. cut stone). See tiles.js.
 *
 * UI colours (parchment, lantern, ink, coral, grog) are deliberately NOT
 * themed: the HUD and the Red-Earth Shard must look the same in every town.
 *
 * To add a town: PL.Theme.register('<town>', { colors: {...}, tiles: {...} }).
 */
(function (PL) {
  'use strict';

  var BASE = {};
  for (var k in PL.C) BASE[k] = PL.C[k];

  var themes = {};

  var Theme = (PL.Theme = {
    current: null,

    register: function (townId, def) { themes[townId] = def; },
    get: function (townId) { return themes[townId] || null; },

    /** Swap the live palette to a town's, or back to base with no argument. */
    apply: function (townId) {
      for (var key in BASE) PL.C[key] = BASE[key];
      PL.Tiles.style = { solid: 'salvage', plank: 'board', spike: 'harpoon' };
      this.current = null;
      var t = themes[townId];
      if (!t) return;
      if (t.colors) for (var c in t.colors) PL.C[c] = t.colors[c];
      if (t.tiles) for (var s in t.tiles) PL.Tiles.style[s] = t.tiles[s];
      this.current = townId;
    }
  });

  // ---------------------------------------------------------------- Shanty Town
  // The original: sun-bleached salvage against a dusk sea. This is the base
  // palette, registered explicitly so `apply` is symmetric for every town.
  Theme.register('shantytown', {
    tiles: { solid: 'salvage', plank: 'board', spike: 'harpoon' }
  });

  // ------------------------------------------------------------------ Aleforge
  // Warm brick and copper, hop-green trim, a brewing-town haze of steam and
  // late gold. Nothing here is bleached — it is all fired, malted, polished.
  Theme.register('aleforge', {
    colors: {
      skyTop: '#2a1d2c', skyMid: '#6b3a34', skyLow: '#c2703a', skyHaze: '#f0b463',
      sunDisc: '#ffe6a8',
      seaDeep: '#3a1d10', seaMid: '#6e3512', seaSurf: '#b8641c', seaFoam: '#f6cf82',
      woodDark: '#5a2419', wood: '#8f3d26', woodLite: '#b9573a', woodPale: '#d98f5e',
      bone: '#e2c07a', boneDark: '#a8863f', rope: '#b08a4a',
      hazard: '#ff9d3d', hazardDark: '#a34a12'
    },
    tiles: { solid: 'brick', plank: 'catwalk', spike: 'burner' }
  });

  // ---------------------------------------------------------------- Providence
  // Cut stone, cold blue shadow, one disciplined stripe of gold leaf. The
  // opposite of Shanty Town in every way, which is the point.
  Theme.register('providence', {
    colors: {
      skyTop: '#101a2e', skyMid: '#25406b', skyLow: '#5f7fa8', skyHaze: '#b8c8d8',
      sunDisc: '#eef4fb',
      seaDeep: '#0b1626', seaMid: '#15304d', seaSurf: '#3d6a90', seaFoam: '#dbe7f2',
      woodDark: '#3c4457', wood: '#6d7689', woodLite: '#98a1b3', woodPale: '#cfd6e2',
      bone: '#e8ecf3', boneDark: '#9aa4b6', rope: '#7d8698',
      lantern: '#ffd77a', lanternHi: '#fff2c8',
      hazard: '#7fd0e8', hazardDark: '#2c6a86'
    },
    tiles: { solid: 'ashlar', plank: 'marble', spike: 'iron' }
  });

  // ----------------------------------------------------------------- Owe Block
  // Soot, rust and sodium light. Two gang colours are the only saturation
  // allowed, so the player can read territory at a glance.
  Theme.register('oweblock', {
    colors: {
      skyTop: '#0d0d12', skyMid: '#1e1a22', skyLow: '#3c2f2c', skyHaze: '#6b4a33',
      sunDisc: '#8a6b45',
      seaDeep: '#08080b', seaMid: '#121118', seaSurf: '#2a2530', seaFoam: '#5a5260',
      woodDark: '#25232a', wood: '#3f3b44', woodLite: '#5c5661', woodPale: '#7d7684',
      bone: '#b8ae9e', boneDark: '#6f6659', rope: '#6a5c48',
      lantern: '#ffa62b', lanternHi: '#ffd591',
      hazard: '#c9552e', hazardDark: '#6e2a17'
    },
    tiles: { solid: 'grime', plank: 'scaffold', spike: 'rebar' }
  });

  // ------------------------------------------------------------------- Fenwick
  // Wet green dusk. Deep moss, bog water, and the cold blue-white of
  // spirit-light — the only bright thing in the whole town.
  Theme.register('fenwick', {
    colors: {
      skyTop: '#101f1c', skyMid: '#1f3a30', skyLow: '#3f5c3c', skyHaze: '#7d9257',
      sunDisc: '#cfe3a8',
      seaDeep: '#0d1a16', seaMid: '#1c3129', seaSurf: '#3d5a41', seaFoam: '#9fc8a8',
      woodDark: '#2c2a1c', wood: '#4b4426', woodLite: '#6b6135', woodPale: '#8f8a4c',
      bone: '#c8d4a6', boneDark: '#7d8a5e', rope: '#6d7a4a',
      lantern: '#9fe8d8', lanternHi: '#e2fff6',
      hazard: '#a8d152', hazardDark: '#4e6b22'
    },
    tiles: { solid: 'loam', plank: 'bough', spike: 'thorn' }
  });

  // -------------------------------------------------------------------- Roto
  // A floating market at noon: bleached bamboo, dyed canvas, turquoise water.
  // The brightest, busiest palette in the game.
  Theme.register('roto', {
    colors: {
      skyTop: '#1c3a52', skyMid: '#3d7f96', skyLow: '#8fc4c0', skyHaze: '#f2dfa6',
      sunDisc: '#fff4c4',
      seaDeep: '#0e4a52', seaMid: '#136d73', seaSurf: '#2fa8a0', seaFoam: '#d6f5ec',
      woodDark: '#7a5a2c', wood: '#b08b43', woodLite: '#d9b464', woodPale: '#f2dc9a',
      bone: '#f4ead0', boneDark: '#b8a887', rope: '#c2925a',
      hazard: '#e8515f', hazardDark: '#8f2430'
    },
    tiles: { solid: 'deck', plank: 'awning', spike: 'hook' }
  });

  // --------------------------------------------------------- Sackbeard's Tavern
  // Inside the beast. Bone, sinew, and firelight — the warm end of every other
  // town's palette, turned up and closed in.
  Theme.register('tavern', {
    colors: {
      skyTop: '#150c14', skyMid: '#3a1a20', skyLow: '#6e2f27', skyHaze: '#b8642f',
      sunDisc: '#ffcf8a',
      seaDeep: '#2b1408', seaMid: '#5c2a0e', seaSurf: '#a85a1c', seaFoam: '#f2c97e',
      woodDark: '#4a3324', wood: '#7d5a3c', woodLite: '#a8825a', woodPale: '#d6bb8e',
      bone: '#f0e2bd', boneDark: '#b3a17a', rope: '#a08258',
      hazard: '#e0603e', hazardDark: '#8f2f1c'
    },
    tiles: { solid: 'shell', plank: 'rib', spike: 'fang' }
  });

})(window.PL = window.PL || {});
