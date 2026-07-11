import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1200);

const r = await p.evaluate(() => {
  const R = window.TopicRegistry, ids = R.ids();
  const strip = s => String(s || '').replace(/<[^>]*>/g, '');
  const titles = {};
  ids.forEach(i => titles[i] = strip((R.get(i).identity || {}).title || ''));
  const out = [];
  for (const id of ids) {
    const t = R.get(id), sys = (t.data || {}).sys || {};
    const pv = sys.pivots || [];
    let linked = 0, chipOverflowRisk = 0, emptyA = 0;
    for (const x of pv) {
      const chip = strip(x.chip || '');
      const txt = chip + ' ' + strip(x.q || '');
      const hasIdx = /\(\d+\)/.test(txt);
      const hasTitle = Object.entries(titles).some(([k, v]) => k !== id && v && txt.includes(v));
      if (hasIdx || hasTitle) linked++;
      if (chip.length > 60) chipOverflowRisk++;
      if (!strip(x.a || '').trim()) emptyA++;
    }
    out.push({ id, idx: (t.identity || {}).index, pivots: pv.length, linked, stages: (sys.stages || []).length, longChips: chipOverflowRisk, emptyA });
  }
  return out;
});

const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
const O = r.filter(x => ORIG.has(x.id)), M = r.filter(x => !ORIG.has(x.id));
const S = (a, k) => a.reduce((s, x) => s + x[k], 0);

console.log('=== SYS PANE: stages + cross-topic jump chips ===');
console.log(`ORIGINALS (8):  stages=${S(O, 'stages')}  pivots=${S(O, 'pivots')}  CROSS-TOPIC-LINKED=${S(O, 'linked')}  chips>60ch=${S(O, 'longChips')}  empty-a=${S(O, 'emptyA')}`);
console.log(`MD BULK  (38):  stages=${S(M, 'stages')}  pivots=${S(M, 'pivots')}  CROSS-TOPIC-LINKED=${S(M, 'linked')}  chips>60ch=${S(M, 'longChips')}  empty-a=${S(M, 'emptyA')}`);
console.log('\nmd topics with a stage chain:', M.filter(x => x.stages > 0).map(x => x.id).join(', ') || '*** NONE (0 of 38) ***');
console.log('md topics with any cross-topic jump:', M.filter(x => x.linked > 0).map(x => x.id).join(', ') || '*** NONE (0 of 38) ***');

// per-original linked detail
console.log('\nORIGINALS cross-link detail:');
O.sort((a, b) => a.idx - b.idx).forEach(x => console.log(`  ${x.id.padEnd(18)} stages=${x.stages} pivots=${x.pivots} linked=${x.linked}`));

// Now measure rendered pane text with textContent (visibility-proof)
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const rendered = await p.evaluate(() => {
  const R = window.TopicRegistry, ids = R.ids();
  const res = [];
  for (const id of ids) {
    R.setTopic(id);
    const o = { id };
    for (const pn of ['sys', 'model', 'drill', 'rf', 'trade']) {
      const el = document.getElementById(pn);
      o[pn] = el ? (el.textContent || '').replace(/\s+/g, ' ').trim().length : -1;
    }
    res.push(o);
  }
  return res;
});
const RO = rendered.filter(x => ORIG.has(x.id)), RM = rendered.filter(x => !ORIG.has(x.id));
const avg = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
console.log('\n=== RENDERED DOM TEXT (textContent chars) ===');
console.log('pane    ORIG(8)   MD(38)   ratio');
for (const k of ['sys', 'model', 'drill', 'rf', 'trade']) {
  const a = avg(RO, k), b2 = avg(RM, k);
  console.log(`${k.padEnd(7)} ${String(a).padStart(6)}  ${String(b2).padStart(6)}   ${(a / b2).toFixed(1)}x`);
}
await b.close();
