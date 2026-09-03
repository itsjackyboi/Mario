/* fx.js — throwaway particles and floating labels. Owned by the World so any
 * entity can call `world.fx.burst(...)` without reaching into the scene.
 */
(function (PL) {
  'use strict';

  function Fx() { this.items = []; }

  Fx.prototype.burst = function (x, y, color, n, opts) {
    opts = opts || {};
    for (var i = 0; i < (n || 8); i++) {
      var a = (opts.angle == null ? Math.random() * Math.PI * 2 : opts.angle + (Math.random() - 0.5) * (opts.spread || 1.4));
      var sp = (opts.speed || 2) * (0.4 + Math.random());
      this.items.push({
        kind: 'p', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.lift || 0.6),
        life: opts.life || 0.55, max: opts.life || 0.55,
        size: opts.size || 3, color: color, grav: opts.grav == null ? 0.22 : opts.grav
      });
    }
  };

  Fx.prototype.ring = function (x, y, color, r) {
    this.items.push({ kind: 'ring', x: x, y: y, r: 2, rMax: r || 34, life: 0.42, max: 0.42, color: color });
  };

  Fx.prototype.label = function (x, y, text, color) {
    this.items.push({ kind: 't', x: x, y: y, vy: -0.7, life: 0.9, max: 0.9, text: text, color: color });
  };

  Fx.prototype.splash = function (x, y) {
    this.burst(x, y, PL.C.seaFoam, 16, { speed: 3.2, lift: 2.4, life: 0.8, size: 3 });
    this.burst(x, y, PL.C.seaSurf, 10, { speed: 2.2, lift: 1.6, life: 0.7, size: 2 });
    this.ring(x, y, 'rgba(207,230,228,0.8)', 44);
  };

  Fx.prototype.update = function (dt) {
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) { this.items.splice(i, 1); continue; }
      if (p.kind === 'p') {
        p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.98;
      } else if (p.kind === 't') {
        p.y += p.vy;
      } else if (p.kind === 'ring') {
        p.r += (p.rMax - p.r) * 0.22;
      }
    }
  };

  Fx.prototype.draw = function (ctx, cam) {
    var ox = cam.ox(), oy = cam.oy();
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      var a = Math.max(0, p.life / p.max);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === 'p') {
        ctx.fillStyle = p.color;
        ctx.fillRect((p.x - ox) | 0, (p.y - oy) | 0, p.size, p.size);
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x - ox, p.y - oy, p.r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        PL.gfx.text(ctx, p.text, p.x - ox, p.y - oy, {
          font: PL.FONT.small, align: 'center', color: p.color
        });
      }
      ctx.restore();
    }
  };

  PL.Fx = Fx;

})(window.PL = window.PL || {});
