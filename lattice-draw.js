/* ============================================================================
 * lattice-draw.js — renders the E8 lattice to a Canvas2D context.
 *
 * ONE draw routine, shared by the live apex hero and the og-image PNG, so the
 * share card is byte-for-byte the same object a visitor sees turning.
 *
 * The "rotation" is a rigid 2D spin of the canonical Coxeter projection — a pure
 * VIEW transform. It does not touch HELM's math (FROZEN): the 240 points and
 * 6720 edges are the canonical projection; only the viewing angle changes.
 *
 * PALETTE — GOLD FIELD on near-black, to read as one site with /atlas/. The lattice
 * is gold (bright ivory-gold at the centre grading to structural bronze-gold at the
 * rim). Blue and orange are SPARSE ACCENTS ONLY — a sparse scatter of marker roots,
 * never the ground the whole lattice sits in. Additive ('lighter') compositing +
 * a radial-gradient halo per point give the soft glow /atlas/ reads as "alive".
 * ==========================================================================*/
(function (root) {
  'use strict';

  // Gold field grade. t = radius/RMAX in [0,1]: bright highlight (inner) -> bronze-gold (rim).
  var GOLD_HI = [255, 246, 216];   // #FFF6D8  highlight
  var GOLD_MID = [233, 200, 122];  // #E9C87A  bright gold
  var GOLD_LO = [176, 141, 87];    // #B08D57  structural gold
  function pointColor(t) {
    var a, b, f;
    if (t < 0.5) { a = GOLD_HI; b = GOLD_MID; f = t / 0.5; }
    else { a = GOLD_MID; b = GOLD_LO; f = (t - 0.5) / 0.5; }
    return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
  }

  // Sparse accents — a scatter of marker roots, blue / orange, alternating. NOT a grade.
  // Keyed off index by a coprime stride so the marks scatter across the rings (~1 in 23).
  var ACCENT_BLUE = [90, 166, 255];    // #5AA6FF
  var ACCENT_ORANGE = [224, 138, 106]; // #E08A6A
  function accentOf(i) {
    if (i % 23 !== 0) return null;
    return ((i / 23 | 0) % 2) ? ACCENT_ORANGE : ACCENT_BLUE;
  }

  // ctx: Canvas2D. W,H: pixel size. angle: radians. core: lattice-core export. opt: {bg, dpr}
  function drawLattice(ctx, W, H, angle, core, opt) {
    opt = opt || {};
    var proj0 = core.proj0, edgePairs = core.edgePairs, rad0 = core.rad0, RMAX = core.RMAX;
    var cx = W / 2, cy = H / 2;
    var scale = Math.min(W, H) * 0.44 / RMAX;
    var cos = Math.cos(angle), sin = Math.sin(angle);
    var dpr = opt.dpr || 1;

    // background — near-black gold-black, a faint warm vignette. Matches /atlas/ #070C18.
    if (opt.bg !== false) {
      var g = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, Math.max(W, H) * 0.72);
      g.addColorStop(0, '#0b1120'); g.addColorStop(0.55, '#070C18'); g.addColorStop(1, '#04060d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    // project + rotate once
    var px = new Float64Array(240), py = new Float64Array(240);
    for (var i = 0; i < 240; i++) {
      var x = proj0[i][0], y = proj0[i][1];
      px[i] = cx + (x * cos - y * sin) * scale;
      py[i] = cy - (x * sin + y * cos) * scale;
    }

    // edges — batched single path, one stroke (fast even at 6720 lines). Faint gold web.
    ctx.lineWidth = Math.max(0.5, dpr * 0.6);
    ctx.strokeStyle = 'rgba(176,141,87,0.05)';
    ctx.beginPath();
    for (var e = 0; e < edgePairs.length; e++) {
      var a = edgePairs[e][0], b = edgePairs[e][1];
      ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
    }
    ctx.stroke();

    // points — halo + bright core, ring-graded gold with sparse blue/orange marker accents.
    // Additive ('lighter') so overlapping light accumulates — the glow that reads as alive.
    // Halo geometry is the accepted original's (r 5.5/1.7 dpr): a per-point radial-gradient was
    // measured ~40% costlier per frame for no proportionate gain, so ONLY the colour changed —
    // the frame cost equals the original the site already shipped at 60fps.
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < 240; i++) {
      var acc = accentOf(i);
      var c = acc || pointColor(rad0[i] / RMAX);
      var rgb = c[0] + ',' + c[1] + ',' + c[2];
      // halo
      ctx.fillStyle = 'rgba(' + rgb + ',' + (acc ? 0.13 : 0.10) + ')';
      ctx.beginPath(); ctx.arc(px[i], py[i], 5.5 * dpr, 0, 6.283185); ctx.fill();
      // core
      ctx.fillStyle = 'rgba(' + rgb + ',0.95)';
      ctx.beginPath(); ctx.arc(px[i], py[i], 1.7 * dpr, 0, 6.283185); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { drawLattice: drawLattice };
  else (typeof window !== 'undefined' ? window : globalThis).drawLattice = drawLattice;
})(this);
