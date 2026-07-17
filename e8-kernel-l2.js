/* ============================================================================
 * e8-kernel-l2.js — L2 PROJECTION LAYER. Projection becomes data, not code.
 *
 * ██ THE FLOAT BOUNDARY ██
 *   L0 (roots) and L1 (structure) are INTEGER-EXACT. Projection onto the
 *   Coxeter plane involves irrational frame vectors, so real numbers legitimately
 *   enter HERE and nowhere below. Everything below this line is exact; everything
 *   at or above it is floating-point. L2 READS from L0/L1 (integer roots, integer
 *   orbits) and emits floats — it NEVER feeds a float back down into L0 or L1.
 *
 * A named registry of 8D->2D / 8D->3D maps. Each entry is a frame + metadata +
 * PROVENANCE (canonical / derived / constructed) so a reader knows whether a
 * frame is truth or a guess. A new surface becomes a registry entry and a name.
 *
 * UMD: window.E8L2 (needs window.E8) / require(). Imports L0 and L1; duplicates neither.
 * ==========================================================================*/
(function (root) {
  'use strict';
  var E8 = (typeof module !== 'undefined' && module.exports) ? require('./e8-kernel.js')
         : (typeof window !== 'undefined' ? window.E8 : globalThis.E8);
  if (!E8 || typeof E8.roots !== 'function') throw new Error('E8L2: L0 kernel (window.E8) not available');

  var ROOTS = E8.roots();       // 240 scaled-int vectors (L0 canonical order)
  var SCALE = E8.SCALE;

  // Canonical HELM frame rows (banked; orthonormal to <=1e-14). Rows 0-1 are HELM's U,V
  // (the Coxeter plane); row 2 is HELM's parked depth axis W (HELM_HIDDEN[0]). Verbatim.
  var HELM_F = [
    [-0.055540651867598566,-0.3632809034166446,-0.29373773459827063,-0.17833964080011647,-0.02213007246265308,0.1680638627011,0.3839297770727283,-0.755458841512189],
    [-0.07940192381183246,-0.3115341217374208,-0.08367483260990177,0.12474634654123831,0.30462041007131624,0.4480859982725476,0.5488729765162671,0.5284340038934313],
    [0.9952942130270336,-0.0451256183326884,-0.02306687574494647,6.971701244804443e-18,0.02306687574494647,0.04512561833268841,0.06521215486255072,0]
  ];

  function dot(a, b) { var s = 0; for (var k = 0; k < 8; k++) s += a[k] * b[k]; return s; }

  var REG = {};
  function register(name, spec) {
    if (!spec || !Array.isArray(spec.frame) || (spec.frame.length !== 2 && spec.frame.length !== 3))
      throw new Error('E8L2.register: frame must be 2 or 3 basis vectors');
    REG[name] = { name: name, dim: spec.frame.length, frame: spec.frame.map(function (r) { return r.slice(); }),
                  description: spec.description || '', provenance: spec.provenance || 'UNSTATED' };
  }

  // project: 240 points in L0 canonical order. true coord = scaled/SCALE (the float boundary).
  function project(name) {
    var s = REG[name]; if (!s) throw new Error('E8L2.project: no projection named ' + name);
    var F = s.frame, out = new Array(240);
    for (var i = 0; i < 240; i++) {
      var t = new Array(8); for (var k = 0; k < 8; k++) t[k] = ROOTS[i][k] / SCALE; // integer -> real: the boundary
      var p = { x: dot(t, F[0]), y: dot(t, F[1]) };
      if (s.dim === 3) p.z = dot(t, F[2]);
      out[i] = p;
    }
    return out;
  }

  function frame(name) { var s = REG[name]; if (!s) throw new Error('E8L2.frame: no projection ' + name); return s.frame.map(function (r) { return r.slice(); }); }
  function list() { return Object.keys(REG).map(function (n) { return { name: n, dim: REG[n].dim, description: REG[n].description, provenance: REG[n].provenance }; }); }

  // ---- SEED ----
  register('coxeter-2d', {
    frame: [HELM_F[0], HELM_F[1]],
    description: 'The iconic Coxeter-plane projection: 240 roots in 8 concentric 30-fold rings.',
    provenance: 'Lifted verbatim from HELM_F rows 0-1 (U,V) — HELM\'s canonical banked frame. Reproduces HELM proj0 exactly.'
  });
  register('coxeter-3d', {
    frame: [HELM_F[0], HELM_F[1], HELM_F[2]],
    description: 'Coxeter plane (X,Y) lifted into 3D by HELM\'s parked depth axis (Z); X,Y reproduce coxeter-2d.',
    provenance: 'HELM_F rows 0-2 — U,V plus HELM\'s own reserved HELM_HIDDEN[0] depth axis W. Banked orthonormal frame, not constructed here.'
  });

  var api = {
    project: project, frame: frame, list: list, register: register,
    FLOAT_BOUNDARY: true
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (typeof window !== 'undefined' ? window : globalThis).E8L2 = api;
})(this);
