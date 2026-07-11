/* Probe 3 -- two decisive experiments:
   A) ROOT-CAUSE PROOF: in the app, dispatch window 'resize' after mount. scene.js re-runs
      resize() with a now-nonzero clientWidth. If the canvas snaps to correct size and paints,
      the diagnosis (mounted-while-hidden + no ResizeObserver) is PROVEN and the fix is known.
   B) CONTROL: the standalone pilot (already-built single file). If IT renders in this same
      headless browser, the kit/WebGL/headless are all FINE => the bug is purely the app embed. */
import { chromium } from 'playwright';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-visual-trainer';
const APP = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const PILOT = 'file:///D:/claude-workspace/deepdive-rehearsal/visual-trainer/kafka-lag-pilot.html';
const log = (...a) => console.log(...a);
const DEEP = `window.__deep=function(sel){const out=[];(function walk(root){try{root.querySelectorAll(sel).forEach(n=>out.push(n));}catch(e){}try{root.querySelectorAll('*').forEach(n=>{if(n.shadowRoot)walk(n.shadowRoot);});}catch(e){}})(document);return out;};`;

const measure = () => {
  const c = window.__deep('canvas')[0];
  if (!c) return { canvas: false };
  const r = c.getBoundingClientRect();
  let paint = 'n/a';
  if (c.width && c.height) {
    const t = document.createElement('canvas');
    t.width = c.width; t.height = c.height;
    try {
      t.getContext('2d').drawImage(c, 0, 0);
      const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data;
      const seen = new Set(); let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 53) {
        seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
        if (d[i] > 30 || d[i + 1] > 30 || d[i + 2] > 30) lit++;
      }
      paint = { distinctColors: seen.size, litSamples: lit };
    } catch (e) { paint = 'readback-failed'; }
  }
  return { buffer: { w: c.width, h: c.height }, css: { w: Math.round(r.width), h: Math.round(r.height) }, paint };
};

const b = await chromium.launch({ headless: true });

/* ---------------- A) ROOT-CAUSE PROOF (in-app) ---------------- */
log('======== A) APP: before vs after a window resize event ========');
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const appErr = [];
p.on('pageerror', e => appErr.push(e.message));
p.on('console', m => { if (m.type() === 'error') appErr.push(m.text()); });
await p.goto(APP, { waitUntil: 'load' });
await p.evaluate(DEEP);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.evaluate(() => { window.location.hash = '#kafka-internals/viz'; });
await p.waitForTimeout(2500);

const before = await p.evaluate(measure);
log('BEFORE (as shipped):', JSON.stringify(before));
await p.locator('canvas').first().screenshot({ path: `${SHOTS}/proof-BEFORE-canvas.png` }).catch(() => log('  (canvas too small to screenshot)'));

// the experiment: force scene.js's resize() to re-run, now that the pane IS laid out
await p.evaluate(() => window.dispatchEvent(new Event('resize')));
await p.waitForTimeout(1500);
const after = await p.evaluate(measure);
log('AFTER  (window resize fired):', JSON.stringify(after));
await p.screenshot({ path: `${SHOTS}/proof-AFTER-full.png` });
await p.locator('canvas').first().screenshot({ path: `${SHOTS}/proof-AFTER-canvas.png` }).catch(() => {});

// does it ANIMATE once sized? canvas-only diff
if (after.buffer && after.buffer.h > 10) {
  const el = p.locator('canvas').first();
  const s1 = await el.screenshot();
  await p.waitForTimeout(1200);
  const s2 = await el.screenshot();
  log('ANIMATES once sized (canvas-only pixel diff):', Buffer.compare(s1, s2) !== 0);
}
log('app errors:', appErr.length, appErr.slice(0, 3));

/* ---------------- B) CONTROL: standalone pilot ---------------- */
log('\n======== B) CONTROL: standalone kafka-lag-pilot.html ========');
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
const pilotErr = [];
p2.on('pageerror', e => pilotErr.push(e.message));
p2.on('console', m => { if (m.type() === 'error') pilotErr.push(m.text()); });
await p2.goto(PILOT, { waitUntil: 'load' });
await p2.evaluate(DEEP);
await p2.waitForTimeout(2500);
const pilot = await p2.evaluate(measure);
log('PILOT canvas:', JSON.stringify(pilot));
await p2.screenshot({ path: `${SHOTS}/control-pilot-standalone.png` });
if (pilot.buffer && pilot.buffer.h > 10) {
  const el = p2.locator('canvas').first();
  const s1 = await el.screenshot({ path: `${SHOTS}/control-pilot-A.png` });
  await p2.waitForTimeout(1200);
  const s2 = await el.screenshot({ path: `${SHOTS}/control-pilot-B.png` });
  log('PILOT animates (canvas-only diff):', Buffer.compare(s1, s2) !== 0);
}
log('pilot errors:', pilotErr.length, pilotErr.slice(0, 3));

await b.close();
