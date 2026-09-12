/* scene-name.js — who is signing the book.
 *
 * A small overlay over the title. It is the one place in the game that takes
 * typed text, so it drives `PL.Input.beginText()` — while that is on, keys go
 * to a real hidden input rather than the action map, which is why typing "Wes"
 * does not also make Corb jump and why an M in a name is an M rather than the
 * mute key. Every letter and symbol a keyboard can produce is allowed; the
 * length is the only limit.
 *
 * The name is only ever used as a label on the shared board. There is no
 * account and nothing to prove: two people can pick the same name and the board
 * will happily show both.
 */
(function (PL) {
  'use strict';

  var C = PL.C;

  function NameScene() {
    this.opaque = false;      // the title keeps drawing behind it
    this.t = 0;
  }

  NameScene.prototype.enter = function () {
    this.t = 0;
    PL.Input.beginText(PL.Store.playerName(), 16);
  };

  NameScene.prototype.exit = function () { PL.Input.endText(); };

  /* THE TWO BUTTONS UNDER THE FIELD, and why they are not `touchKeys` like
   * every other screen's.
   *
   * While a name is being typed the tap belongs to the keyboard — touch.js
   * stands aside on purpose, so a finger can put the caret where it likes
   * without the game grabbing it — which means these have to be the scene's
   * own hit tests. They are also only drawn for a finger: a keyboard already
   * has ENTER and ESC, and the line that says so is where these sit.
   *
   * A phone's own return key does sign the book, because the hidden field is
   * a real text input and its Enter is a real Enter. There is no equivalent
   * for ESC, though, and a dialog you cannot leave is the worse half.
   */
  NameScene.prototype.softOn = function () { return !!(PL.Touch && PL.Touch.on); };

  NameScene.prototype.btnBox = function (i) {
    var w = 340, h = 128;
    var x = (PL.VIEW_W - w) / 2, y = (PL.VIEW_H - h) / 2;
    var bw = 116;
    return { x: i === 0 ? x + 24 : x + w - 24 - bw, y: y + 94, w: bw, h: 26 };
  };

  NameScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (this.softOn() && In.mouse.clicked) {
      var cancel = this.btnBox(0), sign = this.btnBox(1);
      if (In.clickedIn(cancel.x, cancel.y, cancel.w, cancel.h)) {
        PL.Audio.sfx('menu'); PL.Game.pop(); return;
      }
      if (In.clickedIn(sign.x, sign.y, sign.w, sign.h)) {
        PL.Store.setPlayerName(In.text);
        PL.Audio.sfx('select'); PL.Game.pop(); return;
      }
    }
    if (In.textDone) {
      PL.Store.setPlayerName(In.text);
      PL.Audio.sfx('select');
      PL.Game.pop();
      return;
    }
    if (In.textCancel) {
      PL.Audio.sfx('menu');
      PL.Game.pop();
    }
  };

  NameScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var open = Math.min(1, this.t / 0.18);

    ctx.save();
    ctx.globalAlpha = 0.7 * open;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    var w = 340, h = 128;
    var x = (W - w) / 2, y = (H - h) / 2;
    ctx.save();
    ctx.globalAlpha = open;
    PL.gfx.panel(ctx, x, y, w, h, { r: 6, alpha: 1 });

    PL.gfx.text(ctx, 'SIGN THE BOOK', x + w / 2, y + 26, {
      font: PL.FONT.head, align: 'center', color: C.parchment
    });
    PL.gfx.text(ctx, 'Any letter, any symbol. It is only a label.',
      x + w / 2, y + 44, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.55)'
      });

    // the field
    var fx = x + 24, fy = y + 58, fw = w - 48;
    PL.gfx.rect(ctx, fx, fy, fw, 28, 'rgba(12,8,12,0.7)');
    ctx.strokeStyle = C.lantern;
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + 0.5, fy + 0.5, fw - 1, 27);

    var typed = PL.Input.text;
    PL.gfx.text(ctx, typed || 'anonymous', fx + 10, fy + 19, {
      font: PL.FONT.hud,
      color: typed ? C.parchment : 'rgba(242,227,196,0.35)'
    });
    // The caret sits where the field's cursor is, not at the end of the line —
    // the arrow keys, home/end and a click all move it, and a caret that
    // ignored them would be lying about where the next letter lands.
    if (Math.floor(this.t * 2) % 2 === 0) {
      ctx.font = PL.FONT.hud;
      var at = Math.max(0, Math.min(PL.Input.caret == null ? typed.length : PL.Input.caret,
                                    typed.length));
      var cw = ctx.measureText(typed.slice(0, at)).width;
      PL.gfx.rect(ctx, fx + 11 + cw, fy + 7, 1, 15, C.lanternHi);
    }
    PL.gfx.text(ctx, PL.Input.textMax - typed.length + ' left', fx + fw - 8, fy + 19, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.35)'
    });

    if (this.softOn()) {
      var labels = ['LEAVE IT', 'SIGN'];
      for (var bi = 0; bi < 2; bi++) {
        var b = this.btnBox(bi);
        PL.gfx.panel(ctx, b.x, b.y, b.w, b.h, {
          r: 5, alpha: 1,
          fill: bi ? 'rgba(255,179,71,0.22)' : 'rgba(18,12,17,0.8)',
          stroke: bi ? C.lantern : C.rope
        });
        PL.gfx.text(ctx, labels[bi], b.x + b.w / 2, b.y + 17, {
          font: PL.FONT.small, align: 'center',
          color: bi ? C.lanternHi : 'rgba(242,227,196,0.75)'
        });
      }
    } else {
      PL.gfx.text(ctx, 'ENTER to sign  ·  ESC to leave it', x + w / 2, y + h - 14, {
        font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
      });
    }
    ctx.restore();
  };

  PL.NameScene = NameScene;

})(window.PL = window.PL || {});
