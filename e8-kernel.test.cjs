// EXECUTING test suite for e8-kernel L0. Runs and asserts; reports actual values.
'use strict';
const fs = require('fs');
const E8 = require('C:/e8atlas-site/e8-kernel.js');

let fails = 0;
function rep(name, ok, value) { console.log((ok ? '  PASS ' : '  FAIL ') + name + (value !== undefined ? '  => ' + value : '')); if (!ok) fails++; }

const R = E8.roots();

// 1. count
rep('root count = 240', R.length === 240, R.length);

// 2. every root squared length exactly 2
let normOK = true, normSeen = {};
R.forEach(v => { const n = E8.normSq(v); normSeen[n] = 1; if (n !== 2) normOK = false; });
rep('every normSq === 2 (exact)', normOK, 'distinct normSq values = {' + Object.keys(normSeen).join(',') + '}');

// 9. finiteness (integers, none non-finite)
let finite = R.every(v => v.every(x => Number.isFinite(x) && Number.isInteger(x)));
rep('all coordinates finite integers', finite);

// 3. pairwise inner products in {-2..2}, full distribution over all 240x240 ordered pairs (incl self)
const dist = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 }; let inRange = true;
for (let i = 0; i < 240; i++) for (let j = 0; j < 240; j++) {
  const p = E8.inner(R[i], R[j]);
  if (p < -2 || p > 2) inRange = false;
  dist[String(p)]++;
}
rep('all pairwise inner products in {-2,-1,0,1,2}', inRange,
    'dist over 57600 ordered pairs: ' + JSON.stringify(dist));

// 5. kissing / adjacency: for a FIXED root, count at inner product +1 must be 56 (and full per-root profile)
function profile(i) { const c = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 }; for (let j = 0; j < 240; j++) c[String(E8.inner(R[i], R[j]))]++; return c; }
const p0 = profile(0);
rep('per-root inner=+1 count === 56', p0['1'] === 56, p0['1']);
// prove it holds for EVERY root, not just one
let allProfilesEqual = true;
for (let i = 0; i < 240; i++) { const c = profile(i); if (!(c['2'] === 1 && c['-2'] === 1 && c['1'] === 56 && c['-1'] === 56 && c['0'] === 126)) allProfilesEqual = false; }
rep('every root has profile {+2:1,-2:1,+1:56,-1:56,0:126}', allProfilesEqual,
    'root0 profile = ' + JSON.stringify(p0));
rep('kissing number (root count) = 240', R.length === 240, R.length);

// 4. edge count: convention = UNORDERED pairs at inner product EXACTLY +1
let edges = 0;
for (let i = 0; i < 240; i++) for (let j = i + 1; j < 240; j++) if (E8.inner(R[i], R[j]) === 1) edges++;
rep('edge count (unordered pairs, inner=+1) = 6720', edges === 6720, edges);

// 6. reflection closure — exhaustive 240x240 = 57600, every result must be a root
let landed = 0, missed = 0, firstMiss = null;
for (let i = 0; i < 240; i++) for (let j = 0; j < 240; j++) {
  const w = E8.reflect(R[i], R[j]);
  if (E8.has(w)) landed++; else { missed++; if (!firstMiss) firstMiss = { i, j, w }; }
}
rep('reflection closure: all 57600 land in the set', missed === 0,
    'landed=' + landed + ' missed=' + missed + (firstMiss ? ' firstMiss=' + JSON.stringify(firstMiss) : ''));

// 7. Cartan matrix: matches published E8, determinant exactly 1
const C = E8.cartanMatrix();
const PUB = [
  [2,0,-1,0,0,0,0,0],[0,2,0,-1,0,0,0,0],[-1,0,2,-1,0,0,0,0],[0,-1,-1,2,-1,0,0,0],
  [0,0,0,-1,2,-1,0,0],[0,0,0,0,-1,2,-1,0],[0,0,0,0,0,-1,2,-1],[0,0,0,0,0,0,-1,2]
];
const cartanMatch = JSON.stringify(C) === JSON.stringify(PUB);
rep('Cartan matrix matches published E8', cartanMatch, cartanMatch ? 'identical' : JSON.stringify(C));
// exact integer determinant via fraction-free Bareiss elimination
function detInt(M) {
  const n = M.length, A = M.map(r => r.slice()); let sign = 1, prev = 1;
  for (let k = 0; k < n - 1; k++) {
    if (A[k][k] === 0) { let s = -1; for (let r = k + 1; r < n; r++) if (A[r][k] !== 0) { s = r; break; } if (s < 0) return 0; const t = A[k]; A[k] = A[s]; A[s] = t; sign = -sign; }
    for (let r = k + 1; r < n; r++) for (let c = k + 1; c < n; c++) { A[r][c] = (A[r][c] * A[k][k] - A[r][k] * A[k][c]) / prev; }
    prev = A[k][k];
  }
  return sign * A[n - 1][n - 1];
}
const det = detInt(C);
rep('Cartan determinant === 1 (exact)', det === 1, det);
// simple roots must themselves be members of the 240
rep('all 8 simple roots are members of the root set', E8.simpleRoots().every(s => E8.has(s)));

// 8. closed under negation; exactly 120 positive / 120 negative under stated ordering
let negClosed = R.every(v => E8.has(v.map(x => -x)));
rep('closed under negation', negClosed);
const pos = R.filter(E8.isPositive).length, neg = R.filter(v => !E8.isPositive(v)).length;
rep('exactly 120 positive / 120 negative (first-nonzero-coord > 0)', pos === 120 && neg === 120, 'pos=' + pos + ' neg=' + neg);

// canonical order stability: two calls identical, deterministic
const R2 = E8.roots();
rep('canonical order stable across calls', JSON.stringify(R) === JSON.stringify(R2));

// ---- (5) AGREEMENT vs HELM: extract HELM's REAL buildRoots() and compare as sets ----
console.log('\n  --- HELM agreement (HELM buildRoots extracted from the live engine file) ---');
const helmHtml = fs.readFileSync('C:/e8atlas-site/engines/helm-ph1/index.html', 'utf8');
const m = helmHtml.match(/function buildRoots\(\)\{[\s\S]*?return R;\}/);
if (!m) { rep('extract HELM buildRoots()', false, 'not found in engine file'); }
else {
  const buildRoots = eval('(' + m[0].replace('function buildRoots', 'function') + ')'); // anon fn
  const helm = buildRoots(); // Float64Array true coords (±1, ±0.5, 0)
  rep('HELM buildRoots returns 240', helm.length === 240, helm.length);
  // convert HELM true coords -> scaled-int keys, NO epsilon: 2*v must be an exact integer
  const helmKeys = new Set(); let convOK = true;
  for (const v of helm) {
    const scaled = [];
    for (let k = 0; k < 8; k++) { const s = 2 * v[k]; if (!Number.isInteger(s)) { convOK = false; } scaled.push(s); }
    helmKeys.add(scaled.join(','));
  }
  rep('HELM roots convert to exact scaled integers (no epsilon)', convOK);
  const l0Keys = new Set(R.map(E8.key));
  const onlyL0 = [...l0Keys].filter(k => !helmKeys.has(k));
  const onlyHelm = [...helmKeys].filter(k => !l0Keys.has(k));
  const identical = onlyL0.length === 0 && onlyHelm.length === 0 && helmKeys.size === 240 && l0Keys.size === 240;
  rep('L0 root set IDENTICAL to HELM root set', identical,
      identical ? 'both = same 240' : 'onlyL0=' + JSON.stringify(onlyL0.slice(0,5)) + ' onlyHELM=' + JSON.stringify(onlyHelm.slice(0,5)));
}

console.log('\n' + (fails === 0 ? '  ALL GREEN — L0 is integer-exact and agrees with HELM.' : '  ' + fails + ' FAILURE(S) — STOP. Do not adjust tests to pass; report.'));
process.exit(fails === 0 ? 0 : 1);
