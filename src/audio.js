/* audio.js — all sound is synthesised with WebAudio oscillators. No asset
 * files, no network, works offline on GitHub Pages. Toggle with M.
 */
(function (PL) {
  'use strict';

  var A = (PL.Audio = {
    ctx: null,
    muted: false,
    master: null,

    init: function () {
      if (this.ctx) return;
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },

    /** Browsers require a gesture before audio starts; call on first key. */
    resume: function () {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
      return this.muted;
    },

    /** One shaped oscillator note. */
    tone: function (freq, dur, type, vol, slideTo) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol == null ? 0.5 : vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    },

    /** Filtered noise burst — splashes, thuds, crumbling wood. */
    noise: function (dur, vol, freq, q) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime;
      var len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = this.ctx.createBufferSource();
      src.buffer = buf;
      var filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = freq || 900;
      filt.Q.value = q || 1.1;
      var g = this.ctx.createGain();
      g.gain.value = vol == null ? 0.4 : vol;
      src.connect(filt); filt.connect(g); g.connect(this.master);
      src.start(t);
    },

    /* ------------------------------------------------------------- music
     *
     * Six towns, six tunes, all of it oscillators — no files, so it still
     * works from file:// and still weighs nothing.
     *
     * Each track is three voices on a grid of sixteenth notes: a square lead,
     * a triangle bass, and a noise kit. Notes are MIDI numbers and 0 is a
     * rest, which makes a tune something you can read and edit as a row of
     * numbers rather than a wall of frequencies.
     *
     * Scheduling is the standard WebAudio two-clock trick: a coarse timer
     * wakes up often and books every note that falls inside a short lookahead
     * window at an exact audio-clock time. Firing notes straight from
     * setInterval would put the rhythm at the mercy of whatever else the frame
     * is doing, and a tune that stumbles whenever the level gets busy is worse
     * than no tune.
     */
    music: {
      LOOKAHEAD: 0.14,      // seconds of notes booked in advance
      TICK: 25,             // ms between scheduler wake-ups

      track: null, id: null, timer: null, step: 0, nextAt: 0, gain: null,

      /** MIDI note to frequency. 69 is A440, twelve steps to the octave. */
      hz: function (m) { return 440 * Math.pow(2, (m - 69) / 12); },

      play: function (id) {
        if (this.id === id) return;              // already running this one
        var def = PL.Music && PL.Music[id];
        if (!def) { this.stop(); return; }
        A.init();
        this.stop();
        if (!A.ctx) return;
        this.gain = A.ctx.createGain();
        this.gain.gain.value = 0.34;             // well under the sound effects
        this.gain.connect(A.master);
        this.id = id;
        this.track = def;
        this.step = 0;
        this.nextAt = A.ctx.currentTime + 0.06;
        var self = this;
        this.timer = window.setInterval(function () { self.tick(); }, this.TICK);
      },

      stop: function () {
        if (this.timer) { window.clearInterval(this.timer); this.timer = null; }
        if (this.gain) { try { this.gain.disconnect(); } catch (e) {} this.gain = null; }
        this.track = null;
        this.id = null;
      },

      tick: function () {
        if (!A.ctx || !this.track) return;
        var t = this.track;
        var spb = 60 / t.bpm / 4;                // seconds per sixteenth
        while (this.nextAt < A.ctx.currentTime + this.LOOKAHEAD) {
          var i = this.step % t.lead.length;
          this.voice(t.lead[i], this.nextAt, spb * (t.leadLen || 3), t.leadWave || 'square', 0.22);
          this.voice(t.bass[i % t.bass.length], this.nextAt, spb * 3.4, 'triangle', 0.30);
          if (t.drums && t.drums[i % t.drums.length]) {
            this.hit(t.drums[i % t.drums.length], this.nextAt);
          }
          this.nextAt += spb;
          this.step++;
        }
      },

      voice: function (midi, at, dur, wave, vol) {
        if (!midi || A.muted) return;
        var osc = A.ctx.createOscillator();
        var g = A.ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(this.hz(midi), at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        osc.connect(g); g.connect(this.gain);
        osc.start(at); osc.stop(at + dur + 0.02);
      },

      /** 1 = kick, 2 = hat. Enough of a kit for eight-bit. */
      hit: function (kind, at) {
        if (A.muted) return;
        if (kind === 1) {
          var osc = A.ctx.createOscillator(), g = A.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, at);
          osc.frequency.exponentialRampToValueAtTime(48, at + 0.11);
          g.gain.setValueAtTime(0.34, at);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
          osc.connect(g); g.connect(this.gain);
          osc.start(at); osc.stop(at + 0.15);
          return;
        }
        var len = Math.floor(A.ctx.sampleRate * 0.035);
        var buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        var src = A.ctx.createBufferSource(); src.buffer = buf;
        var f = A.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
        var hg = A.ctx.createGain(); hg.gain.value = 0.11;
        src.connect(f); f.connect(hg); hg.connect(this.gain);
        src.start(at);
      }
    },

    sfx: function (name) {
      switch (name) {
        case 'jump':     this.tone(330, 0.13, 'square', 0.35, 620); break;
        case 'doubleJump': this.tone(480, 0.18, 'triangle', 0.4, 900); break;
        case 'grog':     this.tone(880, 0.07, 'square', 0.3); this.tone(1320, 0.09, 'square', 0.22); break;
        case 'stomp':    this.noise(0.12, 0.4, 420, 0.8); this.tone(200, 0.1, 'square', 0.25, 90); break;
        case 'hurt':     this.tone(300, 0.25, 'sawtooth', 0.35, 110); this.noise(0.2, 0.25, 600); break;
        case 'die':      this.tone(400, 0.5, 'square', 0.35, 70); break;
        case 'splash':   this.noise(0.55, 0.5, 700, 0.6); this.noise(0.35, 0.3, 1800, 0.8); break;
        case 'powerup':  this.tone(440, 0.09, 'square', 0.3); setTimeout(function(){A.tone(660,0.09,'square',0.3);},70);
                         setTimeout(function(){A.tone(880,0.16,'square',0.3);},140); break;
        case 'urn':      this.tone(220, 0.4, 'sine', 0.35, 160); this.tone(330, 0.4, 'sine', 0.2, 240); break;
        case 'flag':     this.tone(523, 0.1, 'triangle', 0.3); setTimeout(function(){A.tone(784,0.22,'triangle',0.3);},90); break;
        case 'seed':     this.tone(180, 0.2, 'triangle', 0.3, 420); break;
        case 'shard':    this.tone(1100, 0.1, 'triangle', 0.3); setTimeout(function(){A.tone(1650,0.2,'triangle',0.25);},80); break;
        case 'crumble':  this.noise(0.3, 0.35, 300, 0.7); break;
        case 'menu':     this.tone(520, 0.05, 'square', 0.2); break;
        case 'select':   this.tone(700, 0.07, 'square', 0.28); setTimeout(function(){A.tone(1040,0.1,'square',0.24);},60); break;
        case 'quip':     this.tone(260, 0.06, 'triangle', 0.18); break;
        case 'trialHit': this.tone(660, 0.09, 'square', 0.3, 900); break;
        case 'trialMiss':this.tone(180, 0.22, 'sawtooth', 0.3, 90); break;
        case 'chime':    this.tone(1046, 0.55, 'sine', 0.22); this.tone(1568, 0.4, 'sine', 0.1); break;
        case 'chimeLow': this.tone(523, 0.6, 'sine', 0.24); this.tone(784, 0.45, 'sine', 0.1); break;
        case 'fine':     this.tone(660, 0.09, 'square', 0.25, 300); setTimeout(function(){A.tone(440,0.16,'square',0.22,180);},80); break;
        case 'spirit':   this.tone(1320, 0.3, 'sine', 0.22, 1980); break;
        case 'creak':    this.tone(120, 0.32, 'sawtooth', 0.18, 70); break;
        case 'gust':     this.noise(0.5, 0.2, 420, 0.4); break;
        case 'trialWin': this.tone(523,0.1,'square',0.3); setTimeout(function(){A.tone(659,0.1,'square',0.3);},90);
                         setTimeout(function(){A.tone(784,0.1,'square',0.3);},180);
                         setTimeout(function(){A.tone(1047,0.3,'square',0.3);},270); break;
      }
    }
  });

})(window.PL = window.PL || {});
