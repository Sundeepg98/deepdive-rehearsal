// Precise pixel truth: is the particle choreography actually rendering in-app?
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); window.goView('viz'); });
await p.waitForTimeout(1500);
// the ONLY way to get a sized canvas: a window resize (this is the bug)
await p.setViewportSize({ width: 1399, height: 1000 });
await p.waitForTimeout(800);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });

const R = {};
// drive heavy lag so queues are long
await p.evaluate(() => { window.__VIZ.sim.setProducerRate(400); window.__VIZ.sim.setConsumerCapacity(10); });
await p.waitForTimeout(5000);

R.state = await p.evaluate(() => ({
  queues: window.__VIZ.queues(),
  totalLag: Math.round(window.__VIZ.sim.totalLag()),
  status: window.__VIZ.sim.status(),
}));

R.pixel = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  const c2 = document.createElement('canvas');
  c2.width = c.width; c2.height = c.height;
  const ctx = c2.getContext('2d');
  ctx.drawImage(c, 0, 0);
  const img = ctx.getImageData(0, 0, c2.width, c2.height);
  const d = img.data;
  const W = c2.width, H = c2.height;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  // sample the true background (top-left corner, world ~0,9)
  const bg = px(3, 3);
  const near = (a, t) => Math.abs(a[0] - t[0]) <= 6 && Math.abs(a[1] - t[1]) <= 6 && Math.abs(a[2] - t[2]) <= 6;
  let nonBg = 0;
  const hist = {};
  for (let i = 0; i < d.length; i += 4) {
    const c4 = [d[i], d[i + 1], d[i + 2]];
    if (!near(c4, bg)) nonBg++;
    const k = c4.join(',');
    hist[k] = (hist[k] || 0) + 1;
  }
  const top = Object.entries(hist).sort((a, b2) => b2[1] - a[1]).slice(0, 8)
    .map(([k, v]) => ({ rgb: k, px: v, pct: +(100 * v / (W * H)).toFixed(2) }));
  // QUEUE BAND: world x 3.0..7.3 (between source col 2 and queue col 7.5) -> px
  // world W=16 maps to canvas width
  const x0 = Math.round(3.0 / 16 * W), x1 = Math.round(7.3 / 16 * W);
  let bandNonBg = 0, bandTotal = 0;
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      bandTotal++;
      if (!near(px(x, y), bg)) bandNonBg++;
    }
  }
  return {
    canvas: { w: W, h: H },
    backgroundSample: bg,
    nonBgPct: +(100 * nonBg / (W * H)).toFixed(2),
    topColors: top,
    queueBand: { worldX: '3.0..7.3', pxRange: [x0, x1], nonBgPixels: bandNonBg, total: bandTotal,
                 pct: +(100 * bandNonBg / bandTotal).toFixed(2) },
  };
});
await p.locator('deep-visual').screenshot({ path: SHOTS + 'D-heavy-lag-particles.png' });
const canvasEl = await p.evaluateHandle(() => document.querySelector('deep-visual').shadowRoot.querySelector('canvas'));
await canvasEl.asElement().screenshot({ path: SHOTS + 'E-canvas-only-heavy-lag.png' });
R.errors = errs;
console.log(JSON.stringify(R, null, 2));
await b.close();
