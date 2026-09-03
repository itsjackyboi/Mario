/* scene-letter.js — the letter that got Corb on a boat.
 *
 * Reached from the small envelope on the title screen (click it, or press L).
 * Drawn as a sheet of paper over a dimmed title, closed with a click, ESC or
 * ENTER.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  var BODY = [
    'Dear Corb,',
    '',
    'The situation here in Aleforge has become unbearable. Our Mayor, Seamus ' +
      'Bonehardy, has implemented a whopping total of 0 policies. The Drunken ' +
      'Trials crowned Jagerbauhm as sole king, but he was definitely not the ' +
      'best of the lot even when they were all kings!',
    '',
    'We need someone with sense in a place of power, we need someone who ' +
      'understands what it is to rule. That is why, my dear nephew, I write to ' +
      'you. Please come to Aleforge and compete in the Drunken Trials to take ' +
      'this dear city away from the hands of these Six men.',
    '',
    'Respectfully,',
    'Mr. BBL'
  ];

  function LetterScene() {
    this.opaque = false;   // the title stays behind it
    this.t = 0;
    this.lines = null;
  }

  LetterScene.prototype.enter = function () { this.t = 0; };

  LetterScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (this.t > 0.15 &&
        (In.pressed('back') || In.pressed('confirm') || In.pressed('jump') ||
         In.pressed('letter') || In.mouse.clicked)) {
      PL.Audio.sfx('menu');
      PL.Game.pop();
    }
  };

  /** Lay the body out once, at the width the sheet actually has. */
  LetterScene.prototype.layout = function (ctx, w) {
    if (this.lines) return this.lines;
    ctx.font = PL.FONT.body;
    var out = [];
    for (var i = 0; i < BODY.length; i++) {
      if (!BODY[i]) { out.push(''); continue; }
      var wrapped = U.wrapText(ctx, BODY[i], w);
      for (var j = 0; j < wrapped.length; j++) out.push(wrapped[j]);
    }
    this.lines = out;
    return out;
  };

  LetterScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H;
    var open = Math.min(1, this.t / 0.22);

    ctx.save();
    ctx.globalAlpha = 0.72 * open;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    var pw = 462, ph = 300;
    var px = (W - pw) / 2, py = (H - ph) / 2;

    ctx.save();
    // a slight unfolding, so it reads as paper being opened
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.scale(1, 0.35 + open * 0.65);
    ctx.translate(-pw / 2, -ph / 2);
    ctx.globalAlpha = open;

    // the sheet
    ctx.fillStyle = 'rgba(20,12,16,0.5)';
    ctx.fillRect(6, 8, pw, ph);
    ctx.fillStyle = '#efe2c2';
    ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = 'rgba(160,130,88,0.18)';
    ctx.fillRect(0, 0, pw, 5);
    ctx.fillRect(0, ph - 5, pw, 5);
    // fold creases
    ctx.strokeStyle = 'rgba(140,112,74,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ph / 3); ctx.lineTo(pw, ph / 3);
    ctx.moveTo(0, ph * 2 / 3); ctx.lineTo(pw, ph * 2 / 3);
    ctx.stroke();

    var lines = this.layout(ctx, pw - 64);
    var y = 40;
    for (var i = 0; i < lines.length; i++) {
      var last = i >= lines.length - 2;
      PL.gfx.text(ctx, lines[i], 32, y, {
        font: last ? PL.FONT.hud : PL.FONT.body,
        color: last ? '#4a2f22' : '#3a2a20',
        shadow: false
      });
      y += lines[i] ? 15 : 9;
    }

    // wax seal, bottom right
    ctx.fillStyle = '#8c3630';
    ctx.beginPath();
    ctx.arc(pw - 56, ph - 52, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d4574e';
    ctx.beginPath();
    ctx.arc(pw - 56, ph - 52, 15, 0, Math.PI * 2);
    ctx.fill();
    PL.gfx.text(ctx, 'BBL', pw - 56, ph - 47, {
      font: PL.FONT.small, align: 'center', color: '#5e211d', shadow: false
    });

    // The hint lives on the paper: the sheet fills nearly the whole viewport,
    // so anything below it would land on the title's control legend.
    if (open >= 1) {
      PL.gfx.text(ctx, 'click, ENTER or ESC to fold it up', 32, ph - 18, {
        font: PL.FONT.tiny, color: 'rgba(90,68,54,0.7)', shadow: false
      });
    }
    ctx.restore();
  };

  /* The envelope on the title screen. Drawn and hit-tested from one place so
   * the icon and its click target can never drift apart. */
  PL.LetterIcon = {
    box: { x: 574, y: 250, w: 48, h: 34 },

    draw: function (ctx, t, hot) {
      var b = this.box;
      var lift = hot ? 3 : 0;
      var x = b.x, y = b.y - lift + Math.sin(t * 1.6) * 1.5;

      PL.gfx.glow(ctx, x + b.w / 2, y + b.h / 2, hot ? 42 : 28,
                  'rgba(255,179,71,0.45)', hot ? 0.6 : 0.32);
      ctx.fillStyle = hot ? '#f6e6c2' : '#e2d2ad';
      ctx.fillRect(x, y, b.w, b.h);
      ctx.strokeStyle = '#8c6a44';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, b.w - 1, b.h - 1);
      // the flap
      ctx.strokeStyle = '#a5865c';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + b.w / 2, y + b.h * 0.62);
      ctx.lineTo(x + b.w, y);
      ctx.stroke();
      // seal
      ctx.fillStyle = '#d4574e';
      ctx.beginPath();
      ctx.arc(x + b.w / 2, y + b.h * 0.66, 6, 0, Math.PI * 2);
      ctx.fill();

      PL.gfx.text(ctx, hot ? 'read it' : 'a letter', x + b.w / 2, y + b.h + 12, {
        font: PL.FONT.tiny, align: 'center',
        color: hot ? C.lanternHi : 'rgba(242,227,196,0.55)'
      });
    },

    hot: function () {
      var b = this.box;
      return PL.Input.hovering(b.x - 6, b.y - 6, b.w + 12, b.h + 24);
    },

    clicked: function () {
      var b = this.box;
      return PL.Input.clickedIn(b.x - 6, b.y - 6, b.w + 12, b.h + 24);
    }
  };

  PL.LetterScene = LetterScene;

})(window.PL = window.PL || {});
