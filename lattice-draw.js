/* ============================================================================
 * lattice-draw.js — renders the E8 lattice to a Canvas2D context.
 *
 * ONE draw routine, shared by the live apex hero and the og-image PNG, so the
 * share card is byte-for-byte the same object a visitor sees turning.
 *
 * The "rotation" is a rigid 2D spin of the canonical Coxeter projection — a pure
 * VIEW transform. It does not touch HELM's math (FROZEN): the 240 points and
 * 6720 edges are the canonical projection; only the viewing angle changes.
 * ==========================================================================*/
(function (root) {
  'use strict';

  // Ring-graded palette (matches the apex editorial CSS: amber inner -> ivory/blue outer).
  function pointColor(t) { // t = radius/RMAX in [0,1]
    const amber = [216, 184, 120], ivory = [237, 228, 206], blue = [138, 160, 190];
    let a, b, f;
    if (t < 0.5) { a = amber; b = ivory; f = t / 0.5; }
    else { a = ivory; b = blue; f = (t - 0.5) / 0.5; }
    return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
  }

  // ctx: Canvas2D. W,H: pixel size. angle: radians. core: lattice-core export. opt: {bg, dpr}
  function drawLattice(ctx, W, H, angle, core, opt) {
    opt = opt || {};
    const { proj0, edgePairs, rad0, RMAX } = core;
    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.44 / RMAX;
    const cos = Math.cos(angle), sin = Math.sin(angle);

    // background (paint it — the og PNG needs it; the hero paints each frame)
    if (opt.bg !== false) {
      const g = ctx.createRadialGradient(cx, cy * 0.92, 0, cx, cy, Math.max(W, H) * 0.7);
      g.addColorStop(0, '#0d1626'); g.addColorStop(0.55, '#0a101c'); g.addColorStop(1, '#070b14');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    // project + rotate once
    const px = new Float64Array(240), py = new Float64Array(240);
    for (let i = 0; i < 240; i++) {
      const x = proj0[i][0], y = proj0[i][1];
      px[i] = cx + (x * cos - y * sin) * scale;
      py[i] = cy - (x * sin + y * cos) * scale;
    }

    // edges — batched into a single path, one stroke (fast even at 6720 lines)
    ctx.lineWidth = Math.max(0.5, (opt.dpr || 1) * 0.6);
    ctx.strokeStyle = 'rgba(150,175,210,0.055)';
    ctx.beginPath();
    for (let e = 0; e < edgePairs.length; e++) {
      const a = edgePairs[e][0], b = edgePairs[e][1];
      ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]);
    }
    ctx.stroke();

    // points — halo + core, ring-graded colour. Additive glow.
    const dpr = opt.dpr || 1;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 240; i++) {
      const t = rad0[i] / RMAX;
      const c = pointColor(t);
      const rgb = c[0] + ',' + c[1] + ',' + c[2];
      // halo
      ctx.fillStyle = 'rgba(' + rgb + ',0.10)';
      ctx.beginPath(); ctx.arc(px[i], py[i], 5.5 * dpr, 0, 6.283185); ctx.fill();
      // core
      ctx.fillStyle = 'rgba(' + rgb + ',0.95)';
      ctx.beginPath(); ctx.arc(px[i], py[i], 1.7 * dpr, 0, 6.283185); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { drawLattice };
  else (typeof window !== 'undefined' ? window : globalThis).drawLattice = drawLattice;
})(this);
