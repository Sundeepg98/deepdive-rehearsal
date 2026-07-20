#!/usr/bin/env node
/*
 * MOBILE NEXTUP AFFORDANCE (audit direction D5 -- the Beat-4 revisit) + TOUCH-COMPLETE JUDGMENT.
 *
 * The desktop flow spine (Continue dock + `n` key) has no touch equivalent: `.dock` is display:none
 * below 920px, so mobile had only the unlabeled seg pip and no tap target for the `n` destination.
 * This wave adds the mobile NextUp chip (#ndm) INSIDE the fixed bottom bar -- a compact, quiet tap
 * target rendered by flowDock() from the SAME nextUp() compute as #ndock / the pip / #ssgo. This
 * check guards the whole contract, on the app's most drift-sensitive surface (the load-bearing fixed
 * mock-CTA bar), plus the touch-complete-judgment invariant (the in-pane grade buttons stay tappable
 * at the judgment moment with no keyboard).
 *
 * INVARIANTS (each with a PLANT so it can be watched going red):
 *   1. APPEARS ON MESO: fresh walk recommends the drill (meso) -> the chip is shown, clears the 44px
 *      tap floor, and a hit-test at its painted centre reaches it.        (plant: hide it -> unreachable)
 *   2. NAVIGATES: a REAL tap on the chip runs flowGo -> the active tab becomes the recommended one.
 *   3. HIDES ON MICRO: on the drill mid-drill (the recommended pane, mid-unit) the chip is hidden --
 *      the pane owns momentum; grade via the pane's own touch buttons, not an armed-KEY legend.
 *   4. ONE ROW, NO GROWTH: the fixed bar is ONE row and its height is IDENTICAL whether the chip
 *      shows or hides -- otherwise it would resize across the micro<->meso boundary, the very drift
 *      the position:fixed pin exists to prevent. Zero horizontal overflow at 360 and 390.
 *      (plant: let the mock label wrap -> the squeezed mock CTA grows the bar -> caught.)
 *   5. SEMANTICS PRESERVED: the mock CTA and the Tools FAB stay reachable with the chip in the row
 *      (the shipped FAB-fix must not regress).
 *   6. TOUCH-COMPLETE JUDGMENT: at the drill judgment moment the Missed/Shaky/Solid buttons clear the
 *      44px floor at 360 and 390.                                          (plant: shrink them -> caught)
 *   7. LABEL IN NAME (WCAG 2.5.3): the accessible name CONTAINS the visible kicker text.
 *
 * Real input only (page.mouse.click / document.elementFromPoint), never el.click(); floors measured
 * off the LAYOUT box (offsetHeight), scroll-independent.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/mobile_nextup.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const fails = [];
function ok(name, cond, detail) {
  console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
  if (!cond) fails.push(name);
}

/* fresh app on the walk pane (localStorage cleared -> the ladder recommends the drill = meso) */
async function freshWalk(page) {
  await B.gotoApp(page, HTML);
  await page.evaluate(() => localStorage.clear());
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);
  await B.settle(page);
}

/* measure the chip + bar + neighbours in one shot (light DOM, so elementFromPoint is enough) */
const SNAP = () => {
  const vw = innerWidth, vh = innerHeight;
  const R = (el) => {
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const hit = (r.width && r.height && cx >= 0 && cy >= 0 && cx < vw && cy < vh) ? document.elementFromPoint(cx, cy) : null;
    return { exists: true, hidden: el.hidden === true, display: cs.display, w: Math.round(r.width), h: Math.round(r.height),
      offH: el.offsetHeight, reaches: !!hit && (hit === el || el.contains(hit)),
      hitId: hit ? (hit.id || (hit.className && hit.className.toString ? hit.className.toString().slice(0, 16) : '')) : null };
  };
  const bar = document.querySelector('.sidebar .mockcta');
  const chip = document.getElementById('ndm');
  return {
    overflowX: document.documentElement.scrollWidth - vw,
    barH: bar ? Math.round(bar.getBoundingClientRect().height) : null,
    chip: R(chip), chipText: chip ? chip.textContent.replace(/\s+/g, ' ').trim() : null,
    chipAria: chip ? chip.getAttribute('aria-label') : null,
    chipKicker: chip && chip.querySelector('.nd-m-k') ? chip.querySelector('.nd-m-k').textContent.trim() : null,
    mock: R(document.getElementById('mockopen')), tools: R(document.getElementById('toolsfab')),
  };
};

/* bar height with the chip FORCE-hidden, same pane -- isolates the chip's height contribution */
const BAR_H_CHIP_HIDDEN = () => {
  const chip = document.getElementById('ndm'); const was = chip.hidden;
  chip.hidden = true;
  const h = Math.round(document.querySelector('.sidebar .mockcta').getBoundingClientRect().height);
  chip.hidden = was;
  return h;
};

(async () => {
  const errs = [];
  const browser = await chromium.launch(B.launchOpts());

  for (const w of [360, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => errs.push('[' + w + '] pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('[' + w + '] console: ' + m.text()); });

    /* ---- 1. APPEARS ON MESO ---- */
    await freshWalk(page);
    const s = await page.evaluate(SNAP);
    ok('[' + w + '] chip is shown on meso (fresh walk recommends the drill)', s.chip.exists && !s.chip.hidden && s.chip.display !== 'none', JSON.stringify(s.chip));
    ok('[' + w + '] chip clears the 44px tap floor', s.chip.exists && s.chip.offH >= 44, JSON.stringify(s.chip));
    ok('[' + w + '] chip is reachable by a real hit-test at its painted centre', s.chip.reaches === true, JSON.stringify(s.chip));

    /* ---- 4. ONE ROW, NO GROWTH + no overflow ---- */
    ok('[' + w + '] zero horizontal overflow with the chip in the bar', s.overflowX <= 0, 'overflowX=' + s.overflowX);
    ok('[' + w + '] the bottom bar is ONE row (<=80px)', s.barH !== null && s.barH <= 80, 'barH=' + s.barH);
    const hHidden = await page.evaluate(BAR_H_CHIP_HIDDEN);
    ok('[' + w + '] bar height is IDENTICAL whether the chip shows or hides (chip adds no height)', Math.abs(s.barH - hHidden) <= 1, 'shown=' + s.barH + ' hidden=' + hHidden);

    /* ---- 5. SEMANTICS PRESERVED ---- */
    ok('[' + w + '] the mock CTA stays reachable with the chip present', s.mock.reaches === true, JSON.stringify(s.mock));
    ok('[' + w + '] the Tools FAB stays reachable with the chip present', s.tools.reaches === true, JSON.stringify(s.tools));

    /* ---- 7. LABEL IN NAME (WCAG 2.5.3): accessible name contains the visible kicker ---- */
    ok('[' + w + '] accessible name contains the visible kicker (WCAG 2.5.3)',
      !!(s.chipAria && s.chipKicker && s.chipAria.indexOf(s.chipKicker) !== -1),
      'aria="' + s.chipAria + '" visible="' + s.chipKicker + '"');

    /* ---- 2. NAVIGATES: a REAL tap runs flowGo ---- */
    const box = await page.evaluate(() => { const c = document.getElementById('ndm'); if (!c || c.hidden) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, rec: (function () { try { var n = nextUp(); return n && n.rec ? n.rec.tab : null; } catch (e) { return null; } })() }; });
    let navTo = null;
    if (box) { await page.mouse.click(box.x, box.y); await B.settle(page); navTo = await page.evaluate(() => { const b = document.querySelector('.seg button.on'); return b ? b.getAttribute('data-tab') : null; }); }
    ok('[' + w + '] a real tap on the chip navigates to the recommended target (flowGo)', !!box && navTo === box.rec, 'tapped, active tab=' + navTo + ' expected=' + (box ? box.rec : '(no chip)'));

    /* ---- 3. HIDES ON MICRO (drill mid-drill) ---- */
    await freshWalk(page);
    await page.evaluate(() => window.switchTab('drill'));
    await B.settle(page);
    const micro = await page.evaluate(() => { const c = document.getElementById('ndm'); return { hidden: c.hidden, tier: (function () { try { return nextUp().tier; } catch (e) { return '?'; } })() }; });
    ok('[' + w + '] chip is hidden on the drill mid-drill (micro -- the pane owns momentum)', micro.hidden === true, JSON.stringify(micro));

    /* ---- 6. TOUCH-COMPLETE JUDGMENT: grade buttons clear the 44px floor ---- */
    await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.querySelector('.qq'); }, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => { const r = document.querySelector('#drill deep-drill').shadowRoot; const z = (ms) => new Promise((x) => setTimeout(x, ms)); let g = 0; while (r.getElementById('adv') && g++ < 25) { r.getElementById('adv').click(); await z(6); } });
    await B.settle(page);
    const judge = await page.evaluate(() => {
      const dr = document.querySelector('#drill deep-drill'), r = dr.shadowRoot;
      const F = (id) => { const el = r.getElementById(id); return el ? el.offsetHeight : null; };
      return { atJudgment: dr.atJudgment ? dr.atJudgment() : null, jm: F('jm'), js: F('js'), jg: F('jg') };
    });
    ok('[' + w + '] reached the drill judgment moment', judge.atJudgment === true, JSON.stringify(judge));
    ok('[' + w + '] grade buttons (Missed/Shaky/Solid) clear the 44px floor at the judgment moment',
      judge.jm >= 44 && judge.js >= 44 && judge.jg >= 44, JSON.stringify(judge));

    await page.close();
  }

  /* ============================ PLANTS (watched red) ============================
     Each re-breaks the app at runtime and DEMANDS the matching probe go red, so no assertion above
     is one that cannot fail. */
  {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });

    /* PLANT 1 -- hide the chip: the reachability hit-test must stop finding it. */
    await freshWalk(page);
    const p1 = await page.evaluate(() => {
      const c = document.getElementById('ndm'); const prev = c.style.display; c.style.display = 'none';
      const r = c.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.max(1, Math.round(r.left + r.width / 2)), Math.max(1, Math.round(r.top + r.height / 2)));
      c.style.display = prev;
      return { reachableWhenHidden: !!hit && (hit === c || c.contains(hit)) };
    });
    ok('[plant] hiding the chip makes it unreachable (the reachability probe can go red)', p1.reachableWhenHidden === false, JSON.stringify(p1));

    /* PLANT 2 -- let the mock label wrap: with the chip squeezing the mock CTA at 360, a wrapped
       label grows the mock button and thus the fixed bar -> the one-row / no-growth probe must catch it. */
    const shown = await page.evaluate(() => Math.round(document.querySelector('.sidebar .mockcta').getBoundingClientRect().height));
    const p2 = await page.evaluate(() => {
      const st = document.createElement('style'); st.id = '__nc_wrap';
      st.textContent = '@media(max-width:919px){.sidebar .mockcta .mockbtn .mb-lbl{white-space:normal !important}}';
      document.head.appendChild(st);
      return Math.round(document.querySelector('.sidebar .mockcta').getBoundingClientRect().height);
    });
    await page.evaluate(() => { const s = document.getElementById('__nc_wrap'); if (s) s.remove(); });
    ok('[plant] removing the mock-label nowrap grows the bar past one row (the no-growth probe can go red)',
      p2 > 80 && p2 > shown + 1, 'baseline=' + shown + ' planted=' + p2 + ' (expected planted >80 and > baseline)');

    /* PLANT 3 -- shrink the grade buttons: the judgment floor probe must catch it. */
    await page.evaluate(() => window.switchTab('drill'));
    await B.settle(page);
    await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.querySelector('.qq'); }, null, { timeout: 15000 }).catch(() => {});
    await page.evaluate(async () => { const r = document.querySelector('#drill deep-drill').shadowRoot; const z = (ms) => new Promise((x) => setTimeout(x, ms)); let g = 0; while (r.getElementById('adv') && g++ < 25) { r.getElementById('adv').click(); await z(6); } });
    await B.settle(page);
    const p3 = await page.evaluate(() => {
      const r = document.querySelector('#drill deep-drill').shadowRoot;
      const st = document.createElement('style');
      st.textContent = '.judge button{min-height:0 !important;padding:0 !important;font-size:1px !important;line-height:1 !important}';
      r.appendChild(st);
      const jg = r.getElementById('jg');
      return jg ? jg.offsetHeight : null;
    });
    ok('[plant] shrinking the grade buttons drops them below the 44px floor (the judgment probe can go red)', p3 !== null && p3 < 44, 'planted jg offsetHeight=' + p3);

    await page.close();
  }

  ok('zero console/page errors across the run', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('MOBILE NEXTUP: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
