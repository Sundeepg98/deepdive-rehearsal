/* ============================================================================
 * D3-perf TRACE decomposition -- the decisive attribution.
 * Splits a single pane first-activation (and topic-open) into
 * script / style-recalc / layout / paint / hit-test, at 4x throttle, via the
 * Chromium timeline trace (RunTask + its children). This is what tells us
 * whether the drill P1 is drawCard SCRIPT (audit's hypothesis) or reveal LAYOUT
 * (the perf-track attribution's finding) -- the inversion the brief warns of.
 *
 * Usage: node _perf/trace.cjs [--pane drill] [--html PATH] [--reps 3]
 * ==========================================================================*/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const boot = require('../test/_boot.cjs');

function argv(name, def) { const i = process.argv.indexOf('--' + name); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def; }
const PANE = argv('pane', 'drill');
const REPS = Number(argv('reps', 3));
const HTML = path.resolve(argv('html', path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html')));
const OUT = path.join(__dirname, 'results'); fs.mkdirSync(OUT, { recursive: true });

const PROBE = () => {
  window.__t = {
    async markSwitch(tab) {
      const btn = document.querySelector('.seg button[data-tab="' + tab + '"]');
      void document.body.offsetHeight;
      performance.mark('m0');
      btn.click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      performance.mark('m1');
    },
    async markTopic(id) {
      void document.body.offsetHeight;
      performance.mark('m0');
      window.TopicRegistry.setTopic(id);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      performance.mark('m1');
    },
  };
};

/* sum trace-event self-time by name within [t0,t1] on one thread.
   self = dur - sum(child dur). Chromium 'X' events nest by containment. */
function decompose(events, t0, t1, tid) {
  const inWin = events.filter((e) => e.ph === 'X' && e.tid === tid && e.ts >= t0 && e.ts <= t1 && typeof e.dur === 'number');
  // sort by start asc, then by dur desc (parents before children)
  inWin.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const byName = {}; let runTaskTotal = 0;
  for (let i = 0; i < inWin.length; i++) {
    const e = inWin[i];
    byName[e.name] = byName[e.name] || { total: 0, n: 0 };
    byName[e.name].total += e.dur; byName[e.name].n++;
    if (e.name === 'RunTask') runTaskTotal += e.dur;
  }
  // self-time by name using a flat non-overlap sweep of the LEAF timeline:
  // paint the [ts,ts+dur) intervals, innermost wins, tally microseconds per name.
  const pts = [];
  for (const e of inWin) { pts.push([e.ts, 1, e]); pts.push([e.ts + e.dur, -1, e]); }
  // build innermost-owner timeline by scanning event boundaries
  const bounds = Array.from(new Set(inWin.flatMap((e) => [e.ts, e.ts + e.dur]))).sort((a, b) => a - b);
  const self = {};
  for (let b = 0; b < bounds.length - 1; b++) {
    const a = bounds[b], z = bounds[b + 1]; if (z <= a) continue;
    // innermost event covering [a,z): smallest dur that contains it
    let owner = null;
    for (const e of inWin) { if (e.ts <= a && e.ts + e.dur >= z) { if (!owner || e.dur < owner.dur) owner = e; } }
    if (owner) { self[owner.name] = (self[owner.name] || 0) + (z - a); }
  }
  return { runTaskTotal: +(runTaskTotal / 1000).toFixed(1), byName, self, windowMs: +((t1 - t0) / 1000).toFixed(1) };
}

async function traceOnce(browser, kind, arg) {
  const page = await browser.newPage();
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await boot.gotoApp(page, HTML);
  await page.evaluate(PROBE);
  await boot.enterApp(page);
  await boot.settle(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink.user_timing'], screenshots: false });
  if (kind === 'pane') await page.evaluate((t) => window.__t.markSwitch(t), arg);
  else await page.evaluate((i) => window.__t.markTopic(i), arg);
  const buf = await browser.stopTracing();
  await page.close();
  const trace = JSON.parse(buf.toString('utf8'));
  const ev = trace.traceEvents;
  const m0 = ev.filter((e) => e.name === 'm0' && e.cat && e.cat.indexOf('user_timing') > -1).pop();
  const m1 = ev.filter((e) => e.name === 'm1' && e.cat && e.cat.indexOf('user_timing') > -1).pop();
  if (!m0 || !m1) return { err: 'no marks' };
  return decompose(ev, m0.ts, m1.ts, m0.tid);
}

async function run() {
  const browser = await chromium.launch(boot.launchOpts());
  const runs = [];
  for (let i = 0; i < REPS; i++) {
    const r = await traceOnce(browser, PANE === 'topic' ? 'topic' : 'pane',
      PANE === 'topic' ? await firstTopicSpread(browser) : PANE);
    runs.push(r);
    console.log('rep ' + i + ':', JSON.stringify(r.self ? topSelf(r) : r));
  }
  await browser.close();
  const outfile = path.join(OUT, 'trace-' + PANE + '.json');
  fs.writeFileSync(outfile, JSON.stringify(runs, null, 2));

  // aggregate self-time by name (median across reps)
  const names = {};
  for (const r of runs) { if (!r.self) continue; for (const k in r.self) { (names[k] = names[k] || []).push(r.self[k] / 1000); } }
  console.log('\n=== TRACE self-time (ms) pane=' + PANE + ' reps=' + REPS + ' @4x ===');
  console.log('window p50 ' + med(runs.map(r => r.windowMs).filter(Boolean)) + 'ms   RunTask total p50 ' + med(runs.map(r => r.runTaskTotal).filter(Boolean)) + 'ms');
  const rows = Object.keys(names).map((k) => [k, med(names[k])]).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of rows) console.log('  ' + k.padEnd(22) + String(v.toFixed(1)).padStart(8) + ' ms');
  console.log('\nwrote ' + outfile);
}
function med(xs) { if (!xs || !xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return +s[Math.floor(s.length / 2)].toFixed(1); }
function topSelf(r) { const o = {}; const rows = Object.entries(r.self).map(([k, v]) => [k, +(v / 1000).toFixed(1)]).sort((a, b) => b[1] - a[1]).slice(0, 5); for (const [k, v] of rows) o[k] = v; return { win: r.windowMs, top: o }; }
async function firstTopicSpread() { return 'signing'; }

run().catch((e) => { console.error(e); process.exit(1); });
