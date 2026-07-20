#!/usr/bin/env node
/*
 * TREND / COMPARE INTEGRITY (audit #7 + #21, direction D6 -- highest trust value).
 *
 * THE BUG (#7): a CPR1 session code carries date + drill/wb/mock/mixed tallies but NO topic id, and
 * sessStats measures the CURRENTLY ACTIVE topic. So studying caching (solid 18) on Monday and
 * sharding (solid 3) on Tuesday rendered as a red "regression -15" -- the app asserting a
 * value-judgment on a comparison the stored data does not support, default-on and silent, misfiring
 * for exactly the multi-topic studier its own "Next: <topic>" hand-off encourages.
 * THE FOOTGUN (#21): trend.hist was stored DOUBLE JSON-encoded (trendSave JSON.stringify'd, then
 * Store.set stringified again), the only key in the app that needed a second parse to read.
 *
 * THE FIX: topic-tag each point ({t,c}); compare ONLY same-topic same-basis; legacy untagged points
 * are DISCARDED, never misattributed (the W0 honest-discard precedent); store single-encoded with a
 * read-both/write-canonical migration.
 *
 * Watched RED against the pre-fix (fix-2) deliverable:
 *   - a legacy untagged point is compared to the live session -> a red cmp-bad regression (should be
 *     discarded);
 *   - {t,c} objects are unreadable by the old code, so same-topic points do NOT compare (should);
 *   - storage stays double-encoded (Store.get returns a string, not the array).
 *
 * Local: CHROME=$(node -e "console.log(require('playwright').chromium.executablePath())") \
 *          node test/trend_integrity.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const HI = 'CPR1.20260101.18-0-18-22.0-0-0.x-0-0.0-0-0';   /* a high-solid (18) prior session code */

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

  const boot = async () => {
    await B.gotoApp(page, HTML, { hash: '#walk' });
    await page.evaluate(() => localStorage.clear());
    await B.gotoApp(page, HTML, { hash: '#walk' });
    await B.enterApp(page);
  };
  const curId = () => page.evaluate(() => (typeof sessTopicId === 'function' && sessTopicId()) || (typeof TopicRegistry !== 'undefined' && TopicRegistry.current() && TopicRegistry.current().id) || null);
  /* grade ONE probe Solid on the drill -> live activity + a canonical dGot=1 record */
  const gradeOne = async () => {
    await page.evaluate((t) => switchTab(t), 'drill');
    await page.waitForFunction(() => { const d = document.querySelector('#drill deep-drill'); return d && d.shadowRoot && d.shadowRoot.getElementById('adv'); }, null, { timeout: B.ACT_MS }).catch(() => {});
    await page.evaluate(async () => {
      const r = document.querySelector('#drill deep-drill').shadowRoot; const s = (ms) => new Promise((x) => setTimeout(x, ms));
      let g = 0; while (r.getElementById('adv') && g++ < 20) { r.getElementById('adv').click(); await s(4); }   /* reveal to the judge row */
      const jg = r.getElementById('jg'); if (jg) jg.click(); await s(60);                                       /* grade Solid */
    });
  };
  /* open the session panel, return renderCompare's rendered output HTML */
  const compareHtml = () => page.evaluate(async () => {
    if (typeof openSession === 'function') openSession();
    await new Promise((r) => setTimeout(r, 160));
    const out = (typeof sessRoot !== 'undefined' && sessRoot) ? sessRoot.getElementById('sscmpout') : null;
    const html = out ? out.innerHTML : '';
    if (typeof closeSession === 'function') closeSession();
    return html;
  });

  /* ---- (a) LEGACY UNTAGGED point is DISCARDED, never painted as this topic's regression ---- */
  await boot();
  await gradeOne();
  /* seed a legacy DOUBLE-ENCODED code-string point (the exact pre-fix on-disk shape): high solid, no topic */
  await page.evaluate((code) => { Store.set('trend.hist', JSON.stringify([code])); }, HI);
  const cmpLegacy = await compareHtml();
  ok('legacy untagged history does not crash the compare', typeof cmpLegacy === 'string');
  ok('legacy untagged point is DISCARDED, not painted as a regression (no cmp-bad delta)', !/cmp-bad/.test(cmpLegacy), cmpLegacy.slice(0, 240));
  ok('untagged history + this live session -> the build-it-up hint, no false comparison', /cmp-hint/.test(cmpLegacy), cmpLegacy.slice(0, 240));

  /* ---- (b) a DIFFERENT topic's tagged point is not compared against this topic ---- */
  await boot();
  await gradeOne();
  await page.evaluate((code) => { Store.set('trend.hist', [{ t: '__other_topic__', c: code }]); }, HI);
  const cmpCross = await compareHtml();
  ok('a different topic\'s point is not painted as this topic\'s regression (no cmp-bad)', !/cmp-bad/.test(cmpCross), cmpCross.slice(0, 240));
  ok('cross-topic-only history -> the build-it-up hint (nothing same-topic to compare)', /cmp-hint/.test(cmpCross), cmpCross.slice(0, 240));

  /* ---- (c) SAME-topic tagged points DO compare (the fix must not break a legit trend) ---- */
  await boot();
  const id3 = await curId();
  await page.evaluate((tid) => { Store.set('trend.hist', [{ t: tid, c: 'CPR1.20260101.2-0-2-22.0-0-0.x-0-0.0-0-0' }, { t: tid, c: 'CPR1.20260102.5-0-5-22.0-0-0.x-0-0.0-0-0' }]); }, id3);
  await gradeOne();
  const cmpSame = await compareHtml();
  ok('same-topic tagged points DO produce a comparison (a delta / trend is rendered)', /cmp-(good|bad|same)|tr-row|cmp-head/.test(cmpSame), cmpSame.slice(0, 240));

  /* ---- (d) DOUBLE-ENCODE MIGRATION: trendCapture writes SINGLE-encoded storage ---- */
  await boot();
  await gradeOne();
  const enc = await page.evaluate(() => {
    if (typeof trendCapture === 'function') trendCapture();
    const raw = localStorage.getItem('ddr.v1.trend.hist');
    if (raw == null) return { raw: null };
    let once; try { once = JSON.parse(raw); } catch (e) { return { parseErr: String(e) }; }
    return { onceType: Array.isArray(once) ? 'array' : typeof once, sample: raw.slice(0, 90) };
  });
  ok('trend.hist is stored SINGLE-encoded (one parse yields the array, not a JSON string)', enc.onceType === 'array', JSON.stringify(enc));

  ok('zero console/page errors', errs.length === 0, errs.slice(0, 4).join(' | '));

  await browser.close();
  const pass = fails.length === 0;
  console.log('TREND INTEGRITY: ' + (pass ? 'PASS' : 'FAIL (' + fails.join('; ') + ')'));
  process.exit(pass ? 0 : 1);
})();
