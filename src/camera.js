/* camera.js — follows the player with a horizontal dead-zone, clamps to the
 * level bounds, and owns the screen-shake offset.
 */
(function (PL) {
  'use strict';

  function Camera(worldW, worldH) {
    this.x = 0;
    this.y = 0;
    this.worldW = worldW;
    this.worldH = worldH;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  Camera.prototype.follow = function (target, instant) {
    var vw = PL.VIEW_W, vh = PL.VIEW_H;
    var cx = target.x + target.w / 2;
    var cy = target.y + target.h / 2;

    // Horizontal: keep the player inside a centred dead-zone, biased forward.
    var desiredX = cx - vw * 0.42 + (target.facing > 0 ? 34 : -34);
    var desiredY = cy - vh * 0.58;

    if (instant) {
      this.x = desiredX;
      this.y = desiredY;
    } else {
      this.x += (desiredX - this.x) * 0.12;
      this.y += (desiredY - this.y) * 0.09;
    }
    this.x = PL.util.clamp(this.x, 0, Math.max(0, this.worldW - vw));
    this.y = PL.util.clamp(this.y, 0, Math.max(0, this.worldH - vh));
  };

  Camera.prototype.kick = function (amount) {
    this.shake = Math.max(this.shake, amount);
  };

  Camera.prototype.update = function () {
    if (this.shake > 0.05) {
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
      this.shake *= 0.86;
    } else {
      this.shake = this.shakeX = this.shakeY = 0;
    }
  };

  Camera.prototype.ox = function () { return Math.round(this.x + this.shakeX); };
  Camera.prototype.oy = function () { return Math.round(this.y + this.shakeY); };

  /** True if a world-space box is anywhere near the viewport. */
  Camera.prototype.sees = function (x, y, w, h, pad) {
    pad = pad || 64;
    return x + w > this.x - pad && x < this.x + PL.VIEW_W + pad &&
           y + h > this.y - pad && y < this.y + PL.VIEW_H + pad;
  };

  PL.Camera = Camera;

})(window.PL = window.PL || {});
