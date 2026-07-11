// PROVE the viz-blank mechanism.
// Hypothesis: scene.js:99 calls resize() while the pane is still hidden -> clientWidth/Height = 0
//   -> renderer.setSize(0,0) -> drawing buffer clamps to 1x1. The ONLY re-trigger is a window
//   'resize' event (scene.js:98), which never fires in normal use. So the GL buffer stays 1x1 forever.
// Test: after mounting, dispatch a window resize and see if the visualisation comes alive.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(600);
await p.evaluate(() => { const o = document.querySelector('#_index-overlay'); if (o) { o.classList.remove('open', 'vis'); o.style.display = 'none'; } });
await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
await p.waitForTimeout(3000);

const probe = () => p.evaluate(() => {
  const cv = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const r0 = px[0], g0 = px[1], b0 = px[2];
  let diff = 0;
  for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - r0) > 8 || Math.abs(px[i + 1] - g0) > 8 || Math.abs(px[i + 2] - b0) > 8) diff++;
  return {
    canvasAttr: [cv.width, cv.height],
    canvasCSS: [cv.clientWidth, cv.clientHeight],
    drawingBuffer: [w, h],
    nonBackgroundPixels: +((diff / (w * h)) * 100).toFixed(2),
  };
});

console.log('=== STATE AS SHIPPED (viz pane open, untouched) ===');
const before = await probe();
console.log(JSON.stringify(before));
await p.screenshot({ path: `${SHOTS}/12-viz-BLANK-as-shipped.png` });

console.log('\n=== now fire a window resize (the ONLY thing wired to scene.js resize()) ===');
await p.evaluate(() => window.dispatchEvent(new Event('resize')));
await p.waitForTimeout(2500);
const after = await probe();
console.log(JSON.stringify(after));
await p.screenshot({ path: `${SHOTS}/13-viz-ALIVE-after-window-resize.png` });

console.log('\n=== VERDICT ===');
console.log('drawing buffer  :', before.drawingBuffer.join('x'), '->', after.drawingBuffer.join('x'));
console.log('non-bg pixels   :', before.nonBackgroundPixels + '%', '->', after.nonBackgroundPixels + '%');
console.log(before.nonBackgroundPixels === 0 && after.nonBackgroundPixels > 1
  ? '\nCONFIRMED: the visualisation renders NOTHING as shipped, and only comes alive if the\nwindow happens to be resized. scene.js:99 runs resize() before the pane has layout.'
  : '\ninconclusive');

// also confirm a real browser resize (not a synthetic event) does it
await p.setViewportSize({ width: 1100, height: 850 });
await p.waitForTimeout(1800);
console.log('\nafter a REAL viewport resize:', JSON.stringify(await probe()));
await p.screenshot({ path: `${SHOTS}/14-viz-after-real-resize.png` });
await b.close();
