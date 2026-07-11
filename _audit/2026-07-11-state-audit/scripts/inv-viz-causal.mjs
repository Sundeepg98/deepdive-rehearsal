// Adversarial test of the ROOT-CAUSE claim: "ViewTransitions swaps .pane.on
// asynchronously, so the scene mounts while the pane is display:none".
// Three probes, the middle one requiring NO code injection at all.
import { chromium } from 'playwright';
import fs from 'node:fs';
const FILE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify';
const b = await chromium.launch();
const out = {};

const measure = (p) => p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  const r = c.getBoundingClientRect();
  return { backing: [c.width, c.height], rect: [Math.round(r.width), Math.round(r.height)],
           frames: window.__VIZ ? window.__VIZ.frames() : null };
});

async function toKafka(p) {
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.tn-trigger').click());
  await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
  await p.waitForTimeout(700);
}

// ---- PROBE 1: instrument _mount to see the pane's state AT mount time -------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toKafka(p);
  await p.evaluate(() => {
    window.__MOUNTLOG = [];
    const C = customElements.get('deep-visual');
    const orig = C.prototype._mount;
    C.prototype._mount = function () {
      const pane = document.getElementById('viz');
      window.__MOUNTLOG.push({ phase: 'ENTER _mount',
        paneClass: pane.className, paneDisplay: getComputedStyle(pane).display,
        vzhostClientW: this._host ? this._host.clientWidth : null,
        hasVT: !!(window.ViewTransitions && window.ViewTransitions.run),
        nativeVT: typeof document.startViewTransition === 'function' });
      const r = orig.apply(this, arguments);
      const c = this.shadowRoot.querySelector('canvas');
      window.__MOUNTLOG.push({ phase: 'AFTER _mount (scene built)',
        canvasBacking: c ? [c.width, c.height] : null,
        canvasAttrs: c ? [c.getAttribute('width'), c.getAttribute('height')] : null });
      return r;
    };
  });
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1500);
  out.probe1_mountTimeline = await p.evaluate(() => window.__MOUNTLOG);
  out.probe1_settled = await measure(p);
  await p.close();
}

// ---- PROBE 2: prefers-reduced-motion -> view-transitions.js:24 takes the
//      SYNCHRONOUS apply() path. Pure user setting. NO code injection. --------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await toKafka(p);
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(2500);
  out.probe2_reducedMotion = await measure(p);
  await p.screenshot({ path: `${SHOTS}/probe2-REDUCED-MOTION-renders.png` });
  const r = await p.evaluate(() => {
    const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
    const q = c.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height };
  });
  if (r.h > 5) {
    await p.screenshot({ path: `${SHOTS}/reduced-canvas-a.png`, clip: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) } });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/reduced-canvas-b.png`, clip: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.w), height: Math.round(r.h) } });
  }
  await p.close();
}

// ---- PROBE 3: kill ViewTransitions entirely -> switchTab's else-branch runs
//      swap() synchronously. Confirms the async swap is the discriminator. ----
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toKafka(p);
  await p.evaluate(() => { window.ViewTransitions = null; });
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(2500);
  out.probe3_noViewTransitions = await measure(p);
  await p.close();
}

// ---- PROBE 4 (control): default motion, same flow -> still broken? ----------
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await toKafka(p);
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(2500);
  out.probe4_control_default = await measure(p);
  await p.close();
}

await b.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-causal.json', JSON.stringify(out, null, 1));
