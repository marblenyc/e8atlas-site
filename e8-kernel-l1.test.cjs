'use strict';
const E8 = require('C:/e8atlas-site/e8-kernel.js');
const L1 = require('C:/e8atlas-site/e8-kernel-l1.js');
let fails = 0;
const rep = (n, ok, v) => { console.log((ok ? '  PASS ' : '  FAIL ') + n + (v !== undefined ? '  => ' + v : '')); if (!ok) fails++; };
const ms = (f) => { const t = process.hrtime.bigint(); const r = f(); const dt = Number(process.hrtime.bigint() - t) / 1e6; return { r, dt: dt.toFixed(1) }; };

const ROOTS = E8.roots();

// ---- COXETER ----
let x = ms(() => L1.coxeterNumber());
rep('Coxeter number = 30 (computed)', x.r === 30, x.r + '  [' + x.dt + 'ms]');
// Cox^30 = identity, exhaustive over all 240 roots
x = ms(() => { const Cox = L1.coxeterElement(); let allId = true;
  for (const r0 of ROOTS) { let y = r0; for (let n = 0; n < 30; n++) y = Cox(y); if (E8.key(y) !== E8.key(r0)) allId = false; } return allId; });
rep('Coxeter element ^30 = identity on all 240 roots', x.r === true, 'exhaustive 240 [' + x.dt + 'ms]');

// ---- RINGS / ORBITS ----
x = ms(() => L1.coxeterOrbits());
const orbits = x.r;
rep('ring decomposition = 8 Coxeter orbits', orbits.length === 8, orbits.length + ' orbits [' + x.dt + 'ms]');
rep('each ring has 30 roots', orbits.every(o => o.length === 30), 'sizes=' + orbits.map(o => o.length).join(','));

// agreement with HELM's ringOf (radius-based). HELM_F U,V (floats used ONLY for this cross-check).
const U = [-0.055540651867598566,-0.3632809034166446,-0.29373773459827063,-0.17833964080011647,-0.02213007246265308,0.1680638627011,0.3839297770727283,-0.755458841512189];
const V = [-0.07940192381183246,-0.3115341217374208,-0.08367483260990177,0.12474634654123831,0.30462041007131624,0.4480859982725476,0.5488729765162671,0.5284340038934313];
const dot = (a, b) => { let s = 0; for (let k = 0; k < 8; k++) s += a[k] * b[k]; return s; };
const radiusRing = {}; // rounded radius -> [root indices]  (HELM groups by projected radius)
ROOTS.forEach((r, i) => { const px = dot(r, U), py = dot(r, V); const rad = Math.hypot(px, py).toFixed(5);
  (radiusRing[rad] = radiusRing[rad] || []).push(i); });
const helmRings = Object.values(radiusRing).map(a => a.slice().sort((p, q) => p - q));
const coxRings = orbits.map(o => o.map(v => E8.indexOf(v)).sort((p, q) => p - q));
const sig = a => a.join(',');
const helmSet = new Set(helmRings.map(sig)), coxSet = new Set(coxRings.map(sig));
const onlyCox = [...coxSet].filter(s => !helmSet.has(s));
const ringsAgree = helmRings.length === 8 && coxSet.size === 8 && onlyCox.length === 0;
rep('L1 Coxeter orbits == HELM radius-rings (as partitions)', ringsAgree,
    ringsAgree ? 'identical 8-and-8' : 'HELM rings=' + helmRings.length + ' cox=' + coxSet.size + ' mismatched cox sets=' + onlyCox.length);

// ---- WEYL ----
x = ms(() => L1.weylOrbit(ROOTS[0]));
rep('Weyl orbit of a root = all 240 (single orbit)', x.r.size === 240 && !x.r.capped, x.r.size + ' [' + x.dt + 'ms]');
x = ms(() => L1.weylOrbit(E8.simpleRoots()[0]));
rep('simple reflections generate all 240 (orbit of a simple root)', x.r.size === 240, x.r.size + ' [' + x.dt + 'ms]');

// ---- SUBSYSTEMS ----
const PUB = { A1: 120, A2: 1120, E7: 120, E6: 1120 };
console.log('\n  --- subsystems: computed vs published ---');
for (const type of ['A1', 'A2', 'E7', 'E6']) {
  const t = ms(() => L1.subsystems(type));
  const list = t.r;
  const closedOK = list.every(s => L1.isClosed(s));
  const rootsPer = list.length ? list[0].length : 0;
  const match = list.length === PUB[type];
  rep(type + ' subsystems: computed ' + list.length + ' vs published ' + PUB[type], match,
      list.length + ' (' + rootsPer + ' roots each) closed:' + closedOK + ' [' + t.dt + 'ms]');
  if (!closedOK) rep(type + ' every subsystem closed under its own reflections', false);
}
console.log('  --- subsystems reported as WALL (honest gap, not guessed) ---');
for (const type of ['D4', 'D8', 'A8']) {
  const w = L1.subsystems(type);
  console.log('  WALL ' + type + ': ' + (w.wall ? w.reason : 'unexpectedly returned a value'));
}

console.log('\n' + (fails === 0 ? '  ALL GREEN — L1 structure verified against L0, HELM, and published counts.' : '  ' + fails + ' FAILURE(S) — report, do not tune.'));
process.exit(fails === 0 ? 0 : 1);
