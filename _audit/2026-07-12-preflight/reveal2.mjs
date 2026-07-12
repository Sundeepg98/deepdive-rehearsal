import { chromium } from 'playwright';
const AFTER = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const BEFORE = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html';
const TOPICS = { 'messaging-events': 'event-driven', 'data-storage': 'caching', 'reliability-observability': 'retries-timeouts', 'platform-infra': 'iac', 'architecture-apis': 'state-machine', 'security-tenancy': 'signing' };

const br = await chromium.launch();
const dec = await (await br.newContext()).newPage();
await dec.goto('data:text/html,<body>');
const analyze = buf => dec.evaluate(async b64 => {
  const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
  const bm = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bm.width, bm.height); const x = c.getContext('2d'); x.drawImage(bm, 0, 0);
  const d = x.getImageData(0, 0, bm.width, bm.height).data;
  const L = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const px = []; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; px.push([d[i], d[i + 1], d[i + 2]]); }
  if (!px.length) return null;
  const lum = px.map(L), lo = Math.min(...lum), hi = Math.max(...lum), mid = (lo + hi) / 2;
  const dk = [], lt = []; px.forEach((p, i) => (lum[i] < mid ? dk : lt).push(p));
  const avg = a => a.length ? [0, 1, 2].map(k => Math.round(a.reduce((s, p) => s + p[k], 0) / a.length)) : null;
  const tIsDark = dk.length < lt.length; const tC = tIsDark ? dk : lt, sC = tIsDark ? lt : dk;
  const srt = tC.map(p => [p, L(p)]).sort((a, b) => tIsDark ? a[1] - b[1] : b[1] - a[1]);
  const core = srt.slice(0, Math.max(1, Math.floor(srt.length * .15))).map(v => v[0]);
  const t = avg(core), s = avg(sC); const l1 = L(t), l2 = L(s); const [h2, l3] = l1 > l2 ? [l1, l2] : [l2, l1];
  return { text: t, slab: s, ratio: +((h2 + .05) / (l3 + .05)).toFixed(2) };
}, buf.toString('base64'));

const rows = [];
for (const [build, path] of [['BEFORE', BEFORE], ['AFTER', AFTER]]) {
  const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file:///' + path); await p.waitForTimeout(2000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  for (const theme of ['light', 'dark']) {
    for (const [g, topic] of Object.entries(TOPICS)) {
      await p.evaluate(t => { location.hash = '#' + t + '/drill'; }, topic);
      await p.waitForTimeout(900);
      await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForTimeout(400);
      // Playwright locators PIERCE shadow DOM
      const loc = p.getByText('Reveal answer', { exact: true }).first();
      try {
        await loc.waitFor({ state: 'visible', timeout: 3000 });
        const meta = await loc.evaluate(e => { const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { tag: e.tagName, grad: /gradient/.test(c.backgroundImage), fs: c.fontSize, fw: c.fontWeight, box: `${Math.round(r.width)}x${Math.round(r.height)}` }; });
        const a = await analyze(await loc.screenshot());
        rows.push({ build, theme, group: g, ...meta, ...a, AA: a && a.ratio >= 4.5 });
      } catch (e) { rows.push({ build, theme, group: g, MISSING: true }); }
    }
  }
  await p.close();
}
const rgb = c => c ? `rgb(${c.join(',')})` : '?';
console.log('=== "Reveal answer" PRIMARY CTA — pixel-sampled (shadow-DOM pierced) ===\n');
for (const b of ['BEFORE', 'AFTER']) for (const t of ['light', 'dark']) {
  const r0 = rows.filter(r => r.build === b && r.theme === t && !r.MISSING);
  if (!r0.length) { console.log(`--- ${b}/${t}: NOT FOUND ---`); continue; }
  console.log(`--- ${b} / ${t} ---`);
  r0.forEach(r => console.log(`  ${r.group.padEnd(26)} ${String(r.ratio).padStart(5)}:1 ${r.AA ? 'PASS' : 'FAIL'}  ${r.grad ? 'gradient' : 'flat    '} text=${rgb(r.text).padEnd(18)} slab=${rgb(r.slab).padEnd(18)} ${r.box}`));
}
const f = rows.filter(r => !r.MISSING && !r.AA);
console.log(`\n>>> FAILING AA 4.5:1 -> ${f.length} of ${rows.filter(r => !r.MISSING).length}`);
f.forEach(r => console.log(`   ${r.build} ${r.theme} ${r.group} = ${r.ratio}:1`));
await br.close();
