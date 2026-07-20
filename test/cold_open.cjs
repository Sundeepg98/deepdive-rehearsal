#!/usr/bin/env node
/*
 * COLD-OPEN CLARITY (audit #13) -- the first minute under-stated identity: "system design" appeared
 * NOWHERE above the fold, and the home led with undefined jargon. A candidate who got the link before
 * an interview spent 60 seconds deciding what this even is. The fix adds one quiet value-prop lead
 * (shown to COLD users only) that names what the app is, above the fold, and de-jargons the cold
 * Start CTA.
 *
 * Asserts the cold home shows a value-prop lead that names "system design" ABOVE THE FOLD, that the
 * cold Start CTA is de-jargoned (no bare "Drill the probes"), and -- the gating design -- that once
 * the user is ENGAGED the lead is gone (the home's one-line-of-state / one-decision discipline is not
 * taxed for a returning user). Carries a live PLANT (hide the lead -> the above-fold value prop is
 * gone). This guards STRUCTURE (present + above fold + cold-only); the exact words are the operator's
 * to review at the freeze gate.
 *
 * Watched RED against the pre-fix deliverable: the .hm-lead element does not exist -- no value prop.
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/cold_open.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

/* the cold home's value-prop lead: exists, names "system design", sits above the fold */
const LEAD = () => {
  const onHome = document.documentElement.dataset.view === 'home';
  const el = document.querySelector('#home .hm-lead');
  if (!el) return { onHome, exists: false };
  const r = el.getBoundingClientRect();
  return {
    onHome, exists: true,
    hasSystemDesign: /system[\s-]?design/i.test(el.textContent || ''),
    top: Math.round(r.top),
    aboveFold: r.height > 0 && r.top >= 0 && r.top < innerHeight,
  };
};

/* a GUARANTEED-fresh cold boot: clear storage, page.reload (a same-file hash goto is a same-document
   nav that keeps live state), land on #home. */
async function coldHome(page) {
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }).catch(() => {});
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(B.APP_READY, null, { timeout: B.READY_MS });
  await page.evaluate(() => { if (window.Router && document.documentElement.dataset.view !== 'home') Router.navigate('home'); });
  await B.settle(page);
}

(async () => {
  const fails = [], errs = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS ' : '  FAIL ') + name + (cond || !detail ? '' : '\n     -> ' + detail));
    if (!cond) fails.push(name);
  };
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await B.gotoApp(page, HTML, { hash: '#home' });
  await coldHome(page);

  const lead = await page.evaluate(LEAD);
  ok('the cold home is showing', lead.onHome === true, JSON.stringify(lead));
  ok('the cold home presents a value-prop lead', lead.exists === true, JSON.stringify(lead));
  ok('the lead names "system design" ABOVE THE FOLD (identity in the first minute)', lead.exists && lead.hasSystemDesign === true && lead.aboveFold === true, JSON.stringify(lead));

  /* LIVE PLANT: hide the lead -> the above-fold value prop is gone. Proves the check can go red. */
  const planted = await page.evaluate(() => {
    const el = document.querySelector('#home .hm-lead');
    if (!el) return { ran: false };
    const prev = el.style.display; el.style.display = 'none';
    const r = el.getBoundingClientRect();
    const visible = r.height > 0 && r.top < innerHeight;
    el.style.display = prev;
    return { ran: true, visibleWhenHidden: visible };
  });
  ok('[plant] hiding the lead removes the above-fold value prop (the check can go red)', planted.ran && planted.visibleWhenHidden === false, JSON.stringify(planted));

  /* the cold Start CTA is de-jargoned (the audit flagged "Drill the probes" as undefined jargon) */
  const ctaText = await page.evaluate(() => { const c = document.querySelector('#home .hm-cta .hm-cta-d'); return c ? c.textContent : null; });
  ok('the cold Start CTA is de-jargoned (no bare "Drill the probes")', !!ctaText && !/drill the probes/i.test(ctaText), JSON.stringify({ ctaText }));

  /* GATING: once ENGAGED, the lead is gone -- the returning user's lean home is not taxed. Grade one
     probe to become engaged, re-render the home, and assert the lead is absent. */
  await page.evaluate((t) => switchTab(t), 'drill');
  await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('adv'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot, s = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0; while (r.getElementById('adv') && g++ < 12) { r.getElementById('adv').click(); await s(3); }
    const jg = r.getElementById('jg'); if (jg) jg.click(); await s(40);
  });
  await page.evaluate(() => { if (window.Router) Router.navigate('home'); if (window.HomeView) HomeView.render(); });
  await B.settle(page);
  const engaged = await page.evaluate(() => ({ engaged: (typeof Panels !== 'undefined') ? Panels.engaged() : null, lead: !!document.querySelector('#home .hm-lead'), onHome: document.documentElement.dataset.view === 'home' }));
  ok('once ENGAGED, the home drops the lead (quiet for a returning user)', engaged.engaged === true && engaged.lead === false, JSON.stringify(engaged));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('COLD OPEN: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
