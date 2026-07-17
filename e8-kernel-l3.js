/* ============================================================================
 * e8-kernel-l3.js — L3 QUERY LAYER. Structured questions in, structured data out.
 *
 * L0 is ground (roots), L1 is anatomy (Weyl/Coxeter/subsystems), L2 is projection.
 * L3 is the layer that ANSWERS. A client — a page, a CLI, a reasoning agent — talks
 * to L3 instead of reaching into L0/L1 internals and assembling answers itself.
 *
 * ██ TWO STANDING RULES ██
 *  1. INDEX CONTRACT. Every query takes and returns INDICES into L0's canonical
 *     order (0..239) — never vectors, never keys. One addressing scheme across the
 *     whole stack. A caller that wants coordinates asks L0 (exact) or L2 (projected)
 *     with the index. The single exceptions are root(), which echoes the root's own
 *     coordinate vector because that IS the root, and projected() (see below).
 *  2. EVERY ANSWER IS DATA. No prose, no formatted strings, no interpretation. A
 *     caller formats; L3 answers. This is what lets one L3 serve a renderer and a
 *     reasoning client from the same surface. Returned arrays/objects are fresh
 *     copies — a caller cannot mutate the precomputed truth.
 *
 * ██ THE FLOAT BOUNDARY ██
 *   L3 is INTEGER-EXACT everywhere it reasons about structure — it inherits L0/L1's
 *   exactness and adds no float of its own. The ONE query that crosses into floats
 *   is projected(i, name): it hands back L2's projected coordinates, which live at
 *   or above L2's float boundary. Everything else is exact integer census.
 *
 * UMD: window.E8L3 (needs window.E8, window.E8L1; window.E8L2 optional) / require().
 *   Imports L0 and L1; imports L2 lazily only if projected() is called. Duplicates none.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var isNode = (typeof module !== 'undefined' && module.exports);
  var E8 = isNode ? require('./e8-kernel.js')   : (typeof window !== 'undefined' ? window.E8   : globalThis.E8);
  var L1 = isNode ? require('./e8-kernel-l1.js'): (typeof window !== 'undefined' ? window.E8L1 : globalThis.E8L1);
  if (!E8 || typeof E8.roots !== 'function') throw new Error('E8L3: L0 kernel (window.E8) not available');
  if (!L1 || typeof L1.coxeterOrbits !== 'function') throw new Error('E8L3: L1 structure (window.E8L1) not available');

  var ROOTS = E8.roots();          // 240 scaled-int vectors, L0 canonical order
  var N = 240;

  function checkIndex(i) { if (!(i >= 0 && i < N && (i | 0) === i)) throw new Error('E8L3: index out of range [0,239]: ' + i); return i; }

  // ---- PRECOMPUTE (integer, at load) -------------------------------------
  // GRAM[i*N+j] = exact inner product in {-2,-1,0,1,2}. Int8 is exact and tiny.
  var GRAM = new Int8Array(N * N);
  for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) GRAM[i * N + j] = E8.inner(ROOTS[i], ROOTS[j]);

  // Per-root profile buckets (index lists at each inner-product value) and neighbor lists.
  var PROFILE = new Array(N);   // PROFILE[i] = { '-2':[..],'-1':[..],'0':[..],'1':[..],'2':[..] }
  var NEIGH = new Array(N);     // NEIGH[i]   = indices at inner +1  (expect 56)
  for (i = 0; i < N; i++) {
    var b = { '-2': [], '-1': [], '0': [], '1': [], '2': [] };
    for (j = 0; j < N; j++) b['' + GRAM[i * N + j]].push(j);
    PROFILE[i] = b; NEIGH[i] = b['1'];
  }

  // Rings = Coxeter orbits from L1, as index arrays; RING_OF[i] = ring index.
  var RINGS = L1.coxeterOrbits().map(function (orb) { return orb.map(function (v) { return E8.indexOf(v); }); });
  var RING_OF = new Array(N);
  RINGS.forEach(function (r, k) { r.forEach(function (idx) { RING_OF[idx] = k; }); });

  // ---- lazy subsystem cache (heavy; computed on first query per type) -----
  var RANK = { A1: 1, A2: 2, E6: 6, E7: 7 };
  var subCache = {};
  function subsystemsIdx(type) {
    if (subCache[type]) return subCache[type];
    var raw = L1.subsystems(type);
    if (raw && raw.wall) { subCache[type] = { wall: true, reason: raw.reason }; return subCache[type]; }
    // vectors -> indices; each subsystem becomes a sorted index array
    var idx = raw.map(function (set) { return set.map(function (v) { return E8.indexOf(v); }).sort(function (a, b) { return a - b; }); });
    subCache[type] = idx; return idx;
  }

  // L3's OWN closure re-verification (does NOT trust L1.isClosed): a set of indices
  // is closed iff reflecting any member through any member lands back in the set.
  function isClosedByIndex(indices) {
    var S = {}; for (var a = 0; a < indices.length; a++) S[indices[a]] = 1;
    for (a = 0; a < indices.length; a++) for (var bb = 0; bb < indices.length; bb++) {
      var r = E8.indexOf(E8.reflect(ROOTS[indices[bb]], ROOTS[indices[a]]));
      if (!S[r]) return false;
    }
    return true;
  }

  // ---- lazy L2 (only if projected() is used) -----------------------------
  var L2 = null, projCache = {};
  function getL2() {
    if (L2) return L2;
    L2 = isNode ? require('./e8-kernel-l2.js') : (typeof window !== 'undefined' ? window.E8L2 : globalThis.E8L2);
    if (!L2 || typeof L2.project !== 'function') throw new Error('E8L3.projected: L2 projection layer (window.E8L2) not available');
    return L2;
  }

  // ===================== QUERY SURFACE ====================================

  // ROOT QUERIES ----------------------------------------------------------
  function rootQ(i) {
    checkIndex(i);
    return { index: i, vector: ROOTS[i].slice(), ring: RING_OF[i], positive: E8.isPositive(ROOTS[i]), normSq: E8.normSq(ROOTS[i]) };
  }

  function relationProfile(i) {
    checkIndex(i);
    var p = PROFILE[i];
    return {
      index: i,
      counts: { '-2': p['-2'].length, '-1': p['-1'].length, '0': p['0'].length, '1': p['1'].length, '2': p['2'].length },
      indices: { '-2': p['-2'].slice(), '-1': p['-1'].slice(), '0': p['0'].slice(), '1': p['1'].slice(), '2': p['2'].slice() }
    };
  }

  var KIND = { '2': 'same', '1': 'adjacent', '0': 'orthogonal', '-1': 'opposed', '-2': 'antipode' };
  function relation(i, j) {
    checkIndex(i); checkIndex(j);
    var g = GRAM[i * N + j];
    return { i: i, j: j, inner: g, kind: KIND['' + g] };
  }

  function neighbors(i) { checkIndex(i); return NEIGH[i].slice(); }

  // SUBSYSTEM QUERIES -----------------------------------------------------
  function answerableTypes() {
    var walled = {};
    (L1.WALLED_SUBSYSTEMS || []).forEach(function (t) { var w = L1.subsystems(t); walled[t] = w && w.reason ? w.reason : 'walled'; });
    return { computed: (L1.SUPPORTED_SUBSYSTEMS || []).slice(), walled: walled };
  }

  function subsystemCount(type) {
    var s = subsystemsIdx(type);
    if (s.wall) return { type: type, wall: true, reason: s.reason };
    return { type: type, count: s.length };
  }

  function subsystem(type, k) {
    var s = subsystemsIdx(type);
    if (s.wall) return { type: type, wall: true, reason: s.reason };
    if (!(k >= 0 && k < s.length && (k | 0) === k)) throw new Error('E8L3.subsystem: k out of range [0,' + (s.length - 1) + '] for ' + type + ': ' + k);
    var indices = s[k];
    return { type: type, k: k, rank: RANK[type], roots: indices.length, indices: indices.slice(), closed: isClosedByIndex(indices) };
  }

  function subsystemsContaining(i, type) {
    checkIndex(i);
    var s = subsystemsIdx(type);
    if (s.wall) return { type: type, wall: true, reason: s.reason };
    var out = [];
    for (var k = 0; k < s.length; k++) if (s[k].indexOf(i) !== -1) out.push({ type: type, k: k, rank: RANK[type], roots: s[k].length, indices: s[k].slice() });
    return out;
  }

  // ORBIT QUERIES ---------------------------------------------------------
  function ring(k) { if (!(k >= 0 && k < RINGS.length && (k | 0) === k)) throw new Error('E8L3.ring: k out of range [0,' + (RINGS.length - 1) + ']: ' + k); return RINGS[k].slice(); }
  function ringOf(i) { checkIndex(i); return RING_OF[i]; }

  // PROJECTED COORDINATES (THE FLOAT BOUNDARY) ----------------------------
  // Hands back L2's projected coords for a root index. The one float-returning query.
  function projected(i, name) {
    checkIndex(i);
    var l2 = getL2();
    if (!projCache[name]) projCache[name] = l2.project(name);
    var p = projCache[name][i];
    return (p.z === undefined) ? { x: p.x, y: p.y } : { x: p.x, y: p.y, z: p.z };
  }

  var api = {
    // root
    root: rootQ, relationProfile: relationProfile, relation: relation, neighbors: neighbors,
    // subsystem
    answerableTypes: answerableTypes, subsystemCount: subsystemCount, subsystem: subsystem, subsystemsContaining: subsystemsContaining,
    // orbit
    ring: ring, ringOf: ringOf, ringCount: function () { return RINGS.length; },
    // projection (float boundary)
    projected: projected,
    // contract markers
    N: N, INDEX_CONTRACT: true, FLOAT_BOUNDARY_QUERY: 'projected'
  };
  if (isNode) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).E8L3 = api;
})(this);
