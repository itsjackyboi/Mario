/* scene-title.js — title card, premise, and the control legend. */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function TitleScene() {
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.options = ['Row ashore', 'Leaderboards', 'Wipe local records'];
    this.confirmWipe = 0;
    this.stars = [];
    var rnd = U.rng(77);
    for (var i = 0; i < 60; i++) {
      this.stars.push({ x: rnd() * PL.VIEW_W, y: rnd() * 150, a: 0.15 + rnd() * 0.55 });
    }
  }

  TitleScene.prototype.enter = function () { PL.Theme.apply(null); };

  TitleScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.confirmWipe > 0) this.confirmWipe -= dt;
    var In = PL.Input;
    if (In.pressed('up')) { this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      if (this.sel === 0) {
        PL.Game.replace(new PL.LevelSelectScene('shantytown'));
      } else if (this.sel === 1) {
        PL.Game.push(new PL.LeaderboardScene());
      } else {
        if (this.confirmWipe > 0) {
          PL.Store.clearBoard();
          PL.Store.clearProgress();
          this.confirmWipe = 0;
          this.wiped = 1.8;
        } else {
          this.confirmWipe = 3.0;
        }
      }
    }
    if (this.wiped > 0) this.wiped -= dt;
  };

  TitleScene.prototype.draw = function (ctx) {
    var W = PL.VIEW_W, H = PL.VIEW_H, t = this.t;

    // dusk sky
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.45, C.skyMid);
    g.addColorStop(0.78, C.skyLow);
    g.addColorStop(1, C.skyHaze);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (var s = 0; s < this.stars.length; s++) {
      var st = this.stars[s];
      ctx.globalAlpha = st.a * (0.5 + 0.5 * Math.sin(t * 1.5 + s));
      ctx.fillStyle = '#f2e3c4';
      ctx.fillRect(st.x, st.y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // cliff shelf
    ctx.fillStyle = '#33232c';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, 228);
    ctx.lineTo(70, 214); ctx.lineTo(150, 230); ctx.lineTo(240, 218);
    ctx.lineTo(330, 236); ctx.lineTo(430, 222); ctx.lineTo(540, 238);
    ctx.lineTo(W, 226); ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // stacked shanties along the cliff
    var rnd = U.rng(9);
    for (var h = 0; h < 9; h++) {
      var hx = 20 + h * 68 + rnd() * 12;
      var hw = 40 + rnd() * 26;
      var hh = 32 + rnd() * 30;
      var hy = 228 - hh + rnd() * 8;
      ctx.fillStyle = ['#4b3328', '#3f2c26', '#553a2b'][h % 3];
      ctx.fillRect(hx, hy, hw, hh);
      ctx.fillStyle = '#2c1f22';
      ctx.beginPath();
      ctx.moveTo(hx - 4, hy); ctx.lineTo(hx + hw + 4, hy);
      ctx.lineTo(hx + hw * 0.7, hy - 8); ctx.lineTo(hx + hw * 0.2, hy - 8);
      ctx.closePath(); ctx.fill();
      var flick = 0.75 + Math.sin(t * 6 + h) * 0.15;
      PL.gfx.glow(ctx, hx + hw * 0.4, hy + hh * 0.4, 40, 'rgba(255,179,71,0.5)', 0.45 * flick);
      ctx.fillStyle = 'rgba(255,190,110,' + (0.8 * flick) + ')';
      ctx.fillRect(hx + hw * 0.3, hy + hh * 0.3, 8, 7);
    }

    // the tankard, front and centre, because that is where every level ends
    var tw = 88, th = 106, tx = W / 2 - tw / 2, ty = 112;
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.2) * 2);
    PL.gfx.glow(ctx, W / 2, ty + th * 0.6, 130, 'rgba(255,179,71,0.4)', 0.55);
    ctx.strokeStyle = '#b9b0a2'; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(tx + tw - 2, ty + th * 0.55, 26, -1.3, 1.3); ctx.stroke();
    PL.gfx.rect(ctx, tx, ty + 22, tw, th - 22, C.woodDark);
    for (var i = 0; i < 6; i++) {
      PL.gfx.rect(ctx, tx + 3 + i * 15, ty + 24, 13, th - 28, i % 2 ? C.wood : C.woodLite);
    }
    PL.gfx.rect(ctx, tx - 2, ty + 34, tw + 4, 6, C.boneDark);
    PL.gfx.rect(ctx, tx - 2, ty + th - 24, tw + 4, 6, C.boneDark);
    PL.gfx.rect(ctx, tx + 4, ty + 24, tw - 8, 16, '#e09a2c');
    ctx.fillStyle = '#fbf3dc';
    ctx.beginPath();
    ctx.moveTo(tx - 3, ty + 28);
    for (var f = 0; f <= 8; f++) {
      var ft = f / 8;
      ctx.lineTo(tx - 3 + ft * (tw + 6), ty + 12 + Math.sin(t * 2 + ft * 6) * 3 - Math.sin(ft * Math.PI) * 9);
    }
    ctx.lineTo(tx + tw + 3, ty + 28);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, tx - 3, ty + 24, tw + 6, 5, '#c9bfae');
    ctx.restore();

    // our nobody, mid-leap
    var px = W / 2 - 132, py = 160 + Math.sin(t * 2.4) * 6;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.12);
    PL.gfx.rect(ctx, 3, 20, 6, 8, '#3a2a1e');
    PL.gfx.rect(ctx, 12, 19, 6, 8, '#3a2a1e');
    PL.gfx.rect(ctx, 4, 10, 12, 11, '#e6d9b8');
    PL.gfx.rect(ctx, 2, 10, 4, 12, '#7a4a3c');
    PL.gfx.rect(ctx, 4, 17, 12, 3, C.coral);
    PL.gfx.rect(ctx, 5, 2, 11, 9, '#d9a173');
    ctx.fillStyle = '#40312a';
    ctx.beginPath();
    ctx.moveTo(1, 3); ctx.lineTo(19, 3); ctx.lineTo(15, -1); ctx.lineTo(5, -1);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // dim the lower half so type reads
    var sh = ctx.createLinearGradient(0, 150, 0, H);
    sh.addColorStop(0, 'rgba(14,8,14,0.0)');
    sh.addColorStop(0.45, 'rgba(14,8,14,0.72)');
    sh.addColorStop(1, 'rgba(14,8,14,0.94)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, W, H);

    // ---- title -----------------------------------------------------------
    PL.gfx.text(ctx, 'PINTLAND ISLES', W / 2, 52, {
      font: 'bold 40px "Trebuchet MS", "Segoe UI", sans-serif',
      align: 'center', color: C.parchment
    });
    PL.gfx.text(ctx, 'THE DRUNKEN TRIALS TRYOUT', W / 2, 76, {
      font: 'bold 17px "Trebuchet MS", "Segoe UI", sans-serif',
      align: 'center', color: C.lantern
    });
    PL.gfx.text(ctx, 'No crew. No legend. No reputation. Just a long climb and a full cup.',
      W / 2, 96, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.65)' });

    // ---- menu ------------------------------------------------------------
    for (var m = 0; m < this.options.length; m++) {
      var my = 244 + m * 23;
      var on = m === this.sel;
      var label = this.options[m];
      if (m === 2 && this.confirmWipe > 0) label = 'Wipe local records — press again';
      if (m === 2 && this.wiped > 0) label = 'Records wiped';
      if (on) {
        PL.gfx.rect(ctx, W / 2 - 120, my - 14, 240, 22, 'rgba(255,179,71,0.16)');
        PL.gfx.text(ctx, '>', W / 2 - 112, my, { font: PL.FONT.hud, color: C.lantern });
      }
      PL.gfx.text(ctx, label, W / 2, my, {
        font: PL.FONT.hud, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.55)'
      });
    }

    // ---- controls --------------------------------------------------------
    PL.gfx.panel(ctx, 20, 314, W - 40, 40, { r: 5, alpha: 0.9 });
    var cols = [
      ['MOVE', '← →  A D'],
      ['JUMP', 'SPACE / Z'],
      ['DROP', '↓ + JUMP'],
      ['SEED', 'E / SHIFT'],
      ['PAUSE', 'ESC · M mute']
    ];
    for (var c = 0; c < cols.length; c++) {
      var cx = 32 + c * ((W - 64) / cols.length);
      PL.gfx.text(ctx, cols[c][0], cx, 330, { font: PL.FONT.tiny, color: C.lantern });
      PL.gfx.text(ctx, cols[c][1], cx, 345, { font: PL.FONT.small, color: 'rgba(242,227,196,0.8)' });
    }
    PL.gfx.text(ctx, 'Hold JUMP for height. A Wolendi Wind Pouch buys one more jump in the air.',
      W / 2, 308, { font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.5)' });
    if (!PL.Store.available) {
      PL.gfx.text(ctx, 'localStorage unavailable — records will not be saved', W / 2, 232, {
        font: PL.FONT.tiny, align: 'center', color: C.coral
      });
    }
  };

  PL.TitleScene = TitleScene;

})(window.PL = window.PL || {});
