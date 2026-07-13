/* kb-21: shortcut CONFLICT check.
   Two document-level listeners both answer to "p", neither calls stopPropagation:
     cram-sheet.js:16  keydown -> if (cramov.open && e.key.toLowerCase()==='p') { preventDefault(); window.print(); }
     print-qa.js:59    keydown -> if ((metaKey||ctrlKey) && (e.key==='p')) { preventDefault(); openPrint(); }  // opens a popup window
   For Ctrl+P, event.key IS 'p'. So with the cram sheet open, Ctrl+P should satisfy BOTH — firing
   the printable-Q&A popup AND a raw window.print() of the cram sheet. Also: the bare "p" print is
   not in the '?' panel, and the shell's "suppress shortcuts while a dialog is open" guard does not
   cover it, because cram-sheet registers its own listener. */
import { open, inject } from './kb-lib.mjs';

const { browser, page, ctx } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

/* count window.print() calls without actually printing */
await page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
const prints = () => page.evaluate(() => window.__prints);
const pages = () => ctx.pages().length;

console.log('=== bare "p" with NO overlay open (should do nothing) ===');
await page.keyboard.press('p');
await page.waitForTimeout(400);
console.log(`  window.print() calls: ${await prints()}   popups: ${pages() - 2}`);

console.log('\n=== open the Cram sheet, then press bare "p" ===');
await page.evaluate(() => document.getElementById('cramopen').click());
await page.waitForTimeout(700);
const cramOpen = await page.evaluate(() => document.getElementById('cramov').classList.contains('open'));
console.log(`  cram sheet open: ${cramOpen}`);
await page.keyboard.press('p');
await page.waitForTimeout(500);
console.log(`  window.print() calls: ${await prints()}   <-- an undocumented key: "p" prints while the cram sheet is open`);

console.log('\n=== with the Cram sheet still open, press Ctrl+P ===');
const before = await prints(), pBefore = pages();
await page.keyboard.press('Control+p');
await page.waitForTimeout(900);
const after = await prints(), pAfter = pages();
console.log(`  window.print() calls: ${before} -> ${after}   (cram-sheet.js handler)`);
console.log(`  popup windows      : ${pBefore - 2} -> ${pAfter - 2}   (print-qa.js handler)`);
const both = (after > before) && (pAfter > pBefore);
console.log(`\n  ${both ? '*** CONFLICT: ONE keypress fired BOTH print paths — a popup Q&A window AND a raw print of the cram sheet. ***' : '  only one path fired'}`);

console.log(`\npageerrors: ${page.__errs.length}`);
await browser.close();
