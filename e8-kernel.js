/* ============================================================================
 * e8-kernel.js — L0 GROUND LAYER. The single source of E8 truth.
 *
 * Integer-exact. No floats, no epsilon, no dependencies, no rendering.
 * A root either IS or IS NOT in a set — decided by integer equality, never a
 * tolerance. Every future surface reads its geometry from here.
 *
 * EXACT REPRESENTATION — scale by 2.
 *   A root's true coordinates are stored multiplied by 2, as an 8-tuple of
 *   integers. The two E8 families then become:
 *     integer roots      (±1,±1,0^6) permuted  ->  scaled (±2,±2,0^6)   [112]
 *     half-integer roots (±1/2)^8, even # of -  ->  scaled (±1)^8        [128]
 *   So every stored coordinate is in {-2,-1,0,1,2}. All arithmetic is integer.
 *   True coordinate  = stored / 2.   True inner product = (A·B)/4  (always an
 *   exact integer for E8 roots; asserted divisible, never rounded).
 *
 * Zero-build: plain ES5 JS. <script src="/e8-kernel.js"> in a browser (global
 * `E8`), or require() in Node. 240 roots, canonical order fixed for all time.
 * ==========================================================================*/
(function (root) {
  'use strict';

  var SCALE = 2; // stored coordinate = true coordinate * SCALE

  // ---- generate the 240 roots in SCALED integer coordinates ----
  function generate() {
    var out = [];
    // 112 integer roots: two nonzero positions, each ±1 (scaled ±2)
    for (var i = 0; i < 8; i++)
      for (var j = i + 1; j < 8; j++)
        for (var si = 0; si < 2; si++)
          for (var sj = 0; sj < 2; sj++) {
            var v = [0,0,0,0,0,0,0,0];
            v[i] = si ? 2 : -2;
            v[j] = sj ? 2 : -2;
            out.push(v);
          }
    // 128 half-integer roots: (±1)^8 scaled, with an EVEN number of minus signs
    for (var m = 0; m < 256; m++) {
      var neg = 0, k;
      for (k = 0; k < 8; k++) if (m & (1 << k)) neg++;
      if (neg % 2) continue;
      var w = [];
      for (k = 0; k < 8; k++) w.push((m & (1 << k)) ? -1 : 1);
      out.push(w);
    }
    return out;
  }

  // ---- CANONICAL ORDER: lexicographic ascending on the scaled 8-tuple. ----
  // Total, deterministic, and fixed forever. Downstream indexes into this order.
  function lexLess(a, b) {
    for (var i = 0; i < 8; i++) { if (a[i] !== b[i]) return a[i] < b[i]; }
    return false;
  }
  var ROOTS = generate().sort(function (a, b) { return lexLess(a, b) ? -1 : (lexLess(b, a) ? 1 : 0); });

  // membership by exact integer key
  function key(v) { return v.join(','); }
  var INDEX = {};
  for (var r = 0; r < ROOTS.length; r++) INDEX[key(ROOTS[r])] = r;

  // ---- exact operations (all integer) ----
  function scaledDot(a, b) { var s = 0; for (var i = 0; i < 8; i++) s += a[i] * b[i]; return s; }

  // true inner product = scaledDot/4, exact integer for E8 roots (asserted).
  function inner(a, b) {
    var sd = scaledDot(a, b);
    if (sd % 4 !== 0) throw new Error('E8.inner: non-integer inner product (scaledDot=' + sd + ') — inputs are not E8 roots');
    return sd / 4;
  }

  // exact squared length (= 2 for every root): scaledDot(v,v)/4
  function normSq(v) { var sd = scaledDot(v, v); if (sd % 4 !== 0) throw new Error('E8.normSq: not integer'); return sd / 4; }

  // Weyl reflection of vector v through the hyperplane of root a:
  //   v' = v - 2(<v,a>/<a,a>) a ; for E8 <a,a>=2 so v' = v - <v,a> a.
  // In scaled coords (V=2v, A=2a): V' = V - k*A,  k = <v,a> = (V·A)/4  (exact integer).
  function reflect(v, a) {
    var sd = scaledDot(v, a);
    if (sd % 4 !== 0) throw new Error('E8.reflect: non-integer <v,a>');
    var k = sd / 4;
    var out = new Array(8);
    for (var i = 0; i < 8; i++) out[i] = v[i] - k * a[i];
    return out;
  }

  // ---- simple roots (Bourbaki, even coordinate system), SCALED ----
  //   a1 = 1/2(e1-e2-e3-e4-e5-e6-e7+e8), a2 = e1+e2, a3 = e2-e1, a4 = e3-e2, ... a8 = e7-e6
  var SIMPLE = [
    [ 1,-1,-1,-1,-1,-1,-1, 1],
    [ 2, 2, 0, 0, 0, 0, 0, 0],
    [-2, 2, 0, 0, 0, 0, 0, 0],
    [ 0,-2, 2, 0, 0, 0, 0, 0],
    [ 0, 0,-2, 2, 0, 0, 0, 0],
    [ 0, 0, 0,-2, 2, 0, 0, 0],
    [ 0, 0, 0, 0,-2, 2, 0, 0],
    [ 0, 0, 0, 0, 0,-2, 2, 0]
  ];

  // Cartan matrix C[i][j] = 2<ai,aj>/<aj,aj> = <ai,aj> (all roots have norm^2 2). Exact integers.
  function cartanMatrix() {
    var C = [];
    for (var i = 0; i < 8; i++) { C.push([]); for (var j = 0; j < 8; j++) C[i].push(inner(SIMPLE[i], SIMPLE[j])); }
    return C;
  }

  // positivity: first nonzero SCALED coordinate is positive (a fixed, stated ordering).
  function isPositive(v) { for (var i = 0; i < 8; i++) { if (v[i] !== 0) return v[i] > 0; } return false; }

  var api = {
    SCALE: SCALE,
    roots: function () { return ROOTS.map(function (v) { return v.slice(); }); }, // copies — callers cannot mutate the truth
    simpleRoots: function () { return SIMPLE.map(function (v) { return v.slice(); }); },
    cartanMatrix: cartanMatrix,
    inner: inner,
    normSq: normSq,
    reflect: reflect,
    isPositive: isPositive,
    indexOf: function (v) { var i = INDEX[key(v)]; return i === undefined ? -1 : i; },
    has: function (v) { return INDEX[key(v)] !== undefined; },
    key: key
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).E8 = api;
})(this);
