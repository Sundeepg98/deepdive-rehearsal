import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-desktop';
const b = await chromium.launch();

// A: no reducedMotion, no scrollIntoView -- the config that rendered fine before
const p1 = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p1.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p1.waitForTimeout(1200);
await p1.keyboard.press('Escape');
await p1.waitForTimeout(600);
console.log('A (normal motion):', JSON.stringify(await p1.evaluate(() => ({
  scrollY: window.scrollY,
  paneOn: document.querySelector('.pane.on')?.id,
  paneRect: (r => ({ top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }))(document.querySelector('.pane.on').getBoundingClientRect()),
  sidebarVisible: getComputedStyle(document.querySelector('.sidebar')).display,
  stageH: Math.round(document.querySelector('.stage').getBoundingClientRect().height),
  numHostH: Math.round(document.querySelector('deep-numbers').getBoundingClientRect().height)
}))));
await p1.screenshot({ path: SHOTS + '/num-1280-storage-engines-CLIPPED.png' });

// B: with reducedMotion -- did that blank it?
const p2 = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p2.goto(URL + '#storage-engines/num', { waitUntil: 'load' });
await p2.waitForTimeout(1200);
await p2.keyboard.press('Escape');
await p2.waitForTimeout(600);
console.log('B (reduced motion):', JSON.stringify(await p2.evaluate(() => ({
  scrollY: window.scrollY,
  paneOn: document.querySelector('.pane.on')?.id,
  paneRect: (r => ({ top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) }))(document.querySelector('.pane.on').getBoundingClientRect()),
  paneOpacity: getComputedStyle(document.querySelector('.pane.on')).opacity,
  sidebarOpacity: getComputedStyle(document.querySelector('.sidebar')).opacity,
  stageH: Math.round(document.querySelector('.stage').getBoundingClientRect().height)
}))));
await p2.screenshot({ path: SHOTS + '/_debug-reducedmotion.png' });
await b.close();
