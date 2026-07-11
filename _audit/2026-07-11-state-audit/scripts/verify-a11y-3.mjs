/* ADVERSARIAL RE-VERIFICATION of F4 (#keybody unreachable) — the finding most at risk.
   Chromium 149 ships "keyboard-focusable scrollers" (Chrome 127+), which SHOULD make an
   overflowing scroll container with no focusable children a native Tab stop. If that fires,
   F4 is REFUTED. If the app's own focus trap defeats it, F4 stands. MEASURE, don't reason. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';

const b = await chromium.launch();
console.log('Chromium:', b.version(), '(keyboard-focusable-scrollers shipped in Chrome 127)');

const VIEWPORTS = [
  { w: 1440, h: 900, label: '1440x900 desktop' },
  { w: 1366, h: 768, label: '1366x768 laptop' },
  { w: 1280, h: 700, label: '1280x700 laptop' },
  { w: 853, h: 533, label: '853x533  (=150% zoom of 1280x800)' },
  { w: 640, h: 400, label: '640x400  (=200% zoom of 1280x800)' }
];

for (const v of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: v.w, height: v.h } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.keyboard.press('Escape');           // clear first-run index overlay
  await p.waitForTimeout(400);

  // open the keyboard-shortcuts overlay with its documented "?" shortcut
  await p.keyboard.press('?');
  await p.waitForTimeout(700);

  const state = await p.evaluate(() => {
    const ov = document.getElementById('keyov');
    const body = document.getElementById('keybody');
    if (!ov || !body) return { err: 'missing' };
    const cs = getComputedStyle(body);
    return {
      overlayOpen: ov.classList.contains('open'),
      overflowY: cs.overflowY,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      hidden: body.scrollHeight - body.clientHeight,
      tabIndexAttr: body.getAttribute('tabindex'),
      tabIndexProp: body.tabIndex,
      role: body.getAttribute('role'),
      ariaLabel: body.getAttribute('aria-label'),
      // focusable descendants, PIERCING the <deep-keyboard> shadow root
      focusableDescendants: (() => {
        const sel = 'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"]),summary,details';
        let n = body.querySelectorAll(sel).length;
        body.querySelectorAll('*').forEach(el => { if (el.shadowRoot) n += el.shadowRoot.querySelectorAll(sel).length; });
        return n;
      })(),
      // what the app's own trap considers focusable in this overlay (shell.js:126 selector)
      appTrapFocusables: Array.prototype.filter.call(
        ov.querySelectorAll('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])'),
        el => !el.disabled && el.offsetParent !== null
      ).map(el => el.id || el.className)
    };
  });

  // real Tab cycle
  const cycle = [];
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(90);
    cycle.push(await p.evaluate(() => {
      const a = document.activeElement;
      if (!a) return 'null';
      return (a.id || a.className || a.tagName) + (a === document.body ? '(BODY)' : '');
    }));
  }

  // Can a keyboard user scroll #keybody at all? Try every scroll key with focus where the app puts it.
  await p.evaluate(() => { const kb = document.getElementById('keybody'); kb.scrollTop = 0; });
  const scrollProbe = {};
  for (const key of ['ArrowDown', 'PageDown', 'End', 'Space']) {
    await p.evaluate(() => { document.getElementById('keybody').scrollTop = 0; });
    await p.evaluate(() => { const x = document.getElementById('keyx'); if (x) x.focus(); }); // where the app parks focus
    for (let i = 0; i < 6; i++) { await p.keyboard.press(key); await p.waitForTimeout(60); }
    scrollProbe[key] = await p.evaluate(() => ({
      keybodyScrollTop: document.getElementById('keybody').scrollTop,
      panelScrollTop: (document.querySelector('#keyov .mock-panel') || {}).scrollTop ?? null,
      overlayScrollTop: document.getElementById('keyov').scrollTop
    }));
  }

  // Would Chrome natively focus it if the app's trap were not in the way?
  // (programmatic .focus() on a non-tabbable element only works if it is focusable)
  const nativeFocusable = await p.evaluate(() => {
    const kb = document.getElementById('keybody');
    kb.focus();
    return document.activeElement === kb;
  });

  console.log('\n===== ' + v.label + ' =====');
  console.log(JSON.stringify(state, null, 1));
  console.log('Tab cycle (8 presses):', JSON.stringify(cycle));
  console.log('scroll-key probe (focus parked on #keyx, as the app does):', JSON.stringify(scrollProbe));
  console.log('keybody accepts programmatic .focus()? ', nativeFocusable);

  if (v.w === 640) await p.screenshot({ path: SHOTS + '/f4-keybody-640x400.png' });
  if (v.w === 1440) await p.screenshot({ path: SHOTS + '/f4-keybody-1440x900.png' });
  await ctx.close();
}

// Control: does a SIBLING overlay (cram, which HAS the fix) behave differently at 640x400?
const ctx = await b.newContext({ viewport: { width: 640, height: 400 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(900);
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.click('#cramopen');
await p.waitForTimeout(800);
const cramCycle = [];
for (let i = 0; i < 6; i++) {
  await p.keyboard.press('Tab');
  await p.waitForTimeout(90);
  cramCycle.push(await p.evaluate(() => (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)));
}
await p.evaluate(() => { const c = document.getElementById('cram'); c.scrollTop = 0; c.focus(); });
for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); }
const cramScroll = await p.evaluate(() => ({
  scrollTop: document.getElementById('cram').scrollTop,
  hidden: document.getElementById('cram').scrollHeight - document.getElementById('cram').clientHeight
}));
console.log('\n===== CONTROL: #cram (HAS the tabindex/role/label fix) @640x400 =====');
console.log('Tab cycle:', JSON.stringify(cramCycle));
console.log('after focusing #cram + 6x ArrowDown:', JSON.stringify(cramScroll));
await p.screenshot({ path: SHOTS + '/f4-control-cram-640x400.png' });
await ctx.close();
await b.close();
