/* ADVERSARIAL RE-VERIFICATION of the P1 "VisualKit paints a blank 0x0 canvas" finding.
   Written from scratch — does NOT reuse the original lens's script.
   Strategy: discover the DOM first, then drive the app through its real UI, then measure. */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-codehealth';
mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); console.log('CONSOLE-ERROR:', m.text()); } });
p.on('pageerror', e => { errors.push(e.message); console.log('PAGE-ERROR:', e.message); });

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);

// ---- 1. Discover the real DOM ------------------------------------------------
const disco = await p.evaluate(() => ({
  hash: location.hash,
  hasVisualKit: typeof window.VisualKit,
  hasRegistry: typeof window.TopicRegistry,
  openOverlays: [...document.querySelectorAll('[open], .ov[style*="flex"], dialog[open]')].map(e => e.id || e.className).slice(0, 5),
  tabs: [...document.querySelectorAll('button[data-tab]')].map(t => ({ tab: t.dataset.tab, hidden: t.hidden })),
}));
console.log('\n=== DISCOVERY ===');
console.log(JSON.stringify(disco, null, 2));

// ---- 2. Dismiss boot overlay, go to kafka-internals via the REAL router ------
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = '#kafka-internals/walk'; });
await p.waitForTimeout(1000);

const tabsAfter = await p.evaluate(() =>
  [...document.querySelectorAll('button[data-tab]')].map(t => ({ tab: t.dataset.tab, hidden: t.hidden })));
console.log('\n=== TABS on kafka-internals ===');
console.log(JSON.stringify(tabsAfter));

// ---- 3. Click the viz tab through the real UI (no direct API calls) ---------
const vizBtn = p.locator('button[data-tab="viz"]').first();
console.log('viz tab visible?', await vizBtn.isVisible());
await vizBtn.click();
await p.waitForTimeout(1500);

// ---- 4. Measure the canvas, FIRST MOUNT, no resize --------------------------
const measure = () => p.evaluate(() => {
  const dv = document.querySelector('deep-visual');
  if (!dv) return { err: 'no deep-visual element' };
  const root = dv.shadowRoot;
  if (!root) return { err: 'no shadowRoot' };
  const host = root.getElementById('vzhost');
  const canvas = root.querySelector('canvas');
  if (!canvas) return { err: 'no canvas', hostBox: host && host.getBoundingClientRect() };
  const hb = host.getBoundingClientRect();
  const cb = canvas.getBoundingClientRect();
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  // is anything actually painted? read pixels off a 2D copy
  let nonBlack = null;
  try {
    const c2 = document.createElement('canvas');
    c2.width = Math.max(1, canvas.width); c2.height = Math.max(1, canvas.height);
    const ctx = c2.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    const d = ctx.getImageData(0, 0, c2.width, c2.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] || d[i + 1] || d[i + 2]) n++;
    nonBlack = n;
  } catch (e) { nonBlack = 'err: ' + e.message; }
  return {
    hostBox: { w: Math.round(hb.width), h: Math.round(hb.height) },
    canvasDrawingBuffer: { w: canvas.width, h: canvas.height },   // <-- the GL buffer
    canvasCSSBox: { w: Math.round(cb.width), h: Math.round(cb.height) },
    canvasClientWH: { w: canvas.clientWidth, h: canvas.clientHeight },
    webgl2: !!(canvas.getContext && canvas.getContext('webgl2')),
    glDrawingBuffer: gl ? { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight } : null,
    nonBlackPixels: nonBlack,
    vizInst: typeof window.__VIZ,
  };
});

const first = await measure();
console.log('\n=== MEASUREMENT A: FIRST MOUNT (no resize) ===');
console.log(JSON.stringify(first, null, 2));
await p.screenshot({ path: `${SHOTS}/A-first-mount.png` });

// ---- 5. Resize the window, re-measure ---------------------------------------
await p.setViewportSize({ width: 1281, height: 900 });
await p.waitForTimeout(1200);
const after = await measure();
console.log('\n=== MEASUREMENT B: AFTER 1px VIEWPORT RESIZE ===');
console.log(JSON.stringify(after, null, 2));
await p.screenshot({ path: `${SHOTS}/B-after-resize.png` });

console.log('\n=== VERDICT ===');
console.log('console/page errors during whole run:', errors.length);
const brokeAtFirst = first.canvasDrawingBuffer && (first.canvasDrawingBuffer.w === 0 || first.canvasDrawingBuffer.h === 0);
const fixedByResize = after.canvasDrawingBuffer && after.canvasDrawingBuffer.w > 0 && after.canvasDrawingBuffer.h > 0;
console.log('blank 0x0 drawing buffer on FIRST mount?', brokeAtFirst);
console.log('rescued by a window resize?          ', fixedByResize);
console.log('=> FINDING', (brokeAtFirst && fixedByResize) ? 'CONFIRMED' : 'NOT REPRODUCED as described');

await b.close();
