// The verdict: apply the project's OWN calibrated pixel thresholds
// (visual-trainer/_verify_pixels.py: non-bg > 3%, inter-frame change > 0.2%)
// to the visual pane INSIDE the shipped app, (a) as a user gets it and
// (b) after the window-resize workaround.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(900);

async function killOverlay() {
  await p.evaluate(() => {
    if (window.IndexOverlay && window.IndexOverlay.close) window.IndexOverlay.close();
    document.querySelectorAll('.ix-x').forEach(x => x.click());
  });
  await p.waitForTimeout(250);
}
await killOverlay();
await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); window.goView('viz'); });
await p.waitForTimeout(1800);
await killOverlay();

const R = {};
const canvasBox = async () => p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, attrW: c.width, attrH: c.height };
});

// ---------- (a) AS SHIPPED: what a user actually gets ----------
R.asShipped = await canvasBox();
const clipOf = (o) => ({ x: o.x, y: o.y, width: o.w, height: o.h });
if (R.asShipped.w > 0 && R.asShipped.h > 1) {
  await p.screenshot({ path: SHOTS + 'V-shipped-a.png', clip: clipOf(R.asShipped) });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: SHOTS + 'V-shipped-b.png', clip: clipOf(R.asShipped) });
  R.asShippedShots = true;
} else {
  R.asShippedShots = false;
  R.asShippedNote = 'canvas has no paintable area -- nothing to screenshot';
}
await p.screenshot({ path: SHOTS + 'V-shipped-fullpane.png' });

// ---------- (b) AFTER the window-resize workaround ----------
await p.setViewportSize({ width: 1279, height: 900 });
await p.waitForTimeout(900);
await killOverlay();
R.afterResize = await canvasBox();
await p.waitForTimeout(1200);
const box2 = await canvasBox();
await p.screenshot({ path: SHOTS + 'V-resized-a.png', clip: { x: box2.x, y: box2.y, width: box2.w, height: box2.h } });
await p.waitForTimeout(1500);
await p.screenshot({ path: SHOTS + 'V-resized-b.png', clip: { x: box2.x, y: box2.y, width: box2.w, height: box2.h } });

// how many frames in 2s (real render rate)
R.fps = await p.evaluate(async () => {
  const f0 = window.__VIZ.frames();
  await new Promise(r => setTimeout(r, 2000));
  return (window.__VIZ.frames() - f0) / 2;
});
R.errors = errs;
console.log(JSON.stringify(R, null, 2));
await b.close();
