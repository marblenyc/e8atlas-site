/* ============================================================================
 * lattice-core.js — the E8 root-system geometry for the apex hook.
 *
 * LIFTED VERBATIM from /engines/helm-ph1/ (the canonical HELM Ph1 surface):
 *   buildRoots(), dot(), the canonical orthonormal frame HELM_F, and the
 *   Coxeter-plane projection proj0 = roots·(U,V). The math is FROZEN and copied
 *   unchanged — U,V are HELM_F rows 0,1, byte-identical to the instrument.
 *
 * This file is the SINGLE source of the geometry, required by three consumers so
 * they cannot drift: the browser apex render, the executing pre-flight (rtcheck),
 * and the og-image renderer. Runs in both node (module.exports) and browser (window).
 * ==========================================================================*/
(function (root) {
  'use strict';

  // --- 240 E8 roots (lifted verbatim from HELM buildRoots) ---
  function buildRoots() {
    const R = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++)
      for (const si of [1, -1]) for (const sj of [1, -1]) {
        const r = new Float64Array(8); r[i] = si; r[j] = sj; R.push(r);
      }
    for (let m = 0; m < 256; m++) {
      let b = 0; for (let k = 0; k < 8; k++) if (m & (1 << k)) b++;
      if (b % 2) continue;
      const r = new Float64Array(8);
      for (let k = 0; k < 8; k++) r[k] = (m & (1 << k)) ? -0.5 : 0.5;
      R.push(r);
    }
    return R;
  }
  const dot = (a, b) => { let s = 0; for (let k = 0; k < 8; k++) s += a[k] * b[k]; return s; };

  // --- canonical HELM frame (lifted verbatim; orthonormal to <=1e-14, banked JSON) ---
  const HELM_F = [
    [-0.055540651867598566, -0.3632809034166446, -0.29373773459827063, -0.17833964080011647, -0.02213007246265308, 0.1680638627011, 0.3839297770727283, -0.755458841512189],
    [-0.07940192381183246, -0.3115341217374208, -0.08367483260990177, 0.12474634654123831, 0.30462041007131624, 0.4480859982725476, 0.5488729765162671, 0.5284340038934313]
  ];
  const U = Float64Array.from(HELM_F[0]);
  const V = Float64Array.from(HELM_F[1]);

  const roots = buildRoots();

  // --- projection to the Coxeter plane (verbatim: proj0 = roots·(U,V)) ---
  const proj0 = roots.map(r => [dot(r, U), dot(r, V)]);

  // --- edges where inner product == 1 (verbatim adjacency rule) ---
  const edgePairs = [];
  for (let i = 0; i < 240; i++)
    for (let j = i + 1; j < 240; j++)
      if (Math.round(dot(roots[i], roots[j]) * 2) / 2 === 1) edgePairs.push([i, j]);

  // --- 8 concentric rings of 30 (for radius-graded styling; derived, not new math) ---
  const rad0 = proj0.map(p => Math.hypot(p[0], p[1]));
  const RMAX = Math.max.apply(null, rad0);

  const api = { roots, proj0, edgePairs, rad0, RMAX };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;   // node: require() returns the object
  else (typeof window !== 'undefined' ? window : globalThis).LatticeCore = api; // browser: window.LatticeCore
})(this);
