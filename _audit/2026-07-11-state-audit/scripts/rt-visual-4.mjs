/* Probe 4: re-entry, interactivity, mobile. Does the bug persist on a realistic flow? */
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-visual-trainer';
const APP = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const log = (...a) => console.log(...a);
const DEEP = `window.__deep=function(sel){const out=[];(function walk(root){try{root.querySelectorAll(sel).forEach(n=>out.push(n));}catch(e){}try{root.querySelectorAll('*').forEach(n=>{if(n.shadowRoot)walk(n.shadowRoot);});}catch(e){}})(document);return out;};`;
const M = () => { const c = window.__deep('canvas')[0]; if (!c) return { none: true }; const r = c.getBoundingClientRect(); return { buf: [c.width, c.height], css: [Math.round(r.width), Math.round(r.height)] }; };

const b = await chromium.launch({ headless: true });

/* ---- 1. RE-ENTRY: viz -> walk -> viz (does a return visit size correctly?) ---- */
log('==== 1. RE-ENTRY FLOW ====');
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(APP, { waitUntil: 'load' }); await p.evaluate(DEEP);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.evaluate(() => { window.location.hash = '#kafka-internals/viz'; }); await p.waitForTimeout(2000);
log('first entry      :', JSON.stringify(await p.evaluate(M)));
await p.evaluate(() => { window.location.hash = '#kafka-internals/walk'; }); await p.waitForTimeout(800);
await p.evaluate(() => { window.location.hash = '#kafka-internals/viz'; }); await p.waitForTimeout(2000);
log('RE-entry (2nd)   :', JSON.stringify(await p.evaluate(M)), '<- still broken? then it is 100% of visits');

/* ---- 2. INTERACTIVITY (after a resize rescue, do controls drive the sim?) ---- */
log('\n==== 2. CONTROLS (post-rescue) ====');
await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await p.waitForTimeout(800);
log('after rescue     :', JSON.stringify(await p.evaluate(M)));

const readHud = () => {
  const h = window.__deep('.vz')[0];
  return h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 130) : null;
};
log('HUD t0:', await p.evaluate(readHud));

// slider: set Consumers (2nd range) higher, dispatch input
const sliderWorks = await p.evaluate(() => {
  const rs = window.__deep('input[type=range]');
  if (rs.length < 2) return 'no sliders';
  const before = rs[1].value;
  rs[1].value = '8';
  rs[1].dispatchEvent(new Event('input', { bubbles: true }));
  return { movedFrom: before, to: rs[1].value };
});
await p.waitForTimeout(1200);
log('slider (consumers) ->', JSON.stringify(sliderWorks));
log('HUD after slider:', await p.evaluate(readHud));
await p.screenshot({ path: `${SHOTS}/interact-slider-8consumers.png` });

// story button
const storyBtn = p.locator('button:has-text("Spike, then scale out")').first();
const hasStory = await storyBtn.count();
if (hasStory) {
  await storyBtn.click({ force: true });
  await p.waitForTimeout(1800);
  const cap = await p.evaluate(() => { const c = window.__deep('#caption')[0]; return c ? { shown: getComputedStyle(c).display !== 'none', text: c.textContent.trim().slice(0, 90) } : null; });
  log('story mode caption:', JSON.stringify(cap));
  await p.screenshot({ path: `${SHOTS}/interact-story-running.png` });
}
await p.close();

/* ---- 3. MOBILE 390 ---- */
log('\n==== 3. MOBILE 390 ====');
const m = await b.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(APP, { waitUntil: 'load' }); await m.evaluate(DEEP);
await m.keyboard.press('Escape'); await m.waitForTimeout(300);
await m.evaluate(() => { window.location.hash = '#kafka-internals/viz'; }); await m.waitForTimeout(2200);
log('mobile as-shipped:', JSON.stringify(await m.evaluate(M)));
await m.screenshot({ path: `${SHOTS}/mobile390-asshipped.png` });
await m.evaluate(() => window.dispatchEvent(new Event('resize'))); await m.waitForTimeout(1200);
log('mobile post-rescue:', JSON.stringify(await m.evaluate(M)));
const of = await m.evaluate(() => ({
  docScrollW: document.documentElement.scrollWidth,
  docClientW: document.documentElement.clientWidth,
  overflowsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  ctlHeights: window.__deep('.vz button,.vz input[type=range]').map(n => Math.round(n.getBoundingClientRect().height)),
}));
log('mobile overflow/controls:', JSON.stringify(of));
await m.screenshot({ path: `${SHOTS}/mobile390-post-rescue.png` });
await b.close();
