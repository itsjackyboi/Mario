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
