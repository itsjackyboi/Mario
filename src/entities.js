/* entities.js — the entity base class, the type registry, and tile collision.
 *
 * Everything that lives in a level (pickups, enemies, props, the player) is an
 * Entity. New types register themselves with `PL.Entities.define(type, ctor)`
 * so a level file only ever refers to a type name — engine code never needs to
 * know about Shanty-Town-specific things.
 */
(function (PL) {
  'use strict';

  var T = PL.TILE;

  // ------------------------------------------------------------------ registry

  var registry = {};

  PL.Entities = {
    define: function (type, ctor) { registry[type] = ctor; },
    has: function (type) { return !!registry[type]; },
    create: function (type, opts) {
      var Ctor = registry[type];
      if (!Ctor) throw new Error('Unknown entity type: ' + type);
      var e = new Ctor(opts || {});
      e.type = type;
      return e;
    }
  };

  // ------------------------------------------------------------------- physics

  var Physics = (PL.Physics = {});

  function substeps(d) { return Math.max(1, Math.ceil(Math.abs(d) / 8)); }

  /** Horizontal move with solid-tile resolution. Returns true if blocked. */
  Physics.moveX = function (a, world, dx) {
    if (!dx) return false;
    var n = substeps(dx), s = dx / n, hit = false;
    for (var i = 0; i < n && !hit; i++) {
      a.x += s;
      var y0 = Math.floor(a.y / T), y1 = Math.floor((a.y + a.h - 1) / T);
      if (s > 0) {
        var tx = Math.floor((a.x + a.w - 1) / T);
        for (var ty = y0; ty <= y1; ty++) {
          if (world.solidAt(tx, ty)) { a.x = tx * T - a.w; hit = true; break; }
        }
      } else {
        var tx2 = Math.floor(a.x / T);
        for (var ty2 = y0; ty2 <= y1; ty2++) {
          if (world.solidAt(tx2, ty2)) { a.x = (tx2 + 1) * T; hit = true; break; }
        }
      }
    }
    return hit;
  };

  /**
   * Vertical move. Resolves solid tiles in both directions and one-way
   * surfaces (plank tiles + platform entities) only while falling onto them.
   * Sets a.grounded / a.riding.
   */
  Physics.moveY = function (a, world, dy) {
    if (!dy) return false;
    var n = substeps(dy), s = dy / n, hit = false;
    for (var i = 0; i < n && !hit; i++) {
      var prevBottom = a.y + a.h;
      a.y += s;
      var x0 = Math.floor(a.x / T), x1 = Math.floor((a.x + a.w - 1) / T);

      if (s > 0) {
        var ty = Math.floor((a.y + a.h - 1) / T);
        for (var tx = x0; tx <= x1 && !hit; tx++) {
          if (world.solidAt(tx, ty)) { a.y = ty * T - a.h; hit = true; a.grounded = true; }
        }
        if (!hit && !a.dropThrough) {
          for (var tx3 = x0; tx3 <= x1 && !hit; tx3++) {
            if (world.oneWayAt(tx3, ty) && prevBottom <= ty * T + 2) {
              a.y = ty * T - a.h; hit = true; a.grounded = true;
            }
          }
        }
        if (!hit && !a.dropThrough && a.usePlatforms !== false) {
          var plats = world.platforms;
          for (var p = 0; p < plats.length && !hit; p++) {
            var pl = plats[p];
            if (!pl.active) continue;
            if (a.x + a.w <= pl.x + 1 || a.x >= pl.x + pl.w - 1) continue;
            if (prevBottom <= pl.y + 3 && a.y + a.h >= pl.y) {
              a.y = pl.y - a.h; hit = true; a.grounded = true; a.riding = pl;
              if (pl.onStand) pl.onStand(a);
            }
          }
        }
      } else {
        var tyU = Math.floor(a.y / T);
        for (var tx4 = x0; tx4 <= x1 && !hit; tx4++) {
          if (world.solidAt(tx4, tyU)) { a.y = (tyU + 1) * T; hit = true; }
        }
      }
    }
    return hit;
  };

  /** True if any lethal tile overlaps the box (water, spikes). */
  Physics.lethalOverlap = function (world, box) {
    var x0 = Math.floor(box.x / T), x1 = Math.floor((box.x + box.w - 1) / T);
    var y0 = Math.floor(box.y / T), y1 = Math.floor((box.y + box.h - 1) / T);
    for (var ty = y0; ty <= y1; ty++) {
      for (var tx = x0; tx <= x1; tx++) {
        if (world.lethalAt(tx, ty)) return world.tileAt(tx, ty);
      }
    }
    return 0;
  };

  /** Is there ground (solid or one-way) directly under this point? */
  Physics.groundUnder = function (world, px, py) {
    var tx = Math.floor(px / T), ty = Math.floor(py / T);
    return world.solidAt(tx, ty) || world.oneWayAt(tx, ty);
  };

  // ---------------------------------------------------------------- base class

  function Entity(opts) {
    opts = opts || {};
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.w = opts.w || 24;
    this.h = opts.h || 24;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.riding = null;
    this.dropThrough = 0;
    this.dead = false;
    this.remove = false;
    this.t = 0;
    this.facing = 1;
    // Entities only tick/draw when near the camera unless this is false.
    this.cull = opts.cull !== false;
  }

  Entity.prototype.box = function () {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  };

  Entity.prototype.cx = function () { return this.x + this.w / 2; };
  Entity.prototype.cy = function () { return this.y + this.h / 2; };

  Entity.prototype.update = function () { this.t += PL.STEP; };
  Entity.prototype.draw = function () {};

  /** Called when the player's box overlaps this entity. */
  Entity.prototype.touch = function () {};

  PL.Entity = Entity;

  /** Helper for subclasses: `PL.extend(Child, Entity)`. */
  PL.extend = function (Child, Parent) {
    Child.prototype = Object.create(Parent.prototype);
    Child.prototype.constructor = Child;
    return Child;
  };

})(window.PL = window.PL || {});
