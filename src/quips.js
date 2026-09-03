/* quips.js — the mouth on Corb, our unproven pirate.
 *
 * Levels place trigger zones with the digits 1-9 (see level.js) next to the
 * thing being mocked: a shrine, a moored ship, a tavern door, a memorial.
 * Walking into a zone arms a line; nothing fires at random.
 *
 * HE ONLY GETS TWO A LEVEL. A level places five to seven zones and `QuipBudget`
 * decides which two of them actually speak — weighted so the budget is spent by
 * the end of the level and a different couple speaks on every attempt. He was
 * narrating, and the joke does not survive that.
 *
 * The line shows in a fixed caption box in the bottom-left corner rather than
 * a speech bubble over the action, because the middle of the screen is where
 * the jumps are.
 *
 * LINES is a shared pool so towns can reuse or extend the material. A level
 * file may hold literal text, a `@key` reference to one specific line, or a
 * `@?group` draw — a random line from `ru` (rumours he picked up on the
 * crossing), `in` (what people have said about him) or `cr` (what he makes of
 * the whole business), preferring ones this session has not heard. That is what
 * makes a pool this size worth having: two runs at a level are two different
 * conversations.
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
      tv5: "Nobody in the eleven seas has had to say the name Corb out loud. After this cup, somebody writes it down.",

      /* --- rumours ----------------------------------------------------------
       * Things Corb heard on the crossing and has been chewing on ever since.
       * Deliberately unverified — that is the point of a rumour — and usable
       * in any town, which is why they are pooled apart from the town sets. */
      ru1: "Heard Bonehardy's mines run dry six years back and he's been selling the same tour of 'em ever since.",
      ru2: "Rumour on the boat: Jagerbauhm's crown don't come off. Not won't. Don't.",
      ru3: "They say Guinnie's never once bought a drink. Forty years. Not one. That's not luck, that's a system.",
      ru4: "Word is Pilsner drew the Coors Golden Isles on a napkin and has been defending the napkin ever since.",
      ru5: "Heard Buke lost a duel to a man who'd already left the room. Won't say who told me. Wasn't sober neither.",
      ru6: "There's a story Anqoak sold his own name to a Roto trader and buys it back yearly at interest.",
      ru7: "They reckon the Trials were shut fifty-one years because the last winner never stopped drinking. Still going, some say.",
      ru8: "A deckhand swore the Six meet once a year to argue over who's least embarrassing. Nobody's ever won that one.",
      ru9: "Heard the bells in Providence were cast from a Liquor King's crown. Sounds about the value of it.",
      ru10: "Somebody told me the Stank Tank's got a cellar the Cardinal don't know about. Somebody tells me a lot of things.",
      ru11: "They say Fenwick's vines remember every man who cut one. Long memory for a plant. Short careers for the men.",
      ru12: "Heard Sackbeard's beast is still alive under the floorboards and the drinking is what keeps it down.",
      ru13: "Word round the docks: half the crews out here are named after a king, and none of 'em would sail with one.",
      ru14: "They say the crown weighs nine pounds. Nine. That's a full keg's worth of nothing on a man's head.",
      ru15: "Heard a Friar once fined a gull. Bird had no purse. Bird got a ledger entry anyway.",

      /* --- what Corb has been called ----------------------------------------
       * The insults come back the other way too. He has been rehearsing. */
      in1: "Old Salty said I'd never make it past Shanty Town. Old Salty's wrong about exactly one thing.",
      in2: "My own crew called me 'the lad who tried.' Going to make that a title before the week's out.",
      in3: "Man at the pier laughed and said the Trials weren't for the sober. Neither's a mayor's chair, and here we are.",
      in4: "They asked which king I'd back. Told 'em none. They asked which one'd have me. Fair.",
      in5: "Six men crowned for drinking, and every one of 'em got there without climbing a single wall. Unbelievable.",
      in6: "Uncle says I've got sense. Sense is what you call a man who hasn't done the stupid thing yet.",
      in7: "Nobody's written a verse about me. Nobody's written a verse about a man who finished, either.",
      in8: "Kings, they call themselves. I've met a keg with more of a plan.",
      in9: "'Green,' the harbourmaster said. Green's what a thing is before it's worth picking.",
      in10: "Told a man I'd win. He asked which trial. I said all of 'em. He bought me a drink out of pity.",
      in11: "They've a word here for a pirate with no crew. Several words. None of 'em fit on a headstone.",
      in12: "My mother said I'd come to nothing. She never said which nothing, so I've options.",
      in13: "A cooper laughed so hard he dropped a stave. I'll take that. Nobody drops anything for a nobody.",
      in14: "Every one of these kings was a nobody once. That's the only encouraging thing about the lot of 'em.",
      in15: "Been called unproven. Proven's just unproven that kept going a bit longer.",
      in16: "The bookmakers won't take a bet on me. Won't take one. That's not odds, that's an opinion.",

      ru16: "Heard the Trials used to have seven. Nobody says what happened to the seventh, and nobody asks twice.",
      ru17: "They say Bonehardy's mine collapsed on a full shift and he called it a restructuring.",
      ru18: "Word is Guinnie can tell what's in a barrel through the wood. Only useful talent in the whole peerage.",
      ru19: "Heard a man drank the whole Aleforge cellar dry in a night. Heard it from four men. All four were him.",
      ru20: "They reckon Jagerbauhm's never once paid for a room. Angels don't, apparently.",
      ru21: "There's talk the Cardinal writes the bell schedule to hide something. There's always talk.",
      ru22: "Heard the Owe Block gangs were one crew till somebody laughed at somebody's hat.",
      ru23: "They say Roto sold the same shipment eleven times and every buyer's still waiting politely.",
      ru24: "Word round Fenwick is the Veilwalkers won't say your name aloud in case they get attached.",
      ru25: "Heard Pilsner's crew mutinied twice and both times he thanked them for the initiative.",
      ru26: "They say Buke won a duel by falling over at exactly the right moment. Still counts, apparently.",
      ru27: "Heard Anqoak's library has one book in it and it's a ledger of who owes him.",
      ru28: "There's a rumour the crown's a fake and the real one sank. Half of Aleforge would rather not know.",
      ru29: "Heard the Stank Tank's landlord has never once been seen. Rent still gets collected.",
      ru30: "They say a Friar fined the Cardinal once. Say it quietly. Say it somewhere else.",
      ru31: "Word is the tide charts round here haven't been right since the beast died. Or since it stopped pretending to be.",
      ru32: "Heard a man in Roto bought a map to the Coors Golden Isles. Heard he's still walking.",
      ru33: "They say the first Trial was settled by a coin toss and the loser's been mayor ever since.",
      ru34: "Heard Sackbeard never actually drank. Ran the best bar in the eleven seas stone sober out of spite.",
      ru35: "Word is the bells in Providence go quiet one night a year and nobody will say which.",

      // --- what he thinks of the whole business -----------------------------
      cr1: "Six crowns and not one of 'em earned in daylight. I'll take mine wet, thanks.",
      cr2: "A tryout. That's all this is. Nobody's crowned a tryout before, so I'll be the first at something.",
      cr3: "Everybody here's got a legend and a limp. I've got neither yet. Working on the first one.",
      cr4: "You want to know a town, look at what it's proud of. Then look at what it's quiet about.",
      cr5: "Whole world's kept upright by people nobody writes verses about. Ask a cooper.",
      cr6: "Not one of these kings had to climb. That's going in my verse, whoever ends up writing it.",
      cr7: "Rowing over, I made a list of everything I'd say to 'em. It's long. Getting longer.",
      cr8: "They keep asking what I'm here to prove. Wrong question. Ask what I'm here to take.",
      cr9: "If a crown's what they hand a man for drinking, I'd rather have the tab.",
      cr10: "Uncle wants a mayor. I want a look at their faces. We'll both be served."
    },

    /* How many lines Corb gets per level. He is funnier at two than at seven —
     * the box is a punctuation mark, not a commentary track. Levels place more
     * trigger zones than this; `PL.QuipBudget` decides which of them speak, and
     * it is a different couple every attempt. */
    PER_LEVEL: 2,

    /** Every key in a group prefix ('ru', 'in', 'cr', ...), in table order. */
    group: function (prefix) {
      var out = [];
      for (var k in this.LINES) {
        if (k.indexOf(prefix) === 0 && !isNaN(Number(k.slice(prefix.length)))) out.push(k);
      }
      return out;
    },

    /* Lines already used this session, so a random draw does not repeat itself
     * while there is anything unheard left in the group. */
    heard: {},

    /**
     * Resolve a level's quip text.
     *   '@key'   one specific line
     *   '@?ru'   a random line from the `ru` group, preferring unheard ones
     * Anything else is used verbatim.
     */
    resolve: function (text) {
      if (typeof text !== 'string' || text.charAt(0) !== '@') return text;
      var key = text.slice(1);
      if (key.charAt(0) === '?') return this.LINES[this.draw(key.slice(1))] || text;
      this.heard[key] = true;
      return this.LINES[key] || text;
    },

    /**
     * A key from one or more groups ('ru', or 'in,cr'), preferring lines this
     * session has not heard so a big pool actually gets through.
     */
    draw: function (prefix) {
      var groups = prefix.split(','), all = [];
      for (var g = 0; g < groups.length; g++) {
        all = all.concat(this.group(groups[g]));
      }
      if (!all.length) return null;
      var fresh = [];
      for (var i = 0; i < all.length; i++) if (!this.heard[all[i]]) fresh.push(all[i]);
      var pool = fresh.length ? fresh : all;
      var key = pool[Math.floor(Math.random() * pool.length)];
      this.heard[key] = true;
      return key;
    }
  };

  /**
   * Which of a level's trigger zones actually speak.
   *
   * A level places five to seven zones next to the things worth mocking, but
   * Corb only gets `PER_LEVEL` of them — he was narrating, and the joke does not
   * survive that. The choice is made as each zone is crossed, weighted by how
   * many are left, which spends the whole budget by the end of the level and
   * picks a different couple every attempt. Combined with '@?' draws, two runs
   * at the same level are two different conversations.
   */
  function QuipBudget(total, limit) {
    this.left = Math.max(1, total);
    this.spend = Math.min(limit == null ? PL.Quips.PER_LEVEL : limit, this.left);
  }

  QuipBudget.prototype.take = function () {
    var take = this.spend > 0 && Math.random() < this.spend / this.left;
    this.left = Math.max(1, this.left - 1);
    if (take) this.spend--;
    return take;
  };

  PL.QuipBudget = QuipBudget;

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
