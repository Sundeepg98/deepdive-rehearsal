// P1 root-cause proof: is the UNREMOVED window 'resize' listener (scene.js:98) the GC root
// that retains every leaked renderer? Census window's listeners directly via CDP DOMDebugger.
// Also re-check the lens's "rAF loop IS correctly cancelled on close" sub-claim.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Runtime.enable');

async function windowResizeListeners() {
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  const byType = {};
  for (const l of listeners) byType[l.type] = (byType[l.type] || 0) + 1;
  return { resize: byType.resize || 0, total: listeners.length, byType };
}

await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(2000);
await page.locator('#_index-overlay [data-topic="kafka-internals"]').first().click();
await page.waitForTimeout(1200);

const viz = page.locator('button[data-tab="viz"]:visible').first();
const walk = page.locator('button[data-tab="walk"]:visible').first();

const base = await windowResizeListeners();
console.log('BASELINE window listeners:', JSON.stringify(base));

for (let i = 1; i <= 6; i++) {
  await viz.click(); await page.waitForTimeout(600);
  await walk.click(); await page.waitForTimeout(400);
  const w = await windowResizeListeners();
  console.log(`after ${i} open/close cycles -> window 'resize' listeners = ${w.resize}  (total window listeners ${w.total})`);
}

// rAF sub-claim: with the viz CLOSED, is the render loop actually stopped?
const raf = await page.evaluate(() => new Promise(res => {
  let n = 0; let stop = false;
  const orig = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) { if (!stop) n++; return orig.call(window, cb); };
  setTimeout(() => { stop = true; window.requestAnimationFrame = orig; res(n); }, 3000);
}));
console.log(`\nrAF callbacks scheduled over 3s with viz CLOSED: ${raf}  (lens claimed 0 => loop correctly cancelled)`);

await b.close();
