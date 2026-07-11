/* Probe 2: dismiss the first-run overlay, THEN measure the viz pane honestly.
   Diffs the CANVAS ELEMENT ONLY (a full-page diff would be faked by HUD text ticking). */
import { chromium } from 'playwright';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-visual-trainer';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const log = (...a) => console.log(...a);
const errors = [];

const DEEP = `window.__deep=function(sel){const out=[];(function walk(root){try{root.querySelectorAll(sel).forEach(n=>out.push(n));}catch(e){}try{root.querySelectorAll('*').forEach(n=>{if(n.shadowRoot)walk(n.shadowRoot);});}catch(e){}})(document);return out;};`;

async function go(label, width, height) {
  log(`\n############ ${label} (${width}x${height}) ############`);
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width, height } });
  p.on('console', m => { if (m.type() === 'error') { errors.push(`[${label}] ` + m.text()); log('CONSOLE-ERROR:', m.text()); } });
  p.on('pageerror', e => { errors.push(`[${label}] ` + e.message); log('PAGE-ERROR:', e.message); });

  await p.goto(URL, { waitUntil: 'load' });
  await p.evaluate(DEEP);

  // --- dismiss the first-run topic-index overlay ---
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  let overlayUp = await p.evaluate(() => !!document.querySelector('.ovl:not([hidden]), dialog[open], .modal:not([hidden])'));
  if (overlayUp) { // fall back to clicking a close control
    const x = p.locator('button:has-text("×"), [aria-label*="lose"], .ovl-x').first();
    if (await x.count()) { await x.click({ force: true }).catch(() => {}); await p.waitForTimeout(300); }
  }
  overlayUp = await p.evaluate(() => !!document.querySelector('.ovl:not([hidden]), dialog[open]'));
  log('overlay still up after dismiss attempt:', overlayUp);

  // --- go to the viz pane ---
  await p.evaluate(() => { window.location.hash = '#kafka-internals/viz'; });
  await p.waitForTimeout(3000);

  // --- measure the canvas + its ancestor chain (diagnose any 0-height) ---
  const geo = await p.evaluate(() => {
    const c = window.__deep('canvas')[0];
    if (!c) return { canvas: false };
    const chain = [];
    let n = c;
    for (let i = 0; i < 6 && n; i++) {
      const r = n.getBoundingClientRect();
      chain.push({
        node: n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ').filter(Boolean).join('.') : ''),
        w: Math.round(r.width), h: Math.round(r.height),
        display: getComputedStyle(n).display,
      });
      n = n.parentElement || (n.getRootNode() && n.getRootNode().host);
    }
    const r = c.getBoundingClientRect();
    return {
      canvas: true,
      drawingBuffer: { w: c.width, h: c.height },   // GL buffer
      css: { w: Math.round(r.width), h: Math.round(r.height) },
      visible: r.width > 0 && r.height > 0,
      chain,
    };
  });
  log('CANVAS GEOMETRY:', JSON.stringify(geo, null, 1));

  const inst = await p.evaluate(() => ({
    mounted: !!window.__VIZ,
    frames: window.__VIZ && window.__VIZ.frames ? window.__VIZ.frames() : null,
  }));
  log('INSTANCE:', JSON.stringify(inst));

  await p.screenshot({ path: `${SHOTS}/${label}-full.png`, fullPage: false });

  // --- CANVAS-ONLY animation diff: the honest test ---
  let canvasAnim = 'n/a (canvas has zero area - cannot capture)';
  if (geo.canvas && geo.visible) {
    const el = p.locator('canvas').first();
    const a = await el.screenshot({ path: `${SHOTS}/${label}-canvasA.png` });
    await p.waitForTimeout(1200);
    const bb = await el.screenshot({ path: `${SHOTS}/${label}-canvasB.png` });
    const differ = Buffer.compare(a, bb) !== 0;
    // is the canvas non-blank at all? sample its pixels via readback
    const nonBlank = await p.evaluate(() => {
      const c = window.__deep('canvas')[0];
      const t = document.createElement('canvas');
      t.width = c.width; t.height = c.height;
      if (!c.width || !c.height) return 'zero-size';
      try {
        t.getContext('2d').drawImage(c, 0, 0);
        const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
        const seen = new Set();
        for (let i = 0; i < d.length; i += 4 * 97) seen.add(`${d[i]},${d[i+1]},${d[i+2]}`);
        return { distinctColors: seen.size, sample: [...seen].slice(0, 6) };
      } catch (e) { return 'readback-failed: ' + e.message; }
    });
    canvasAnim = { pixelsDiffer: differ, nonBlank };
  }
  log('CANVAS ANIMATION (canvas region only):', JSON.stringify(canvasAnim));

  const f2 = await p.evaluate(() => (window.__VIZ ? window.__VIZ.frames() : null));
  log(`FRAME COUNTER: ${inst.frames} -> ${f2}`);

  await b.close();
  return { geo, inst, canvasAnim };
}

await go('desktop', 1280, 900);
await go('mobile390', 390, 844);
log('\n=== ERRORS:', errors.length); errors.forEach(e => log(' !', e));
