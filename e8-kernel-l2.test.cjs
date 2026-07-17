'use strict';
const E8 = require('C:/e8atlas-site/e8-kernel.js');
const L1 = require('C:/e8atlas-site/e8-kernel-l1.js');
const L2 = require('C:/e8atlas-site/e8-kernel-l2.js');
const puppeteer = require('C:/Users/DELL/AppData/Local/Temp/claude/c--Users-DELL-OneDrive-Desktop-anki-v1/02caf6ee-1206-45c0-bc75-ce21ff7a0901/scratchpad/node_modules/puppeteer-core');
let fails = 0;
const rep = (n, ok, v) => { console.log((ok ? '  PASS ' : '  FAIL ') + n + (v !== undefined ? '  => ' + v : '')); if (!ok) fails++; };
const ms = (f) => { const t = process.hrtime.bigint(); const r = f(); return { r, dt: (Number(process.hrtime.bigint() - t) / 1e6).toFixed(1) }; };

const ROOTS = E8.roots();

console.log('  registry: ' + JSON.stringify(L2.list().map(e => e.name + '(' + e.dim + 'D)')));

// every projection: 240 points, all finite, timed
for (const entry of L2.list()) {
  const x = ms(() => L2.project(entry.name));
  const pts = x.r;
  const n240 = pts.length === 240;
  const finite = pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && (entry.dim === 2 || Number.isFinite(p.z)));
  rep(entry.name + ': 240 finite points', n240 && finite, pts.length + ' pts, all-finite:' + finite + ' [' + x.dt + 'ms]');
}

// ring structure survives coxeter-2d: L1's 8 Coxeter orbits should bin to 8 radii
const pts2d = L2.project('coxeter-2d');
const idx = {}; ROOTS.forEach((r, i) => idx[E8.key(r)] = i);
const orbits = L1.coxeterOrbits();
const ringRadii = orbits.map(orb => {
  const rads = orb.map(v => { const p = pts2d[idx[E8.key(v)]]; return Math.hypot(p.x, p.y); });
  const mn = Math.min.apply(null, rads), mx = Math.max.apply(null, rads);
  return { r: ((mn + mx) / 2), spread: (mx - mn) };
}).sort((a, b) => a.r - b.r);
const maxSpread = Math.max.apply(null, ringRadii.map(r => r.spread));
rep('ring structure survives projection: 8 orbits -> 8 tight radii', orbits.length === 8 && maxSpread < 1e-9,
    '8 radii=[' + ringRadii.map(r => r.r.toFixed(6)).join(', ') + '] maxIntraRingSpread=' + maxSpread.toExponential(2));

(async () => {
  // AGREEMENT: coxeter-2d vs HELM's LIVE proj0, matched by root vector
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--disable-gpu'] });
  const p = await b.newPage();
  await p.goto('http://localhost:8791/engines/helm-ph1/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForSelector('#enter.show', { timeout: 15000 }); await p.click('#enter');
  await p.waitForFunction(() => document.getElementById('boot').classList.contains('gone'), { timeout: 8000 });
  const helm = await p.evaluate(() => ({ roots: roots.map(r => Array.from(r)), proj0: proj0.map(a => a.slice()) }));
  await b.close();

  // map HELM root (true coords) -> its proj0
  const helmByKey = {};
  helm.roots.forEach((r, i) => { helmByKey[r.map(x => Math.round(x * 2)).join(',')] = helm.proj0[i]; });
  let maxDev = 0, matched = 0;
  for (let i = 0; i < 240; i++) {
    const hp = helmByKey[E8.key(ROOTS[i])];               // HELM proj0 for this root
    if (!hp) continue; matched++;
    const dx = pts2d[i].x - hp[0], dy = pts2d[i].y - hp[1];
    const d = Math.hypot(dx, dy); if (d > maxDev) maxDev = d;
  }
  rep('coxeter-2d reproduces HELM live proj0 (matched by root)', matched === 240 && maxDev < 1e-12,
      'matched=' + matched + '/240, MAX DEVIATION=' + maxDev.toExponential(3));

  console.log('\n' + (fails === 0 ? '  ALL GREEN — L2 registry projects exactly, reproduces HELM, rings survive.' : '  ' + fails + ' FAILURE(S).'));
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('  TEST FAILED: ' + e.message); process.exit(1); });
