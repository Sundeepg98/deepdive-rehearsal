import { chromium } from 'playwright';
import fs from 'fs';

const AFTER = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const BEFORE = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html';
const TOPICS = {
  'messaging-events': 'event-driven', 'data-storage': 'caching', 'reliability-observability': 'retries-timeouts',
  'platform-infra': 'iac', 'architecture-apis': 'state-machine', 'security-tenancy': 'signing',
};

const br = await chromium.launch();
// a scratch page whose only job is decoding PNG buffers -> pixel clusters
const dec = await (await br.newContext()).newPage();
await dec.goto('data:text/html,<body>');

async function analyze(buf) {
  return dec.evaluate(async (b64) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
    const bm = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bm.width, bm.height);
    const x = c.getContext('2d'); x.drawImage(bm, 0, 0);
    const d = x.getImageData(0, 0, bm.width, bm.height).data;
    const L = ([r, g, bl]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(bl); };
    const px = [];
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; px.push([d[i], d[i + 1], d[i + 2]]); }
    if (!px.length) return null;
    const lum = px.map(L);
    const lo = Math.min(...lum), hi = Math.max(...lum), mid = (lo + hi) / 2;
    const dark = [], light = [];
    px.forEach((p, i) => (lum[i] < mid ? dark : light).push(p));
    const avg = a => a.length ? [0, 1, 2].map(k => Math.round(a.reduce((s, p) => s + p[k], 0) / a.length)) : null;
    const textIsDark = dark.length < light.length;
    const textC = textIsDark ? dark : light, slabC = textIsDark ? light : dark;
    // core glyph pixels only (drop antialiased edges): most extreme 15% of the text cluster
    const sorted = textC.map(p => [p, L(p)]).sort((a, b) => textIsDark ? a[1] - b[1] : b[1] - a[1]);
    const core = sorted.slice(0, Math.max(1, Math.floor(sorted.length * .15))).map(v => v[0]);
    const t = avg(core), s = avg(slabC);
    const l1 = L(t), l2 = L(s); const [h2, l3] = l1 > l2 ? [l1, l2] : [l2, l1];
    return { text: t, slab: s, ratio: +((h2 + .05) / (l3 + .05)).toFixed(2), textPx: textC.length, slabPx: slabC.length };
  }, buf.toString('base64'));
}

const rows = [];
for (const [build, path] of [['BEFORE', BEFORE], ['AFTER', AFTER]]) {
  const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await p.goto('file:///' + path);
  await p.waitForTimeout(2000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  for (const theme of ['light', 'dark']) {
    for (const [g, topic] of Object.entries(TOPICS)) {
      await p.evaluate(t => { location.hash = '#' + t + '/drill'; }, topic);
      await p.waitForTimeout(850);
      await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForTimeout(400);
      for (const [label, src] of [['reveal', '^Reveal answer'], ['mock', 'Mock run']]) {
        const h = await p.evaluateHandle(s => {
          const rx = new RegExp(s, 'i');
          return [...document.querySelectorAll('button,a')].find(e => rx.test((e.innerText || '').trim()) && e.getBoundingClientRect().width > 60) || null;
        }, src);
        const el = h.asElement();
        if (!el) { await h.dispose(); continue; }
        try {
          const a = await analyze(await el.screenshot());
          if (a) rows.push({ build, theme, group: g, el: label, ...a, AA: a.ratio >= 4.5, AA_large: a.ratio >= 3 });
        } catch (e) {}
        await h.dispose();
      }
    }
  }
  await p.close();
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/pixctr.json', JSON.stringify(rows, null, 2));
const rgb = c => c ? `rgb(${c.join(',')})` : '?';
console.log('=== PIXEL-SAMPLED CTA CONTRAST (real rendered slab; gradients included) ===\n');
for (const build of ['BEFORE', 'AFTER']) for (const theme of ['light', 'dark']) {
  const r0 = rows.filter(r => r.build === build && r.theme === theme);
  if (!r0.length) continue;
  console.log(`--- ${build} / ${theme} ---`);
  r0.forEach(r => console.log(`  ${r.el.padEnd(6)} ${r.group.padEnd(26)} ${String(r.ratio).padStart(5)}:1  ${r.AA ? 'PASS   ' : (r.AA_large ? 'FAIL-AA' : 'FAIL!! ')}  text=${rgb(r.text).padEnd(18)} slab=${rgb(r.slab)}`));
}
const f = rows.filter(r => !r.AA);
console.log(`\n>>> CTA text failing WCAG AA 4.5:1 -> ${f.length} of ${rows.length}`);
f.forEach(r => console.log(`    ${r.build.padEnd(6)} ${r.theme.padEnd(5)} ${r.group.padEnd(26)} ${r.el.padEnd(6)} ${r.ratio}:1`));
await br.close();
