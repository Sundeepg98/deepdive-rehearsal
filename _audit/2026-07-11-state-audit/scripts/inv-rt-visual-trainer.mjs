// ADVERSARIAL RE-VERIFICATION of the rt-visual-trainer lens.
// Independently measures the viz canvas geometry + GL drawing buffer in the SHIPPED dist.
import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-rt-visual-trainer';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
fs.mkdirSync(SHOTS, { recursive: true });

const out = {};
const b = await chromium.launch();

// ---- the measurement, run identically at any viewport -----------------------
const MEASURE = () => {
  const hostEl = document.querySelector('deep-visual');
  if (!hostEl) return { err: 'no deep-visual element' };
  const sr = hostEl.shadowRoot;
  if (!sr) return { err: 'no shadowRoot' };
  const c = sr.querySelector('canvas');
  if (!c) return { err: 'no canvas in shadowRoot', hostHTML: sr.innerHTML.slice(0, 200) };

  // GL drawing buffer -- the REAL framebuffer size (not the CSS box)
  let gl = null, dbw = null, dbh = null, renderer = null, ver = null;
  try {
    gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      dbw = gl.drawingBufferWidth; dbh = gl.drawingBufferHeight;
      ver = gl.getParameter(gl.VERSION);
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    }
  } catch (e) { gl = 'ERR:' + e.message; }

  const r = c.getBoundingClientRect();
  const cs = getComputedStyle(c);

  // ancestor chain
  const chain = [];
  let n = c;
  for (let i = 0; i < 5 && n; i++) {
    const rr = n.getBoundingClientRect();
    chain.push({
      tag: n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className : ''),
      w: +rr.width.toFixed(1), h: +rr.height.toFixed(1),
    });
    n = n.parentElement || (n.getRootNode() && n.getRootNode().host) || null;
  }

  // the "no visual" fallback message -- does anything tell the user?
  const empty = sr.getElementById('vzempty');

  return {
    attrW: c.width, attrH: c.height,                 // drawing-buffer attrs
    drawingBuffer: { w: dbw, h: dbh },               // authoritative GL size
    glVersion: ver, glRenderer: renderer,
    cssBox: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
    cssHeightStyle: cs.height, cssWidthStyle: cs.width,
    borderTop: cs.borderTopWidth, borderBottom: cs.borderBottomWidth,
    chain,
    emptyHidden: empty ? empty.hidden : 'no #vzempty',
    frames: window.__VIZ ? window.__VIZ.frames() : null,
    ctlHeights: [...sr.querySelectorAll('input[type=range], button')]
      .map((e) => ({ t: e.tagName.toLowerCase(), txt: (e.textContent || '').trim().slice(0, 30), h: +e.getBoundingClientRect().height.toFixed(1) })),
  };
};

async function boot(vw, vh) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
  p.on('pageerror', (e) => errs.push('PE:' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);
  // dismiss any first-run overlay
  await p.keyboard.press('Escape').catch(() => {});
  await p.waitForTimeout(200);
  // navigate to kafka-internals via the app's own topic nav, then the viz view
  const nav = await p.evaluate(() => {
    const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
    if (it) { it.click(); return 'clicked tn-item'; }
    window.location.hash = '#kafka-internals/viz';
    return 'hash fallback';
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => window.goView && window.goView('viz'));
  await p.waitForTimeout(1600);
  return { p, errs, nav };
}

// ============ 1. DESKTOP 1280, EXACTLY AS SHIPPED ============
{
  const { p, errs, nav } = await boot(1280, 800);
  out.desktop_asShipped = await p.evaluate(MEASURE);
  out.desktop_nav = nav;
  await p.screenshot({ path: `${SHOTS}/A-desktop-asshipped.png` });
  // frames advance even though buffer is 0x0?
  const f1 = await p.evaluate(() => (window.__VIZ ? window.__VIZ.frames() : null));
  await p.waitForTimeout(1500);
  const f2 = await p.evaluate(() => (window.__VIZ ? window.__VIZ.frames() : null));
  out.desktop_frames = { f1, f2, advanced: f2 > f1 + 20 };

  // ---- THE FIX PROOF: dispatch a single window resize ----
  await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(1200);
  out.desktop_afterResizeEvent = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${SHOTS}/B-desktop-after-resize-event.png` });

  // pixel proof: crop the stage region AFTER the fix
  const box = await p.evaluate(() => {
    const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: Math.max(0, Math.floor(r.x)), y: Math.max(0, Math.floor(r.y)), width: Math.floor(r.width), height: Math.floor(r.height) };
  });
  if (box.width > 2 && box.height > 2) {
    await p.screenshot({ path: `${SHOTS}/C-canvas-only-AFTER.png`, clip: box });
  }
  out.desktop_errs = errs;
  await p.close();
}

// ============ 2. RE-ENTRY (viz -> walk -> viz) ============
{
  const { p, errs } = await boot(1280, 800);
  const first = await p.evaluate(MEASURE);
  await p.evaluate(() => window.goView('walk'));
  await p.waitForTimeout(600);
  await p.evaluate(() => window.goView('viz'));
  await p.waitForTimeout(1600);
  const second = await p.evaluate(MEASURE);
  out.reentry = {
    firstVisit: { buf: first.drawingBuffer, css: first.cssBox },
    secondVisit: { buf: second.drawingBuffer, css: second.cssBox },
  };
  out.reentry_errs = errs;
  await p.close();
}

// ============ 3. MOBILE 390 ============
{
  const { p, errs } = await boot(390, 844);
  out.mobile_asShipped = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${SHOTS}/D-mobile390-asshipped.png`, fullPage: false });
  // control heights only mean something once laid out -> force the size, then re-measure
  await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(1000);
  out.mobile_afterResize = await p.evaluate(MEASURE);
  await p.screenshot({ path: `${SHOTS}/E-mobile390-after-resize.png` });
  out.mobile_overflow = await p.evaluate(() => {
    const sr = document.querySelector('deep-visual').shadowRoot;
    const v = sr.querySelector('.vz');
    return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, vzW: v ? +v.getBoundingClientRect().width.toFixed(1) : null };
  });
  out.mobile_errs = errs;
  await p.close();
}

// ============ 4. THEME: what theme is the app in by default? ============
{
  const { p } = await boot(1280, 800);
  out.theme = await p.evaluate(() => {
    const sr = document.querySelector('deep-visual').shadowRoot;
    const btn = [...sr.querySelectorAll('button')].find((x) => x.textContent.includes('Spike'));
    const page = getComputedStyle(document.body);
    return {
      htmlDataTheme: document.documentElement.getAttribute('data-theme'),
      htmlClass: document.documentElement.className,
      bodyBg: page.backgroundColor, bodyColor: page.color,
      kitBtnBg: btn ? getComputedStyle(btn).backgroundColor : null,
      kitBtnColor: btn ? getComputedStyle(btn).color : null,
      canvasBg: getComputedStyle(sr.querySelector('canvas')).backgroundColor,
    };
  });
  await p.close();
}

await b.close();
fs.writeFileSync(`${SHOTS}/../../scripts/inv-rt-visual-results.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
