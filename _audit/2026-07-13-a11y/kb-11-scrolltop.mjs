/* kb-11: characterise the one INVISIBLE control. #scrolltop is hidden with opacity:0 +
   pointer-events:none (styles.css:794) and revealed with .show (:795). Neither state uses
   visibility/display/inert/tabindex=-1, so the button is removed from the MOUSE (pointer-events:
   none) but NOT from the KEYBOARD. Prove: (a) at page top it is focusable and paints nothing;
   (b) once scrolled past 400px it is visible and does paint a ring — i.e. the ring is fine, the
   bug is that it is tabbable while invisible. */
import { open, inject, pxdiff, shotBox, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

const state = () => page.evaluate(() => {
  const b = document.getElementById('scrolltop');
  const s = getComputedStyle(b);
  return {
    scrollY: Math.round(window.pageYOffset),
    hasShow: b.classList.contains('show'),
    opacity: s.opacity, visibility: s.visibility, display: s.display, pointerEvents: s.pointerEvents,
    tabindex: b.getAttribute('tabindex'), inert: b.hasAttribute('inert'), ariaHidden: b.getAttribute('aria-hidden'),
    tabbable: window.__kb.tabbable(b),
    inTabOrder: !b.disabled && b.getAttribute('tabindex') !== '-1'
  };
});

async function ringOf() {
  const el = await page.$('#scrolltop');
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(200);
  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const b = await shotBox(page, rect, 16);
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(250);
  const a = await shotBox(page, rect, 16);
  const d = await pxdiff(page, b, a, 8);
  return { rect, changed: d.changed };
}

console.log('=== STATE A: page at top (the state every topic/pane loads in) ===');
const A = await state();
console.log(' ', JSON.stringify(A, null, 1).replace(/\n/g, '\n  '));
const ringA = await ringOf();
console.log(`  focus ring painted: ${ringA.changed} px  <-- ${ringA.changed === 0 ? 'NOTHING. Focus is invisible.' : 'visible'}`);
await page.screenshot({ path: `${SHOTS}/scrolltop-01-focused-but-invisible.png` });

/* can the keyboard actually LAND on it by tabbing? (not just by scripted focus) */
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
let hit = -1;
for (let i = 1; i <= 60; i++) {
  await page.keyboard.press('Tab');
  const id = await page.evaluate(() => { const e = window.__kb.deepActive(); return e ? e.id : ''; });
  if (id === 'scrolltop') { hit = i; break; }
}
console.log(`\n  reached by pressing Tab ${hit} times from the top of the page: ${hit > 0 ? 'YES' : 'no'}`);
const whatUserSees = await page.evaluate(() => {
  const e = window.__kb.deepActive();
  const s = getComputedStyle(e);
  return { focused: e.id, opacity: s.opacity, matchesFocusVisible: e.matches(':focus-visible') };
});
console.log(`  while focused: ${JSON.stringify(whatUserSees)}`);
console.log(`  => the browser considers it focused and :focus-visible, and paints an outline it has told the compositor is 0% opaque.`);

console.log('\n=== STATE B: scrolled past the 400px threshold ===');
await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
await page.waitForTimeout(700);
const B = await state();
console.log(' ', JSON.stringify(B, null, 1).replace(/\n/g, '\n  '));
const ringB = await ringOf();
console.log(`  focus ring painted: ${ringB.changed} px  <-- ${ringB.changed > 0 ? 'visible (the ring itself is fine)' : 'still nothing'}`);
await page.screenshot({ path: `${SHOTS}/scrolltop-02-visible-when-scrolled.png`, clip: { x: Math.max(0, ringB.rect.x - 40), y: Math.max(0, ringB.rect.y - 40), width: 130, height: 130 } });

console.log('\n=== VERDICT ===');
console.log(`  at top     : tabbable=${A.tabbable} opacity=${A.opacity} pointer-events=${A.pointerEvents} -> ring ${ringA.changed}px`);
console.log(`  scrolled   : tabbable=${B.tabbable} opacity=${B.opacity} pointer-events=${B.pointerEvents} -> ring ${ringB.changed}px`);
console.log(`  The button is unreachable BY MOUSE when hidden (pointer-events:none) but remains`);
console.log(`  reachable BY KEYBOARD in exactly that state. Focus vanishes for one Tab stop.`);
await browser.close();
