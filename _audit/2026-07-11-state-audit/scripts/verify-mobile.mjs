/* Mobile-only re-test: ESC on static overlays, '/'-vs-Ctrl+K stacking, and the
   headline 575px index-overlay scroll-chain claim. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('::' + k + ':: ' + JSON.stringify(v)); };

const STATIC = [
  { n: 'mock', ov: '#mockov', open: '#mockopen' }, { n: 'mix', ov: '#mixov', open: '#mixopen' },
  { n: 'cram', ov: '#cramov', open: '#cramopen' }, { n: 'sess', ov: '#sessov', open: '#sessopen' },
  { n: 'plan', ov: '#planov', open: '#planopen' }, { n: 'scope', ov: '#scopeov', open: '#scopeopen' },
  { n: 'keys', ov: '#keyov', open: '#keyopen' },
];

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1300);
  await p.evaluate(() => { window.print = () => {}; });
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
  await p.waitForTimeout(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  return { ctx, p, errs };
}
// #mockopen lives in .mockcta (the always-visible CTA bar); the raised .mockbar drawer
// COVERS it. Every other static trigger lives INSIDE .mockbar and needs the drawer up.
async function setDrawer(p, want) {
  const open = await p.evaluate(() => document.body.classList.contains('tools-open'));
  if (open !== want) { await p.evaluate(() => document.getElementById('toolsfab').click()); await p.waitForTimeout(450); }
}
async function ensureDrawer(p, sel) {
  const inCta = sel === '#mockopen';
  await setDrawer(p, !inCta);
}
async function waitClosed(p, sel, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const o = await p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.classList.contains('open')); }, sel);
    if (!o) return { closed: true, afterMs: Date.now() - t0 };
    await p.waitForTimeout(100);
  }
  return { closed: false, afterMs: ms };
}

const browser = await chromium.launch();

/* A: ESC closes each static overlay (polled) + real tap on the trigger */
{
  const { ctx, p } = await boot(browser);
  const esc = {};
  for (const s of STATIC) {
    await ensureDrawer(p, s.open);
    // #keyopen is .kbd-only -> display:none below 920px (styles.css:441). Record that, open via API.
    const trigVisible = await p.evaluate(x => {
      const e = document.querySelector(x);
      if (!e) return false;
      const cs = getComputedStyle(e);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    }, s.open);
    if (!trigVisible) {
      esc[s.n] = { TRIGGER_NOT_TAPPABLE_ON_MOBILE: true, note: 'trigger is display:none at 390px' };
      await p.evaluate(x => document.querySelector(x).click(), s.open);
    } else {
      await p.click(s.open);         // REAL tap; drawer is up so the button is genuinely tappable
    }
    await p.waitForTimeout(700);
    const opened = await p.evaluate(x => document.querySelector(x).classList.contains('open'), s.ov);
    if (!opened) { esc[s.n] = { ...(esc[s.n] || {}), result: 'DID-NOT-OPEN' }; continue; }
    const lock = await p.evaluate(() => document.body.style.overflow);
    await p.keyboard.press('Escape');
    const r = await waitClosed(p, s.ov);
    esc[s.n] = { ...(esc[s.n] || {}), openedByTap: trigVisible, scrollLock: lock, escapeCloses: r.closed, closedAfterMs: r.afterMs };
    if (!r.closed) { await p.evaluate(x => { const b = document.querySelector(x).querySelector('.mock-x,.cram-x'); if (b) b.click(); }, s.ov); await p.waitForTimeout(800); }
  }
  log('M.A.escapeClosesStatic', esc);
  await ctx.close();
}

/* B: stacking — '/' (claimed) vs Ctrl+K */
{
  const { ctx, p } = await boot(browser);
  await ensureDrawer(p, '#cramopen');
  await p.click('#cramopen');
  await p.waitForTimeout(800);
  log('M.B.cramOpened', await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    bodyOverflow: document.body.style.overflow,
  })));

  await p.keyboard.press('/');
  await p.waitForTimeout(700);
  const sl = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    searchOpen: window.SearchOverlay.isOpen(),
  }));
  log('M.B.afterSlash_CLAIMED_REPRO', { ...sl, SLASH_STACKS: sl.cramOpen && sl.searchOpen });

  await p.keyboard.press('Control+k');
  await p.waitForTimeout(800);
  const st = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    searchOpen: window.SearchOverlay.isOpen(),
  }));
  log('M.B.afterCtrlK', { ...st, CTRLK_STACKS: st.cramOpen && st.searchOpen });
  if (st.cramOpen && st.searchOpen) {
    await p.screenshot({ path: `${SHOTS}/mobile-stacked-search-over-cram.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(1300);
    const a = await p.evaluate(() => ({
      cramOpen: document.getElementById('cramov').classList.contains('open'),
      searchOpen: window.SearchOverlay.isOpen(),
      bodyOverflow: document.body.style.overflow,
    }));
    log('M.B.afterONE_Escape', { ...a, BOTH_CLOSED_BY_ONE_ESC: !a.cramOpen && !a.searchOpen });
    await p.screenshot({ path: `${SHOTS}/mobile-stacked-after-one-esc.png` });
  }
  await ctx.close();
}

/* C: THE HEADLINE — does the topic index chain-scroll the page 575px on mobile? */
{
  const { ctx, p } = await boot(browser);
  const before = await p.evaluate(() => ({
    docScrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    pageScrollableBehindPx: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    bodyScrollY: window.scrollY,
  }));
  await p.evaluate(() => window.IndexOverlay.open());
  await p.waitForTimeout(800);
  const pre = await p.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const sc = ov.querySelector('.ix-scroll') || ov;
    return {
      bodyOverflowStyle: document.body.style.overflow,
      bodyComputedOverflow: getComputedStyle(document.body).overflow,
      innerOverscrollBehaviorY: getComputedStyle(sc).overscrollBehaviorY,
      scrollerScrollHeight: sc.scrollHeight,
      scrollerClientHeight: sc.clientHeight,
      bodyScrollBefore: window.scrollY,
    };
  });
  await p.screenshot({ path: `${SHOTS}/mobile-index-open.png` });

  // 1) WHEEL path (what the original lens measured)
  await p.evaluate(() => { const ov = document.getElementById('_index-overlay'); const sc = ov.querySelector('.ix-scroll') || ov; sc.scrollTop = sc.scrollHeight; });
  await p.waitForTimeout(300);
  const box = await p.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const sc = ov.querySelector('.ix-scroll') || ov;
    const r = sc.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await p.mouse.move(box.x, box.y);
  for (let i = 0; i < 15; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(60); }
  await p.waitForTimeout(600);
  const wheelAfter = await p.evaluate(() => window.scrollY);

  // 2) TOUCH-DRAG path (the actual mobile gesture)
  await p.evaluate(() => { const ov = document.getElementById('_index-overlay'); const sc = ov.querySelector('.ix-scroll') || ov; sc.scrollTop = sc.scrollHeight; });
  await p.waitForTimeout(250);
  for (let i = 0; i < 6; i++) {
    await p.touchscreen.tap(box.x, box.y).catch(() => {});
    await p.evaluate(async (b) => {
      const t = (x, y) => new Touch({ identifier: 1, target: document.elementFromPoint(x, y) || document.body, clientX: x, clientY: y });
      const el = document.elementFromPoint(b.x, b.y) || document.body;
      const fire = (type, x, y) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t(x, y)], changedTouches: [t(x, y)] }));
      fire('touchstart', b.x, b.y + 200);
      for (let k = 0; k < 10; k++) fire('touchmove', b.x, b.y + 200 - k * 20);
      fire('touchend', b.x, b.y);
    }, box).catch(() => {});
    await p.waitForTimeout(80);
  }
  await p.waitForTimeout(500);
  const touchAfter = await p.evaluate(() => window.scrollY);

  log('M.C.indexScrollChain', {
    ...before, ...pre,
    bodyScrollAfterWheel: wheelAfter,
    pxLeaked_wheel: wheelAfter - pre.bodyScrollBefore,
    bodyScrollAfterTouch: touchAfter,
    pxLeaked_touch: touchAfter - pre.bodyScrollBefore,
    CHAINS_TO_PAGE_BEHIND: (wheelAfter - pre.bodyScrollBefore) > 0 || (touchAfter - pre.bodyScrollBefore) > 0,
    MAX_POSSIBLE_LEAK_PX: before.pageScrollableBehindPx,
  });
  await p.screenshot({ path: `${SHOTS}/mobile-index-after-scroll.png` });
  await ctx.close();
}

/* D: topicnav overflow + drawer ESC + textzoom/pomodoro */
{
  const { ctx, p, errs } = await boot(browser);
  const tn = await p.$('#tntrigger');
  if (tn && await tn.isVisible()) {
    await p.click('#tntrigger');
    await p.waitForTimeout(600);
    log('M.D.topicnavMenu', await p.evaluate(() => {
      const m = document.getElementById('tnmenu');
      if (!m || m.hidden) return { hidden: true };
      const r = m.getBoundingClientRect();
      return {
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        innerWidth: window.innerWidth,
        overflowRightPx: Math.round(r.right - window.innerWidth),
        docScrollWidth: document.documentElement.scrollWidth,
        hOverflow: document.documentElement.scrollWidth > window.innerWidth,
        canPanSideways: document.documentElement.scrollWidth > window.innerWidth,
      };
    }));
    await p.screenshot({ path: `${SHOTS}/mobile-topicnav-overflow.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
  }
  // drawer esc
  await p.evaluate(() => document.getElementById('toolsfab').click());
  await p.waitForTimeout(500);
  const dOpen = await p.evaluate(() => document.body.classList.contains('tools-open'));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  const dAfter = await p.evaluate(() => document.body.classList.contains('tools-open'));
  log('M.D.drawerEsc', { opened: dOpen, stillOpenAfterEsc: dAfter, closedByEsc: dOpen && !dAfter });
  await p.screenshot({ path: `${SHOTS}/mobile-drawer-open.png` });

  // textzoom / pomodoro
  log('M.D.controls', await p.evaluate(() => {
    const tz = document.getElementById('textzoom'), pm = document.getElementById('pomodoro');
    return {
      textzoomExists: !!tz, textzoomDisplay: tz ? getComputedStyle(tz).display : null,
      pomodoroExists: !!pm, pomodoroDisplay: pm ? getComputedStyle(pm).display : null,
      anyTextSizeControlVisible: Array.from(document.querySelectorAll('button')).some(b => {
        const cs = getComputedStyle(b);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && /^A[-+]$|zoom/i.test(b.textContent.trim());
      }),
    };
  }));
  // does the pomodoro timer run unprompted on mobile?
  const p0 = await p.evaluate(() => { const e = document.querySelector('#pomodoro .pomodoro-time'); return e ? e.textContent : null; });
  await p.waitForTimeout(3500);
  const p1 = await p.evaluate(() => { const e = document.querySelector('#pomodoro .pomodoro-time'); return e ? e.textContent : null; });
  log('M.D.pomodoroAutoRuns', { t0: p0, tAfter3_5s: p1, TIMER_RUNS_UNPROMPTED: p0 !== p1 });

  log('M.errors', errs);
  await ctx.close();
}

await browser.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/verify-mobile.json', JSON.stringify(OUT, null, 2));
console.log('\n=== DONE ===');
