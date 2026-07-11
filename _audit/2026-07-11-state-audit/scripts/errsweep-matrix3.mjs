/* MATRIX v3 -- correct render-health measurement.
   v2 measured too early (view-transition hadn't committed, .pane.on lagged one step),
   which produced false "thin" cells. Here we WAIT for the pane to actually become
   .on before measuring, so an "empty pane" result is real. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-matrix3-results.json';

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

const cells = [];
const t0 = Date.now();

for (const t of topics) {
  ctx = { topic: t, pane: '-' };
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(90);

  for (const v of panes) {
    ctx = { topic: t, pane: v };
    await p.evaluate(view => window.switchTab(view), v);
    // WAIT for the transition to actually commit
    let committed = true;
    try {
      await p.waitForFunction(id => document.querySelector('.pane.on')?.id === id, v, { timeout: 3000 });
    } catch { committed = false; }
    await p.waitForTimeout(v === 'viz' ? 420 : 40);

    const st = await p.evaluate(() => {
      const on = document.querySelector('.pane.on');
      if (!on) return { on: null, txt: 0, kids: 0, h: 0, shadow: false, canvas: null };
      const ce = on.querySelector('*');
      const sr = ce && ce.shadowRoot;
      const canvas = sr ? sr.querySelector('canvas') : on.querySelector('canvas');
      const host = sr || on;
      return {
        on: on.id,
        tag: ce ? ce.tagName.toLowerCase() : null,
        h: Math.round(on.getBoundingClientRect().height),
        txt: (host.textContent || '').trim().length,
        kids: host.children.length,
        shadow: !!sr,
        canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
        vis: on.getBoundingClientRect().height > 0
      };
    });
    cells.push({ topic: t, pane: v, committed, ...st });
  }
  process.stdout.write('.');
}
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await p.waitForTimeout(1200);

const bad = cells.filter(c => !c.committed || c.on !== c.pane || c.txt < 40 || !c.vis);
writeFileSync(OUT, JSON.stringify({ cells, errors, requests, failed, bad }, null, 1));

console.log('\n=== ERRORS:', errors.length);
const agg = {};
for (const e of errors) { const k = e.kind + ' :: ' + e.msg.slice(0, 140); (agg[k] ||= []).push(`${e.topic}/${e.pane}`); }
for (const [k, w] of Object.entries(agg)) {
  console.log(`\n[${w.length}x] ${k}`);
  console.log('   at:', w.slice(0, 12).join(', '));
  const ex = errors.find(e => (e.kind + ' :: ' + e.msg.slice(0, 140)) === k);
  if (ex?.stack) console.log('   stack:', ex.stack.slice(0, 300));
}
console.log('\n=== NETWORK:', requests.length, JSON.stringify([...new Set(requests.map(r => r.type + ' ' + r.url))]));
console.log('=== FAILED:', failed.length);

console.log('\n=== BAD CELLS (uncommitted / wrong pane / empty / zero-height):', bad.length, '/', cells.length);
const byPane = {};
for (const c of bad) (byPane[c.pane] ||= []).push(c);
for (const [pane, list] of Object.entries(byPane)) {
  console.log(`\n  ${pane}: ${list.length}`);
  console.log('   ', list.slice(0, 6).map(c => `${c.topic}[on=${c.on},txt=${c.txt},h=${c.h},commit=${c.committed}]`).join('  '));
}

// per-pane text stats (a pane that renders but is systematically tiny is worth knowing)
console.log('\n=== PER-PANE TEXT LENGTH (min/median/max over 46 topics) ===');
for (const v of panes) {
  const ts = cells.filter(c => c.pane === v && c.on === v).map(c => c.txt).sort((a, b) => a - b);
  if (!ts.length) { console.log(`  ${v}: NO COMMITTED CELLS`); continue; }
  console.log(`  ${v.padEnd(6)} n=${ts.length}  min=${ts[0]}  med=${ts[Math.floor(ts.length / 2)]}  max=${ts[ts.length - 1]}`);
}
// canvas presence on viz
const viz = cells.filter(c => c.pane === 'viz');
console.log('\n=== VIZ canvas presence:', viz.filter(c => c.canvas).length, '/', viz.length);
console.log('   no-canvas topics:', viz.filter(c => !c.canvas).map(c => c.topic).join(', ') || '(none)');

await b.close();
