// Does the viz leak actually BREAK the feature? Chrome force-loses the oldest WebGL context past ~16 live.
// Also: does the rAF render loop keep running after the pane is closed (background CPU burn)?
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/perf';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

const warnings = [];
p.on('console', m => {
  const t = m.text();
  if (/webgl|context|too many|lost/i.test(t)) { warnings.push(`[${m.type()}] ${t}`); console.log(`CONSOLE-${m.type().toUpperCase()}:`, t); }
  else if (m.type() === 'error') console.log('CONSOLE-ERROR:', t);
});
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));

await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelector('[data-topic="kafka-internals"]')?.click());
await p.waitForTimeout(800);

// instrument: count getContext calls + webglcontextlost events + rAF ticks
await p.evaluate(() => {
  window.__gl = 0; window.__lost = 0; window.__raf = 0;
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, ...a) {
    if (/webgl/i.test(t)) {
      window.__gl++;
      this.addEventListener('webglcontextlost', () => { window.__lost++; console.warn('WEBGL CONTEXT LOST on canvas #' + window.__gl); });
    }
    return orig.call(this, t, ...a);
  };
  const oraf = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) { window.__raf++; return oraf.call(window, cb); };
});

console.log('=== OPENING viz 20 TIMES (Chrome live-WebGL-context cap is ~16) ===');
for (let i = 1; i <= 20; i++) {
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1300);
  const st = await p.evaluate(() => ({ gl: window.__gl, lost: window.__lost }));
  await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
  await p.waitForTimeout(350);
  console.log(`cycle ${String(i).padStart(2)}: webglContextsCreated=${st.gl}  contextLostEvents=${st.lost}`);
  if (i === 17 || i === 20) {
    await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${SHOTS}/08-viz-after-${i}-opens.png` });
    await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());
    await p.waitForTimeout(300);
  }
}
const fin = await p.evaluate(() => ({ gl: window.__gl, lost: window.__lost }));
console.log('\nTOTAL webgl contexts created:', fin.gl, ' context-lost events fired:', fin.lost);
console.log('warnings captured:', warnings.length);
warnings.slice(0, 10).forEach(w => console.log('  ', w));

// ---- rAF burn after close ----
console.log('\n=== rAF LOOP AFTER CLOSING viz (background CPU burn?) ===');
await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelector('button[data-tab="walk"]').click());   // close it
await p.waitForTimeout(300);
const a = await p.evaluate(() => window.__raf);
await p.waitForTimeout(3000);                                                          // 3s idle, pane CLOSED
const c = await p.evaluate(() => window.__raf);
console.log('rAF callbacks scheduled while viz CLOSED, over 3s:', c - a, `(~${((c - a) / 3).toFixed(0)}/s)`);
console.log('  -> a still-running render loop would show ~60/s per live scene.');

await b.close();
