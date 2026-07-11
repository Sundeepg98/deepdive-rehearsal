// BULLETPROOF repro: natural user flow. Real Playwright clicks on VISIBLE elements only.
// No JS injection, no forced overlay hiding, no synthetic resize events.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

for (const vp of [{ width: 1280, height: 900 }, { width: 1512, height: 950 }]) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: vp });
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(2200);

  // 1. natural click on the visible Kafka Internals card inside the index overlay
  await p.locator('#_index-overlay [data-topic="kafka-internals"]').first().click();
  await p.waitForTimeout(1400);

  // 2. natural click on the visible Visualize tab
  await p.locator('button[data-tab="viz"]:visible').first().click();
  await p.waitForTimeout(3500);

  const geo = await p.evaluate(() => {
    const dv = document.querySelector('deep-visual');
    const cv = dv && dv.shadowRoot && dv.shadowRoot.querySelector('canvas');
    if (!cv) return { err: 'no canvas' };
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const r = cv.getBoundingClientRect();
    return {
      canvasAttr: [cv.width, cv.height],
      canvasRenderedBox: [Math.round(r.width), Math.round(r.height)],
      drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
      userSeesAnything: r.width > 0 && r.height > 0,
    };
  });
  console.log(`viewport ${vp.width}x${vp.height} NATURAL FLOW:`, JSON.stringify(geo));
  await p.screenshot({ path: `${SHOTS}/15-viz-natural-${vp.width}.png` });
  await b.close();
}
console.log('\ncanvasRenderedBox height = 0  =>  the Visualize pane shows the user NOTHING.');
