/* FAST MATRIX SWEEP v2: 46 topics x 10 panes, driven through the app's OWN
   switch paths (TopicRegistry.setTopic + window.switchTab -- the exact functions
   the tab click handler and topic nav call), so the same render code runs without
   Playwright click-actionability stalls.
   Also records: per-cell render health, ANY network request, all errors. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-matrix2-results.json';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

let ctx = { topic: '(boot)', pane: '(boot)' };
const errors = [], requests = [], failed = [];
const push = (kind, msg, stack) => errors.push({ kind, msg, stack: (stack || '').split('\n').slice(0, 4).join(' | '), ...ctx });

p.on('console', m => { if (m.type() === 'error') push('console', m.text()); });
p.on('pageerror', e => push('pageerror', e.message, e.stack));
p.on('request', r => requests.push({ url: r.url().slice(0, 160), type: r.resourceType(), ...ctx }));
p.on('requestfailed', r => failed.push({ url: r.url().slice(0, 160), err: r.failure()?.errorText, ...ctx }));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);

const topics = await p.evaluate(() => TopicRegistry.ids());
const panes = await p.evaluate(() => Object.keys(window.Router.ROUTES));
console.log(`FAST matrix: ${topics.length} x ${panes.length} = ${topics.length * panes.length} cells`);

const thin = [];
const t0 = Date.now();

for (const t of topics) {
  ctx = { topic: t, pane: '-' };
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(60);

  for (const v of panes) {
    ctx = { topic: t, pane: v };
    await p.evaluate(view => window.switchTab(view), v);
    await p.waitForTimeout(v === 'viz' ? 320 : 55);
    const st = await p.evaluate(() => {
      const on = document.querySelector('.pane.on');
      if (!on) return { on: null, txt: 0, kids: 0, h: 0 };
      const ce = on.querySelector('*');
      const sr = ce && ce.shadowRoot;
      const canvas = sr ? sr.querySelector('canvas') : on.querySelector('canvas');
      return {
        on: on.id,
        h: Math.round(on.getBoundingClientRect().height),
        txt: (sr ? (sr.textContent || '') : (on.textContent || '')).trim().length,
        kids: sr ? sr.children.length : on.children.length,
        canvas: canvas ? `${canvas.width}x${canvas.height}` : null
      };
    });
    if (!st.on || st.on !== v || st.txt < 20) thin.push({ topic: t, pane: v, ...st });
  }
  process.stdout.write(t.slice(0, 3) + ' ');
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\ndone in ${secs}s`);

await p.waitForTimeout(1500);

writeFileSync(OUT, JSON.stringify({
  topics: topics.length, panes: panes.length, cells: topics.length * panes.length,
  errors, requests, failed, thin, seconds: secs
}, null, 1));

console.log('\n=== ERRORS:', errors.length);
const agg = {};
for (const e of errors) { const k = e.kind + ' :: ' + e.msg.slice(0, 140); (agg[k] ||= []).push(`${e.topic}/${e.pane}`); }
for (const [k, where] of Object.entries(agg)) {
  console.log(`\n[${where.length}x] ${k}`);
  console.log('   at:', where.slice(0, 10).join(', '));
  const ex = errors.find(e => (e.kind + ' :: ' + e.msg.slice(0, 140)) === k);
  if (ex?.stack) console.log('   stack:', ex.stack.slice(0, 260));
}
console.log('\n=== NETWORK REQUESTS:', requests.length);
console.log(JSON.stringify([...new Set(requests.map(r => `${r.type} ${r.url}`))], null, 1));
console.log('=== FAILED:', failed.length, JSON.stringify(failed.slice(0, 10), null, 1));
console.log('\n=== THIN/EMPTY CELLS:', thin.length, '/', topics.length * panes.length);
// group thin by pane
const byPane = {};
for (const c of thin) (byPane[c.pane] ||= []).push(c.topic);
for (const [pane, ts] of Object.entries(byPane)) console.log(`  ${pane}: ${ts.length} topics -> ${ts.slice(0, 8).join(', ')}${ts.length > 8 ? ' ...' : ''}`);
console.log(JSON.stringify(thin.slice(0, 15), null, 1));

await b.close();
