#!/usr/bin/env node
/* W-ADDRESSES cycle 10, R24 -- THE WRAP SWEEP, width by width, across the whole <=419px band.
   Reads the gauge key's rendered ROW COUNT and HEIGHT at every integer width in a declared band,
   on whatever deliverable it is handed. Nothing in the worktree is written. */
const { chromium } = require('playwright');
const path = require('path');
/* RESOLVED RELATIVE TO THIS FILE, because this probe lives in the repository and is meant to be
   re-runnable -- including on a CI runner, which is where the wrap point turned out to differ.
   It carried an absolute D:\ path for exactly one dispatch before that mattered. */
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const HTML = process.argv[2];
const LO = Number(process.argv[3] || 320);
const HI = Number(process.argv[4] || 440);

const SEED = () => {
  TopicRegistry.ids().slice(0, 12).forEach((id) => {
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    cards.forEach((c, i) => { map[keys[i]] = (i % 7 === 0) ? 2 : 3; });
    const shk = Object.keys(map).filter((k) => map[k] < 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: cards.length - shk, shk: shk, done: cards.length, tot: cards.length,
      revisit: ['idempotency', 'backpressure'], cards: map, cv: 1, ts: Date.now() }));
  });
};

const READ = () => {
  const k = document.querySelector('.hm-alt .hm-key');
  if (!k) return null;
  const kb = k.getBoundingClientRect();
  const cs = getComputedStyle(k);
  const ks = [...k.querySelectorAll('.hm-k')].filter((x) => x.getClientRects().length);
  const tops = [...new Set(ks.map((x) => Math.round(x.getBoundingClientRect().top)))]
    .sort((a, b) => a - b);
  return {
    n: ks.length,
    rows: tops.length,
    h: Math.round(kb.height * 100) / 100,
    mt: Math.round(parseFloat(cs.marginTop) * 100) / 100,
    labels: ks.map((x) => (x.textContent || '').trim()),
    perRow: tops.map((t) => ks.filter((x) => Math.round(x.getBoundingClientRect().top) === t)
      .map((x) => (x.textContent || '').trim()).join('|')),
    keel: document.querySelectorAll('.hm-alt .hm-seg.keel').length,
  };
};

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await B.gotoApp(page, HTML, { hash: '#home' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.evaluate(SEED);
  await B.gotoApp(page, HTML, { hash: '#home' });
  await B.until(page, () => !!document.querySelector('#home .hm-alt'), null, B.ACT_MS, 'home');
  await B.settle(page);

  const rows = [];
  for (let w = LO; w <= HI; w++) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const r = await page.evaluate(READ);
    rows.push([w, r]);
  }
  await browser.close();

  console.log('HTML: ' + HTML);
  console.log('swatches: ' + rows[0][1].n + '  labels: ' + JSON.stringify(rows[0][1].labels)
    + '  keel segments: ' + rows[0][1].keel);
  let prev = null;
  for (const [w, r] of rows) {
    const sig = r.rows + '/' + r.h + '/' + r.mt;
    if (sig !== prev) {
      console.log('  w=' + w + '  rows=' + r.rows + '  keyH=' + r.h + '  marginTop=' + r.mt
        + '  cost=' + Math.round((r.h + r.mt) * 100) / 100 + '  ' + JSON.stringify(r.perRow));
      prev = sig;
    }
  }
  const at = (w) => rows.find((x) => x[0] === w);
  for (const w of [320, 360, 363, 364, 375, 390, 412, 419]) {
    const e = at(w);
    if (e) {
      console.log('  AT ' + w + ': rows=' + e[1].rows + ' keyH=' + e[1].h + ' mt=' + e[1].mt
        + ' cost=' + Math.round((e[1].h + e[1].mt) * 100) / 100);
    }
  }
})();
