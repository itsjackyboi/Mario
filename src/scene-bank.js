/* scene-bank.js — the Beer Bank.
 *
 * Three shelves — PETS, OUTFITS, HATS — switched with LEFT/RIGHT, browsed with
 * UP/DOWN, and ENTER either buys the thing or puts it on. Nothing in here can
 * be sold back and nothing in here does anything, which keeps the screen
 * honest: it is a wardrobe, not an upgrade tree.
 *
 * The balance is the one number that matters, so it sits top-right in the same
 * place on every shelf, and an item you cannot afford says how far off you are
 * rather than just greying out.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var SHELVES = [
    { slot: 'pet',    label: 'PETS',    list: function () { return PL.Bank.PETS; } },
    { slot: 'outfit', label: 'OUTFITS', list: function () { return PL.Bank.OUTFITS; } },
    { slot: 'hat',    label: 'HATS',    list: function () { return PL.Bank.HATS; } }
  ];

  var LIST_X = 16, LIST_Y = 74, LIST_W = 300, LIST_H = 238;
  var ROW_H = 28;
  var VISIBLE = Math.floor((LIST_H - 14) / ROW_H);

  function BankScene() {
    this.opaque = true;
    this.t = 0;
    this.shelf = 0;
    this.sel = 0;
    this.scroll = 0;
    this.note = '';
    this.noteT = 0;
    this.noteBad = false;
  }

  BankScene.prototype.enter = function () { PL.Theme.apply(null); };

  BankScene.prototype.items = function () { return SHELVES[this.shelf].list(); };
  BankScene.prototype.current = function () { return this.items()[this.sel]; };

  BankScene.prototype.say = function (text, bad) {
    this.note = text;
    this.noteT = 2.6;
    this.noteBad = !!bad;
    PL.Audio.sfx(bad ? 'hurt' : 'select');
  };

  BankScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.noteT > 0) this.noteT -= dt;
    var In = PL.Input;

    if (In.pressed('back')) { PL.Game.pop(); return; }

    if (In.pressed('left')) {
      this.shelf = (this.shelf + SHELVES.length - 1) % SHELVES.length;
      this.sel = 0; this.scroll = 0; PL.Audio.sfx('menu');
    }
    if (In.pressed('right')) {
      this.shelf = (this.shelf + 1) % SHELVES.length;
      this.sel = 0; this.scroll = 0; PL.Audio.sfx('menu');
    }

    var items = this.items();
    if (In.pressed('up')) { this.sel = (this.sel + items.length - 1) % items.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % items.length; PL.Audio.sfx('menu'); }
    if (In.pressed('confirm') || In.pressed('jump')) this.choose();

    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel > this.scroll + VISIBLE - 1) this.scroll = this.sel - VISIBLE + 1;
    this.scroll = U.clamp(this.scroll, 0, Math.max(0, items.length - VISIBLE));
  };

  /** Buy it, wear it, or take it off if it is already on. */
  BankScene.prototype.choose = function () {
    var it = this.current();
    var slot = SHELVES[this.shelf].slot;
    var owned = it.price === 0 || PL.Store.owns(it.id);

    if (!owned) {
      var short = it.price - PL.Store.bank().grog;
      if (short > 0) {
        this.say(short + ' grog short of ' + it.name + '.', true);
        return;
      }
      PL.Store.buy(it.id, it.price);
      PL.Store.equip(slot, it.id);
      this.say('Bought ' + it.name + ', and wearing it.');
      return;
    }

    if (PL.Store.bank()[slot] === it.id) {
      // Taking a pet off leaves you with none; an outfit or hat falls back to
      // the free default, because Corb has to be wearing something.
      PL.Store.equip(slot, '');
      this.say(slot === 'pet' ? it.name + ' stays behind.' : 'Back to what he rowed in.');
      return;
    }
    PL.Store.equip(slot, it.id);
    this.say(slot === 'pet' ? it.name + ' is with you.' : 'Wearing ' + it.name + '.');
  };

  // ------------------------------------------------------------------ draw

  BankScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#20160f');
    g.addColorStop(1, '#3f2a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    PL.gfx.glow(ctx, W / 2, H + 40, 320, 'rgba(255,179,71,0.28)', 0.4);

    var bank = PL.Store.bank();
    PL.gfx.text(ctx, 'THE BEER BANK', 20, 32, { font: PL.FONT.head, color: C.parchment });
    PL.gfx.text(ctx, 'Every barrel you walk out of a level with ends up here.',
      20, 48, { font: PL.FONT.tiny, color: 'rgba(242,227,196,0.5)' });

    // ---- balance, top right, same place on every shelf
    PL.gfx.panel(ctx, W - 228, 12, 212, 44, { r: 5, alpha: 1 });
    PL.ItemIcons.grog(ctx, W - 220, 21, 17);
    PL.gfx.text(ctx, String(bank.grog), W - 22, 36, {
      font: 'bold 19px "Trebuchet MS", "Segoe UI", sans-serif',
      align: 'right', color: C.grogBand
    });
    PL.gfx.text(ctx, U.fit(ctx, 'IN HAND  ·  ' + bank.banked + ' EARNED ALL TIME',
                           PL.FONT.tiny, 196), W - 22, 50, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
    });

    // ---- shelves
    for (var s = 0; s < SHELVES.length; s++) {
      var on = s === this.shelf;
      var tw = 92, tx = 16 + s * (tw + 6);
      PL.gfx.panel(ctx, tx, 56, tw, 18, {
        r: 4, alpha: 1,
        fill: on ? 'rgba(255,179,71,0.22)' : 'rgba(18,12,17,0.6)',
        stroke: on ? C.lantern : 'rgba(156,124,82,0.35)'
      });
      PL.gfx.text(ctx, SHELVES[s].label, tx + tw / 2, 69, {
        font: PL.FONT.tiny, align: 'center',
        color: on ? C.lanternHi : 'rgba(242,227,196,0.5)'
      });
    }

    this.drawList(ctx, bank);
    this.drawDetail(ctx, W, H, bank);

    var hint = (this.noteT > 0 && this.note)
      ? this.note
      : '↑ ↓ pick  ·  ← → shelf  ·  ENTER buy or wear  ·  ESC back';
    PL.gfx.text(ctx, hint, W / 2, H - 10, {
      font: PL.FONT.tiny, align: 'center',
      color: this.noteT > 0 ? (this.noteBad ? C.coral : C.lanternHi)
                            : 'rgba(242,227,196,0.5)'
    });
  };

  BankScene.prototype.drawList = function (ctx, bank) {
    var items = this.items();
    var slot = SHELVES[this.shelf].slot;
    PL.gfx.panel(ctx, LIST_X, LIST_Y, LIST_W, LIST_H, { r: 6 });

    var last = Math.min(items.length, this.scroll + VISIBLE);
    for (var i = this.scroll; i < last; i++) {
      var it = items[i];
      var y = LIST_Y + 10 + (i - this.scroll) * ROW_H;
      var on = i === this.sel;
      var owned = it.price === 0 || PL.Store.owns(it.id);
      var wearing = bank[slot] === it.id || (it.price === 0 && !bank[slot]);
      var afford = bank.grog >= it.price;

      if (on) PL.gfx.rect(ctx, LIST_X + 5, y, LIST_W - 10, ROW_H - 4, 'rgba(255,179,71,0.18)');

      // the thing itself, at icon size
      ctx.save();
      ctx.translate(LIST_X + 12, y + 2);
      if (slot === 'pet') it.draw(ctx, 0, 0, 20, this.t);
      else swatch(ctx, it, slot, 20);
      ctx.restore();

      var nameCol = on ? C.lanternHi : (owned ? C.parchment : 'rgba(242,227,196,0.72)');
      PL.gfx.text(ctx, U.fit(ctx, it.name, PL.FONT.hud, 176), LIST_X + 40, y + 17, {
        font: PL.FONT.hud, color: nameCol
      });

      if (wearing) {
        PL.gfx.text(ctx, 'WORN', LIST_X + LIST_W - 12, y + 17, {
          font: PL.FONT.tiny, align: 'right', color: C.teal
        });
      } else if (owned) {
        PL.gfx.text(ctx, 'OWNED', LIST_X + LIST_W - 12, y + 17, {
          font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.45)'
        });
      } else {
        PL.gfx.text(ctx, String(it.price), LIST_X + LIST_W - 12, y + 17, {
          font: PL.FONT.small, align: 'right',
          color: afford ? C.grogBand : 'rgba(212,87,78,0.85)'
        });
      }
    }

    if (items.length > VISIBLE) {
      var trackX = LIST_X + LIST_W - 5;
      var trackY = LIST_Y + 8, trackH = LIST_H - 16;
      PL.gfx.rect(ctx, trackX, trackY, 3, trackH, 'rgba(242,227,196,0.12)');
      var thumbH = Math.max(18, trackH * VISIBLE / items.length);
      var maxScroll = items.length - VISIBLE;
      PL.gfx.rect(ctx, trackX,
        trackY + (trackH - thumbH) * (maxScroll ? this.scroll / maxScroll : 0),
        3, thumbH, C.lantern);
    }
  };

  BankScene.prototype.drawDetail = function (ctx, W, H, bank) {
    var it = this.current();
    var slot = SHELVES[this.shelf].slot;
    var owned = it.price === 0 || PL.Store.owns(it.id);
    var x = LIST_X + LIST_W + 12;
    var w = W - x - 16;
    PL.gfx.panel(ctx, x, LIST_Y, w, LIST_H, { r: 6 });

    // big preview
    var big = 74;
    var px = x + (w - big) / 2, py = LIST_Y + 18;
    PL.gfx.glow(ctx, px + big / 2, py + big / 2, big, 'rgba(255,179,71,0.22)', 0.4);
    if (slot === 'pet') it.draw(ctx, px, py, big, this.t);
    else swatch(ctx, it, slot, big, px, py);

    PL.gfx.text(ctx, U.fit(ctx, it.name, PL.FONT.head, w - 24), x + w / 2, py + big + 22, {
      font: PL.FONT.head, align: 'center', color: C.lanternHi
    });
    if (it.kind) {
      PL.gfx.text(ctx, it.kind.toUpperCase(), x + w / 2, py + big + 36, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
      });
    }

    ctx.font = PL.FONT.small;
    var lines = U.wrapText(ctx, it.blurb || '', w - 28);
    for (var i = 0; i < lines.length && i < 3; i++) {
      PL.gfx.text(ctx, lines[i], x + w / 2, py + big + 54 + i * 13, {
        font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.75)'
      });
    }

    var footY = LIST_Y + LIST_H - 16;
    if (!owned) {
      var short = it.price - bank.grog;
      PL.gfx.text(ctx, short > 0 ? short + ' grog short' : 'ENTER to buy',
        x + w / 2, footY, {
          font: PL.FONT.small, align: 'center',
          color: short > 0 ? C.coral : C.grogBand
        });
    } else {
      var wearing = bank[slot] === it.id || (it.price === 0 && !bank[slot]);
      PL.gfx.text(ctx, wearing ? (slot === 'pet' ? 'ENTER to leave behind' : 'Worn')
                               : 'ENTER to wear', x + w / 2, footY, {
        font: PL.FONT.small, align: 'center',
        color: wearing ? C.teal : C.parchment
      });
    }
  };

  /** Outfits and hats have no sprite of their own, so show the colours. */
  function swatch(ctx, it, slot, s, x, y) {
    x = x || 0; y = y || 0;
    if (slot === 'outfit') {
      PL.gfx.rect(ctx, x + s * 0.10, y + s * 0.14, s * 0.80, s * 0.56, it.coat);
      PL.gfx.rect(ctx, x + s * 0.10, y + s * 0.62, s * 0.80, s * 0.14, it.trim);
      PL.gfx.rect(ctx, x + s * 0.34, y + s * 0.76, s * 0.32, s * 0.16, it.skin);
    } else {
      PL.gfx.rect(ctx, x + s * 0.08, y + s * 0.34, s * 0.84, s * 0.26, it.hat);
      PL.gfx.rect(ctx, x + s * 0.18, y + s * 0.26, s * 0.64, s * 0.12, it.band);
      if (it.spikes) {
        for (var i = 0; i < 4; i++) {
          ctx.fillStyle = it.crown ? it.hat : it.band;
          ctx.beginPath();
          ctx.moveTo(x + s * (0.18 + i * 0.17), y + s * 0.26);
          ctx.lineTo(x + s * (0.24 + i * 0.17), y + s * 0.06);
          ctx.lineTo(x + s * (0.30 + i * 0.17), y + s * 0.26);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  PL.BankScene = BankScene;

})(window.PL = window.PL || {});
