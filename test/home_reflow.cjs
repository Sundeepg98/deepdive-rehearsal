#!/usr/bin/env node
/* ===================== THE HOME REFLOWS, AND CLIPPING IS DETECTED =====================
 *
 * WHAT IT CATCHES, and why nothing here could catch it before.
 *
 * The usual reflow predicate is `documentElement.scrollWidth > clientWidth`. In a FIXED SHELL it
 * is blind. A position:fixed bar with `overflow:hidden` -- which every app bar is -- does not
 * GROW the document when its contents are too wide: it CLIPS them. The document stays exactly
 * the viewport's width, the predicate stays false, and a control has silently left the screen.
 * Measured on this very wave before this check existed: at 390px the home's fixed top bar carried
 * "Search / Shortcuts / Theme" and the Theme button's right edge landed at 421px inside a 390px
 * bar -- unreachable at any scroll position -- while scrollWidth reported 390 and every existing
 * arm was green. That is the defect class this file exists for.
 *
 * SO IT MEASURES GEOMETRY, NOT SCROLL. For every rendered element on the home route it compares
 * the element's painted box against the box of its nearest CLIPPING ancestor (the nearest
 * ancestor whose computed overflow-x is hidden/clip/auto/scroll, or the viewport). Anything whose
 * right edge is past its clipper -- and which is not itself inside something that scrolls
 * horizontally on purpose -- is unreachable, and unreachable is the finding.
 *
 * WCAG 1.4.10 says content reflows to 320px CSS pixels without loss. "Without loss" is exactly
 * "nothing got clipped away", which is what this measures rather than the proxy.
 *
 * TWO PLANTED MUTANTS, EVERY RUN, because this repo has shipped checks that could not fail:
 *   1. a wide child forced into the fixed top bar    -> must be caught
 *   2. a wide child forced into the document flow    -> must be caught
 * If either goes undetected the check ABORTS rather than report a green it did not earn. Mutant 1
 * is the one the scrollWidth predicate cannot see, and it is planted first for that reason.
 *
 * SCOPE: the #home route, at 320 / 390 / 500 / 700 / 900 CSS px, both themes. The topic routes
 * have their own geometry guards (fold_budget, chrome_metrics, sidebar_geometry, click_drift).
 *
 * WHY THE WIDTH LIST GREW (2026-08-01). The original list was 320 and 390 -- and the status
 * census, the one bar in this app that actually clipped, is `display:none` at BOTH of them. So
 * the check was right about the mechanism and blind about the instance: it tested a fixed-bar
 * clipping rule at the only two widths where the fixed bar in question does not exist, while the
 * census silently cut "Offline -- nothing leaves this file" off itself everywhere between 420 and
 * 790. A check has to be sampled where the thing it guards is alive; 500/700/900 are the band the
 * census renders in, and 900 also covers the widest layout that still has fixed phone chrome.
 *
 * Usage: node test/home_reflow.cjs [file]
 * Exit:  0 = pass, 1 = FAIL */
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || process.cwd() + '/dist/index.html';

/* Returns every element whose painted right edge escapes its nearest clipping ancestor.
   Runs in the page. Deliberately geometric: no scroll, no overflow heuristics on the document. */
const OVERSPILL = () => {
  const CLIPS = ['hidden', 'clip', 'auto', 'scroll'];
  const out = [];
  const nodes = document.querySelectorAll('#home *, .hm-rail *, .hm-tabs *, .hm-status *, .hm-rail, .hm-tabs, .hm-status');
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;                 /* not rendered */
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.position === 'absolute') continue;

    /* the nearest ancestor that CLIPS horizontally; the viewport if there is none */
    let clip = null, p = el.parentElement;
    while (p && p !== document.documentElement) {
      const pcs = getComputedStyle(p);
      if (CLIPS.includes(pcs.overflowX)) { clip = { el: p, cs: pcs, r: p.getBoundingClientRect() }; break; }
      p = p.parentElement;
    }
    /* a clipper that SCROLLS horizontally is a designed affordance (a chip strip), not a loss --
       the content is reachable. Only hidden/clip actually destroys reach. */
    if (clip && (clip.cs.overflowX === 'auto' || clip.cs.overflowX === 'scroll')
        && clip.el.scrollWidth > clip.el.clientWidth + 1) continue;

    const bound = clip ? clip.r.right : window.innerWidth;
    const over = Math.round(r.right - bound);
    if (over > 1) {
      out.push({
        sel: (el.tagName.toLowerCase() + '.' + (el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.')).slice(0, 46),
        over, right: Math.round(r.right), bound: Math.round(bound),
        clipper: clip ? ((clip.el.className || clip.el.tagName).toString().split(/\s+/)[0]) : 'viewport',
        text: (el.textContent || '').trim().slice(0, 28),
      });
    }
  }
  /* de-dup: a clipped parent reports its clipped children too; keep the widest per selector */
  const best = new Map();
  for (const o of out) if (!best.has(o.sel) || best.get(o.sel).over < o.over) best.set(o.sel, o);
  return [...best.values()].sort((a, b) => b.over - a.over).slice(0, 8);
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const out = [];
  let aborted = null;

  for (const w of [320, 390, 500, 700, 900]) {
    for (const theme of ['light', 'dark']) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w, height: 720 });
      await page.addInitScript((t) => { try { localStorage.setItem('ddr.v1.theme', JSON.stringify(t)); } catch (e) {} }, theme);
      await B.gotoApp(page, HTML, { hash: '#home' });
      await B.until(page, () => !!document.querySelector('#home .hm-continue'), null, B.ACT_MS, 'home rendered');

      const spill = await page.evaluate(OVERSPILL);
      out.push(['[' + w + '/' + theme + '] nothing on the home is clipped out of reach',
        spill.length === 0,
        spill.map((s) => s.sel + ' +' + s.over + 'px past its ' + s.clipper +
          ' (right ' + s.right + ' vs ' + s.bound + ')' + (s.text ? ' "' + s.text + '"' : '')).join(' | ')]);

      /* the document itself must not gain a horizontal scrollbar either -- the WEAKER of the two
         predicates, kept because a wave can break it independently of clipping */
      const doc = await page.evaluate(() => ({ dw: document.documentElement.scrollWidth, ww: innerWidth }));
      out.push(['[' + w + '/' + theme + '] the document does not scroll horizontally',
        doc.dw <= doc.ww + 1, 'document ' + doc.dw + ' vs viewport ' + doc.ww]);

      /* the census is the bar this check was written for and could not previously see */
      if (w >= 420) {
        const cen = await page.evaluate(() => {
          const s = document.querySelector('.hm-status');
          if (!s || !s.getClientRects().length) return null;
          return { over: Math.round(s.scrollWidth - s.clientWidth), w: Math.round(s.clientWidth) };
        });
        out.push(['[' + w + '/' + theme + '] the status census fits the bar it is painted in',
          !cen || cen.over <= 1, cen ? cen.over + 'px of content clipped inside a ' + cen.w + 'px bar' : 'not rendered']);
      }

      /* ---- MUTANT 1: the one scrollWidth cannot see ---- */
      if (w === 320 && theme === 'light') {
        const m1 = await page.evaluate(() => {
          const bar = document.querySelector('.hm-rail');
          if (!bar) return { err: 'no .hm-rail to plant into' };
          const d = document.createElement('span');
          d.id = '_mutant1'; d.textContent = 'x'; d.style.cssText = 'display:inline-block;width:900px;flex:none';
          bar.appendChild(d);
          return { docBefore: document.documentElement.scrollWidth, ww: innerWidth };
        });
        const caught = await page.evaluate(OVERSPILL);
        const docAfter = await page.evaluate(() => document.documentElement.scrollWidth);
        await page.evaluate(() => { const d = document.getElementById('_mutant1'); if (d) d.remove(); });
        if (m1.err) { aborted = m1.err; }
        else if (!caught.length) {
          aborted = 'MUTANT 1 UNDETECTED: a 900px child inside the fixed top bar was not reported. '
            + 'This is the whole reason this file exists -- documentElement.scrollWidth read '
            + docAfter + ' against a ' + m1.ww + 'px viewport, i.e. the usual predicate stayed '
            + 'GREEN while a control sat off-screen.';
        }
      }

      /* ---- MUTANT 2: ordinary in-flow overflow ---- */
      if (w === 320 && theme === 'light') {
        await page.evaluate(() => {
          const host = document.querySelector('#home .hm-continue');
          const d = document.createElement('div');
          d.id = '_mutant2'; d.style.cssText = 'width:900px;height:8px';
          if (host) host.appendChild(d);
        });
        const caught2 = await page.evaluate(OVERSPILL);
        await page.evaluate(() => { const d = document.getElementById('_mutant2'); if (d) d.remove(); });
        if (!caught2.length) aborted = 'MUTANT 2 UNDETECTED: a 900px in-flow child was not reported.';
      }

      await page.close();
    }
  }

  await browser.close();

  if (aborted) {
    console.log('=== HOME REFLOW ===');
    console.log('SELF-TEST ABORT -- the analyser does not do what it claims:');
    console.log('  ' + aborted);
    return B.finish(1, 'HOME REFLOW: FAIL (self-test)');
  }

  const bad = out.filter((o) => !o[1]);
  for (const [label, pass, detail] of out) console.log((pass ? '  PASS  ' : '  FAIL  ') + label + (pass ? '' : '  -- ' + detail));
  console.log('\n  2 planted mutants detected (a wide child in the FIXED bar -- invisible to '
    + 'documentElement.scrollWidth -- and a wide child in the flow)');
  if (bad.length) return B.finish(1, 'HOME REFLOW: FAIL (' + bad.length + ')');
  return B.finish(0, 'HOME REFLOW: PASS  (' + out.length + ' assertions across 320/390 x light/dark, '
    + 'measured as clipping geometry rather than document scroll)');
})();
