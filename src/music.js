/* music.js — one eight-bit tune per city, as rows of numbers.
 *
 * Notes are MIDI numbers on a grid of sixteenths, 0 is a rest, and every track
 * loops on its own length. Sixty is middle C, so 62 is the D above it; a note
 * twelve higher is the same note an octave up. Written this way a tune is
 * something you can read down the page and edit a step at a time, which is the
 * whole reason not to ship audio files.
 *
 * `drums` is the kit: 1 kick, 2 hat, 0 nothing.
 *
 * The towns are meant to be told apart with your eyes shut, so each one gets
 * its own key, tempo and rhythm rather than a reskin of the same loop:
 *
 *   Shanty Town  D minor, slow, a lilt          — salvage and grog
 *   Aleforge     E minor, fast, straight eights — brick, copper and steam
 *   Providence   C major, on the beat, bells    — order, tonic, prayer
 *   Fenwick      A dorian, slow, sparse         — mud magic and moss
 *   Roto Kaiishi G pentatonic, busy             — a market on stilts
 *   Sackbeard's  D harmonic minor, heavy        — inside the beast
 *
 * To add one: give the area an entry keyed by its town id and PlayScene picks
 * it up automatically. Nothing else needs editing.
 */
(function (PL) {
  'use strict';

  PL.Music = {
    /* The title: sparse and unhurried, because it plays under a menu someone
     * is reading rather than a level they are running. */
    title: {
      bpm: 76, leadWave: 'triangle', leadLen: 6,
      lead: [62, 0, 0, 0, 0, 0, 69, 0,  0, 0, 0, 0, 65, 0, 0, 0,
             62, 0, 0, 0, 0, 0, 67, 0,  0, 0, 65, 0, 0, 0, 0, 0],
      bass: [38, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0,
             41, 0, 0, 0, 0, 0, 0, 0,  0, 0, 0, 0, 0, 0, 0, 0],
      drums: null
    },

    shantytown: {
      bpm: 96, leadLen: 3,
      lead: [62, 0, 65, 0, 69, 0,  0, 67,  65, 0, 62, 0,  0, 0, 60, 0,
             62, 0, 65, 0, 69, 0, 74, 0,   72, 0, 69, 0, 67, 0, 65, 0],
      bass: [38, 0, 0, 0, 38, 0, 0, 0,  41, 0, 0, 0, 41, 0, 0, 0,
             38, 0, 0, 0, 38, 0, 0, 0,  43, 0, 0, 0, 45, 0, 0, 0],
      drums: [1, 0, 2, 0, 0, 0, 2, 0,  1, 0, 2, 0, 0, 0, 2, 0,
              1, 0, 2, 0, 0, 0, 2, 0,  1, 0, 2, 0, 1, 0, 2, 0]
    },

    aleforge: {
      bpm: 132, leadLen: 2,
      lead: [64, 0, 64, 0, 67, 0, 64, 0,  71, 0, 0, 69, 67, 0, 64, 0,
             62, 0, 62, 0, 64, 0, 62, 0,  67, 0, 0, 64, 62, 0, 59, 0],
      bass: [40, 0, 40, 0, 40, 0, 40, 0,  43, 0, 43, 0, 43, 0, 43, 0,
             38, 0, 38, 0, 38, 0, 38, 0,  40, 0, 40, 0, 40, 0, 40, 0],
      drums: [1, 0, 2, 2, 1, 0, 2, 0,  1, 0, 2, 2, 1, 0, 2, 0,
              1, 0, 2, 2, 1, 0, 2, 0,  1, 1, 2, 2, 1, 0, 2, 2]
    },

    /* Providence runs on the chime, so its tune sits square on the beat and
     * the lead is a bell rather than a square wave. */
    providence: {
      bpm: 112, leadWave: 'sine', leadLen: 5,
      lead: [72, 0, 0, 0, 76, 0, 0, 0,  79, 0, 0, 0, 76, 0, 0, 0,
             74, 0, 0, 0, 77, 0, 0, 0,  81, 0, 0, 0, 79, 0, 0, 0],
      bass: [48, 0, 0, 0, 52, 0, 0, 0,  55, 0, 0, 0, 52, 0, 0, 0,
             50, 0, 0, 0, 53, 0, 0, 0,  57, 0, 0, 0, 55, 0, 0, 0],
      drums: [1, 0, 0, 0, 2, 0, 0, 0,  1, 0, 0, 0, 2, 0, 0, 0,
              1, 0, 0, 0, 2, 0, 0, 0,  1, 0, 0, 0, 2, 0, 2, 0]
    },

    fenwick: {
      bpm: 88, leadWave: 'triangle', leadLen: 4,
      lead: [69, 0, 0, 72, 0, 74, 0, 0,  76, 0, 74, 0, 72, 0, 0, 0,
             69, 0, 0, 67, 0, 69, 0, 0,  72, 0, 0, 0, 71, 0, 0, 0],
      bass: [33, 0, 0, 0, 0, 0, 40, 0,  33, 0, 0, 0, 0, 0, 38, 0,
             33, 0, 0, 0, 0, 0, 40, 0,  36, 0, 0, 0, 0, 0, 0, 0],
      drums: [1, 0, 0, 0, 0, 0, 2, 0,  0, 0, 0, 0, 1, 0, 2, 0,
              1, 0, 0, 0, 0, 0, 2, 0,  0, 0, 0, 0, 1, 0, 0, 0]
    },

    roto: {
      bpm: 120, leadLen: 2,
      lead: [67, 0, 69, 0, 71, 0, 74, 0,  76, 0, 74, 0, 71, 0, 69, 0,
             67, 0, 69, 0, 71, 0, 74, 0,  79, 0, 76, 0, 74, 0, 71, 0],
      bass: [43, 0, 43, 0, 50, 0, 43, 0,  45, 0, 45, 0, 52, 0, 45, 0,
             43, 0, 43, 0, 50, 0, 43, 0,  47, 0, 47, 0, 43, 0, 43, 0],
      drums: [1, 0, 2, 0, 1, 0, 2, 0,  1, 0, 2, 0, 1, 0, 2, 2,
              1, 0, 2, 0, 1, 0, 2, 0,  1, 0, 2, 2, 1, 0, 2, 0]
    },

    tavern: {
      bpm: 104, leadLen: 3,
      lead: [62, 0, 65, 0, 69, 0, 73, 0,  74, 0, 0, 73, 69, 0, 65, 0,
             62, 0, 65, 0, 69, 0, 74, 0,  77, 0, 74, 0, 69, 0, 62, 0],
      bass: [38, 0, 0, 38, 0, 0, 38, 0,  43, 0, 0, 43, 0, 0, 43, 0,
             34, 0, 0, 34, 0, 0, 34, 0,  38, 0, 0, 38, 0, 0, 38, 0],
      drums: [1, 0, 0, 2, 1, 0, 2, 0,  1, 0, 0, 2, 1, 0, 2, 0,
              1, 0, 0, 2, 1, 0, 2, 0,  1, 1, 0, 2, 1, 0, 2, 2]
    }
  };

})(window.PL = window.PL || {});
