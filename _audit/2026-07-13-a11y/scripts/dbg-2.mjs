/* Pin down 4 ambiguities before reporting anything:
 *  (a) are the 9x9 walkthrough dots actually clickable, or just cursor:pointer theatre?
 *  (b) what OCCLUDES the .seg tab buttons (rect 44 tall, tap 37)?
 *  (c) is the search overlay's input really 19px tall?
 *  (d) when the tools sheet is closed (translateY(115%)), are its controls still focusable?
 */
import { launch, phone, installDeep, PHONES } from './lib.mjs';

const b = await launch();
const p = await phone(b, PHONES.p390);
await installDeep(p);

// dismiss first-run index overlay
await p.locator('.ix-card').first().click().catch(() => {});
await p.waitForTimeout(1000);

// (a) dots: real click handler? drive it and see if the step changes.
const dots = await p.evaluate(async () => {
  const host = document.querySelector('deep-walkthrough');
  const root = host.shadowRoot;
  const dotEls = [...root.querySelectorAll('#wdots i')];
  const stepBefore = root.querySelector('#wcard')?.textContent?.trim().slice(0, 50);
  const r = dotEls[0].getBoundingClientRect();
  // click the LAST dot; if dots are wired, the card content must change
  const last = dotEls[dotEls.length - 1];
  last.click();
  await new Promise((res) => setTimeout(res, 400));
  const stepAfter = root.querySelector('#wcard')?.textContent?.trim().slice(0, 50);
  return {
    count: dotEls.length,
    size: `${Math.round(r.width)}x${Math.round(r.height)}`,
    cursor: getComputedStyle(dotEls[0]).cursor,
    tag: dotEls[0].tagName,
    role: dotEls[0].getAttribute('role'),
    tabindex: dotEls[0].getAttribute('tabindex'),
    ariaLabel: dotEls[0].getAttribute('aria-label'),
    stepChangedOnClick: stepBefore !== stepAfter,
    stepBefore, stepAfter,
  };
});
console.log('(a) WALKTHROUGH DOTS:', JSON.stringify(dots, null, 1));

// (b) what occludes a .seg tab button?
const seg = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('.seg button')].find((x) => {
    const r = x.getBoundingClientRect();
    return r.width > 0 && r.left >= 0 && r.right <= innerWidth;
  });
  if (!btn) return 'no fully-visible seg button';
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const probe = (dy) => {
    const el = window.__deepFromPoint(cx, cy + dy);
    return el ? `${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(' ')[0]}` : 'null';
  };
  return {
    rect: `${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.top)}`,
    atCenter: probe(0),
    up: [-14, -18, -20, -21, -22].map((d) => `${d}: ${probe(d)}`),
    down: [14, 18, 20, 21, 22].map((d) => `+${d}: ${probe(d)}`),
    parentOverflow: getComputedStyle(btn.parentElement).overflow,
    parentScrollW: btn.parentElement.scrollWidth,
    parentClientW: btn.parentElement.clientWidth,
  };
});
console.log('\n(b) .seg BUTTON probe:', JSON.stringify(seg, null, 1));

// (c) search overlay input
await p.evaluate(() => document.querySelector('#toolsfab')?.click());
await p.waitForTimeout(450);
await p.evaluate(() => document.querySelector('#searchopen')?.click());
await p.waitForTimeout(900);
const search = await p.evaluate(() => {
  const inp = document.querySelector('#_search-overlay input');
  if (!inp) return 'no input';
  const r = inp.getBoundingClientRect();
  const cs = getComputedStyle(inp);
  return {
    rect: `${r.width.toFixed(1)}x${r.height.toFixed(1)}`,
    fontSize: cs.fontSize, padding: cs.padding, border: cs.borderWidth,
    minHeight: cs.minHeight, height: cs.height, boxSizing: cs.boxSizing,
    lineHeight: cs.lineHeight,
    placeholder: inp.placeholder,
    // 16px is the iOS floor: below it, focusing the field ZOOMS the page
    iosZoomsOnFocus: parseFloat(cs.fontSize) < 16,
  };
});
console.log('\n(c) SEARCH INPUT:', JSON.stringify(search, null, 1));
await p.screenshot({ path: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/shots/mobile/dbg-search-overlay.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// (d) closed tools sheet: still focusable / still in the a11y tree?
const closed = await p.evaluate(() => {
  const mb = document.querySelector('.sidebar .mockbar');
  const cs = getComputedStyle(mb);
  const r = mb.getBoundingClientRect();
  const controls = [...mb.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')];
  return {
    transform: cs.transform,
    rectTop: Math.round(r.top), viewportH: innerHeight,
    offscreen: r.top >= innerHeight,
    inertAttr: mb.hasAttribute('inert') || !!mb.closest('[inert]'),
    ariaHidden: mb.getAttribute('aria-hidden'),
    visibilityHidden: cs.visibility === 'hidden',
    display: cs.display,
    controlCount: controls.length,
    checkVisibilityTrue: controls.filter((c) => c.checkVisibility({ opacityProperty: true, visibilityProperty: true })).length,
  };
});
console.log('\n(d) TOOLS SHEET WHEN CLOSED:', JSON.stringify(closed, null, 1));

// prove it: TAB from the top and see if focus lands inside the closed sheet
const tabWalk = await p.evaluate(async () => {
  document.body.focus();
  const seen = [];
  const active = () => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  };
  return { note: 'tab order captured in node via keyboard', start: active()?.tagName };
});
const order = [];
for (let i = 0; i < 34; i++) {
  await p.keyboard.press('Tab');
  const info = await p.evaluate(() => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a) return null;
    const mb = document.querySelector('.sidebar .mockbar');
    const r = a.getBoundingClientRect();
    return {
      el: a.tagName.toLowerCase() + (a.id ? '#' + a.id : '.' + (a.getAttribute('class') || '').split(' ')[0]),
      label: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32),
      inClosedSheet: !!(mb && mb.contains(a)),
      onScreen: r.top >= 0 && r.bottom <= innerHeight && r.width > 0,
      y: Math.round(r.top),
    };
  });
  if (info) order.push(info);
}
const phantom = order.filter((o) => o.inClosedSheet);
console.log('\n(d2) TAB ORDER (first 34 stops):');
for (const o of order) console.log(`   ${o.inClosedSheet ? 'PHANTOM' : '       '} ${o.el.padEnd(26)} y=${String(o.y).padStart(5)} onScreen=${o.onScreen}  "${o.label}"`);
console.log(`\n   => ${phantom.length} of ${order.length} tab stops land inside the CLOSED, off-screen tools sheet.`);

await b.close();
