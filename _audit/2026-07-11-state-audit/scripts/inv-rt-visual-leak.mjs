// MISSED-FINDING HUNT: scene.js:98 adds a window 'resize' listener that kit.js
// dispose() (147-152) never removes. Count the listeners across mount/unmount
// cycles via CDP, and watch for WebGL context exhaustion (a WARNING, not an
// error -- which is why an error-only listener would never see it).
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();

const msgs = [];               // EVERY console message, not just errors
p.on('console', (m) => msgs.push({ type: m.type(), text: m.text() }));
p.on('pageerror', (e) => msgs.push({ type: 'pageerror', text: e.message }));

const cdp = await ctx.newCDPSession(p);
await cdp.send('Runtime.enable');

async function resizeListenerCount() {
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'window', objectGroup: 'probe' });
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  return listeners.filter((l) => l.type === 'resize').length;
}

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.keyboard.press('Escape').catch(() => {});
await p.waitForTimeout(200);
await p.evaluate(() => {
  const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals'));
  if (it) it.click();
});
await p.waitForTimeout(700);

const out = { cycles: [] };
out.baselineResizeListeners = await resizeListenerCount();

// N cycles of viz -> walk (mount -> dispose)
const N = 18;
for (let i = 1; i <= N; i++) {
  await p.evaluate(() => window.goView('viz'));
  await p.waitForTimeout(450);
  await p.evaluate(() => window.goView('walk'));
  await p.waitForTimeout(250);
  if (i === 1 || i === 5 || i === 10 || i === N) {
    const heap = await p.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null));
    out.cycles.push({ cycle: i, resizeListeners: await resizeListenerCount(), heapMB: heap ? +(heap / 1048576).toFixed(1) : null });
  }
}

// Does a window resize AFTER dispose still hit the dead closure? (we are on walk,
// the kit is disposed; if the listener leaked, resize() runs on a disposed renderer)
const errBefore = msgs.length;
await p.evaluate(() => window.dispatchEvent(new Event('resize')));
await p.waitForTimeout(600);
out.errorsFromPostDisposeResize = msgs.slice(errBefore);

out.webglWarnings = msgs.filter((m) => /webgl|context/i.test(m.text));
out.allErrors = msgs.filter((m) => m.type === 'error' || m.type === 'pageerror');
out.allWarnings = msgs.filter((m) => m.type === 'warning');
out.msgCount = msgs.length;

console.log(JSON.stringify(out, null, 2));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/inv-leak-results.json', JSON.stringify(out, null, 2));
await b.close();
