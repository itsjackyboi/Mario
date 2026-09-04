/* pet.js — the animal trotting along behind Corb.
 *
 * Bought from the Beer Bank, purely cosmetic, and deliberately inert: it has
 * no body in the physics world, cannot be stood on, cannot be hit, and cannot
 * touch anything. It is drawn and nothing else, which is the only way to be
 * certain a cosmetic never changes a time on the shared board.
 *
 * It follows by walking a short trail of where Corb has recently been rather
 * than by steering toward him. Steering makes an animal that cuts corners and
 * walks through walls; a trail makes one that goes where you went, which is
 * what a following animal looks like. When Corb is airborne the trail keeps
 * being recorded, so the pet takes the same jump a moment later — which is
 * funnier and cheaper than giving it physics of its own.
 *
 * Its name is always drawn above it. That was asked for, and it is right: half
 * the point of a 20,000-grog ghost horse is that everyone can read who it is.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var LAG = 26;          // frames of trail between Corb and the animal
  var MAX_TRAIL = 90;

  function Pet(cfg) {
    this.cfg = cfg;
    this.trail = [];
    this.t = 0;
    this.x = 0; this.y = 0;
    this.facing = 1;
    this.ready = false;
  }

  Pet.prototype.reset = function (p) {
    this.trail.length = 0;
    this.x = p.x; this.y = p.y;
    this.ready = false;
  };

  Pet.prototype.update = function (dt, p) {
    this.t += dt;
    // Record where he is, then stand where he was LAG frames ago.
    this.trail.push({ x: p.x, y: p.y, f: p.facing, g: p.gsign });
    if (this.trail.length > MAX_TRAIL) this.trail.shift();
    if (this.trail.length <= LAG) { this.x = p.x; this.y = p.y; return; }

    var at = this.trail[this.trail.length - 1 - LAG];
    var dx = at.x - this.x;
    this.x = at.x;
    this.y = at.y;
    this.gsign = at.g;
    if (Math.abs(dx) > 0.3) this.facing = dx > 0 ? 1 : -1;
    this.ready = true;
  };

  Pet.prototype.draw = function (ctx, cam) {
    if (!this.ready) return;
    var s = 22;
    var x = Math.round(this.x - cam.ox()) + (this.facing > 0 ? -4 : 2);
    var y = Math.round(this.y - cam.oy()) + 28 - s;
    if (x < -60 || x > PL.VIEW_W + 60) return;

    ctx.save();
    // Face the way it is walking, and turn over with him under a veil gate.
    ctx.translate(x + s / 2, y + s / 2);
    ctx.scale(this.facing > 0 ? -1 : 1, this.gsign < 0 ? -1 : 1);
    ctx.translate(-s / 2, -s / 2);
    this.cfg.draw(ctx, 0, 0, s, this.t);
    ctx.restore();

    // The name, always. Small, and above the animal so it never sits over the
    // ground you are trying to read.
    var label = this.cfg.name;
    ctx.save();
    ctx.font = PL.FONT.tiny;
    var w = ctx.measureText(label).width + 8;
    var lx = x + s / 2, ly = y - 9;
    PL.gfx.rect(ctx, lx - w / 2, ly - 8, w, 11, 'rgba(18,12,17,0.72)');
    PL.gfx.text(ctx, label, lx, ly, {
      font: PL.FONT.tiny, align: 'center', color: C.parchment, shadow: false
    });
    ctx.restore();
  };

  /** The pet for this run, or null if none is worn. Built once per level. */
  PL.makePet = function () {
    var cfg = PL.Bank.worn('pet');
    return cfg ? new Pet(cfg) : null;
  };

  PL.Pet = Pet;

})(window.PL = window.PL || {});
