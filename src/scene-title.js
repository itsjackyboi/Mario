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
      { label: 'Drunken speedrun', hint: 'Every level back to back on one clock. Shard run or Any%.' },
      { label: 'Leaderboards', hint: "Top five per level, and every run behind it." },
      { label: 'Sign the book', hint: 'The name your runs go under on the shared board.' },
      /* The two split-board switches. They are set before a run because they
       * change what every colour on the board means, and they live on the shelf
       * beside the Beer Bank rather than in this list because they are settings
       * rather than places to go — a fifth row of text sat on top of the hint
       * line and the control legend, which is exactly the screen space the
       * board was shrunk to save. Focus lands on them after the last menu row;
       * they are drawn by SplitSwitches. */
      { slider: 0 },
      { slider: 1 }
    ];
    this.stars = [];
    var rnd = U.rng(77);
    for (var i = 0; i < 60; i++) {
      this.stars.push({ x: rnd() * PL.VIEW_W, y: rnd() * 150, a: 0.15 + rnd() * 0.55 });
    }
  }

  TitleScene.prototype.optionHint = function (i) {
    var o = this.options[i];
    if (o.slider == null) return o.hint;
    return PL.SplitSwitches.hint(o.slider) + '  ← → to swap.';
  };

  TitleScene.prototype.enter = function () {
    PL.Theme.apply(null);
    // Warm the shared board so the leaderboard is not staring at a spinner, and
    // push anything that was set while the network was away. Both no-op when no
    // endpoint is configured.
    PL.Cloud.load();
    PL.Cloud.flush();
    PL.Audio.music.play('title');
  };

  TitleScene.prototype.update = function (dt) {
    this.t += dt;
    var In = PL.Input;
    // A switch under the cursor flips on left/right without confirming, and
    // either switch flips on a click wherever the cursor happens to be.
    var onSlider = this.options[this.sel].slider;
    if (onSlider != null && (In.pressed('left') || In.pressed('right'))) {
      PL.SplitSwitches.flip(onSlider);
    }
    var hit = PL.SplitSwitches.clicked();
    if (hit >= 0) { this.sel = 4 + hit; PL.SplitSwitches.flip(hit); }
    // Everything on this screen answers the mouse. Half a screen of clickable
    // things is worse than none: it teaches you the wrong rule and then breaks
    // it. Hovering a row moves the cursor onto it, so the keyboard and the
    // pointer are never pointing at two different things.
    for (var r = 0; r < this.options.length; r++) {
      if (this.options[r].slider != null) continue;
      var box = this.rowBox(r);
      if (In.hoveredInto(box.x, box.y, box.w, box.h) && this.sel !== r) {
        this.sel = r;
        PL.Audio.sfx('menu');
      }
      if (In.clickedIn(box.x, box.y, box.w, box.h)) {
        this.sel = r;
        this.choose();
        return;
      }
    }
    if (In.pressed('up')) { this.sel = (this.sel + this.options.length - 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (In.pressed('down')) { this.sel = (this.sel + 1) % this.options.length; PL.Audio.sfx('menu'); }
    if (PL.LetterIcon.clicked() || In.pressed('letter')) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.LetterScene());
      return;
    }
    if (PL.BankIcon.clicked() || In.pressed('bank')) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.BankScene());
      return;
    }
    if (PL.RecordsIcon.clicked() || In.pressed('records')) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.LeaderboardScene({ archive: true }));
      return;
    }
    if (PL.NameChip.clicked()) {
      PL.Audio.sfx('select');
      PL.Game.push(new PL.NameScene());
      return;
    }
    if (In.pressed('confirm') || In.pressed('jump')) this.choose();
  };

  /** Where a menu row is, so drawing and hit-testing cannot drift apart. */
  TitleScene.prototype.rowBox = function (i) {
    return { x: PL.VIEW_W / 2 - 130, y: 222 + i * 22 - 14, w: 260, h: 21 };
  };

  /** Take the highlighted row, whether the cursor or the pointer picked it. */
  TitleScene.prototype.choose = function () {
    var o = this.options[this.sel];
    if (o.slider != null) { PL.SplitSwitches.flip(o.slider); return; }
    PL.Audio.sfx('select');
    if (this.sel === 0) PL.Game.replace(new PL.LevelSelectScene('shantytown'));
    else if (this.sel === 1) PL.Game.replace(new PL.SpeedrunPickScene());
    else if (this.sel === 2) PL.Game.push(new PL.LeaderboardScene());
    else if (this.sel === 3) PL.Game.push(new PL.NameScene());
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

    // build number, top-left, faint enough to ignore and legible enough to read,
    // with the old book under it
    PL.gfx.text(ctx, 'v' + PL.VERSION, 8, 16, {
      font: PL.FONT.tiny, color: 'rgba(242,227,196,0.28)', shadow: false
    });
    PL.RecordsIcon.draw(ctx, PL.RecordsIcon.hot());

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
    PL.gfx.text(ctx, 'You are Corb. The drunk with a dream',
      W / 2, 96, { font: PL.FONT.small, align: 'center', color: 'rgba(242,227,196,0.65)' });

    /* Said once, on the machine it happened to. An empty Bank and a blank board
     * look exactly like a bug to someone who had both yesterday. */
    if (PL.wiped) {
      PL.gfx.text(ctx, 'v2: preview records, grog and skins have been cleared — ' +
        'the old board is under PRE-RELEASE RECORDS', W / 2, 110, {
          font: PL.FONT.tiny, align: 'center', color: C.coral
        });
    }

    // ---- who is playing --------------------------------------------------
    PL.NameChip.draw(ctx, PL.NameChip.hot());

    // ---- menu ------------------------------------------------------------
    // Only the rows that are places to go; the last two options are the split
    // switches on the shelf, which draw themselves.
    for (var m = 0; m < this.options.length; m++) {
      if (this.options[m].slider != null) continue;
      var rb = this.rowBox(m), my = 222 + m * 22;
      var on = m === this.sel;
      if (on) {
        PL.gfx.rect(ctx, rb.x, rb.y, rb.w, rb.h, 'rgba(255,179,71,0.16)');
        PL.gfx.text(ctx, '>', W / 2 - 122, my, { font: PL.FONT.hud, color: C.lantern });
      }
      PL.gfx.text(ctx, this.options[m].label, W / 2, my, {
        font: PL.FONT.hud, align: 'center',
        color: on ? C.parchment : 'rgba(242,227,196,0.55)'
      });
    }
    // one line explaining whatever is highlighted, best time folded in
    // The speedrun's records live on the category screen now, one each, so the
    // hint describes the choice rather than quoting one of the two.
    var hint = this.optionHint(this.sel);
    if (this.sel === 3 && PL.Store.playerName()) {
      hint = 'Signed as ' + PL.Store.playerName() + '. Pick something else if you like.';
    }
    PL.gfx.text(ctx, hint, W / 2, 304, {
      font: PL.FONT.tiny, align: 'center', color: 'rgba(242,227,196,0.6)'
    });

    // ---- the two things on the shelf, one either side --------------------
    PL.LetterIcon.draw(ctx, t, PL.LetterIcon.hot());
    PL.BankIcon.draw(ctx, t, PL.BankIcon.hot());
    PL.SplitSwitches.draw(ctx, this.sel - 4);

    // ---- controls --------------------------------------------------------
    PL.gfx.panel(ctx, 20, 312, W - 40, 42, { r: 5, alpha: 0.9 });
    var cols = [
      ['MOVE', '← →  A D'],
      ['JUMP', 'SPACE / Z'],
      ['USE ITEM', 'E / SHIFT'],
      ['PAUSE', 'ESC · M mute · H records']
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

  /* ------------------------------------------------------- split switches
   *
   * Two sliders on the shelf beside the Beer Bank, deciding what the split
   * board races:
   *
   *     YOU  | WORLD        whose records
   *     LEVEL | SPEEDRUN    which of that person's two records for a level
   *
   * They are set here, before a run, because they change the meaning of every
   * colour on the board and swapping them mid-run would rewrite what you have
   * already read. They are sliders rather than menu rows because they are
   * states rather than destinations — and because a fifth row of text landed on
   * top of the hint line and the control legend.
   *
   * Both a click and the keyboard drive them: the title's cursor carries on
   * past the last menu row onto each switch, where ← → flips it.
   */
  PL.SplitSwitches = {
    boxes: [{ x: 72, y: 246, w: 112, h: 16 }, { x: 72, y: 268, w: 112, h: 16 }],
    LABELS: [['YOU', 'WORLD'], ['LEVEL', 'SPEEDRUN']],

    /** 0 or 1: which side each switch is on. */
    state: function (i) {
      return i === 0 ? (PL.Store.compareMode() === 'world' ? 1 : 0)
                     : (PL.Store.splitMode() === 'speedrun' ? 1 : 0);
    },

    hint: function (i) {
      if (i === 0) {
        return PL.Store.compareMode() === 'world'
          ? 'Splits race the fastest time anyone has posted.'
          : 'Splits race your own records.';
      }
      return PL.Store.splitMode() === 'speedrun'
        ? 'Against splits set inside a speedrun — like for like.'
        : 'Against times set on the level on its own.';
    },

    flip: function (i) {
      PL.Audio.sfx('menu');
      if (i === 0) {
        var next = PL.Store.compareMode() === 'world' ? 'self' : 'world';
        PL.Store.setCompareMode(next);
        // World needs the board in memory to compare against, so ask for it now
        // rather than at the moment the first split lands.
        if (next === 'world') PL.Cloud.load(true);
      } else {
        PL.Store.setSplitMode(PL.Store.splitMode() === 'speedrun' ? 'level' : 'speedrun');
      }
      PL.Speedrun.invalidate();
    },

    hot: function (i) {
      var b = this.boxes[i];
      return PL.Input.hovering(b.x, b.y, b.w, b.h);
    },

    /** The switch the pointer just landed on, or -1. */
    clicked: function () {
      for (var i = 0; i < this.boxes.length; i++) {
        var b = this.boxes[i];
        if (PL.Input.clickedIn(b.x, b.y, b.w, b.h)) return i;
      }
      return -1;
    },

    draw: function (ctx, focus) {
      PL.gfx.text(ctx, 'SPLIT BOARD', this.boxes[0].x + 1, this.boxes[0].y - 5, {
        font: PL.FONT.tiny, color: 'rgba(242,227,196,0.45)'
      });
      for (var i = 0; i < this.boxes.length; i++) {
        var b = this.boxes[i], on = this.state(i);
        var lit = focus === i || this.hot(i);
        PL.gfx.panel(ctx, b.x, b.y, b.w, b.h, {
          r: 8, alpha: 1,
          fill: 'rgba(18,12,17,0.78)',
          stroke: lit ? C.lantern : 'rgba(156,124,82,0.45)'
        });
        // The knob is half the track, so which side it is on reads before any
        // of the words do.
        var half = (b.w - 6) / 2;
        PL.gfx.roundRect(ctx, b.x + 3 + on * half, b.y + 3, half, b.h - 6, 6);
        ctx.fillStyle = lit ? 'rgba(255,179,71,0.34)' : 'rgba(255,179,71,0.2)';
        ctx.fill();
        for (var s = 0; s < 2; s++) {
          PL.gfx.text(ctx, this.LABELS[i][s], b.x + 3 + s * half + half / 2, b.y + 11, {
            font: PL.FONT.tiny, align: 'center',
            color: on === s ? (lit ? C.lanternHi : C.parchment) : 'rgba(242,227,196,0.4)'
          });
        }
      }
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
