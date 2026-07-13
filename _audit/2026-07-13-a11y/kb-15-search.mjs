/* kb-15: #searchopen did not open the Search overlay on Enter, while 9 other overlays did.
   Either (a) my detector has a blind spot, or (b) the Search button is mouse-operable but not
   keyboard-operable — a WCAG 2.1.1 failure and precisely what this lens exists to catch.
   Distinguish by trying, in order: scripted .click(), a real MOUSE click, Enter, Space, and the
   documented "/" shortcut — and after each, ask the DOM directly whether the overlay exists/open. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.evaluate(() => window.switchTab('walk'));
await page.waitForTimeout(300);
fs.mkdirSync(SHOTS, { recursive: true });

const state = () => page.evaluate(() => {
  const el = document.getElementById('_search-overlay');
  const api = window.SearchOverlay;
  return {
    exists: !!el,
    classes: el ? el.className : '-',
    display: el ? getComputedStyle(el).display : '-',
    isOpenAPI: api && api.isOpen ? api.isOpen() : null,
    focused: (() => { const a = window.__kb.deepActive(); return a ? (a.id || a.className || a.tagName) : 'BODY'; })()
  };
});
const reset = async () => { await page.keyboard.press('Escape'); await page.waitForTimeout(300); };

console.log('initial:', JSON.stringify(await state()));

/* how is the button wired at all? */
const wiring = await page.evaluate(() => {
  const b = document.getElementById('searchopen');
  return { tag: b.tagName, type: b.getAttribute('type'), hasOnclick: b.onclick !== null, disabled: b.disabled, tabindex: b.getAttribute('tabindex') };
});
console.log('#searchopen wiring:', JSON.stringify(wiring));

console.log('\n--- 1. scripted .click() ---');
await page.evaluate(() => document.getElementById('searchopen').click());
await page.waitForTimeout(600);
console.log('   ', JSON.stringify(await state()));
await reset();

console.log('\n--- 2. real MOUSE click ---');
await page.click('#searchopen');
await page.waitForTimeout(600);
const mouse = await state();
console.log('   ', JSON.stringify(mouse));
await reset();

console.log('\n--- 3. keyboard: focus #searchopen, press Enter ---');
await page.evaluate(() => document.getElementById('searchopen').focus());
await page.waitForTimeout(150);
const focusedOn = await page.evaluate(() => window.__kb.deepActive().id);
console.log(`    focus is on: #${focusedOn}`);
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
const kEnter = await state();
console.log('   ', JSON.stringify(kEnter));
await page.screenshot({ path: `${SHOTS}/search-01-after-enter.png` });
await reset();

console.log('\n--- 4. keyboard: focus #searchopen, press Space ---');
await page.evaluate(() => document.getElementById('searchopen').focus());
await page.keyboard.press('Space');
await page.waitForTimeout(700);
const kSpace = await state();
console.log('   ', JSON.stringify(kSpace));
await reset();

console.log('\n--- 5. the documented "/" shortcut ---');
await page.evaluate(() => { document.activeElement.blur(); });
await page.keyboard.press('/');
await page.waitForTimeout(700);
const slash = await state();
console.log('   ', JSON.stringify(slash));
await page.screenshot({ path: `${SHOTS}/search-02-after-slash.png` });

console.log('\n=== VERDICT ===');
console.log(`  mouse click opens it : ${mouse.isOpenAPI === true || mouse.classes.includes('open')}`);
console.log(`  Enter  opens it      : ${kEnter.isOpenAPI === true || kEnter.classes.includes('open')}`);
console.log(`  Space  opens it      : ${kSpace.isOpenAPI === true || kSpace.classes.includes('open')}`);
console.log(`  "/"    opens it      : ${slash.isOpenAPI === true || slash.classes.includes('open')}`);
await browser.close();
