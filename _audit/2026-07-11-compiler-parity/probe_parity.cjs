// Measure population of every slice, for THE 8 vs THE 38, straight out of TopicRegistry
// in the built app. This is the apples-to-apples the gate refuses to make.
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || path.join(__dirname, '..', '..', 'dist', 'index.html');
const HAND8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(HTML));
  await page.waitForTimeout(400);

  const rows = await page.evaluate(() => {
    const n = (x) => (Array.isArray(x) ? x.length : (x && typeof x === 'object') ? Object.keys(x).length : 0);
    return TopicRegistry.ids().map((id) => {
      const t = TopicRegistry.get(id), d = (t && t.data) || {};
      const drill = d.drill || {}, sys = d.sys || {}, model = d.model || {}, bank = d.bank || {};
      const cards = drill.cards || [];
      const pivots = sys.pivots || [];
      return {
        id,
        cards: cards.length,
        follows: cards.reduce((a, c) => a + n(c.f), 0),
        senior: cards.filter((c) => c.senior).length,
        tierNotes: n(drill.tierNotes),
        speak: (drill.speak || []).filter(Boolean).length,
        sysStages: n(sys.stages),
        pivots: pivots.length,
        pivotAns: pivots.filter((p) => p.a && p.a.length).length,
        chipBloat: pivots.filter((p) => /\n/.test(p.chip || '') || (p.chip || '').length > 120).length,
        modelAns: n(model.answers),
        modelBeats: (model.answers || []).reduce((a, x) => a + n(x.beats), 0),
        mockBeats: n(bank.mockBeats),
        curveballs: n(bank.curveballs),
        frames: n(bank.frames),
        cmpNotes: n((t.identity || {}).cmpNotes),
        wbSteps: n((d.wb || {}).steps),
        walkSteps: n((d.walk || {}).steps),
        modelScript: n((d.walk || {}).modelScript),
        numInputs: n((d.num || {}).inputs),
        tradeDec: n((d.trade || {}).decisions),
        rfFlags: n((d.rf || {}).flags),
        openCards: n((d.open || {}).cards),
      };
    });
  });
  await browser.close();

  const KEYS = ['cards', 'follows', 'senior', 'tierNotes', 'speak', 'sysStages', 'pivots', 'pivotAns', 'chipBloat',
    'modelAns', 'modelBeats', 'mockBeats', 'curveballs', 'frames', 'cmpNotes', 'wbSteps', 'walkSteps', 'modelScript',
    'numInputs', 'tradeDec', 'rfFlags', 'openCards'];
  const a = rows.filter((r) => HAND8.includes(r.id));
  const b = rows.filter((r) => !HAND8.includes(r.id));
  const avg = (set, k) => (set.reduce((s, r) => s + r[k], 0) / set.length);
  const min = (set, k) => Math.min(...set.map((r) => r[k]));

  console.log('total topics: %d   (the 8: %d, the 38: %d)\n', rows.length, a.length, b.length);
  console.log('%-12s | %-18s | %-18s | %s', 'slice', 'THE 8 (avg / min)', 'THE 38 (avg / min)', 'ratio');
  console.log('-'.repeat(74));
  for (const k of KEYS) {
    const a8 = avg(a, k), a38 = avg(b, k);
    const ratio = a8 === 0 ? '--' : (a38 / a8 * 100).toFixed(0) + '%';
    const flag = (a8 > 0 && a38 / a8 < 0.5) ? '  <<< GAP' : (k === 'chipBloat' && a38 > 0 ? '  <<< CORRUPT' : '');
    console.log('%-12s | %6s / %-9s | %6s / %-9s | %s%s',
      k, a8.toFixed(1), min(a, k), a38.toFixed(1), min(b, k), ratio, flag);
  }
})();
