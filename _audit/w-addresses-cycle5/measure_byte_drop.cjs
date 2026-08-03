'use strict';
/* W-ADDRESSES cycle 5, judge item 3 -- RE-RUN THE DROP AND QUOTE WHAT IT MEASURES.
 *
 * The ledger and print_truth.cjs both carried "14 bytes of 125,089" for the same experiment, and
 * the figure reproduced under NEITHER of the two mutations the sentences describe. This file is
 * the arithmetic, taken standalone with ARM F's own method -- the same seed, the same waits, the
 * same warm-up render, the same printBackground:false -- so the numbers are comparable to the
 * ones in the check's PASS line rather than merely near them.
 *
 * THREE CONFIGURATIONS, because the ledger's sentence and the code comment's list are DIFFERENT
 * EXPERIMENTS with different answers:
 *   FULL     the OFF override exactly as print_truth.cjs applies it -- the baseline delta
 *   MINUS6   the SIX grade-bearing selectors of GRADE_SEL dropped from OFF (the ledger's sentence)
 *   MINUS5   the FIVE the code comment lists (no .hm-gr-t) dropped from OFF
 * Each is measured twice, so the noise of the renderer is reported beside every delta rather than
 * assumed to be zero.
 */
const { chromium } = require('playwright');
const B = require('./../../test/_boot.cjs');

const HTML = process.argv[2] || 'deepdive_content_pipeline_rehearsal.html';

const LATTICE_SEED = () => {
  localStorage.clear();
  let j = -1;
  TopicRegistry.ids().forEach((id, k) => {
    if (k % 3 === 2) return;
    j++;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (j % 4) / 4;
    const bad = (Math.floor(j / 4) % 2) ? 1 : 2;
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: 1750000000000 }));
  });
};

const GAUGE = ['.hm-seg', '.hm-seg::after', '.hm-seg.open', '.hm-seg.keel::before',
  '.hm-k i', '.hm-k i::after'];
const GRADE6 = ['.hm-gr-t', '.hm-room-n', '.hm-room-bar', '.hm-room-bar i', '.ix-goal-bar',
  '.ix-goal-bar span'];
const GRADE5 = ['.hm-room-n', '.hm-room-bar', '.hm-room-bar i', '.ix-goal-bar',
  '.ix-goal-bar span'];
const off = (sels) => sels.join(',')
  + '{print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}';

const CONFIGS = [
  ['FULL    (OFF as shipped: gauge + all six grade selectors)', GAUGE.concat(GRADE6)],
  ['MINUS6  (the six GRADE_SEL selectors dropped from OFF)', GAUGE],
  ['MINUS5  (the five the code comment lists dropped from OFF)', GAUGE.concat(['.hm-gr-t'])],
];

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext();
  const hp = await ctx.newPage();
  await B.gotoApp(hp, HTML, { hash: '#home' });
  await hp.evaluate(LATTICE_SEED);
  await B.gotoApp(hp, HTML, { hash: '#home' });
  await B.until(hp, () => !!document.querySelector('#home .hm-alt .hm-seg.keel'), null, B.ACT_MS,
    'a gauge with keel marks on it');
  await B.until(hp, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,
    'the boot splash to be REMOVED');
  await B.settle(hp);
  const shot = async (css) => {
    await hp.evaluate((c) => {
      const old = document.getElementById('_r9'); if (old) old.remove();
      if (!c) return;
      const s = document.createElement('style'); s.id = '_r9'; s.textContent = c;
      document.head.appendChild(s);
    }, css || '');
    await B.settle(hp);
    return (await hp.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: false })).length;
  };
  await shot(null);                       /* warm-up: the first pdf() of a page differs by ~7k */
  const on1 = await shot(null);
  const on2 = await shot(null);
  console.log('exact (no override): ' + on1 + ' / ' + on2
    + '   noise ' + Math.abs(on1 - on2));
  const base = { on1, on2 };
  const rows = [];
  for (const [name, sels] of CONFIGS) {
    const o1 = await shot(off(sels));
    const o2 = await shot(off(sels));
    const delta = Math.min(base.on1, base.on2) - Math.max(o1, o2);
    rows.push({ name, o1, o2, delta, noise: Math.abs(o1 - o2) });
    console.log(name + '  economy ' + o1 + ' / ' + o2 + '  noise ' + Math.abs(o1 - o2)
      + '  delta ' + delta);
  }
  const full = rows[0].delta;
  console.log('');
  for (const r of rows.slice(1)) {
    console.log(r.name.split(' ')[0] + ': the selectors are worth ' + (full - r.delta)
      + ' bytes of ' + full + ' ('
      + ((full - r.delta) / full * 100).toFixed(3) + '% of the delta)');
  }
  await browser.close();
})();
