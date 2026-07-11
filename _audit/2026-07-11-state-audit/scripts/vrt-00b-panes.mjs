import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);

console.log('--- globals with Router-ish names ---');
console.log(await p.evaluate(() => Object.keys(window).filter(k => /rout|view|pane|nav/i.test(k)).slice(0, 30)));

console.log('\n--- all .pane elements (default #walk) ---');
console.log(await p.evaluate(() => [...document.querySelectorAll('.pane')].map(x => ({ id: x.id, cls: x.className, disp: getComputedStyle(x).display }))));

// Click the sys tab like a real user
await p.click('.sidebar .seg button[data-tab="sys"]');
await p.waitForTimeout(700);
console.log('\n--- after clicking sys tab ---');
console.log('hash:', await p.evaluate(() => location.hash));
console.log(await p.evaluate(() => [...document.querySelectorAll('.pane')].map(x => ({ id: x.id, cls: x.className, disp: getComputedStyle(x).display, npiv: x.querySelectorAll('.piv').length }))));

// deep-link test
await p.goto(URL + '#caching/sys', { waitUntil: 'load' });
await p.waitForTimeout(1000);
console.log('\n--- after goto #caching/sys ---');
console.log('hash:', await p.evaluate(() => location.hash));
console.log('current topic:', await p.evaluate(() => window.TopicRegistry.current()?.id));
console.log(await p.evaluate(() => {
  const on = [...document.querySelectorAll('.pane')].filter(x => getComputedStyle(x).display !== 'none');
  return on.map(x => ({ id: x.id, cls: x.className, npiv: x.querySelectorAll('.piv').length, nchip: x.querySelectorAll('.piv .chip').length }));
}));
await b.close();
