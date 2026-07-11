/* Focused, correctly-timed re-test of the ESC / stacking / scroll-chain claims.
   ovHide() has a 500ms fallback timer (mock-run/logic.js:26) -> poll, never a fixed 450ms wait. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });
const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('::' + k + ':: ' + JSON.stringify(v)); };
const VP = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };

const STATIC = [
  { n: 'mock', ov: '#mockov', open: '#mockopen' }, { n: 'mix', ov: '#mixov', open: '#mixopen' },
  { n: 'cram', ov: '#cramov', open: '#cramopen' }, { n: 'sess', ov: '#sessov', open: '#sessopen' },
  { n: 'plan', ov: '#planov', open: '#planopen' }, { n: 'scope', ov: '#scopeov', open: '#scopeopen' },
  { n: 'keys', ov: '#keyov', open: '#keyopen' },
];

async function boot(browser, vp) {
  const ctx = await browser.newContext({ viewport: VP[vp] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.print = () => {}; });
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
  await p.waitForTimeout(600);
  await p.evaluate(() => window.scrollTo(0, 0));
  return { ctx, p, errs };
}
// poll until closed, up to 3s (ovHide fallback is 500ms)
async function waitClosed(p, sel, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const open = await p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.classList.contains('open')); }, sel);
    if (!open) return { closed: true, afterMs: Date.now() - t0 };
    await p.waitForTimeout(100);
  }
  return { closed: false, afterMs: ms };
}
async function openTools(p, vp) {
  if (vp !== 'mobile') return;
  const f = await p.$('#toolsfab');
  if (f && await f.isVisible()) { await p.click('#toolsfab'); await p.waitForTimeout(350); }
}

const browser = await chromium.launch();

for (const vp of ['desktop', 'mobile']) {
  /* ---- A: does ESC actually close each static overlay? (polled, 3s) ---- */
  {
    const { ctx, p } = await boot(browser, vp);
    const esc = {};
    for (const s of STATIC) {
      await openTools(p, vp);
      await p.click(s.open, { force: true });
      await p.waitForTimeout(600);
      const opened = await p.evaluate(x => document.querySelector(x).classList.contains('open'), s.ov);
      if (!opened) { esc[s.n] = 'DID-NOT-OPEN'; continue; }
      await p.keyboard.press('Escape');
      const r = await waitClosed(p, s.ov);
      const lockAfter = await p.evaluate(() => document.body.style.overflow);
      esc[s.n] = { escapeCloses: r.closed, closedAfterMs: r.afterMs, scrollLockReleased: lockAfter === '' };
      if (!r.closed) { await p.evaluate(x => { const b = document.querySelector(x).querySelector('.mock-x,.cram-x'); if (b) b.click(); }, s.ov); await p.waitForTimeout(700); }
    }
    log(`A.${vp}.escapeClosesStatic`, esc);
    await ctx.close();
  }

  /* ---- B: can '/' (CLAIMED repro) stack search over cram? vs Ctrl+K ---- */
  {
    const { ctx, p } = await boot(browser, vp);
    await openTools(p, vp);
    await p.click('#cramopen', { force: true });
    await p.waitForTimeout(700);
    const cramState = await p.evaluate(() => ({
      cramOpen: document.getElementById('cramov').classList.contains('open'),
      bodyOverflow: document.body.style.overflow,
      activeEl: document.activeElement ? (document.activeElement.id || document.activeElement.className) : null,
    }));
    log(`B.${vp}.cramOpened`, cramState);

    // (a) THE CLAIMED REPRO: press '/'
    await p.keyboard.press('/');
    await p.waitForTimeout(700);
    const afterSlash = await p.evaluate(() => ({
      cramOpen: document.getElementById('cramov').classList.contains('open'),
      searchOpen: window.SearchOverlay.isOpen(),
    }));
    log(`B.${vp}.afterSlash_CLAIMED_REPRO`, {
      ...afterSlash,
      SLASH_STACKS_SEARCH_OVER_CRAM: afterSlash.cramOpen && afterSlash.searchOpen,
    });
    // reset to a clean cram-only state
    await p.evaluate(() => { if (window.SearchOverlay.isOpen()) window.SearchOverlay.close(); });
    await p.waitForTimeout(500);
    let cramStill = await p.evaluate(() => document.getElementById('cramov').classList.contains('open'));
    if (!cramStill) { await openTools(p, vp); await p.click('#cramopen', { force: true }); await p.waitForTimeout(700); }

    // (b) Ctrl+K — search-overlay.js:370 has its OWN listener, ungated by the open-dialog guard
    await p.keyboard.press('Control+k');
    await p.waitForTimeout(800);
    const stacked = await p.evaluate(() => ({
      cramOpen: document.getElementById('cramov').classList.contains('open'),
      searchOpen: window.SearchOverlay.isOpen(),
      bodyOverflow: document.body.style.overflow,
    }));
    log(`B.${vp}.afterCtrlK`, { ...stacked, CTRLK_STACKS: stacked.cramOpen && stacked.searchOpen });

    if (stacked.cramOpen && stacked.searchOpen) {
      await p.screenshot({ path: `${SHOTS}/${vp}-stacked-search-over-cram.png` });
      await p.keyboard.press('Escape');
      await p.waitForTimeout(1200); // > ovHide 500ms fallback
      const after = await p.evaluate(() => ({
        cramOpen: document.getElementById('cramov').classList.contains('open'),
        searchOpen: window.SearchOverlay.isOpen(),
        bodyOverflow: document.body.style.overflow,
      }));
      log(`B.${vp}.afterONE_Escape`, {
        ...after,
        BOTH_CLOSED_BY_ONE_ESC: !after.cramOpen && !after.searchOpen,
        SCROLL_LOCK_LEAKED: after.bodyOverflow === 'hidden',
      });
      await p.screenshot({ path: `${SHOTS}/${vp}-stacked-after-one-esc.png` });
    }
    await ctx.close();
  }

  /* ---- C: index-overlay scroll chain, measured on a page that CAN scroll ---- */
  {
    const { ctx, p } = await boot(browser, vp);
    // make sure the page behind genuinely has scrollable height (real usage: a topic is loaded)
    const pageMetrics = await p.evaluate(() => ({
      docScrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      pageScrollableBehindPx: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }));
    await p.evaluate(() => window.IndexOverlay.open());
    await p.waitForTimeout(700);
    const pre = await p.evaluate(() => {
      const ov = document.getElementById('_index-overlay');
      const sc = ov.querySelector('.ix-scroll') || ov;
      return {
        bodyOverflowStyle: document.body.style.overflow,
        innerOverscrollBehaviorY: getComputedStyle(sc).overscrollBehaviorY,
        scrollerClass: sc.className,
        scrollerScrollHeight: sc.scrollHeight,
        scrollerClientHeight: sc.clientHeight,
        bodyScrollBefore: window.scrollY,
      };
    });
    // drive the inner list to its END (the precondition for chaining), then keep wheeling
    await p.evaluate(() => {
      const ov = document.getElementById('_index-overlay');
      const sc = ov.querySelector('.ix-scroll') || ov;
      sc.scrollTop = sc.scrollHeight;
    });
    await p.waitForTimeout(250);
    const box = await p.evaluate(() => {
      const ov = document.getElementById('_index-overlay');
      const sc = ov.querySelector('.ix-scroll') || ov;
      const r = sc.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    await p.mouse.move(box.x, box.y);
    for (let i = 0; i < 15; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(60); }
    await p.waitForTimeout(500);
    const post = await p.evaluate(() => ({ bodyScrollAfter: window.scrollY }));
    const leaked = post.bodyScrollAfter - pre.bodyScrollBefore;
    log(`C.${vp}.indexScrollChain`, {
      ...pageMetrics, ...pre, ...post,
      pxLeaked: leaked,
      CHAINS_TO_PAGE_BEHIND: leaked > 0,
      NOTE: pageMetrics.pageScrollableBehindPx === 0 ? 'page behind cannot scroll at all -> chain impossible' : 'page behind is scrollable',
    });
    await p.screenshot({ path: `${SHOTS}/${vp}-index-scrollchain.png` });
    await ctx.close();
  }
}

await browser.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/verify-esc-stack.json', JSON.stringify(OUT, null, 2));
console.log('\n=== DONE ===');
