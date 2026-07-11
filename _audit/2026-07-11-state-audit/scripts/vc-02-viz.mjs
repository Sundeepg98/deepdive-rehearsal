/* rt-console VERIFY 02 — independently re-check FINDING 1 (0x0 canvas in the viz pane).
   Instruments VisualKit.mount to capture the HOST geometry AT MOUNT TIME, so the
   "mounts while the pane is still display:none" claim is tested, not assumed. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';

const HOOK = `
window.__M = [];
let _VK;
Object.defineProperty(window, 'VisualKit', {
  configurable: true,
  get() { return _VK; },
  set(v) {
    _VK = v;
    if (v && typeof v.mount === 'function' && !v.__wrapped) {
      const orig = v.mount;
      v.mount = function (host, data) {
        const pane = document.getElementById('viz');
        window.__M.push({
          when: +performance.now().toFixed(1),
          hostW: host.clientWidth, hostH: host.clientHeight,
          hostRect: [host.getBoundingClientRect().width, host.getBoundingClientRect().height],
          paneDisplay: getComputedStyle(pane).display,
          paneHasOn: pane.classList.contains('on'),
          paneOnNow: (document.querySelector('.pane.on') || {}).id,
          readyState: document.readyState,
        });
        return orig.apply(this, arguments);
      };
      v.__wrapped = true;
    }
  }
});
`;

function measure() {
  return {
    hash: location.hash,
    topic: TopicRegistry.current().id,
    paneOn: (document.querySelector('.pane.on') || {}).id,
    vizInst: !!window.__VIZ,
    ...(() => {
      const dv = document.querySelector('deep-visual');
      const r = dv && dv.shadowRoot;
      const host = r && r.getElementById('vzhost');
      const empty = r && r.getElementById('vzempty');
      const c = r && r.querySelector('canvas');
      if (!c) return { canvas: 'NONE', hostH: host ? host.clientHeight : null, emptyShown: empty ? !empty.hidden : null };
      let gl = null, db = 'n/a';
      try { gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl) db = gl.drawingBufferWidth + 'x' + gl.drawingBufferHeight; } catch (e) { db = 'ERR:' + e.message; }
      const rect = c.getBoundingClientRect();
      return {
        canvasAttr: c.width + 'x' + c.height,
        canvasCSS: Math.round(rect.width) + 'x' + Math.round(rect.height),
        drawBuf: db,
        hostH: host.clientHeight,
        hostW: host.clientWidth,
        paneH: document.getElementById('viz').offsetHeight,
        emptyShown: empty ? !empty.hidden : null,
      };
    })(),
    mounts: window.__M,
  };
}

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(HOOK);
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));

await p.goto(URL + '#kafka-internals/walk', { waitUntil: 'load' });
await p.waitForTimeout(900);

// Control: does WebGL work at all in this browser?
const control = await p.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 200;
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { webgl: false };
  return { webgl: true, drawBuf: gl.drawingBufferWidth + 'x' + gl.drawingBufferHeight, renderer: gl.getParameter(gl.RENDERER) };
});
console.log('CONTROL WEBGL:', JSON.stringify(control));

// Is the Visualize tab visible on kafka-internals?
const tab = await p.evaluate(() => {
  const btn = document.querySelector('.seg button[data-tab="viz"]');
  return { exists: !!btn, hidden: btn ? btn.hidden : null, display: btn ? getComputedStyle(btn).display : null };
});
console.log('VIZ TAB (kafka-internals):', JSON.stringify(tab));

console.log('\n--- A: click the Visualize tab ---');
await p.click('.seg button[data-tab="viz"]');
await p.waitForTimeout(3000);
let A = await p.evaluate(measure);
console.log(JSON.stringify(A, null, 2));
await p.screenshot({ path: S + '/vc-A-viz-after-click.png' });
await p.locator('#viz').screenshot({ path: S + '/vc-A-viz-pane-only.png' }).catch(e => console.log('pane shot fail', e.message));

console.log('\n--- B: resize the window ---');
await p.setViewportSize({ width: 1281, height: 901 });
await p.waitForTimeout(1600);
let B = await p.evaluate(measure);
console.log(JSON.stringify({ ...B, mounts: undefined }, null, 2));
await p.screenshot({ path: S + '/vc-B-viz-after-resize.png' });
await p.locator('#viz').screenshot({ path: S + '/vc-B-viz-pane-only.png' }).catch(() => {});

console.log('\n--- C: leave to walk, re-enter viz ---');
await p.click('.seg button[data-tab="walk"]');
await p.waitForTimeout(600);
await p.click('.seg button[data-tab="viz"]');
await p.waitForTimeout(2500);
let C = await p.evaluate(measure);
console.log(JSON.stringify(C, null, 2));
await p.screenshot({ path: S + '/vc-C-viz-after-reentry.png' });

console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
