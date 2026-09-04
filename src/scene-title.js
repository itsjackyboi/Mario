/* scene-title.js — title card, premise, and the control legend. */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  function TitleScene() {
    this.opaque = true;
    this.t = 0;
    this.sel = 0;
    this.options = [
      { label: 'Row ashore', hint: 'Pick a town and a level. Times logged per level.' },
      { label: 'Drunken speedrun', hint: 'Every level back to back on one unbroken clock.' },
      { label: 'Leaderboards', hint: "Top five per level, and every run behind it." },
      { label: 'Beer Bank', hint: 'Spend what you have banked on pets and clothes.' },
      { label: 'Sign the book', hint: 'The name your runs go under on the shared board.' }
    ];
    this.stars = [];
    var rnd = U.rng(77);
    for (var i = 0; i < 60; i++) {
      this.stars.push({ x: rnd() * PL.VIEW_W, y: rnd() * 150, a: 0.15 + rnd() * 0.55 });
    }
  }

  TitleScene.prototype.enter = function () {
    PL.Theme.apply(null);
    // Warm the shared board so the leaderboard is not staring at a spinner, and
    // push anything that was set while the network was away. Both no-op when no
    // endpoint is configured.
    PL.Cloud.load();
    PL.Cloud.flush();
  };

  TitleScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    if (In.pressed('up')) { this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (PL.LetterIcon.clicked() || In.pressed('letter')) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.LetterScene());
      return;
    }
    if (PL.NameChip.clicked()) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.NameScene());
      return;
    }
    if (In.pressed('confirm') || In.pressed('jump')) {
      PL.Audio.sfx('select');
      if (this.sel === 0) PL.Game.replace(new PL.LevelSelectScene('shantytown'));
      else if (this.sel === 1) PL.Speedrun.start();
      else if (this.sel === 2) PL.Game.push(new PL.LeaderboardScene());
      else if (this.sel === 3) PL.Game.push(new PL.BankScene());
      else PL.Game.push(new PL.NameScene());
    }
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

    // build number, top-left, faint enough to ignore and legible enough to read
    PL.gfx.text(ctx, 'v' + PL.VERSION, 8, 16, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.28)', shadow: false
    });

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
    var tw = 84, th = 98, tx = W / 2 - tw / 2, ty = 106;
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
    var px = W / 2 - 128, py = 150 + Math.sin(t * 2.4) * 6;
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
    PL.gfx.text(ctx, 'You are Corb. No crew, no legend, no reputation — just a long climb and a full cup.',
      W / 2, 96, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.65)' });

    // ---- who is playing --------------------------------------------------
    PL.NameChip.draw(ctx, PL.NameChip.hot());

    // ---- menu ------------------------------------------------------------
    for (var m = 0; m < this.options.length; m++) {
      var my = 214 + m * 22;
      var on = m === this.sel;
      if (on) {
        PL.gfx.rect(ctx, W / 2 - 130, my - 14, 260, 21, 'rgba(255,179,71,0.16)');
        PL.gfx.text(ctx, '>', W / 2 - 122, my, { font: PL.FONT.hud, color: C.lantern });
      }
      PL.gfx.text(ctx, this.options[m].label, W / 2, my, {
        font: PL.FONT.hud, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.55)'
      });
    }
    // one line explaining whatever is highlighted, best time folded in
    var hint = this.options[this.sel].hint;
    var srBest = this.sel === 1 ? PL.Speedrun.best() : null;
    if (srBest) hint += '   Best: ' + U.formatTime(srBest.timeMs);
    if (this.sel === 3) {
      var bk = PL.Store.bank();
      hint = bk.grog + ' grog in the bank' +
        (bk.owned.length ? '  ·  ' + bk.owned.length + ' bought' : '  ·  nothing bought yet');
    }
    if (this.sel === 4) hint = PL.Store.playerName()
      ? 'Signed as ' + PL.Store.playerName() + '. Pick something else if you like.'
      : hint;
    PL.gfx.text(ctx, hint, W / 2, 304, {
      font: PL.FONT.tiny, align: 'center',
      color: srBest ? 'rgba(255,226,168,0.8)' : 'rgba(242,227,196,0.6)'
    });

    // ---- the letter from Aleforge ----------------------------------------
    PL.LetterIcon.draw(ctx, t, PL.LetterIcon.hot());

    // ---- controls --------------------------------------------------------
    PL.gfx.panel(ctx, 20, 312, W - 40, 42, { r: 5, alpha: 0.9 });
    var cols = [
      ['MOVE', '← →  A D'],
      ['JUMP', 'SPACE / Z'],
      ['USE ITEM', 'E / SHIFT'],
      ['PAUSE', 'ESC · M mute']
    ];
    for (var c = 0; c < cols.length; c++) {
      var cx = 32 + c * ((W - 64) / cols.length);
      PL.gfx.text(ctx, cols[c][0], cx, 329, { font: PL.FONT.tiny, color: C.lantern });
      PL.gfx.text(ctx, cols[c][1], cx, 345, { font: PL.FONT.small, color: 'rgba(242,227,196,0.8)' });
    }
    if (!PL.Store.available) {
      PL.gfx.text(ctx, 'localStorage unavailable — records will not be saved', W / 2, 208, {
        font: PL.FONT.tiny, align: 'center', color: C.coral
      });
    }
  };

  /* The signature in the corner. Drawn and hit-tested from one place so the
   * chip and its click target cannot drift apart. */
  PL.NameChip = {
    box: { x: 454, y: 8, w: 178, h: 22 },

    draw: function (ctx, hot) {
      var b = this.box, name = PL.Store.playerName();
      PL.gfx.panel(ctx, b.x, b.y, b.w, b.h, {
        r: 4,
        fill: hot ? 'rgba(255,179,71,0.18)' : 'rgba(18,12,17,0.75)',
        stroke: hot ? C.lantern : 'rgba(156,124,82,0.5)', alpha: 1
      });
      PL.gfx.text(ctx, name ? 'SIGNED' : 'UNSIGNED', b.x + 8, b.y + 15, {
        font: PL.FONT.tiny, color: name ? C.lantern : C.coral
      });
      PL.gfx.text(ctx, U.fit(ctx, name || 'click to sign', PL.FONT.small, b.w - 76),
        b.x + 62, b.y + 15, {
          font: PL.FONT.small,
          color: name ? C.parchment : 'rgba(242,227,196,0.5)'
        });
    },

    hot: function () {
      var b = this.box;
      return PL.Input.hovering(b.x, b.y, b.w, b.h);
    },

    clicked: function () {
      var b = this.box;
      return PL.Input.clickedIn(b.x, b.y, b.w, b.h);
    }
  };

  PL.TitleScene = TitleScene;

})(window.PL = window.PL || {});
