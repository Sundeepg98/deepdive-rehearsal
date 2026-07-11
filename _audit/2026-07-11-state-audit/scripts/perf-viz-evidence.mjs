// Clean visual evidence: viz working (1st open) vs after the WebGL context cap is blown.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const lost = [];
p.on('console', m => { if (/too many active webgl/i.test(m.text())) lost.push(m.text()); });

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2200);

// open the topic, then CLOSE the index overlay
await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(700);
await p.evaluate(() => {
  const ov = document.querySelector('#_index-overlay');
  if (ov) { ov.classList.remove('open', 'vis'); ov.hidden = true; ov.style.display = 'none'; }
});
await p.waitForTimeout(300);

// count live contexts + detect a lost one by probing isContextLost()
await p.evaluate(() => {
  window.__canvases = [];
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) {
    const c = gc.call(this, t, ...a);
    if (/webgl/i.test(t)) window.__canvases.push(c);
    return c;
  };
});

// ---- open viz: FIRST time (healthy) ----
await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
await p.waitForTimeout(3000);
await p.screenshot({ path: `${SHOTS}/10-viz-open-1-HEALTHY.png` });
const s1 = await p.evaluate(() => ({
  ctxs: window.__canvases.length,
  lost: window.__canvases.filter(c => c && c.isContextLost && c.isContextLost()).length,
}));
console.log('after 1st open :', JSON.stringify(s1));

// ---- churn to 18 opens ----
for (let i = 2; i <= 18; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
  await p.waitForTimeout(220);
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(950);
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${SHOTS}/11-viz-open-18-CONTEXT-LOST.png` });
const s18 = await p.evaluate(() => ({
  ctxs: window.__canvases.length,
  lost: window.__canvases.filter(c => c && c.isContextLost && c.isContextLost()).length,
}));
console.log('after 18th open:', JSON.stringify(s18));
console.log('"Too many active WebGL contexts" warnings:', lost.length);
console.log('\nEVIDENCE: of', s18.ctxs, 'GL contexts created,', s18.lost, 'have been FORCE-LOST by Chrome.');
await b.close();
