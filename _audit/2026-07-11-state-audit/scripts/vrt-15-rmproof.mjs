/* MINIMAL PROOF: under prefers-reduced-motion:reduce the app is blank because
   body{opacity:0} + animation:bodyIn ... forwards  is killed by
   styles.css:137  @media (prefers-reduced-motion:reduce){*{animation:none!important}}
   => adding ONLY `body{opacity:1}` restores the entire app. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SH = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-desktop/';
const b = await chromium.launch();

// fresh load, reduce on from the start (what a real user with "reduce motion" gets)
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2500);
const before = await p.evaluate(() => ({
  bodyOpacity: getComputedStyle(document.body).opacity,
  bodyAnim: getComputedStyle(document.body).animationName,
  bodyFill: getComputedStyle(document.body).animationFillMode,
  matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
  innerTextLen: document.body.innerText.trim().length,
}));
console.log('FRESH LOAD, reduce ON  ->', JSON.stringify(before));
await p.screenshot({ path: SH + 'PROOF-reduce-blank.png' });

await p.addStyleTag({ content: 'body{opacity:1!important}' });
await p.waitForTimeout(600);
const after = await p.evaluate(() => ({ bodyOpacity: getComputedStyle(document.body).opacity }));
console.log('after adding body{opacity:1} ->', JSON.stringify(after));
await p.screenshot({ path: SH + 'PROOF-reduce-fixed-with-body-opacity-1.png' });

// control: same fresh load, motion allowed
const p2 = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
await p2.goto(URL, { waitUntil: 'load' });
await p2.waitForTimeout(2500);
console.log('CONTROL, reduce OFF   ->', JSON.stringify(await p2.evaluate(() => ({
  bodyOpacity: getComputedStyle(document.body).opacity,
  bodyAnim: getComputedStyle(document.body).animationName,
}))));
await p2.screenshot({ path: SH + 'PROOF-normal-renders.png' });
await b.close();
