/* FULL MATRIX SWEEP: 46 topics x 10 panes.
   Captures console errors, pageerrors, failed requests, ANY network request.
   Tags every error with the exact topic+pane+action that was live when it fired. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-matrix-results.json';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

let ctx = { topic: '(boot)', pane: '(boot)', action: 'load' };
const errors = [];   // {kind, msg, ctx, stack}
const requests = []; // every request
const failed = [];

const push = (kind, msg, stack) => errors.push({ kind, msg, stack: (stack || '').split('\n').slice(0, 4).join(' | '), ...ctx });

p.on('console', m => { if (m.type() === 'error') push('console', m.text()); });
p.on('pageerror', e => push('pageerror', e.message, e.stack));
p.on('request', r => requests.push({ url: r.url().slice(0, 160), type: r.resourceType(), ...ctx }));
p.on('requestfailed', r => failed.push({ url: r.url().slice(0, 160), err: r.failure()?.errorText, ...ctx }));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);

const topics = await p.evaluate(() => TopicRegistry.ids());
const panes = await p.evaluate(() => Object.keys(window.Router.ROUTES));
console.log(`Sweeping ${topics.length} topics x ${panes.length} panes = ${topics.length * panes.length} cells`);

// health probe: does the pane actually have content after switching?
const probe = async () => p.evaluate(() => {
  const on = document.querySelector('.pane.on');
  if (!on) return { on: null };
  // the pane hosts a custom element; measure its rendered text+shadow content
  const ce = on.querySelector('*');
  const sr = ce && ce.shadowRoot;
  return {
    on: on.id,
    h: on.getBoundingClientRect().height,
    txt: (sr ? (sr.textContent || '') : (on.textContent || '')).trim().length,
    kids: sr ? sr.children.length : on.children.length
  };
});

const empties = [];
let cells = 0;

for (const t of topics) {
  ctx = { topic: t, pane: '-', action: 'setTopic' };
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(120);

  for (const v of panes) {
    ctx = { topic: t, pane: v, action: 'click tab' };
    // real user path: click the [data-tab] button
    const btn = p.locator(`[data-tab="${v}"]`).first();
    try {
      await btn.click({ timeout: 4000 });
    } catch (e) {
      push('click-fail', `could not click [data-tab="${v}"]: ${e.message.split('\n')[0]}`);
      continue;
    }
    await p.waitForTimeout(90);
    ctx.action = 'settled';
    const st = await probe();
    cells++;
    if (!st.on || st.txt < 20) empties.push({ topic: t, pane: v, ...st });
    // give async (rAF/timer) errors a beat on the viz pane which uses WebGL
    if (v === 'viz') await p.waitForTimeout(260);
  }
  process.stdout.write('.');
}
console.log(`\nvisited ${cells} cells`);

await p.waitForTimeout(1200);

const res = {
  topics: topics.length, panes: panes.length, cells,
  errorCount: errors.length,
  errors,
  requestCount: requests.length,
  requests,
  failedCount: failed.length,
  failed,
  emptyPanes: empties
};
writeFileSync(OUT, JSON.stringify(res, null, 1));

console.log('=== ERRORS:', errors.length);
// aggregate by message
const agg = {};
for (const e of errors) {
  const k = e.kind + ' :: ' + e.msg.slice(0, 130);
  (agg[k] ||= []).push(`${e.topic}/${e.pane}`);
}
for (const [k, where] of Object.entries(agg)) {
  console.log(`\n[${where.length}x] ${k}`);
  console.log('   first 8:', where.slice(0, 8).join(', '));
}
console.log('\n=== REQUESTS:', requests.length, JSON.stringify(requests.map(r => r.url + ' <' + r.type + '>')));
console.log('=== FAILED REQ:', failed.length, JSON.stringify(failed, null, 1));
console.log('=== EMPTY/THIN PANES:', empties.length);
console.log(JSON.stringify(empties.slice(0, 40), null, 1));

await b.close();
