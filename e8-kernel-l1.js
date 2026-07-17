/* ============================================================================
 * e8-kernel-l1.js — L1 STRUCTURE LAYER. The anatomy of E8, computed from L0.
 *
 * Weyl action · subsystems · Coxeter element · ring (orbit) decomposition.
 * Integer-exact throughout — every operation is arithmetic on L0's scaled
 * tuples. NO floats, NO epsilon. Imports L0; duplicates none of its math.
 *
 * UMD: window.E8L1 in a browser (needs window.E8 loaded first), require() in Node.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var E8 = (typeof module !== 'undefined' && module.exports) ? require('./e8-kernel.js')
         : (typeof window !== 'undefined' ? window.E8 : globalThis.E8);
  if (!E8 || typeof E8.roots !== 'function') throw new Error('E8L1: L0 kernel (e8-kernel.js / window.E8) not available');

  var ROOTS = E8.roots();                 // 240 scaled-int vectors, canonical order
  var SIMPLE = E8.simpleRoots();          // 8 scaled-int simple roots
  var key = E8.key, reflect = E8.reflect, inner = E8.inner, has = E8.has, indexOf = E8.indexOf;

  // ---- WEYL ----
  // weylReflection(a): the reflection through root a, as an operator on any vector.
  function weylReflection(a) { return function (v) { return reflect(v, a); }; }
  var simpleReflections = SIMPLE.map(weylReflection);

  // weylOrbit(v): closure of v under the 8 simple reflections, by BFS (never enumerates W).
  function weylOrbit(v, cap) {
    cap = cap || 500000;
    var seen = {}, order = [], q = [v.slice()];
    seen[key(v)] = 1; order.push(v.slice());
    for (var h = 0; h < q.length; h++) {
      if (order.length > cap) return { capped: true, size: order.length, vectors: order };
      var x = q[h];
      for (var s = 0; s < 8; s++) {
        var y = reflect(x, SIMPLE[s]); var k = key(y);
        if (!seen[k]) { seen[k] = 1; order.push(y); q.push(y); }
      }
    }
    return { capped: false, size: order.length, vectors: order };
  }

  // ---- COXETER ----
  // coxeterElement(): product of the 8 simple reflections (apply a1, then a2, ... a8).
  function coxeterElement() {
    return function (v) { var x = v; for (var s = 0; s < 8; s++) x = reflect(x, SIMPLE[s]); return x; };
  }
  // coxeterNumber(): order of the Coxeter element, COMPUTED (LCM of root cycle lengths under Cox).
  function coxeterNumber() {
    var Cox = coxeterElement();
    function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
    var lcm = 1;
    for (var i = 0; i < ROOTS.length; i++) {
      var start = key(ROOTS[i]), x = ROOTS[i], n = 0;
      do { x = Cox(x); n++; } while (key(x) !== start && n < 1000);
      lcm = lcm / gcd(lcm, n) * n;
    }
    return lcm;
  }
  // coxeterOrbits(): partition the 240 roots into Coxeter-element orbits (the rings).
  function coxeterOrbits() {
    var Cox = coxeterElement(), seen = {}, orbits = [];
    for (var i = 0; i < ROOTS.length; i++) {
      var k0 = key(ROOTS[i]); if (seen[k0]) continue;
      var orb = [], x = ROOTS[i];
      do { orb.push(x.slice()); seen[key(x)] = 1; x = Cox(x); } while (!seen[key(x)]);
      orbits.push(orb);
    }
    return orbits;
  }

  // ---- SUBSYSTEMS ----
  // A subsystem is a subset of the 240 roots closed under its own reflections.
  function isClosed(set) {
    var S = {}; for (var i = 0; i < set.length; i++) S[key(set[i])] = 1;
    for (var a = 0; a < set.length; a++) for (var b = 0; b < set.length; b++) {
      if (!S[key(reflect(set[a], set[b]))]) return false;
    }
    return true;
  }
  function perp(set) { // roots orthogonal to EVERY root in set
    var out = [];
    for (var i = 0; i < ROOTS.length; i++) {
      var ok = true;
      for (var j = 0; j < set.length; j++) if (inner(ROOTS[i], set[j]) !== 0) { ok = false; break; }
      if (ok) out.push(ROOTS[i]);
    }
    return out;
  }
  function setKey(set) { return set.map(key).sort().join('|'); } // canonical id of a root-subset

  // A1: each unordered {a,-a} pair.
  function subsystemsA1() {
    var out = [], seen = {};
    for (var i = 0; i < ROOTS.length; i++) {
      var kk = [key(ROOTS[i]), key(ROOTS[i].map(function (x) { return -x; }))].sort().join('|');
      if (!seen[kk]) { seen[kk] = 1; out.push([ROOTS[i], ROOTS[i].map(function (x) { return -x; })]); }
    }
    return out;
  }
  // A2: {±a,±b,±(a+b)} with <a,b> = -1 and a+b a root. Identify by the 6-root set.
  function subsystemsA2() {
    var pos = ROOTS.filter(E8.isPositive), out = [], seen = {};
    for (var i = 0; i < pos.length; i++) for (var j = i + 1; j < pos.length; j++) {
      if (inner(pos[i], pos[j]) !== -1) continue;
      var s = pos[i].map(function (x, t) { return x + pos[j][t]; }); // a+b (scaled add is exact)
      if (!has(s)) continue;
      var six = [pos[i], pos[j], s, pos[i].map(function (x) { return -x; }), pos[j].map(function (x) { return -x; }), s.map(function (x) { return -x; })];
      var kk = setKey(six); if (!seen[kk]) { seen[kk] = 1; out.push(six); }
    }
    return out;
  }
  // E7 = perp of each A1 (126 roots). E6 = perp of each A2 (72 roots). Deduped by root-set.
  function subsystemsByPerp(seed, expectRoots) {
    var out = [], seen = {};
    for (var i = 0; i < seed.length; i++) {
      var p = perp(seed[i]);
      if (p.length !== expectRoots) continue;
      var kk = setKey(p); if (!seen[kk]) { seen[kk] = 1; out.push(p); }
    }
    return out;
  }

  var SUPPORTED = { A1: 1, A2: 1, E6: 1, E7: 1 };
  var WALL = {
    D4: 'rank-4, count is large; correct enumeration needs the Weyl-orbit/coset method, not integer BFS — WALL',
    D8: 'rank-8 (fills the space, no orthogonal complement to seed from); needs W(E8)-orbit counting — WALL',
    A8: 'rank-8 (Borel-de Siebenthal, no perp seed); needs coset enumeration — WALL'
  };
  function subsystems(type) {
    if (type === 'A1') return subsystemsA1();
    if (type === 'A2') return subsystemsA2();
    if (type === 'E7') return subsystemsByPerp(subsystemsA1(), 126);
    if (type === 'E6') return subsystemsByPerp(subsystemsA2(), 72);
    if (WALL[type]) return { wall: true, type: type, reason: WALL[type] };
    throw new Error('E8L1.subsystems: unknown type ' + type);
  }

  var api = {
    weylReflection: weylReflection,
    simpleReflections: simpleReflections,
    weylOrbit: weylOrbit,
    coxeterElement: coxeterElement,
    coxeterNumber: coxeterNumber,
    coxeterOrbits: coxeterOrbits,
    subsystems: subsystems,
    isClosed: isClosed,
    perp: perp,
    SUPPORTED_SUBSYSTEMS: Object.keys(SUPPORTED),
    WALLED_SUBSYSTEMS: Object.keys(WALL)
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).E8L1 = api;
})(this);
