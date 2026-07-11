/* LENS: visual trainer runtime. Honest test: does the visual RENDER, INIT, ANIMATE, and RESPOND? */
import { chromium } from 'playwright';
import fs from 'node:fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-visual-trainer';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const errors = [];
const log = (...a) => console.log(...a);

// deep query helper injected into the page: pierce shadow roots
const DEEP = `
window.__deep = function(sel){
  const out=[];
  (function walk(root){
    try{ root.querySelectorAll(sel).forEach(n=>out.push(n)); }catch(e){}
    try{ root.querySelectorAll('*').forEach(n=>{ if(n.shadowRoot) walk(n.shadowRoot); }); }catch(e){}
  })(document);
  return out;
};`;

async function run(label, launchOpts) {
  log(`\n================ LAUNCH: ${label} ================`);
  const b = await chromium.launch(launchOpts);
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('console', m => { if (m.type() === 'error') { errors.push(m.text()); log('CONSOLE-ERROR:', m.text()); } });
  p.on('pageerror', e => { errors.push(e.message); log('PAGE-ERROR:', e.message); });

  await p.goto(URL, { waitUntil: 'load' });
  await p.addInitScript(DEEP);
  await p.evaluate(DEEP);

  // --- 0. WebGL capability of THIS browser (the confound to rule out) ---
  const gl = await p.evaluate(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('webgl2');
    if (!g) return { webgl2: false };
    const dbg = g.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: true,
      vendor: dbg ? g.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'n/a',
      renderer: dbg ? g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a',
      version: g.getParameter(g.VERSION),
    };
  }).catch(e => ({ err: e.message }));
  log('WEBGL2 CAPABILITY:', JSON.stringify(gl));

  // --- 1. Does the kit global exist? ---
  const kit = await p.evaluate(() => ({
    VisualKit: typeof window.VisualKit,
    mount: window.VisualKit && typeof window.VisualKit.mount,
    version: window.VisualKit && window.VisualKit.version,
    cfg: typeof window.TOPIC_KI_VISUAL,
  }));
  log('KIT GLOBAL:', JSON.stringify(kit));

  // --- 2. Is the viz TAB present, and only for the opted-in topic? ---
  await p.evaluate(() => { window.location.hash = '#kafka-internals/walk'; });
  await p.waitForTimeout(600);
  const tabOnKI = await p.evaluate(() => {
    const b = document.querySelector('button[data-tab="viz"]');
    return b ? { exists: true, hidden: b.hidden, text: b.textContent.trim() } : { exists: false };
  });
  log('VIZ TAB on kafka-internals:', JSON.stringify(tabOnKI));

  // --- 3. Navigate to the viz pane ---
  await p.evaluate(() => { window.location.hash = '#kafka-internals/viz'; });
  await p.waitForTimeout(2500);

  const mounted = await p.evaluate(() => {
    const inst = window.__VIZ;
    const canvases = window.__deep('canvas').map(c => ({
      w: c.width, h: c.height,
      cw: Math.round(c.getBoundingClientRect().width),
      ch: Math.round(c.getBoundingClientRect().height),
    }));
    return {
      instExists: !!inst,
      hasFrames: !!(inst && inst.frames),
      frames: inst && inst.frames ? inst.frames() : null,
      queues: inst && inst.queues ? inst.queues() : null,
      canvases,
      emptyMsg: (window.__deep('#vzempty')[0] || {}).textContent,
      emptyHidden: (window.__deep('#vzempty')[0] || {}).hidden,
    };
  });
  log('MOUNT STATE:', JSON.stringify(mounted, null, 1));

  await p.screenshot({ path: `${SHOTS}/${label}-desktop-viz.png` });
  log(`shot -> ${label}-desktop-viz.png`);

  // --- 4. ANIMATION: frame counter + pixel diff, 1s apart ---
  const f1 = await p.evaluate(() => (window.__VIZ ? window.__VIZ.frames() : null));
  const q1 = await p.evaluate(() => (window.__VIZ && window.__VIZ.queues ? JSON.stringify(window.__VIZ.queues()) : null));
  const a = await p.screenshot({ path: `${SHOTS}/${label}-anim-A.png` });
  await p.waitForTimeout(1000);
  const f2 = await p.evaluate(() => (window.__VIZ ? window.__VIZ.frames() : null));
  const q2 = await p.evaluate(() => (window.__VIZ && window.__VIZ.queues ? JSON.stringify(window.__VIZ.queues()) : null));
  const bshot = await p.screenshot({ path: `${SHOTS}/${label}-anim-B.png` });

  const pixelsDiffer = Buffer.compare(a, bshot) !== 0;
  log(`ANIMATION: frames ${f1} -> ${f2} (delta ${f2 - f1}) | pixels differ over 1s: ${pixelsDiffer}`);
  log(`  queues t0: ${q1}`);
  log(`  queues t1: ${q2}`);
  log(`  sim state changed: ${q1 !== q2}`);

  // --- 5. CONTROLS: discover the real control DOM ---
  const controls = await p.evaluate(() => {
    const host = window.__deep('#vzhost')[0];
    if (!host) return { host: false };
    const ctl = [];
    host.querySelectorAll('button,input,select').forEach(n => ctl.push({
      tag: n.tagName.toLowerCase(), type: n.type || null,
      label: (n.textContent || n.value || n.id || '').toString().trim().slice(0, 40),
      id: n.id || null, min: n.min || null, max: n.max || null, value: n.value || null,
      h: Math.round(n.getBoundingClientRect().height),
      w: Math.round(n.getBoundingClientRect().width),
    }));
    return { host: true, html: host.innerHTML.length, controls: ctl };
  });
  log('CONTROLS:', JSON.stringify(controls, null, 1));

  await b.close();
  return { gl, kit, tabOnKI, mounted, anim: { f1, f2, pixelsDiffer, q1, q2 }, controls };
}

const r = await run('headless', { headless: true });
fs.writeFileSync(`${SHOTS}/../../scripts/_probe1.json`, JSON.stringify({ r, errors }, null, 2));
log('\n=== CONSOLE/PAGE ERRORS TOTAL:', errors.length, '===');
errors.forEach(e => log(' !', e));
