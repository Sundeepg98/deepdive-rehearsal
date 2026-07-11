import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });

// go to red flags (lens's repro: short pane, exposed canvas) on an MD topic
await p.evaluate(() => TopicRegistry.setTopic('event-driven'));
await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="rf"]').click());
await p.waitForTimeout(700);

// Freeze the mesh animation at its 0% keyframe for a deterministic read
await p.addStyleTag({ content: '.stage::before,.stage::after{animation:none !important} *{transition:none !important}' });
await p.waitForTimeout(500);

// Is the pseudo actually clipped by .stage? Compare fixed-blob geometry to stage box.
const geom = await p.evaluate(() => {
  const st = document.querySelector('.stage');
  const r = st.getBoundingClientRect();
  const cs = getComputedStyle(st);
  return {
    stage: { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) },
    overflowX: cs.overflowX, overflowY: cs.overflowY, transform: cs.transform, filter: cs.filter, willChange: cs.willChange, contain: cs.contain,
    // blob boxes (viewport coords, position:fixed)
    beforeBox: { x0: 0, y0: 0, x1: Math.round(0.70 * 1440), y1: Math.round(0.70 * 900) },
    afterBox: { x0: 1440 - Math.round(0.60 * 1440), y0: 900 - Math.round(0.60 * 900), x1: 1440, y1: 900 },
  };
});
console.log('GEOM:', JSON.stringify(geom, null, 1));

await p.screenshot({ path: SHOTS + '/mesh-full-rf.png' });
const png = await p.screenshot();          // full viewport buffer
fs.writeFileSync(SHOTS + '/mesh-raw.png', png);

// decode + analyse in a blank page canvas
const an = await chromium.launch();
const ap = await an.newPage();
await ap.goto('about:blank');
const b64 = png.toString('base64');
const res = await ap.evaluate(async (data) => {
  const img = new Image();
  await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + data; });
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);

  function rowScan(y) {
    const d = cx.getImageData(0, y, img.width, 1).data;
    const px = x => [d[x * 4], d[x * 4 + 1], d[x * 4 + 2]];
    // first derivative along x, in the stage region only (296..1150)
    const steps = [];
    for (let x = 297; x < 1150; x++) {
      const a = px(x - 1), b = px(x);
      const dd = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (dd > 0) steps.push({ x, delta: dd, from: a, to: b });
    }
    steps.sort((u, v) => v.delta - u.delta);
    return { y, topSteps: steps.slice(0, 6), left: px(300), mid: px(720), right: px(1145) };
  }
  function colScan(x) {
    const d = cx.getImageData(x, 0, 1, img.height).data;
    const px = y => [d[y * 4], d[y * 4 + 1], d[y * 4 + 2]];
    const steps = [];
    for (let y = 1; y < 900; y++) {
      const a = px(y - 1), b = px(y);
      const dd = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      if (dd > 0) steps.push({ y, delta: dd, from: a, to: b });
    }
    steps.sort((u, v) => v.delta - u.delta);
    return { x, topSteps: steps.slice(0, 6) };
  }
  return {
    // rows in the empty canvas region below the RF cards
    row800: rowScan(800), row860: rowScan(860), row700: rowScan(700),
    // a column through empty canvas on the right of the stage
    col1120: colScan(1120), col1000: colScan(1000),
  };
}, b64);
await an.close();

console.log('\n=== ROW SCANS (x-derivative inside stage 296..1150) ===');
for (const k of ['row700', 'row800', 'row860']) {
  const r = res[k];
  console.log(`\n${k} (y=${r.y})  left(x300)=${r.left}  mid(x720)=${r.mid}  right(x1145)=${r.right}`);
  console.log('  biggest x-steps:', r.topSteps.map(s => `x=${s.x} d=${s.delta} ${s.from}->${s.to}`).join(' | ') || 'NONE (perfectly smooth)');
}
console.log('\n=== COL SCANS (y-derivative) ===');
for (const k of ['col1000', 'col1120']) {
  const r = res[k];
  console.log(`\n${k} biggest y-steps:`, r.topSteps.map(s => `y=${s.y} d=${s.delta} ${s.from}->${s.to}`).join(' | ') || 'NONE');
}
const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('');
console.log('\nLEFT->RIGHT across stage at y=800:', hex(res.row800.left), '->', hex(res.row800.right));
await b.close();
