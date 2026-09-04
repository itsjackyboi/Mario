/* bank.js — the Beer Bank's catalogue, and the animals in it.
 *
 * Everything you walk out of a level with goes into the Bank. It buys nothing
 * that helps you: pets trot along behind Corb, outfits and hats repaint him,
 * and that is the whole of it. A cosmetic that changed a run would put every
 * time on the shared board into a different category, and there is only one
 * board.
 *
 * Three slots, worn independently, so the combinations are yours:
 *   pet     one of the animals below, following at a distance, name on show
 *   outfit  coat, trim and skin tone
 *   hat     whatever is on his head
 *
 * THE PETS ARE FROM THE COMPENDIUM. Every one but Jigglet appears in Notable
 * Animals, and seven of the nine are the horses, mules and hornses the Six rode
 * to Pintland on the Walk of Shame — which is why the tiers read as a stable
 * rather than a menagerie. PegButt tops it because he has to: "most trusted
 * horse ridden by man", brutally murdered by Jameson Pilsner, "just like a
 * father to us all". You do not buy PegButt. You buy what is left of him.
 *
 * Each entry draws itself into a size-s box, so the shop icon and the animal
 * following you around a level are the same artwork at two sizes.
 */
(function (PL) {
  'use strict';

  var C = PL.C;

  /* The shared quadruped. Every horse, mule and hornse starts here and then
   * does something of its own on top — the silhouette is what makes them read
   * as a stable, and the details are what tell them apart. */
  function beast(ctx, x, y, s, coat, mane, opt) {
    opt = opt || {};
    var lift = opt.lift || 0;
    PL.gfx.rect(ctx, x + s * 0.14, y + s * 0.34 - lift, s * 0.64, s * 0.32, coat);
    PL.gfx.rect(ctx, x + s * 0.19, y + s * 0.62 - lift, s * 0.11, s * 0.30, coat);
    PL.gfx.rect(ctx, x + s * 0.63, y + s * 0.62 - lift, s * 0.11, s * 0.30, coat);
    PL.gfx.rect(ctx, x + s * 0.62, y + s * 0.14 - lift, s * 0.26, s * 0.28, coat);
    PL.gfx.rect(ctx, x + s * (opt.longEar ? 0.64 : 0.66),
                y + s * (opt.longEar ? 0.00 : 0.06) - lift,
                s * 0.07, s * (opt.longEar ? 0.16 : 0.10), mane);
    PL.gfx.rect(ctx, x + s * 0.52, y + s * 0.16 - lift, s * 0.14, s * 0.30, mane);
    PL.gfx.rect(ctx, x + s * 0.08, y + s * 0.28 - lift, s * 0.08, s * 0.26, mane);
    ctx.fillStyle = opt.eye || C.ink;
    ctx.fillRect(x + s * 0.80, y + s * 0.22 - lift, s * 0.05, s * 0.05);
    if (opt.muzzle) {
      PL.gfx.rect(ctx, x + s * 0.78, y + s * 0.30 - lift, s * 0.10, s * 0.10, opt.muzzle);
    }
  }

  var PETS = [
    {
      id: 'jigglet', name: 'Jigglet', kind: 'chicken', price: 1000,
      blurb: 'A chicken. Follows you for reasons of her own.',
      draw: function (ctx, x, y, s, t) {
        var bob = Math.sin(t * 8) * s * 0.04;
        PL.gfx.rect(ctx, x + s * 0.24, y + s * 0.42 + bob, s * 0.44, s * 0.34, '#f2ead6');
        PL.gfx.rect(ctx, x + s * 0.18, y + s * 0.44 + bob, s * 0.14, s * 0.22, '#ded4bc');
        PL.gfx.rect(ctx, x + s * 0.56, y + s * 0.24 + bob, s * 0.22, s * 0.22, '#f2ead6');
        PL.gfx.rect(ctx, x + s * 0.60, y + s * 0.14 + bob, s * 0.12, s * 0.10, '#d4574e');
        PL.gfx.rect(ctx, x + s * 0.56, y + s * 0.42 + bob, s * 0.10, s * 0.07, '#d4574e');
        ctx.fillStyle = '#e2a33c';
        ctx.fillRect(x + s * 0.76, y + s * 0.32 + bob, s * 0.10, s * 0.06);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + s * 0.68, y + s * 0.30 + bob, s * 0.04, s * 0.04);
        ctx.fillStyle = '#e2a33c';
        ctx.fillRect(x + s * 0.34, y + s * 0.76, s * 0.06, s * 0.16);
        ctx.fillRect(x + s * 0.54, y + s * 0.76, s * 0.06, s * 0.16);
      }
    },
    {
      id: 'skeet', name: 'Skeet Budle', kind: 'mule', price: 1000,
      blurb: 'Walk of Shame stock. Carried a king once and has not let it go.',
      draw: function (ctx, x, y, s) {
        beast(ctx, x, y, s, '#8d7b63', '#463c30', { longEar: true, muzzle: '#c6b79c' });
      }
    },
    {
      id: 'maxtrans', name: 'Max Trans', kind: 'parrot', price: 3000,
      blurb: "Pilsner's bird. Knows where the Golden Isles are. Will not say.",
      draw: function (ctx, x, y, s, t) {
        var w = Math.sin(t * 11) * s * 0.09;
        PL.gfx.rect(ctx, x + s * 0.30, y + s * 0.28, s * 0.34, s * 0.44, '#2f9e5e');
        PL.gfx.rect(ctx, x + s * 0.20, y + s * 0.56, s * 0.16, s * 0.34, '#2f7ea0');
        PL.gfx.rect(ctx, x + s * 0.32, y + s * 0.34 + w, s * 0.26, s * 0.24, '#57c47f');
        PL.gfx.rect(ctx, x + s * 0.54, y + s * 0.12, s * 0.24, s * 0.24, '#d4574e');
        ctx.fillStyle = '#e2c07a';
        ctx.fillRect(x + s * 0.76, y + s * 0.20, s * 0.11, s * 0.11);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + s * 0.66, y + s * 0.18, s * 0.04, s * 0.04);
        ctx.fillStyle = '#e2a33c';
        ctx.fillRect(x + s * 0.40, y + s * 0.86, s * 0.05, s * 0.10);
      }
    },
    {
      id: 'wacker', name: 'Dick Wacker', kind: 'horse', price: 3000,
      blurb: 'Walk of Shame stock. Nobody will say how he came by the name.',
      draw: function (ctx, x, y, s) {
        beast(ctx, x, y, s, '#6b4a34', '#2e2118');
        PL.gfx.rect(ctx, x + s * 0.24, y + s * 0.36, s * 0.16, s * 0.10, '#c9b48c'); // blaze
      }
    },
    {
      id: 'chiton', name: 'Chi Ton Pissbulls', kind: 'horse', price: 5000,
      blurb: 'Walk of Shame stock. Drinks more than the man who rode him.',
      draw: function (ctx, x, y, s, t) {
        beast(ctx, x, y, s, '#9a8fa8', '#544a62', { lift: Math.sin(t * 2.1) > 0.86 ? s * 0.03 : 0 });
        PL.gfx.rect(ctx, x + s * 0.30, y + s * 0.44, s * 0.20, s * 0.16, '#7c718c');  // dapples
        PL.gfx.rect(ctx, x + s * 0.54, y + s * 0.50, s * 0.12, s * 0.10, '#7c718c');
      }
    },
    {
      id: 'pegbuttjr', name: 'PegButt Jr.', kind: 'horse', price: 5000,
      blurb: 'Forever in his father’s shadow. Awfully large shoes to fill.',
      draw: function (ctx, x, y, s) {
        beast(ctx, x, y, s, '#c9b48c', '#7d6a4a');
        // his father's shoes, far too big, worn anyway
        ctx.fillStyle = '#b8bec4';
        ctx.fillRect(x + s * 0.14, y + s * 0.88, s * 0.21, s * 0.09);
        ctx.fillRect(x + s * 0.58, y + s * 0.88, s * 0.21, s * 0.09);
      }
    },
    {
      id: 'farty', name: 'Farty McShits', kind: 'hornse', price: 10000,
      blurb: 'A hornse. Half-brother to Shitty McFarts, and twice the smell.',
      draw: function (ctx, x, y, s, t) {
        beast(ctx, x, y, s, '#5d6b4a', '#313d28');
        ctx.save();
        ctx.globalAlpha = 0.34 + Math.sin(t * 3) * 0.16;
        ctx.fillStyle = '#9fbf6a';
        for (var i = 0; i < 3; i++) {
          var d = (t * 0.8 + i * 0.33) % 1;
          ctx.beginPath();
          ctx.arc(x + s * (0.06 - d * 0.12), y + s * (0.42 - d * 0.18),
                  s * (0.05 + d * 0.08), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    {
      id: 'slick', name: 'Slick Dickless', kind: 'horse', price: 10000,
      blurb: 'The last of the Walk of Shame stock. Sleek. Entirely unbothered.',
      draw: function (ctx, x, y, s, t) {
        beast(ctx, x, y, s, '#20242e', '#3c4657');
        ctx.save();
        ctx.globalAlpha = 0.45 + Math.sin(t * 2.2) * 0.25;
        PL.gfx.rect(ctx, x + s * 0.18, y + s * 0.36, s * 0.56, s * 0.05, '#8fa8d8');
        ctx.restore();
      }
    },
    {
      id: 'pegbutt', name: 'PegButt', kind: 'horse', price: 20000,
      blurb: 'Most trusted horse ridden by man. Pilsner killed him. He came back.',
      draw: function (ctx, x, y, s, t) {
        // He is dead. The most expensive thing in the Bank is a ghost, and the
        // lore is the reason — you are not buying a horse, you are buying what
        // is left of the one that was a father to us all.
        ctx.save();
        PL.gfx.glow(ctx, x + s * 0.5, y + s * 0.5, s * 1.1, 'rgba(180,214,230,0.5)', 0.5);
        ctx.globalAlpha = 0.62 + Math.sin(t * 1.7) * 0.12;
        beast(ctx, x, y, s - s * 0.02, '#cfe4ee', '#8fb8cc', {
          eye: '#5fd8ff', lift: Math.sin(t * 1.3) * s * 0.02
        });
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#e8f6ff';
        ctx.fillRect(x + s * 0.14, y + s * 0.88, s * 0.21, s * 0.06);
        ctx.fillRect(x + s * 0.58, y + s * 0.88, s * 0.21, s * 0.06);
        ctx.restore();
      }
    }
  ];

  /* Outfits repaint the body; hats sit on the head. Kept as separate slots so
   * the two mix — the point of a cosmetic is that yours is not everyone's. */
  var OUTFITS = [
    { id: 'ship', name: 'Ship Clothes', price: 0,
      blurb: 'What he rowed in wearing.',
      coat: '#b0453e', trim: '#f2e3c4', skin: '#d9a173' },
    { id: 'saltcrust', name: 'Salt-Crusted', price: 1200,
      blurb: 'Been in the water more than out of it.',
      coat: '#4c6d63', trim: '#cfe6e4', skin: '#c08e63' },
    { id: 'brewhand', name: "Brewer's Apron", price: 2500,
      blurb: 'Aleforge work clothes. Permanently smells of the mash house.',
      coat: '#8a5a2c', trim: '#e2c07a', skin: '#d9a173' },
    { id: 'chime', name: 'Chime Grey', price: 4000,
      blurb: 'Providence cut. Nobody will fine you twice in this.',
      coat: '#aeb6bd', trim: '#ffd77a', skin: '#cf9f74' },
    { id: 'crimson', name: 'Cutter Crimson', price: 6000,
      blurb: 'Owe Block colours. Half the Block will love you for it.',
      coat: '#c0392b', trim: '#f0c7a0', skin: '#c08e63' },
    { id: 'circus', name: 'Circus Blue', price: 6000,
      blurb: 'The other half of the Block. Choose carefully, or do not.',
      coat: '#2f6fa8', trim: '#cfe6f5', skin: '#d9a173' },
    { id: 'goldcoral', name: 'Goldcoral Silks', price: 9000,
      blurb: "Anqoak's own cloth. Costs more than the ship it came on.",
      coat: '#c9a24a', trim: '#fff0c2', skin: '#d9a173' },
    { id: 'veil', name: 'Veilwalker Weave', price: 15000,
      blurb: 'Fenwick made this. It should not fit a man, and it does.',
      coat: '#5c3f7a', trim: '#c9a8f0', skin: '#e0c3a6' }
  ];

  var HATS = [
    { id: 'tricorn', name: 'Salt Tricorn', price: 0,
      blurb: 'The one he arrived in.', hat: '#40312a', band: '#5a4436' },
    { id: 'redband', name: 'Crimson Bandana', price: 800,
      blurb: 'Cutter red. Worn off the Block it just means you are brave.',
      hat: '#c0392b', band: '#8a2820', low: true },
    { id: 'bluecap', name: 'Circus Cap', price: 800,
      blurb: 'Seaside Circus blue, and a bell nobody asked for.',
      hat: '#2f6fa8', band: '#1d4a72', low: true },
    { id: 'wolendi', name: 'Wolendi Cap', price: 2500,
      blurb: 'Wind-farm issue. Stays on in a shear, which is the whole trick.',
      hat: '#7d6a4a', band: '#e2c07a' },
    { id: 'friar', name: "Friar's Hood", price: 4500,
      blurb: 'Drawn up, nobody in Providence looks at you twice.',
      hat: '#6a717a', band: '#aeb6bd', hood: true },
    { id: 'kelp', name: 'Kelp Crown', price: 7000,
      blurb: 'Fenwick wove it out of the bog. It is still growing.',
      hat: '#3d5c4c', band: '#9fe8d8', spikes: true },
    { id: 'liquor', name: "The Liquor King's Crown", price: 20000,
      blurb: 'Nine pounds of nothing on a man’s head. Now it is yours.',
      hat: '#e0a83c', band: '#fff0c2', spikes: true, crown: true }
  ];

  var byId = {};
  function tag(list, slot) {
    for (var i = 0; i < list.length; i++) { list[i].slot = slot; byId[list[i].id] = list[i]; }
  }
  tag(PETS, 'pet');
  tag(OUTFITS, 'outfit');
  tag(HATS, 'hat');

  PL.Bank = {
    PETS: PETS,
    OUTFITS: OUTFITS,
    HATS: HATS,

    get: function (id) { return byId[id] || null; },

    /** What is worn in a slot, or the free default where there is one. */
    worn: function (slot) {
      var id = PL.Store.bank()[slot];
      var it = (id && PL.Store.owns(id)) ? byId[id] : null;
      if (it) return it;
      if (slot === 'outfit') return OUTFITS[0];
      if (slot === 'hat') return HATS[0];
      return null;                       // a pet is nothing until you buy one
    }
  };

})(window.PL = window.PL || {});
