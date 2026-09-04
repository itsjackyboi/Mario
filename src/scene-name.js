/* scene-name.js — who is signing the book.
 *
 * A small overlay over the title. It is the one place in the game that takes
 * typed text, so it drives `PL.Input.beginText()` — while that is on, the
 * action map is skipped entirely and keys are letters, which is why typing
 * "Wes" does not also make Corb jump.
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

  NameScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
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
    PL.gfx.text(ctx, 'The name your runs go under on the shared board.',
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
    // caret
    if (Math.floor(this.t * 2) % 2 === 0) {
      ctx.font = PL.FONT.hud;
      var cw = ctx.measureText(typed).width;
      PL.gfx.rect(ctx, fx + 11 + cw, fy + 7, 1, 15, C.lanternHi);
    }
    PL.gfx.text(ctx, PL.Input.textMax - typed.length + ' left', fx + fw - 8, fy + 19, {
      font: PL.FONT.tiny, align: 'right', color: 'rgba(242,227,196,0.35)'
    });

    PL.gfx.text(ctx, 'ENTER to sign  ·  ESC to leave it', x + w / 2, y + h - 14, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)'
    });
    ctx.restore();
  };

  PL.NameScene = NameScene;

})(window.PL = window.PL || {});
