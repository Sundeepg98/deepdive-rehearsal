// ADVERSARIAL VERIFY of rt-perf P0: "Visualize pane renders NOTHING as shipped".
// Independent re-measure + two NEW falsifiable mechanism tests the original lens never ran.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rtperf';

// Measure the canvas geometry + whether GL actually drew anything (readPixels on the real buffer).
const GEO = () => {
  const dv = document.querySelector('deep-visual');
  const cv = dv && dv.shadowRoot && dv.shadowRoot.querySelector('canvas');
  if (!cv) return { err: 'no canvas' };
  const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const r = cv.getBoundingClientRect();
  let nonBlack = null, px = null;
  if (gl) {
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    // clear color is 0x0d1117 => (13,17,23). count pixels differing from it.
    let n = 0;
    for (let i = 0; i < buf.length; i += 4) {
      if (Math.abs(buf[i] - 13) > 6 || Math.abs(buf[i + 1] - 17) > 6 || Math.abs(buf[i + 2] - 23) > 6) n++;
    }
    nonBlack = n; px = w * h;
  }
  // is the #viz pane actually revealed?
  const pane = document.getElementById('viz');
  return {
    canvasAttr: [cv.width, cv.height],
    renderedBox: [Math.round(r.width), Math.round(r.height)],
    drawingBuffer: gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : null,
    ctxLost: gl ? gl.isContextLost() : null,
    litPixels: nonBlack, totalPixels: px,
    paneHasOnClass: pane ? pane.classList.contains('on') : null,
    paneClientWidth: pane ? pane.clientWidth : null,
    hostClientWidth: (() => { const h = dv.shadowRoot.getElementById('vzhost'); return h ? h.clientWidth : null; })(),
  };
};

async function openViz(p, { reducedMotion = null } = {}) {
  const ctxOpts = { viewport: { width: 1280, height: 900 } };
  if (reducedMotion) ctxOpts.reducedMotion = reducedMotion;
  const page = await p.newPage(ctxOpts);
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  await page.locator('#_index-overlay [data-topic="kafka-internals"]').first().click();
  await page.waitForTimeout(1200);
  await page.locator('button[data-tab="viz"]:visible').first().click();
  await page.waitForTimeout(3000);
  return { page, errs };
}

const b = await chromium.launch();

// ---- TEST 1: reproduce the lens claim (default motion) --------------------
{
  const { page, errs } = await openViz(b);
  const geo = await page.evaluate(GEO);
  console.log('T1 DEFAULT (lens claim):', JSON.stringify(geo));
  console.log('   console errors:', errs.length);
  await page.screenshot({ path: `${SHOTS}/t1-default-BROKEN.png` });

  // ---- TEST 2: does a window resize repair it? (lens proof-of-mechanism)
  await page.setViewportSize({ width: 1281, height: 900 });
  await page.waitForTimeout(1500);
  const geo2 = await page.evaluate(GEO);
  console.log('T2 AFTER RESIZE:', JSON.stringify(geo2));
  await page.screenshot({ path: `${SHOTS}/t2-after-resize-REPAIRED.png` });
  await page.close();
}

// ---- TEST 3 (NEW): prefers-reduced-motion => ViewTransitions.run() calls
// apply() SYNCHRONOUSLY (view-transitions.js), so the pane is revealed BEFORE
// routechange dispatches. If the mechanism is the startViewTransition async
// gap, the viz should RENDER CORRECTLY here with no resize at all.
{
  const { page, errs } = await openViz(b, { reducedMotion: 'reduce' });
  const geo = await page.evaluate(GEO);
  console.log('T3 REDUCED-MOTION (my prediction: WORKS):', JSON.stringify(geo));
  console.log('   console errors:', errs.length);
  await page.screenshot({ path: `${SHOTS}/t3-reducedmotion.png` });
  await page.close();
}

// ---- TEST 4 (NEW): switch topic WHILE already on the viz pane. The pane is
// already .on, so remount happens into a laid-out host => should render.
{
  const { page } = await openViz(b);
  const before = await page.evaluate(GEO);
  // switch to another viz-capable topic via the topic index overlay
  const topics = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#_index-overlay [data-topic]').forEach(e => out.push(e.getAttribute('data-topic')));
    return out.slice(0, 60);
  });
  console.log('T4 topics available:', topics.length);
  // open index overlay and pick a different topic
  await page.keyboard.press('Escape');
  const other = await page.evaluate(() => {
    // find another topic that has a visual (nav tab unhidden after switch is the tell)
    return null;
  });
  // use the topic-nav "next" if present, else re-open index overlay
  await page.evaluate(() => { if (window.__openIndex) window.__openIndex(); });
  await page.waitForTimeout(600);
  const visible = await page.locator('#_index-overlay [data-topic]:visible').count();
  console.log('T4 index overlay topic buttons visible:', visible);
  if (visible > 1) {
    // click a different topic than kafka-internals
    const handle = page.locator('#_index-overlay [data-topic]:visible').nth(1);
    const tid = await handle.getAttribute('data-topic');
    await handle.click();
    await page.waitForTimeout(2500);
    const geo = await page.evaluate(GEO);
    console.log(`T4 AFTER TOPIC SWITCH (to ${tid}) while on viz:`, JSON.stringify(geo));
    await page.screenshot({ path: `${SHOTS}/t4-topicswitch-on-viz.png` });
  }
  console.log('T4 before:', JSON.stringify(before));
  await page.close();
}

await b.close();
