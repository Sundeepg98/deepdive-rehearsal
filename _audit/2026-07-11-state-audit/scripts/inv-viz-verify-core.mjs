// ADVERSARIAL RE-VERIFICATION of the inv-visual-trainer lens, finding #1:
// "the WebGL canvas is 0x0 in the shipped app".
// Independent measurement. Does NOT reuse the original agent's scripts.
import { chromium } from 'playwright';
import fs from 'node:fs';

const FILE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const out = {};

async function measure(p) {
  return p.evaluate(() => {
    const host = document.querySelector('deep-visual');
    if (!host) return { err: 'no deep-visual element' };
    const sr = host.shadowRoot;
    const c = sr && sr.querySelector('canvas');
    if (!c) return { err: 'no canvas in deep-visual shadow root', hostHTML: host.shadowRoot ? host.shadowRoot.innerHTML.slice(0, 120) : 'no shadow' };
    const r = c.getBoundingClientRect();
    const cs = getComputedStyle(c);
    const pane = document.getElementById('viz');
    return {
      backingStore: [c.width, c.height],          // <-- the WebGL drawing buffer
      widthAttr: c.getAttribute('width'), heightAttr: c.getAttribute('height'),
      rect: [Math.round(r.width), Math.round(r.height)],
      cssWH: [cs.width, cs.height],
      borderTop: cs.borderTopWidth, borderBottom: cs.borderBottomWidth,
      clientWH: [c.clientWidth, c.clientHeight],
      paneClass: pane ? pane.className : null,
      paneDisplay: pane ? getComputedStyle(pane).display : null,
      kitMounted: !!window.__VIZ,
      frames: window.__VIZ ? window.__VIZ.frames() : null,
      glCtxSize: (() => { try { const gl = c.getContext('webgl2') || c.getContext('webgl'); return gl ? [gl.drawingBufferWidth, gl.drawingBufferHeight] : 'no-gl'; } catch (e) { return 'ctx-err:' + e.message; } })(),
    };
  });
}

// Clip-screenshot the canvas twice, 1.5s apart -> the project's OWN calibration
async function pixelPair(p, tag) {
  const rect = await p.evaluate(() => {
    const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (rect.w < 1 || rect.h < 1) return { skipped: 'canvas rect is degenerate', rect };
  const clip = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.max(1, Math.round(rect.w)), height: Math.max(1, Math.round(rect.h)) };
  const A = `${SHOTS}/${tag}-canvas-a.png`, B = `${SHOTS}/${tag}-canvas-b.png`;
  await p.screenshot({ path: A, clip });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: B, clip });
  return { a: A, b: B, clip, bytesA: fs.statSync(A).size, bytesB: fs.statSync(B).size };
}

async function driveToViz(p) {
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('.tn-trigger').click());
  await p.waitForTimeout(400);
  await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
  await p.waitForTimeout(800);
  // click the REAL tab, like a user would (not just goView)
  const tabW = await p.evaluate(() => { const t = document.querySelector('button[data-tab="viz"]'); return t ? t.offsetWidth : -1; });
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(2000);
  return tabW;
}

// ---------- DESKTOP, exactly as a user gets it ----------
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text().slice(0, 100)); });

out.desktopTabWidth = await driveToViz(p);
out.desktop_AS_SHIPPED = await measure(p);
await p.screenshot({ path: `${SHOTS}/desktop-AS-SHIPPED-full.png` });
out.desktop_AS_SHIPPED_pixels = await pixelPair(p, 'shipped-desktop');
out.errorsSoFar = [...errs];

// ---------- now fire a window resize, nothing else ----------
await p.setViewportSize({ width: 1281, height: 900 });
await p.waitForTimeout(1200);
out.desktop_AFTER_RESIZE = await measure(p);
await p.screenshot({ path: `${SHOTS}/desktop-AFTER-RESIZE-full.png` });
out.desktop_AFTER_RESIZE_pixels = await pixelPair(p, 'resized-desktop');
await p.close();

// ---------- MOBILE ----------
const m = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await driveToViz(m);
out.mobile_AS_SHIPPED = await measure(m);
await m.screenshot({ path: `${SHOTS}/mobile-390-AS-SHIPPED.png` });
await m.close();

// ---------- CONTROL: the standalone pilot (should render fine) ----------
const s = await b.newPage({ viewport: { width: 1280, height: 900 } });
await s.goto('file:///D:/claude-workspace/deepdive-rehearsal/visual-trainer/kafka-lag-pilot.html', { waitUntil: 'load' });
await s.waitForTimeout(2500);
out.standalone_pilot = await s.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { err: 'no canvas' };
  const r = c.getBoundingClientRect();
  return { backingStore: [c.width, c.height], rect: [Math.round(r.width), Math.round(r.height)] };
});
await s.close();

await b.close();
out.pageErrors = errs;
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync(`${SHOTS}/../../scripts/_inv-viz-core.json`, JSON.stringify(out, null, 1));
