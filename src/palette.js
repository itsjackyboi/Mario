/* palette.js — the deliberate colour set for the whole game, plus low-level
 * drawing helpers. Shanty Town is warm lantern-light against a dusk cliff:
 * sun-bleached salvage wood, bone, rope, barnacle teal, and one hot coral red
 * reserved for danger and key items. Nothing else gets to be saturated.
 */
(function (PL) {
  'use strict';

  PL.C = {
    // Dusk sky, top to horizon
    skyTop:    '#2b2038',
    skyMid:    '#5b3a4e',
    skyLow:    '#a95a4c',
    skyHaze:   '#e0975a',
    sunDisc:   '#ffd08a',

    // Sea
    seaDeep:   '#12303c',
    seaMid:    '#1b4655',
    seaSurf:   '#2f7183',
    seaFoam:   '#cfe6e4',

    // Salvage timber
    woodDark:  '#4b2f1d',
    wood:      '#7a5130',
    woodLite:  '#a9773f',
    woodPale:  '#c99a5c',

    // Bone & rope
    bone:      '#d8c69c',
    boneDark:  '#a8926a',
    rope:      '#9c7c52',

    // Light
    lantern:   '#ffb347',
    lanternHi: '#ffe2a8',
    flame:     '#ff8b42',

    // Accents
    coral:     '#d4574e',   // danger, red-earth shard
    coralDark: '#8c3630',
    grog:      '#c9762e',   // grog barrel body
    grogBand:  '#f0b45e',
    teal:      '#4fb8a5',   // clockheart tonic
    pale:      '#c6d3d8',   // hollow urn / soullessness
    ink:       '#160f14',
    inkSoft:   '#241a24',
    parchment: '#f2e3c4'
  };

  PL.FONT = {
    tiny:  '8px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    small: 'bold 10px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    hud:   'bold 13px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    body:  '12px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    head:  'bold 20px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    title: 'bold 34px "Trebuchet MS", "Segoe UI", system-ui, sans-serif',
    mono:  'bold 12px "Consolas", "Courier New", monospace'
  };

  var G = (PL.gfx = {});

  G.rect = function (ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h));
  };

  G.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  G.panel = function (ctx, x, y, w, h, opts) {
    opts = opts || {};
    ctx.save();
    ctx.globalAlpha = opts.alpha == null ? 0.92 : opts.alpha;
    G.roundRect(ctx, x, y, w, h, opts.r || 5);
    ctx.fillStyle = opts.fill || 'rgba(22,15,20,0.93)';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = opts.stroke || PL.C.rope;
    G.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, (opts.r || 5) - 1);
    ctx.stroke();
    ctx.restore();
  };

  /** Text with a hard 1px drop shadow — keeps HUD legible over any backdrop. */
  G.text = function (ctx, str, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || PL.FONT.hud;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    if (opts.shadow !== false) {
      ctx.fillStyle = opts.shadowColor || 'rgba(10,6,10,0.85)';
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = opts.color || PL.C.parchment;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  /** Warm radial pool of lantern light. */
  G.glow = function (ctx, x, y, r, color, strength) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength == null ? 0.55 : strength;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  /** A plank face: base colour, darker grain lines, two nail heads. */
  G.plank = function (ctx, x, y, w, h, base, grain, nails) {
    G.rect(ctx, x, y, w, h, base);
    ctx.fillStyle = grain;
    var lines = Math.max(1, Math.floor(h / 7));
    for (var i = 0; i < lines; i++) {
      var ly = y + 3 + i * 7;
      if (ly < y + h - 1) ctx.fillRect(x + 2, ly, w - 4, 1);
    }
    if (nails !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(x + 3, y + 3, 2, 2);
      ctx.fillRect(x + w - 5, y + h - 5, 2, 2);
    }
  };

})(window.PL = window.PL || {});
