/* DEFINITIVE SWEEP -- real user state.
   Boot with a hash so __bootHash is set (store.js:10) => the "START HERE" index
   overlay does NOT auto-open (index-overlay.js:427). Then drive the app the way a
   user does: CLICK the real tab buttons, switch topics through the registry's own
   single switch path, and measure whether the pane actually commits.
   Commit is polled on an INTERVAL (not rAF) so a busy frame can't fake a stall. */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#walk';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/errsweep-final-results.json';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

let ctx = { topic: '(boot)', pane: '(boot)' };
const errors = [], requests = [], failed = [], clickFails = [];
const push = (kind, msg, stack) => errors.push({ kind, msg, stack: (stack || '').split('\n').slice(0, 4).join(' | '), ...ctx });
p.on('console', m => { if (m.type() === 'error') push('console', m.text()); });
p.on('pageerror', e => push('pageerror', e.message, e.stack));
p.on('request', r => requests.push({ url: r.url().slice(0, 160), type: r.resourceType(), ...ctx }));
p.on('requestfailed', r => failed.push({ url: r.url().slice(0, 160), err: r.failure()?.errorText, ...ctx }));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);

const ovOpen = await p.evaluate(() => window.IndexOverlay.isOpen());
console.log('START HERE overlay open at boot-with-hash?', ovOpen, ovOpen ? ' <-- unexpected!' : '(good: real user state)');
await p.screenshot({ path: `${SHOTS}/final-boot-real-state.png` });

const topics = await p.evaluate(() => TopicRegistry.ids());
const panes = await p.evaluate(() => Object.keys(window.Router.ROUTES));
console.log(`Sweeping ${topics.length} topics x ${panes.length} panes by REAL CLICKS = ${topics.length * panes.length} cells\n`);

const cells = [];
const t0 = Date.now();

for (let ti = 0; ti < topics.length; ti++) {
  const t = topics[ti];
  ctx = { topic: t, pane: '-' };
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(90);

  for (const v of panes) {
    ctx = { topic: t, pane: v };
    let clicked = true;
    try {
      await p.locator(`[data-tab="${v}"]`).first().click({ timeout: 3000 });
    } catch (e) {
      clicked = false;
      clickFails.push({ topic: t, pane: v, msg: e.message.split('\n')[0] });
    }
    let committed = true;
    try {
      await p.waitForFunction(id => document.querySelector('.pane.on')?.id === id, v,
        { timeout: 2500, polling: 100 });   // INTERVAL polling, not rAF
    } catch { committed = false; }
    await p.waitForTimeout(v === 'viz' ? 380 : 30);

    const st = await p.evaluate(() => {
      const on = document.querySelector('.pane.on');
      if (!on) return { on: null, txt: 0, h: 0, canvas: null };
      const ce = on.querySelector('*');
      const sr = ce && ce.shadowRoot;
      const host = sr || on;
      const canvas = host.querySelector('canvas');
      return {
        on: on.id,
        tag: ce ? ce.tagName.toLowerCase() : null,
        h: Math.round(on.getBoundingClientRect().height),
        txt: (host.textContent || '').trim().length,
        canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
      };
    });
    cells.push({ topic: t, pane: v, clicked, committed, ...st });
  }
  process.stdout.write(ti % 10 === 9 ? `${ti + 1} ` : '.');
}
console.log(`\n\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await p.waitForTimeout(1200);

const notCommitted = cells.filter(c => !c.committed);
const wrongPane = cells.filter(c => c.on !== c.pane);
const empty = cells.filter(c => c.txt < 40);

writeFileSync(OUT, JSON.stringify({ cells, errors, requests, failed, clickFails, notCommitted, empty }, null, 1));

console.log('================= RESULTS =================');
console.log('cells               :', cells.length);
console.log('CLICK FAILURES      :', clickFails.length);
if (clickFails.length) console.log('   sample:', JSON.stringify(clickFails.slice(0, 3), null, 1));
console.log('NOT-COMMITTED panes :', notCommitted.length);
if (notCommitted.length) console.log('   ', notCommitted.slice(0, 10).map(c => `${c.topic}/${c.pane}(on=${c.on})`).join(', '));
console.log('WRONG PANE SHOWN    :', wrongPane.length);
console.log('EMPTY panes (<40ch) :', empty.length);
if (empty.length) console.log('   ', [...new Set(empty.map(c => c.pane))].join(', '));

console.log('\nAPP ERRORS          :', errors.length);
const agg = {};
for (const e of errors) { const k = e.kind + ' :: ' + e.msg.slice(0, 140); (agg[k] ||= []).push(`${e.topic}/${e.pane}`); }
for (const [k, w] of Object.entries(agg)) {
  console.log(`\n  [${w.length}x] ${k}`);
  console.log('     at:', w.slice(0, 10).join(', '));
  const ex = errors.find(e => (e.kind + ' :: ' + e.msg.slice(0, 140)) === k);
  if (ex?.stack) console.log('     stack:', ex.stack.slice(0, 300));
}
console.log('\nNETWORK REQUESTS    :', requests.length);
console.log(JSON.stringify([...new Set(requests.map(r => r.type + ' ' + r.url))], null, 1));
console.log('FAILED REQUESTS     :', failed.length);

console.log('\n--- PER-PANE TEXT (min/med/max across 46 topics) ---');
for (const v of panes) {
  const ts = cells.filter(c => c.pane === v && c.on === v).map(c => c.txt).sort((a, b) => a - b);
  if (!ts.length) { console.log(`  ${v}: no committed cells`); continue; }
  console.log(`  ${v.padEnd(6)} n=${String(ts.length).padStart(2)}  min=${String(ts[0]).padStart(6)}  med=${String(ts[Math.floor(ts.length / 2)]).padStart(6)}  max=${String(ts[ts.length - 1]).padStart(6)}`);
}
const viz = cells.filter(c => c.pane === 'viz');
console.log('\nVIZ canvas present  :', viz.filter(c => c.canvas).length, '/', viz.length);
const vizTxt = [...new Set(viz.map(c => c.txt))];
console.log('VIZ distinct txt len:', JSON.stringify(vizTxt));

await b.close();
