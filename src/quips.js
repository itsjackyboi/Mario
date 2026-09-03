/* quips.js — the mouth on Corb, our unproven pirate.
 *
 * Levels place trigger zones with the digits 1-9 (see level.js) next to the
 * thing being mocked: a shrine, a moored ship, a tavern door, a memorial.
 * Walking into the zone fires the line once. Nothing fires at random.
 *
 * The line shows in a fixed caption box in the bottom-left corner rather than
 * a speech bubble over the action — Corb talks a lot, and the middle of the
 * screen is where the jumps are.
 *
 * LINES is a shared pool so towns can reuse or extend the material — level
 * files may hold literal text or a `@key` reference into this table.
 */
(function (PL) {
  'use strict';

  var C = PL.C, U = PL.util;

  PL.Quips = {
    LINES: {
      // --- Seamus Bonehardy, "King of Kegs" ---------------------------------
      bonehardy1: "Seamus Bonehardy? King of Kegs, my ass — sounds like a King of Getting Robbed in his own mines.",
      bonehardy2: "Mayor of Aleforge, they say. Ain't seen the inside of a town hall since they gave him the key to the cellar.",
      bonehardy3: "Barrel Breakers. Six crews he's been on. Six. That ain't a legend, that's a work history.",

      // --- Jack Anqoak, "Oracle of Aleforge" --------------------------------
      anqoak1: "Anqoak's the 'Oracle of Aleforge.' Oracle of what, foretelling his own gang's beatdown?",
      anqoak2: "Man saw the future so clear he walked into Hoegaarden and left his soul in it. Fine oracling.",
      anqoak3: "Goldcoral Incorporated. Only pirate alive who needs a ledger to count his own plunder.",

      // --- Jagerbauhm, "Drunken Angel" --------------------------------------
      jager1: "They call Jagerbauhm the Drunken Angel. I've seen angels. He ain't got the wings for it.",
      jager2: "Born on these docks, they say, then ran off to Providence to get holy. Grog didn't take, so he took the grog.",

      // --- Guinnie ----------------------------------------------------------
      guinnie1: "Guinnie slept through his own initiation. Man's a legend for napping.",
      guinnie2: "Won the Trials so blackout he didn't know he was king for a year. That's not a crown, that's a hangover.",

      // --- Buke -------------------------------------------------------------
      buke1: "Buke — no middle name, no last name, no personality, from what I hear.",
      buke2: "Found in an empty whiskey barrel. Explains the taste. Explains the conversation.",

      // --- Jameson Pilsner --------------------------------------------------
      jp1: "Jameson Pilsner, Captain of the Coors Golden Isles. Bet the ship's as hollow as his nickname.",
      jp2: "Golden Isles. Golden. Nobody's ever seen 'em. Nobody's ever seen him win a fight, neither.",

      // --- the six of them together -----------------------------------------
      six1: "Six kings for one crown. That's not a dynasty, that's a bar tab nobody wants to settle.",
      six2: "Ode to the Six. Six verses, six men, and not one of 'em could row a dinghy straight.",
      six3: "Six kings, and every one of 'em crowned for drinking. I'm about to be crowned for climbing.",

      // --- Aleforge ---------------------------------------------------------
      af1: "Brewing capital of the isles, and they crowned a man King of Kegs who can't keep hold of his own.",
      af2: "Bonehardy's the mayor here. Sits in taverns, not town hall. Frankly the job picked the right man.",
      af3: "The Drunken Trials. Fifty-one years shut, and the first winner was so gone he missed his own coronation.",
      af4: "Anqoak reads the future out of a library in Hoegaarden. Never once read the room.",
      af5: "Jagerbauhm got his taste off a fake ClockHeart Tonic at sixteen. Whole legend, built on a bad batch.",
      af6: "They built a clock tower so nobody in Aleforge would ever have an excuse. Nobody uses it.",

      // --- Providence -------------------------------------------------------
      pv1: "Whole town runs on a bell. Anqoak came here to get clever and left without a soul. Bad trade.",
      pv2: "Jagerbauhm grew up in these spires pretending to be sober. That's the most impressive thing about him.",
      pv3: "Order, they call it. Jameson Pilsner would last one chime in this place before somebody fined his hat.",
      pv4: "Cardinal born to a Shanty mother, running the tidiest town in the isles. Best joke anyone ever told.",
      pv5: "Six kings couldn't agree on a crown. This lot can't disagree on a bell. Neither's a way to live.",

      // --- Owe Block --------------------------------------------------------
      ob1: "Crimson Cutters. Bonehardy, Anqoak and Jagerbauhm ran with this lot and got flattened by a circus.",
      ob2: "Buke was raised in a whiskey barrel and it still gave him more upbringing than this street gives anyone.",
      ob3: "Two colours, one alley, and nobody's king of either. Feels more honest than a crown, if I'm straight.",
      ob4: "Anqoak rapped his way out of trouble down here. Rapped. I'd rather take the beating.",

      // --- Fenwick ----------------------------------------------------------
      fw1: "Veilwalkers live ten lifetimes to our one and not one of 'em wasted a single hour being a Liquor King.",
      fw2: "Guinnie turned on his own captain near these woods. Only decent thing in his file, and he keeps it quiet.",
      fw3: "Six kings, and none of 'em ever set foot in here. Woods don't care what you're crowned.",

      // --- Roto Kaiishi -----------------------------------------------------
      rt1: "Anqoak runs his whole fortune through this market. Aggressive mercantilism, he calls it. Fencing, we call it.",
      rt2: "Pilsner claims the Coors Golden Isles export nothing. Convenient, for a place nobody's found.",
      rt3: "Bonehardy took a chest of gold off a man he'd just maimed. Round here they'd call that a receipt.",
      rt4: "Everything's for sale in Roto. Six crowns included, and I reckon they'd go cheap.",

      // --- Sackbeard's Tavern -----------------------------------------------
      tv1: "Sackbeard killed the thing we're standing in and built a bar out of it. That's a legend. That's the bar.",
      tv2: "Gideon Drake sailed in mutinied and half-dead and still out-mayored the lot of them. Low bar. Big beast.",
      tv3: "Six kings drank under these ribs and not one of 'em had to climb here first.",
      tv4: "Old Salty says the new pirates are looking for the wrong sort of booty. Old Salty is right about everything.",
      tv5: "Nobody in the eleven seas has had to say the name Corb out loud. After this cup, somebody writes it down."
    },

    /** Resolve '@key' references; anything else is used verbatim. */
    resolve: function (text) {
      if (typeof text === 'string' && text.charAt(0) === '@') {
        return this.LINES[text.slice(1)] || text;
      }
      return text;
    }
  };

  // --------------------------------------------------------------- the bubble

  function QuipBox() {
    this.text = '';
    this.timer = 0;
    this.full = 1;
    this.queue = [];
    this.anchor = null;
  }

  QuipBox.prototype.say = function (text, anchor) {
    text = PL.Quips.resolve(text);
    if (this.timer > 0) {
      if (this.queue.length < 2) this.queue.push({ text: text, anchor: anchor });
      return;
    }
    this.text = text;
    this.anchor = anchor;
    this.timer = this.full = 2.2 + Math.min(3.6, text.length * 0.04);
    PL.Audio.sfx('quip');
  };

  QuipBox.prototype.update = function (dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0 && this.queue.length) {
        var next = this.queue.shift();
        this.text = next.text;
        this.anchor = next.anchor;
        this.timer = this.full = 2.2 + Math.min(3.6, next.text.length * 0.04);
        PL.Audio.sfx('quip');
      }
    }
  };

  /* Fixed caption box, bottom-left. Never moves, never covers the player.
   * Height grows with the line count and the type drops a size before it would
   * ever need a fourth line, so nothing overlaps and nothing gets clipped. */
  var BOX_W = 420, TEXT_X = 74, LINE_H = 13;

  QuipBox.prototype.draw = function (ctx) {
    if (this.timer <= 0 || !this.text) return;

    ctx.font = PL.FONT.body;
    var font = PL.FONT.body;
    var lines = U.wrapText(ctx, this.text, BOX_W - TEXT_X - 12);
    if (lines.length > 2) {
      ctx.font = font = PL.FONT.small;
      lines = U.wrapText(ctx, this.text, BOX_W - TEXT_X - 12);
    }
    var h = Math.max(42, 16 + lines.length * LINE_H + 8);
    var x = 8, y = PL.VIEW_H - h - 8;
    var fade = Math.min(1, this.timer / 0.3, (this.full - this.timer) / 0.18);

    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    PL.gfx.panel(ctx, x, y, BOX_W, h, {
      r: 4, fill: 'rgba(18,12,17,0.9)', stroke: 'rgba(156,124,82,0.8)', alpha: 1
    });

    // Corb, in miniature, so it is obvious who is talking
    drawCorbHead(ctx, x + 9, y + (h - 22) / 2);
    PL.gfx.text(ctx, 'CORB', x + 38, y + h / 2 + 3, {
      font: PL.FONT.tiny, color: C.lantern
    });

    var top = y + (h - lines.length * LINE_H) / 2 + 10;
    for (var i = 0; i < lines.length; i++) {
      PL.gfx.text(ctx, lines[i], x + TEXT_X, top + i * LINE_H, {
        font: font, color: C.parchment
      });
    }
    ctx.restore();
  };

  function drawCorbHead(ctx, x, y) {
    PL.gfx.rect(ctx, x + 2, y + 4, 18, 14, '#d9a173');
    ctx.fillStyle = '#b07f55';
    ctx.fillRect(x + 2, y + 14, 18, 3);
    ctx.fillStyle = PL.C.ink;
    ctx.fillRect(x + 13, y + 8, 3, 3);
    ctx.fillStyle = '#40312a';
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 5); ctx.lineTo(x + 24, y + 5);
    ctx.lineTo(x + 19, y - 1); ctx.lineTo(x + 3, y - 1);
    ctx.closePath(); ctx.fill();
    PL.gfx.rect(ctx, x + 1, y + 3, 20, 3, '#5a4436');
  }

  PL.QuipBox = QuipBox;

})(window.PL = window.PL || {});
