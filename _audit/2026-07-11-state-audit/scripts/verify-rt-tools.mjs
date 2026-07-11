/* Adversarial re-verification of the rt-tools lens.
   Re-measures every claim independently. Default = refute. */
import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-tools';
fs.mkdirSync(SHOTS, { recursive: true });

const OUT = {};
const log = (k, v) => { OUT[k] = v; console.log('::' + k + ':: ' + JSON.stringify(v)); };

const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };

// The 7 static overlays (in HTML at parse time) + their open triggers
const STATIC = [
  { name: 'mock',  ov: '#mockov',  open: '#mockopen' },
  { name: 'mix',   ov: '#mixov',   open: '#mixopen' },
  { name: 'cram',  ov: '#cramov',  open: '#cramopen' },
  { name: 'sess',  ov: '#sessov',  open: '#sessopen' },
  { name: 'plan',  ov: '#planov',  open: '#planopen' },
  { name: 'scope', ov: '#scopeov', open: '#scopeopen' },
  { name: 'keys',  ov: '#keyov',   open: '#keyopen' },
];

async function boot(browser, vp) {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  // neutralise print() so headless never blocks
  await p.evaluate(() => { window.print = () => {}; });
  // FACT: on a fresh profile the Topic-index overlay is OPEN on load (it IS the home
  // screen) and intercepts all pointer events. Dismiss it to reach the app itself.
  const homeOpen = await p.evaluate(() => {
    const el = document.getElementById('_index-overlay');
    return !!(el && el.classList.contains('open'));
  });
  if (homeOpen) {
    await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
    await p.waitForTimeout(500);
  }
  const stillOpen = await p.evaluate(() => {
    const el = document.getElementById('_index-overlay');
    return !!(el && el.classList.contains('open'));
  });
  if (stillOpen) {
    // fall back: pick the first topic card
    const card = await p.$('#_index-overlay .ix-card, #_index-overlay button');
    if (card) { await card.click(); await p.waitForTimeout(700); }
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  return { ctx, p, errs, homeOverlayOpenOnLoad: homeOpen };
}

// mobile needs the tools drawer open to reach .mockbar buttons
async function openTools(p, vp) {
  if (vp !== 'mobile') return;
  const fab = await p.$('#toolsfab');
  if (fab && await fab.isVisible()) {
    await p.click('#toolsfab');
    await p.waitForTimeout(350);
  }
}

const browser = await chromium.launch();

/* ============================================================
   F1 — FOCUS MODE TRAP
   ============================================================ */
for (const vp of ['desktop', 'mobile']) {
  const { ctx, p, homeOverlayOpenOnLoad } = await boot(browser, vp);
  log(`F0.${vp}.homeIndexOverlayOpenOnLoad`, { openOnLoad: homeOverlayOpenOnLoad });

  // structural: is #_focus-toggle inside .sidebar?
  const struct = await p.evaluate(() => {
    const b = document.getElementById('_focus-toggle');
    const sb = document.querySelector('.sidebar');
    return {
      exists: !!b,
      insideSidebar: !!(b && sb && sb.contains(b)),
      parentClass: b && b.parentElement ? b.parentElement.className : null,
      visBefore: b ? getComputedStyle(b).visibility : null,
    };
  });
  log(`F1.${vp}.structure`, struct);

  await p.screenshot({ path: `${SHOTS}/${vp}-focus-BEFORE.png` });

  // activate via a REAL click on the button
  await p.click('#_focus-toggle', { timeout: 10000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${SHOTS}/${vp}-focus-AFTER.png` });

  const after = await p.evaluate(() => {
    const vis = el => el ? getComputedStyle(el).visibility : 'ABSENT';
    const b = document.getElementById('_focus-toggle');
    // count genuinely tappable elements: interactive, visible, hit-testable
    const cands = document.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])');
    let tappable = [];
    for (const el of cands) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && (hit === el || el.contains(hit) || hit.contains(el))) {
        tappable.push(el.id || el.className || el.tagName);
      }
    }
    const rb = b ? b.getBoundingClientRect() : null;
    const at = rb ? document.elementFromPoint(rb.left + rb.width / 2, rb.top + rb.height / 2) : null;
    return {
      focusModeOn: document.querySelector('.app').classList.contains('_focus-mode'),
      toggleVisibility: vis(b),
      elementAtTogglePoint: at ? (at.id || at.className || at.tagName) : null,
      tappableCount: tappable.length,
      tappableList: tappable.slice(0, 8),
      segVis: vis(document.querySelector('.seg')),
      mockctaVis: vis(document.querySelector('.mockcta')),
      toolsfabVis: vis(document.getElementById('toolsfab')),
      topicnavVis: vis(document.getElementById('topicnav')),
    };
  });
  log(`F1.${vp}.afterActivation`, after);

  // can a real click escape?
  let clickErr = null;
  try { await p.click('#_focus-toggle', { timeout: 2500 }); }
  catch (e) { clickErr = e.constructor.name + ': ' + String(e.message).split('\n')[0]; }
  const stillOn1 = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
  log(`F1.${vp}.realClickToExit`, { error: clickErr, stillTrapped: stillOn1 });

  // does Escape exit?
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const stillOn2 = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
  log(`F1.${vp}.escapeExits`, { escapeExits: !stillOn2, stillTrapped: stillOn2 });

  // does 'f' exit?
  await p.keyboard.press('f');
  await p.waitForTimeout(500);
  const stillOn3 = await p.evaluate(() => document.querySelector('.app').classList.contains('_focus-mode'));
  log(`F1.${vp}.fKeyExits`, { fKeyExits: !stillOn3 });

  await ctx.close();
}

/* ============================================================
   F2 — PRINT Q&A TOKEN COLLAPSE
   ============================================================ */
{
  const { ctx, p } = await boot(browser, 'desktop');
  await p.evaluate(() => { window.print = () => {}; });

  const popupPromise = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await p.click('#printqa');
  const popup = await popupPromise;

  if (!popup) {
    log('F2.popup', { opened: false, NOTE: 'no popup captured' });
  } else {
    await popup.waitForTimeout(900);
    await popup.evaluate(() => { window.print = () => {}; }).catch(() => {});
    const probe = await popup.evaluate(() => {
      const cs = (sel, prop) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el)[prop] : 'NO-EL';
      };
      const rootVar = n => {
        const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
        return v === '' ? '(UNDEFINED)' : v;
      };
      const styleText = document.querySelector('style') ? document.querySelector('style').textContent : '';
      const varRefs = (styleText.match(/var\(--/g) || []).length;
      return {
        title: document.title,
        articles: document.querySelectorAll('article').length,
        stylesheetVarRefs: varRefs,
        tokens: {
          '--space-40': rootVar('--space-40'),
          '--space-760': rootVar('--space-760'),
          '--font-size-display': rootVar('--font-size-display'),
          '--font-weight-heavy': rootVar('--font-weight-heavy'),
        },
        computed: {
          bodyPadding: cs('body', 'padding'),
          bodyMaxWidth: cs('body', 'maxWidth'),
          bodyWidth: cs('body', 'width'),
          h1_fontSize: cs('h1', 'fontSize'),
          h1_fontWeight: cs('h1', 'fontWeight'),
          body_fontSize: cs('body', 'fontSize'),
          h2_fontSize: cs('h2', 'fontSize'),
          a_fontSize: cs('.a', 'fontSize'),
          sig_fontSize: cs('.sig', 'fontSize'),
          fu_paddingLeft: cs('.fu', 'paddingLeft'),
          fu_margin: cs('.fu', 'margin'),
          sr_padding: cs('.sr', 'padding'),
          article_marginBottom: cs('article', 'marginBottom'),
        },
        // does h1 actually render identical to body?
        h1EqualsBody: cs('h1', 'fontSize') === cs('body', 'fontSize') && cs('h1', 'fontWeight') === cs('body', 'fontWeight'),
      };
    });
    log('F2.printqa', probe);
    await popup.screenshot({ path: `${SHOTS}/desktop-printqa-popup.png`, fullPage: false });
  }
  await ctx.close();
}

/* ============================================================
   F3 — SCROLL LOCK / OVERSCROLL CHAIN
   F4 — BACKDROP CLICK
   F5 — DOUBLE ESCAPE
   ============================================================ */
for (const vp of ['desktop', 'mobile']) {
  const { ctx, p } = await boot(browser, vp);

  // ---- F4 static: backdrop click ----
  const staticRes = {};
  for (const s of STATIC) {
    await openTools(p, vp);
    const trig = await p.$(s.open);
    if (!trig) { staticRes[s.name] = 'NO-TRIGGER'; continue; }
    await p.click(s.open, { force: true });
    await p.waitForTimeout(450);
    const opened = await p.evaluate(sel => {
      const el = document.querySelector(sel);
      return el ? el.classList.contains('open') : false;
    }, s.ov);
    if (!opened) { staticRes[s.name] = 'DID-NOT-OPEN'; continue; }

    const lock = await p.evaluate(() => document.body.style.overflow);

    // find a point provably on the backdrop, not the panel
    const pt = await p.evaluate(sel => {
      const ov = document.querySelector(sel);
      const panel = ov.querySelector('.mock-panel,.cram-panel') || ov.firstElementChild;
      const pr = panel.getBoundingClientRect();
      // try a few candidate points outside the panel but inside the viewport
      const cands = [
        [Math.max(4, pr.left / 2), innerHeight / 2],
        [innerWidth / 2, Math.max(4, pr.top / 2)],
        [innerWidth - 4, innerHeight / 2],
        [innerWidth / 2, innerHeight - 4],
      ];
      for (const [x, y] of cands) {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
        if (x >= pr.left && x <= pr.right && y >= pr.top && y <= pr.bottom) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit === ov) return { x, y, hitId: hit.id, panelRect: { l: pr.left, t: pr.top, r: pr.right, b: pr.bottom } };
      }
      return null;
    }, s.ov);

    if (!pt) { staticRes[s.name] = { lock, backdrop: 'NO-BACKDROP-POINT-FOUND' }; await p.keyboard.press('Escape'); await p.waitForTimeout(400); continue; }

    await p.mouse.click(pt.x, pt.y);
    await p.waitForTimeout(450);
    const stillOpen = await p.evaluate(sel => document.querySelector(sel).classList.contains('open'), s.ov);
    staticRes[s.name] = { scrollLock: lock, clickedAt: [Math.round(pt.x), Math.round(pt.y)], hitElementIsOverlay: pt.hitId === s.ov.slice(1), backdropCloses: !stillOpen };

    // clean up
    await p.keyboard.press('Escape');
    await p.waitForTimeout(450);
    const closed = await p.evaluate(sel => !document.querySelector(sel).classList.contains('open'), s.ov);
    staticRes[s.name].escapeCloses = closed;
    if (!closed) { await p.evaluate(sel => { const x = document.querySelector(sel).querySelector('.mock-x,.cram-x'); if (x) x.click(); }, s.ov); await p.waitForTimeout(400); }
  }
  log(`F4.${vp}.static`, staticRes);

  // ---- F4/F3 dynamic: index + notes + search + cross ----
  const dynRes = {};

  // index overlay
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.open());
  await p.waitForTimeout(600);
  dynRes.index = await p.evaluate(() => {
    const el = document.getElementById('_index-overlay');
    return { open: !!(el && el.classList.contains('open')), scrollLock: document.body.style.overflow };
  });
  // backdrop click
  const ipt = await p.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    for (const [x, y] of [[4, innerHeight / 2], [innerWidth - 4, innerHeight / 2], [innerWidth / 2, 2]]) {
      if (document.elementFromPoint(x, y) === ov) return { x, y };
    }
    return null;
  });
  if (ipt) {
    await p.mouse.click(ipt.x, ipt.y);
    await p.waitForTimeout(500);
    dynRes.index.backdropCloses = await p.evaluate(() => { const el = document.getElementById('_index-overlay'); return !(el && el.classList.contains('open')); });
  } else dynRes.index.backdropCloses = 'NO-BACKDROP-POINT';

  // ---- F3 the headline: does the index overlay chain-scroll the page? ----
  await p.evaluate(() => { window.scrollTo(0, 0); const s = document.querySelector('.stage'); if (s) s.scrollTop = 0; });
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.open());
  await p.waitForTimeout(600);
  const chain = await p.evaluate(async () => {
    const ov = document.getElementById('_index-overlay');
    const scroller = ov.querySelector('.ix-scroll') || ov;
    const csOv = getComputedStyle(scroller);
    const bodyBefore = window.scrollY;
    const pageScrollable = document.documentElement.scrollHeight > innerHeight;
    // drive the inner scroller to its very end first (that's the precondition for chaining)
    scroller.scrollTop = scroller.scrollHeight;
    await new Promise(r => setTimeout(r, 120));
    return {
      innerScrollerSel: scroller.className,
      innerOverscrollBehaviorY: csOv.overscrollBehaviorY,
      innerScrollTop: scroller.scrollTop,
      innerScrollHeight: scroller.scrollHeight,
      innerClientHeight: scroller.clientHeight,
      atEnd: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2,
      bodyOverflowStyle: document.body.style.overflow,
      bodyComputedOverflow: getComputedStyle(document.body).overflow,
      pageScrollableBehind: pageScrollable,
      docScrollHeight: document.documentElement.scrollHeight,
      innerHeight,
      bodyScrollBefore: bodyBefore,
    };
  });
  // now WHEEL over the overlay to see if it chains to the page behind
  const box = await p.evaluate(() => {
    const ov = document.getElementById('_index-overlay');
    const s = ov.querySelector('.ix-scroll') || ov;
    const r = s.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await p.mouse.move(box.x, box.y);
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(50); }
  await p.waitForTimeout(400);
  const afterWheel = await p.evaluate(() => ({ bodyScrollAfter: window.scrollY, stageScroll: (document.querySelector('.stage') || {}).scrollTop }));
  chain.bodyScrollAfter = afterWheel.bodyScrollAfter;
  chain.pxLeaked = afterWheel.bodyScrollAfter - chain.bodyScrollBefore;
  chain.CHAINS_TO_PAGE_BEHIND = chain.pxLeaked > 0;
  log(`F3.${vp}.indexScrollChain`, chain);
  await p.screenshot({ path: `${SHOTS}/${vp}-index-scrollchain.png` });

  // close index
  await p.evaluate(() => window.IndexOverlay && window.IndexOverlay.close && window.IndexOverlay.close());
  await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollTo(0, 0));

  // notes + search scroll lock
  await p.evaluate(() => window.NotesOverlay && window.NotesOverlay.open && window.NotesOverlay.open());
  await p.waitForTimeout(500);
  dynRes.notes = await p.evaluate(() => {
    const el = document.getElementById('_notes-overlay');
    return { open: !!(el && el.classList.contains('open')), scrollLock: document.body.style.overflow };
  });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  await p.evaluate(() => window.SearchOverlay && window.SearchOverlay.open());
  await p.waitForTimeout(500);
  dynRes.search = await p.evaluate(() => {
    const el = document.getElementById('_search-overlay');
    return {
      isOpen: window.SearchOverlay.isOpen(),
      hasOpenClass: !!(el && el.classList.contains('open')),
      displayStyle: el ? el.style.display : null,
      isRoleDialogAriaModal: !!(el && el.getAttribute('role') === 'dialog' && el.getAttribute('aria-modal') === 'true'),
      scrollLock: document.body.style.overflow,
    };
  });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  log(`F4F3.${vp}.dynamic`, dynRes);

  // ---- F5: DOUBLE ESCAPE. Test BOTH the claimed repro ('/') and Ctrl+K ----
  // open cram
  await openTools(p, vp);
  await p.click('#cramopen', { force: true });
  await p.waitForTimeout(500);

  // (a) claimed repro: press '/'
  await p.keyboard.press('/');
  await p.waitForTimeout(500);
  const slashResult = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    searchOpen: window.SearchOverlay.isOpen(),
  }));
  log(`F5.${vp}.slashRepro_CLAIMED`, { ...slashResult, SLASH_OPENS_SEARCH_OVER_CRAM: slashResult.searchOpen });

  // (b) alternative: Ctrl+K (search-overlay's own ungated listener)
  await p.keyboard.press('Control+k');
  await p.waitForTimeout(600);
  const bothOpen = await p.evaluate(() => ({
    cramOpen: document.getElementById('cramov').classList.contains('open'),
    searchOpen: window.SearchOverlay.isOpen(),
    bodyOv: document.body.style.overflow,
  }));
  log(`F5.${vp}.ctrlK_stacks`, bothOpen);
  if (bothOpen.cramOpen && bothOpen.searchOpen) {
    await p.screenshot({ path: `${SHOTS}/${vp}-stacked-search-over-cram.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
    const afterEsc = await p.evaluate(() => ({
      cramOpen: document.getElementById('cramov').classList.contains('open'),
      searchOpen: window.SearchOverlay.isOpen(),
      bodyOv: document.body.style.overflow,
    }));
    log(`F5.${vp}.afterOneEscape`, { ...afterEsc, BOTH_CLOSED_BY_ONE_ESC: !afterEsc.cramOpen && !afterEsc.searchOpen });
    await p.screenshot({ path: `${SHOTS}/${vp}-stacked-after-one-esc.png` });
  }
  // reset
  await p.evaluate(() => { const c = document.getElementById('cramov'); if (c.classList.contains('open')) { const x = c.querySelector('.cram-x,.mock-x'); if (x) x.click(); } });
  await p.waitForTimeout(400);

  await ctx.close();
}

/* ============================================================
   F6 — TOPICNAV OVERFLOW   F7 — TEXTZOOM/POMODORO   F8 — DRAWER ESC   F9 — DEAD inttog
   ============================================================ */
for (const vp of ['desktop', 'mobile']) {
  const { ctx, p, errs } = await boot(browser, vp);

  // F9 (DOM truth, viewport-independent)
  const f9 = await p.evaluate(() => ({
    mockbarContainsInttog: document.querySelector('.mockbar').contains(document.getElementById('inttog')),
    mockbarContainsThemetog: document.querySelector('.mockbar').contains(document.getElementById('themetog')),
    inttogParent: document.getElementById('inttog').parentElement.className,
    themetogParent: document.getElementById('themetog').parentElement.className,
  }));
  log(`F9.${vp}.deadCondition`, f9);

  // F7
  const f7 = await p.evaluate(() => {
    const tz = document.getElementById('textzoom'), pm = document.getElementById('pomodoro');
    return {
      textzoomExists: !!tz, textzoomDisplay: tz ? getComputedStyle(tz).display : null,
      pomodoroExists: !!pm, pomodoroDisplay: pm ? getComputedStyle(pm).display : null,
      pomodoroTimeText: pm ? (pm.querySelector('.pomodoro-time') || {}).textContent : null,
    };
  });
  log(`F7.${vp}.controls`, f7);

  // F7b: does the pomodoro timer AUTO-RUN with nobody starting it? (original lens implied it does)
  const t0 = await p.evaluate(() => { const pm = document.getElementById('pomodoro'); return pm ? (pm.querySelector('.pomodoro-time') || {}).textContent : null; });
  await p.waitForTimeout(3000);
  const t1 = await p.evaluate(() => { const pm = document.getElementById('pomodoro'); return pm ? (pm.querySelector('.pomodoro-time') || {}).textContent : null; });
  log(`F7b.${vp}.pomodoroAutoRuns`, { t0, tAfter3s: t1, TIMER_RUNS_UNPROMPTED: t0 !== t1 });

  // F6: topicnav dropdown
  const tn = await p.$('#tntrigger');
  if (tn && await tn.isVisible()) {
    await p.click('#tntrigger');
    await p.waitForTimeout(500);
    const menu = await p.evaluate(() => {
      const m = document.getElementById('tnmenu');
      if (!m || m.hidden) return { hidden: true };
      const r = m.getBoundingClientRect();
      return {
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width),
        innerWidth,
        overflowRightPx: Math.round(r.right - innerWidth),
        docScrollWidth: document.documentElement.scrollWidth,
        hOverflow: document.documentElement.scrollWidth > innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
      };
    });
    log(`F6.${vp}.topicnavMenu`, menu);
    await p.screenshot({ path: `${SHOTS}/${vp}-topicnav.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
    const tnEsc = await p.evaluate(() => { const m = document.getElementById('tnmenu'); return m ? m.hidden : null; });
    log(`F6.${vp}.topicnavEscCloses`, { closedByEsc: tnEsc });
  } else {
    log(`F6.${vp}.topicnavMenu`, { triggerVisible: false });
  }

  // F8: tools drawer ESC (mobile only)
  if (vp === 'mobile') {
    await p.click('#toolsfab');
    await p.waitForTimeout(500);
    const openState = await p.evaluate(() => document.body.classList.contains('tools-open'));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(400);
    const afterEsc = await p.evaluate(() => document.body.classList.contains('tools-open'));
    log('F8.mobile.drawerEsc', { openedOk: openState, stillOpenAfterEsc: afterEsc, closedByEsc: openState && !afterEsc });
    // scrim tap
    const scrim = await p.evaluate(() => {
      const b = document.getElementById('toolsbd');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return { z: cs.zIndex, display: cs.display, top: Math.round(r.top) };
    });
    await p.mouse.click(195, 120);
    await p.waitForTimeout(400);
    const afterScrim = await p.evaluate(() => document.body.classList.contains('tools-open'));
    log('F8.mobile.drawerScrim', { scrim, closedByScrimTap: !afterScrim });
  }

  log(`ERRORS.${vp}`, errs);
  await ctx.close();
}

await browser.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/verify-rt-tools.json', JSON.stringify(OUT, null, 2));
console.log('\n=== DONE ===');
