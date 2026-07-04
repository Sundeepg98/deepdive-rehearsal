#!/usr/bin/env node
/*
 * Topic-contract gate: every registered topic must conform to the shared shape,
 * so adding a topic is pure content-filling -- a malformed topic fails the build
 * instead of shipping.  Per topic, this verifies:
 *   - identity has index / group / title / h1 / locatorTail / thesis, and group
 *     is a real TOPIC_GROUPS id
 *   - data carries all 10 slices (walk drill wb sys trade model num rf open bank)
 *   - drill.cards is a >= MIN_CARDS array; the three core tiers (SDE2/SDE3/Staff)
 *     are each present with >= MIN_PER_CORE cards; no unexpected tier labels
 *   - every drill card has a signal and a question
 * Exits non-zero (listing the offending topics) on any violation.
 *
 * Usage (matches the other browser checks; run by test/check_all.py):
 *   node test/topic_contract.cjs [path/to/build.html]
 *   CHROME=/path/to/chrome node test/topic_contract.cjs
 */
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const CFG = {
  VIEWS: ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'bank'],
  IDENTITY_FIELDS: ['index', 'group', 'title', 'h1', 'locatorTail', 'thesis'],
  CORE_TIERS: ['SDE2', 'SDE3', 'Staff'],
  ALLOWED_TIERS: ['SDE2', 'SDE3', 'Staff', 'EXTEND'],
  MIN_CARDS: 18,
  MIN_PER_CORE: 3
};

(async () => {
  const launch = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  if (process.env.CHROME) launch.executablePath = process.env.CHROME;
  const browser = await chromium.launch(launch);
  const page = await browser.newPage();
  const perr = [];
  page.on('pageerror', e => perr.push('pageerror: ' + e.message));
  await page.goto('file://' + path.resolve(HTML));
  await page.waitForTimeout(300);

  const rep = await page.evaluate((cfg) => {
    if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
    var groupIds = (typeof TOPIC_GROUPS !== 'undefined') ? TOPIC_GROUPS.map(function (g) { return g.id; }) : [];
    var problems = [];
    var ids = TopicRegistry.ids();
    ids.forEach(function (id) {
      var t = TopicRegistry.get(id), idn = (t && t.identity) || {}, data = (t && t.data) || {};
      cfg.IDENTITY_FIELDS.forEach(function (f) {
        if (idn[f] === undefined || idn[f] === null || idn[f] === '') problems.push(id + ': missing identity.' + f);
      });
      if (idn.group && groupIds.length && groupIds.indexOf(idn.group) === -1) problems.push(id + ': group "' + idn.group + '" is not a TOPIC_GROUPS id');
      cfg.VIEWS.forEach(function (v) { if (!data[v]) problems.push(id + ': missing "' + v + '" slice'); });
      var cards = (data.drill && Array.isArray(data.drill.cards)) ? data.drill.cards : null;
      if (!cards) { problems.push(id + ': drill.cards is not an array'); return; }
      if (cards.length < cfg.MIN_CARDS) problems.push(id + ': ' + cards.length + ' drill cards (< ' + cfg.MIN_CARDS + ')');
      var tc = {};
      cards.forEach(function (c) { tc[c.tier] = (tc[c.tier] || 0) + 1; });
      cfg.CORE_TIERS.forEach(function (tr) {
        if (!tc[tr]) problems.push(id + ': no "' + tr + '" cards');
        else if (tc[tr] < cfg.MIN_PER_CORE) problems.push(id + ': only ' + tc[tr] + ' "' + tr + '" cards (< ' + cfg.MIN_PER_CORE + ')');
      });
      Object.keys(tc).forEach(function (tr) { if (cfg.ALLOWED_TIERS.indexOf(tr) === -1) problems.push(id + ': unexpected tier "' + tr + '"'); });
      cards.forEach(function (c, i) {
        if (!c.signal) problems.push(id + ': card ' + i + ' missing signal');
        if (!c.q) problems.push(id + ': card ' + i + ' missing q');
      });
    });
    return { count: ids.length, problems: problems };
  }, CFG);

  await browser.close();
  if (rep.fatal) { console.log('TOPIC CONTRACT: FAIL (' + rep.fatal + ')'); process.exit(1); }
  if (perr.length) { console.log('TOPIC CONTRACT: FAIL (page errors: ' + perr.join('; ') + ')'); process.exit(1); }
  if (rep.problems.length) {
    console.log('TOPIC CONTRACT: FAIL (' + rep.problems.length + ' issue(s) across ' + rep.count + ' topics)');
    rep.problems.slice(0, 25).forEach(function (p) { console.log('  - ' + p); });
    process.exit(1);
  }
  console.log('TOPIC CONTRACT: PASS  (' + rep.count + ' topics: all slices + group + tiers + cards conform)');
  process.exit(0);
})();
