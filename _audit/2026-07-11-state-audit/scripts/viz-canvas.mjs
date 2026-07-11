// The VisualKit mounts + runs, but does it PAINT? Measure the canvas drawing surface.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/code-health';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.evaluate(async () => {
  window.TopicRegistry.setTopic('kafka-internals');
  await new Promise((r) => setTimeout(r, 1200));
});
await p.click('button[data-tab="viz"]');
await p.waitForTimeout(4000);

const m = await p.evaluate(() => {
  const el = document.querySelector('deep-visual');
  const root = el.shadowRoot;
  const host = root.getElementById('vzhost');
  const canvas = root.querySelector('canvas');
  const hr = host.getBoundingClientRect();
  const cr = canvas ? canvas.getBoundingClientRect() : null;
  return {
    hostBox: { w: Math.round(hr.width), h: Math.round(hr.height) },
    hostClient: { w: host.clientWidth, h: host.clientHeight },
    canvasExists: !!canvas,
    canvasDrawingBuffer: canvas ? { width: canvas.width, height: canvas.height } : null,
    canvasCssBox: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
    canvasStyle: canvas ? { w: canvas.style.width, h: canvas.style.height, display: getComputedStyle(canvas).display } : null,
    simRunning: !!window.__VIZ,
  };
});
console.log('=== VisualKit canvas measurement (kafka-internals -> Visualize) ===');
console.log(JSON.stringify(m, null, 1));

// Does a resize event rescue it?
await p.setViewportSize({ width: 1281, height: 901 });
await p.waitForTimeout(1500);
const afterResize = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  return c ? { width: c.width, height: c.height, cssW: Math.round(c.getBoundingClientRect().width), cssH: Math.round(c.getBoundingClientRect().height) } : 'none';
});
console.log('after a window resize:', JSON.stringify(afterResize));
await p.screenshot({ path: `${SHOTS}/viz-after-resize.png` });
console.log('errors:', errors.length, errors.slice(0, 4));
await b.close();
