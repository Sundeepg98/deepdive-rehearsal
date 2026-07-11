/* MISSED-HUNT B: on mobile the Tools sheet (.mockbar) is hidden with transform only.
   transform does NOT remove an element from the a11y tree or the tab order.
   Also: #toolsfab has no aria-expanded/aria-controls. And the #cram control for F4. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';

const b = await chromium.launch();

console.log('############ MISSED-HUNT B: mobile Tools sheet — hidden by transform, still focusable? ############');
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(600);

const closedState = await p.evaluate(() => {
  const mb = document.querySelector('.mockbar');
  const fab = document.getElementById('toolsfab');
  const cs = getComputedStyle(mb);
  const r = mb.getBoundingClientRect();
  const btns = [...mb.querySelectorAll('button')];
  return {
    bodyHasToolsOpen: document.body.classList.contains('tools-open'),
    mockbarTransform: cs.transform,
    mockbarVisibility: cs.visibility,
    mockbarDisplay: cs.display,
    mockbarAriaHidden: mb.getAttribute('aria-hidden'),
    mockbarInert: mb.hasAttribute('inert'),
    mockbarRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) },
    viewportHeight: window.innerHeight,
    offscreen: r.top >= window.innerHeight,
    buttonCount: btns.length,
    // the two things that decide "is it still reachable by AT / keyboard":
    buttonsWithOffsetParent: btns.filter(x => x.offsetParent !== null).length,
    buttonsWithClientRects: btns.filter(x => x.getClientRects().length > 0).length,
    fab: { ariaExpanded: fab.getAttribute('aria-expanded'), ariaControls: fab.getAttribute('aria-controls'), ariaHaspopup: fab.getAttribute('aria-haspopup'), text: fab.textContent }
  };
});
console.log('Tools sheet CLOSED (default) @390x844:');
console.log(JSON.stringify(closedState, null, 1));
await p.screenshot({ path: SHOTS + '/missed-mobile-tools-closed.png' });

// Now Tab through the page with the sheet CLOSED and see whether the off-screen buttons take focus.
await p.evaluate(() => { document.body.focus(); if (document.activeElement) document.activeElement.blur(); });
const stops = [];
for (let i = 0; i < 26; i++) {
  await p.keyboard.press('Tab');
  await p.waitForTimeout(60);
  const s = await p.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    const r = a.getBoundingClientRect();
    const inMockbar = !!a.closest && !!a.closest('.mockbar');
    return {
      id: a.id || a.className || a.tagName,
      inMockbar,
      top: Math.round(r.top),
      offscreen: r.top >= window.innerHeight || r.bottom <= 0
    };
  });
  if (s) stops.push(s);
}
const mockbarStops = stops.filter(s => s.inMockbar);
console.log('\nTab stops (26 presses), sheet CLOSED:');
console.log(JSON.stringify(stops, null, 0));
console.log('\n>>> Tab stops that land INSIDE the visually-closed .mockbar:', mockbarStops.length);
console.log('>>> of those, OFF-SCREEN (top >= viewport height):', mockbarStops.filter(s => s.offscreen).length);
console.log(JSON.stringify(mockbarStops, null, 0));

// Screenshot with focus parked on an off-screen mockbar button
if (mockbarStops.length) {
  await p.evaluate(() => { const b = document.querySelector('.mockbar button'); if (b) b.focus(); });
  await p.waitForTimeout(200);
  const where = await p.evaluate(() => {
    const a = document.activeElement; const r = a.getBoundingClientRect();
    return { focused: a.id || a.className, top: Math.round(r.top), viewportH: window.innerHeight, visibleOnScreen: r.top < window.innerHeight && r.bottom > 0 };
  });
  console.log('\nfocus() on the first .mockbar button while the sheet is CLOSED:', JSON.stringify(where));
  await p.screenshot({ path: SHOTS + '/missed-mobile-focus-offscreen.png' });
}

// AX tree: is the closed sheet still exposed to a screen reader?
const cdp = await p.context().newCDPSession(p);
await cdp.send('Accessibility.enable');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const names = ['Topic index', 'One-page cram sheet', 'Session progress', 'Mixed fire', 'Game plan'];
const found = [];
for (const n of nodes) {
  const nm = n.name && n.name.value ? n.name.value.replace(/\s+/g, ' ').trim() : '';
  if (n.role && n.role.value === 'button' && names.some(s => nm.startsWith(s))) {
    found.push({ name: nm.slice(0, 45), ignored: n.ignored === true });
  }
}
console.log('\nCDP AX tree — mockbar buttons while the sheet is visually CLOSED:');
console.log(JSON.stringify(found, null, 1));
console.log('>>> exposed (not ignored) to a screen reader:', found.filter(f => !f.ignored).length, '/', found.length);

// aria-expanded after opening
await p.click('#toolsfab');
await p.waitForTimeout(500);
const openFab = await p.evaluate(() => {
  const fab = document.getElementById('toolsfab');
  return { bodyHasToolsOpen: document.body.classList.contains('tools-open'), ariaExpanded: fab.getAttribute('aria-expanded') };
});
console.log('\nAfter clicking #toolsfab (sheet OPEN):', JSON.stringify(openFab));
await p.screenshot({ path: SHOTS + '/missed-mobile-tools-open.png' });
await ctx.close();

console.log('\n############ F4 CONTROL: #cram (HAS the fix) at a small viewport ############');
const ctx2 = await b.newContext({ viewport: { width: 1100, height: 500 } });
const p2 = await ctx2.newPage();
await p2.goto(URL, { waitUntil: 'load' });
await p2.waitForTimeout(1000);
await p2.keyboard.press('Escape');
await p2.waitForTimeout(400);
await p2.evaluate(() => document.getElementById('cramopen').click());
await p2.waitForTimeout(900);
const cramCycle = [];
for (let i = 0; i < 6; i++) {
  await p2.keyboard.press('Tab');
  await p2.waitForTimeout(90);
  cramCycle.push(await p2.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName));
}
const cramArrow = await p2.evaluate(async () => {
  const c = document.getElementById('cram');
  c.scrollTop = 0;
  return { hidden: c.scrollHeight - c.clientHeight, tabIndex: c.tabIndex, role: c.getAttribute('role'), label: c.getAttribute('aria-label') };
});
await p2.evaluate(() => document.getElementById('cram').focus());
for (let i = 0; i < 6; i++) { await p2.keyboard.press('ArrowDown'); await p2.waitForTimeout(70); }
const cramAfter = await p2.evaluate(() => document.getElementById('cram').scrollTop);
console.log('#cram attrs:', JSON.stringify(cramArrow));
console.log('#cram Tab cycle:', JSON.stringify(cramCycle));
console.log('#cram scrollTop after focus + 6x ArrowDown:', cramAfter, '  <-- the FIXED sibling scrolls; #keybody stays 0');

// same viewport, keybody, for an apples-to-apples comparison
await p2.keyboard.press('Escape');
await p2.waitForTimeout(400);
await p2.keyboard.press('?');
await p2.waitForTimeout(700);
const keyCycle = [];
for (let i = 0; i < 6; i++) {
  await p2.keyboard.press('Tab');
  await p2.waitForTimeout(90);
  keyCycle.push(await p2.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName));
}
const keyInfo = await p2.evaluate(() => {
  const k = document.getElementById('keybody');
  k.scrollTop = 0;
  const x = document.getElementById('keyx'); if (x) x.focus();
  return { hidden: k.scrollHeight - k.clientHeight, tabIndex: k.tabIndex, role: k.getAttribute('role'), label: k.getAttribute('aria-label') };
});
for (let i = 0; i < 6; i++) { await p2.keyboard.press('ArrowDown'); await p2.waitForTimeout(70); }
const keyAfter = await p2.evaluate(() => document.getElementById('keybody').scrollTop);
console.log('\n#keybody attrs @1100x500:', JSON.stringify(keyInfo));
console.log('#keybody Tab cycle:', JSON.stringify(keyCycle));
console.log('#keybody scrollTop after 6x ArrowDown:', keyAfter);
await p2.screenshot({ path: SHOTS + '/f4-keybody-1100x500.png' });
await ctx2.close();

console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
