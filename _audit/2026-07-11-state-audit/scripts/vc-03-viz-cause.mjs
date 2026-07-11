/* rt-console VERIFY 03 — CAUSAL test of FINDING 1's root cause.
   Claim: the mount runs while #viz is still display:none, because shell.js hands the
   `.on` class swap to ViewTransitions.run() -> document.startViewTransition() (async),
   while visual-pane mounts synchronously on the DOM `routechange`.

   Test 1: Proxy-intercept VisualKit.mount (its `mount` is a NON-CONFIGURABLE getter,
           so plain monkey-patching silently no-ops) and record host geometry + pane
           display AT THE MOMENT OF MOUNT.
   Test 2: force prefers-reduced-motion:reduce -> ViewTransitions.run() falls back to a
           SYNCHRONOUS apply() (view-transitions.js:24,36). If the canvas then sizes
           correctly, the startViewTransition deferral IS the cause. If it stays 0x0,
           the stated root cause is WRONG.
*/
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
    // kit's mount is defined via Object.defineProperty(obj,'mount',{get,enumerable})
    // => non-configurable accessor. Assignment no-ops. Use a Proxy instead.
    _VK = new Proxy(v, {
      get(t, k) {
        if (k === 'mount') {
          return function (host, data) {
            const pane = document.getElementById('viz');
            window.__M.push({
              when: +performance.now().toFixed(1),
              hostClient: host.clientWidth + 'x' + host.clientHeight,
              paneDisplay: getComputedStyle(pane).display,
              paneHasOnClass: pane.classList.contains('on'),
              paneOnAtThatMoment: (document.querySelector('.pane.on') || {}).id || null,
              inViewTransition: !!document.documentElement.matches(':has(*)') && undefined,
            });
            return t.mount(host, data);
          };
        }
        return t[k];
      }
    });
  }
});
window.__vtUsed = null;
`;

function measure() {
  const dv = document.querySelector('deep-visual');
  const r = dv && dv.shadowRoot;
  const c = r && r.querySelector('canvas');
  const host = r && r.getElementById('vzhost');
  if (!c) return { canvas: 'NONE', mounts: window.__M };
  let db = 'n/a';
  try { const gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl) db = gl.drawingBufferWidth + 'x' + gl.drawingBufferHeight; } catch (e) { db = 'ERR'; }
  const rect = c.getBoundingClientRect();
  return {
    canvasAttr: c.width + 'x' + c.height,
    canvasCSS: Math.round(rect.width) + 'x' + Math.round(rect.height),
    drawBuf: db,
    hostH: host.clientHeight,
    paneH: document.getElementById('viz').offsetHeight,
    hasStartVT: typeof document.startViewTransition === 'function',
    reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches,
    mounts: window.__M,
  };
}

const b = await chromium.launch();

for (const rm of ['no-preference', 'reduce']) {
  console.log(`\n############ prefers-reduced-motion: ${rm} ############`);
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: rm === 'reduce' ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(HOOK);
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE:' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR:' + e.message));

  await p.goto(URL + '#kafka-internals/walk', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.click('.seg button[data-tab="viz"]');
  await p.waitForTimeout(2800);

  const m = await p.evaluate(measure);
  console.log(JSON.stringify(m, null, 2));
  await p.screenshot({ path: `${S}/vc-cause-${rm}.png` });
  console.log('errors:', errs.length ? errs : 'none');
  await ctx.close();
}

await b.close();
