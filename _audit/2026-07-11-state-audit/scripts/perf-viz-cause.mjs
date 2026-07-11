// Root-cause the viz leak: who retains the GL context?
//  H1: a new <deep-visual> per mount, each adding a permanent window 'routechange' listener (visual-pane.js:21)
//  H2: VisualKit dispose() doesn't release the GL context
//  H3: dispose() throws and is swallowed by the empty catch (visual-pane.js:53)
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2200);

await p.evaluate(() => {
  window.__ctor = 0; window.__routeListeners = 0; window.__disposeCalls = 0; window.__disposeThrew = 0; window.__gl = 0;
  // count window 'routechange' listeners
  const add = window.addEventListener.bind(window);
  window.addEventListener = function (t, f, o) { if (t === 'routechange') window.__routeListeners++; return add(t, f, o); };
  const rm = window.removeEventListener.bind(window);
  window.removeEventListener = function (t, f, o) { if (t === 'routechange') window.__routeListeners--; return rm(t, f, o); };
  // count GL contexts
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) { if (/webgl/i.test(t)) window.__gl++; return gc.call(this, t, ...a); };
  // wrap VisualKit.mount to observe the instance + its dispose
  const VK = window.VisualKit;
  if (VK && VK.mount) {
    const om = VK.mount.bind(VK);
    VK.mount = function (host, data) {
      window.__ctor++;
      const inst = om(host, data);
      const od = inst.dispose && inst.dispose.bind(inst);
      inst.dispose = function () {
        window.__disposeCalls++;
        try { return od && od(); }
        catch (e) { window.__disposeThrew++; console.log('DISPOSE THREW: ' + e.message); throw e; }
      };
      return inst;
    };
  }
});

await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(900);

const read = () => p.evaluate(() => ({
  mounts: window.__ctor, disposeCalls: window.__disposeCalls, disposeThrew: window.__disposeThrew,
  routeListeners: window.__routeListeners, gl: window.__gl,
  deepVisualEls: document.querySelectorAll('deep-visual').length,
}));

console.log('=== viz open/close x6, instrumented ===');
console.log('cycle'.padStart(5), 'VK.mount'.padStart(9), 'dispose()'.padStart(10), 'threw'.padStart(6), 'routeLstnrs'.padStart(12), 'glCtx'.padStart(6), '<deep-visual>'.padStart(14));
console.log(String(0).padStart(5), JSON.stringify(await read()));
for (let i = 1; i <= 6; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
  await p.waitForTimeout(500);
  const r = await read();
  console.log(String(i).padStart(5), String(r.mounts).padStart(9), String(r.disposeCalls).padStart(10), String(r.disposeThrew).padStart(6), String(r.routeListeners).padStart(12), String(r.gl).padStart(6), String(r.deepVisualEls).padStart(14));
}

console.log('\n=== TOPIC SWITCH while on viz (the other path) ===');
for (let i = 0; i < 3; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const t = ['caching', 'saga', 'replication'][Math.floor(Math.random() * 3)]; document.querySelector(`[data-topic="${t}"]`)?.click(); });
  await p.waitForTimeout(900);
  console.log('after topic-switch-while-on-viz:', JSON.stringify(await read()));
}

console.log('\n=== INTERPRETATION ===');
const f = await read();
console.log('VisualKit.mount() calls :', f.mounts);
console.log('inst.dispose() calls    :', f.disposeCalls, f.disposeCalls === f.mounts ? '(dispose IS being called for every mount)' : '(MISMATCH -> some mounts never disposed)');
console.log('dispose() threw         :', f.disposeThrew);
console.log('live GL contexts created:', f.gl);
console.log('window routechange lstnr:', f.routeListeners, '<- never removed => every <deep-visual> ever created is retained');
console.log('<deep-visual> in light DOM:', f.deepVisualEls);
await b.close();
