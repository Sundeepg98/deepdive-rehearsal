/* kb-04: confirm the one surviving tab-order inversion and name its mechanism.
   Claim under test: the .seg pane-switcher (the app's PRIMARY navigation — all 9 panes) is
   painted at the TOP of the sidebar but comes LAST in the DOM, so a keyboard user reaches it
   only after 24 other controls. If true, the cause must be visible in CSS (flex `order`), and
   the fix is one line. Measure DOM index, computed order, and painted rect together. */
import { open, inject, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const { browser, page } = await open();
await inject(page);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const r = await page.evaluate(() => {
  const side = document.querySelector('aside.sidebar');
  const kids = [...side.children];
  const s = getComputedStyle(side);
  return {
    sidebarDisplay: s.display, sidebarFlexDir: s.flexDirection,
    children: kids.map((el, i) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        domIndex: i,
        cls: el.className || el.tagName.toLowerCase(),
        order: cs.order, position: cs.position,
        top: Math.round(rect.top), bottom: Math.round(rect.bottom),
        controls: el.querySelectorAll('button,a[href],input').length
      };
    })
  };
});
console.log(`sidebar: display=${r.sidebarDisplay} flex-direction=${r.sidebarFlexDir}\n`);
console.log('DOM idx | order | position | painted top..bottom | #controls | class');
r.children.forEach(c => {
  console.log(`   ${String(c.domIndex).padStart(2)}   |  ${c.order.padStart(3)}  | ${c.position.padEnd(8)} | ${String(c.top).padStart(5)}..${String(c.bottom).padEnd(5)}   |    ${String(c.controls).padStart(2)}     | ${c.cls}`);
});

/* the inversion, stated numerically: painted order vs DOM order */
const painted = [...r.children].sort((a, b) => a.top - b.top).map(c => c.cls);
const dom = r.children.map(c => c.cls);
console.log(`\nPAINTED (visual, top->bottom): ${painted.join('  ->  ')}`);
console.log(`DOM     (= TAB order):         ${dom.join('  ->  ')}`);
const matches = painted.every((c, i) => c === dom[i]);
console.log(`\nvisual order == tab order? ${matches ? 'YES' : 'NO  <-- WCAG 2.4.3 Focus Order violation'}`);

/* how deep is the pane switcher for a keyboard user? */
const depth = await page.evaluate(() => {
  const all = window.__kb.all();
  const firstSeg = all.findIndex(e => e.closest && e.closest('.seg'));
  return { totalBefore: firstSeg, firstSegLabel: window.__kb.label(all[firstSeg]) };
});
console.log(`\nTab presses to reach the FIRST pane button ("${depth.firstSegLabel.slice(0, 24)}"): ${depth.totalBefore + 1}`);
console.log(`Tab presses to reach the LAST pane button:  ${depth.totalBefore + 9}`);

/* proof shot: focus the first seg button, show where the ring is vs where the sidebar starts */
fs.mkdirSync(SHOTS, { recursive: true });
await page.evaluate(() => { document.activeElement.blur(); });
for (let i = 0; i < depth.totalBefore + 1; i++) await page.keyboard.press('Tab');
const who = await page.evaluate(() => window.__kb.label(window.__kb.deepActive()));
console.log(`\nafter ${depth.totalBefore + 1} Tabs, focus is on: "${who.slice(0, 30)}"`);
await page.screenshot({ path: `${SHOTS}/order-01-seg-reached-at-stop25.png`, clip: { x: 0, y: 0, width: 300, height: 960 } });
console.log(`shot: order-01-seg-reached-at-stop25.png`);

await browser.close();
