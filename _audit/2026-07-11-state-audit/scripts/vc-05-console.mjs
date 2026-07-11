/* rt-console VERIFY 05 — adversarial re-check of the headline claims:
     "ZERO console errors, ZERO uncaught page errors, ZERO failed requests,
      1 network request (the document)".
   The app has 59 EMPTY `catch (e) {}` blocks in src/scripts and registers NO
   window.onerror / unhandledrejection handler. So "0 console errors" does NOT
   prove "0 exceptions" -- a thrown-and-swallowed exception is invisible to
   page.on('console'). Use CDP Debugger.setPauseOnExceptions('all') to catch
   CAUGHT exceptions too. Also re-checks the network claim and the `v`-key claim,
   and tests whether a plain RELOAD on event-driven teleports the user.
*/
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const S = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/rt-console-verify';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

const consoleMsgs = [];
const pageErrors = [];
const requests = [];
const failed = [];
p.on('console', m => consoleMsgs.push({ t: m.type(), text: m.text() }));
p.on('pageerror', e => pageErrors.push(e.message));
p.on('request', r => requests.push(r.url()));
p.on('requestfailed', r => failed.push(r.url() + ' :: ' + (r.failure() || {}).errorText));

// --- CDP: catch CAUGHT exceptions too ---
const cdp = await ctx.newCDPSession(p);
await cdp.send('Debugger.enable');
await cdp.send('Debugger.setPauseOnExceptions', { state: 'all' });
const thrown = [];
cdp.on('Debugger.paused', async (e) => {
  try {
    if (e.reason === 'exception' || e.reason === 'promiseRejection') {
      const d = e.data || {};
      const f = (e.callFrames || [])[0] || {};
      thrown.push({
        reason: e.reason,
        desc: String(d.description || d.value || d.className || '?').split('\n')[0].slice(0, 160),
        fn: f.functionName || '(anon)',
        line: f.location ? f.location.lineNumber + 1 : '?',
      });
    }
  } catch (_) {}
  try { await cdp.send('Debugger.resume'); } catch (_) {}
});

// also catch unhandled promise rejections from inside the page
await p.addInitScript(`window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason)));`);

console.log('--- boot ---');
await p.goto(URL + '#walk', { waitUntil: 'load' });
await p.waitForTimeout(1200);

console.log('--- drive: 10 panes x 3 topics via real tab clicks ---');
const TOPICS = ['content-pipeline', 'kafka-internals', 'event-driven'];
const TABS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'viz'];
for (const t of TOPICS) {
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(300);
  for (const tab of TABS) {
    // viz tab is hidden on viz-less topics -> use the `v` key path the app itself exposes
    const vis = await p.evaluate(sel => { const btn = document.querySelector(sel); return btn && !btn.hidden; }, `.seg button[data-tab="${tab}"]`);
    if (vis) { await p.click(`.seg button[data-tab="${tab}"]`); }
    else { await p.keyboard.press('v'); }
    await p.waitForTimeout(180);
  }
}

console.log('--- drive: overlays ---');
const OVERLAYS = [
  ['#mockopen', 'mockov'], ['#mixopen', 'mixov'], ['#cramopen', 'cramov'],
  ['#sessopen', 'sessov'], ['#scopeopen', 'scopeov'], ['#planopen', 'planov'],
  ['#keyopen', 'keyov'], ['#notesopen', 'notesov'], ['#idxopen', '_index-overlay'],
];
for (const [btn, ov] of OVERLAYS) {
  const has = await p.evaluate(s => !!document.querySelector(s), btn);
  if (!has) { console.log('   (no button', btn, ')'); continue; }
  await p.click(btn).catch(() => {});
  await p.waitForTimeout(400);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
}
// keyboard overlay, search, index
await p.keyboard.press('?'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.keyboard.press('/'); await p.waitForTimeout(300); await p.keyboard.type('kafka'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.keyboard.press('\\'); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// theme, density, topic step
await p.keyboard.press('d'); await p.waitForTimeout(150);
await p.keyboard.press(']'); await p.waitForTimeout(400);
await p.keyboard.press('['); await p.waitForTimeout(400);
await p.keyboard.press('g'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// --- `v` key on a viz-less topic: what hash does it leave? ---
await p.evaluate(() => TopicRegistry.setTopic('saga'));
await p.waitForTimeout(400);
await p.keyboard.press('v');
await p.waitForTimeout(600);
const vKey = await p.evaluate(() => ({
  hash: location.hash, href: location.href,
  topic: TopicRegistry.current().id,
  pane: (document.querySelector('.pane.on') || {}).id,
  emptyMsg: (() => { const r = document.querySelector('deep-visual').shadowRoot; const e = r.getElementById('vzempty'); return e && !e.hidden ? e.textContent : null; })(),
}));
console.log('\n`v` KEY ON viz-less TOPIC (saga):', JSON.stringify(vKey, null, 2));
await p.screenshot({ path: S + '/vc-vkey-saga-viz.png' });

const rej = await p.evaluate(() => window.__rej);

// --- RELOAD test on event-driven (same profile, localStorage warm) ---
console.log('\n--- RELOAD test: event-driven, same profile (progress written) ---');
await p.evaluate(() => TopicRegistry.setTopic('event-driven'));
await p.waitForTimeout(900);
const before = await p.evaluate(() => ({ topic: TopicRegistry.current().id, hash: location.hash, h1: document.querySelector('.hdr h1').textContent }));
console.log('  before reload:', JSON.stringify(before));
await p.reload({ waitUntil: 'load' });
await p.waitForTimeout(1500);
const after = await p.evaluate(() => ({ topic: TopicRegistry.current().id, hash: location.hash, h1: document.querySelector('.hdr h1').textContent, idxOpen: (typeof IndexOverlay !== 'undefined' && IndexOverlay.isOpen) ? IndexOverlay.isOpen() : null }));
console.log('  after  reload:', JSON.stringify(after));
console.log(after.topic === before.topic ? '  >>> reload preserved the topic' : `  >>> *** RELOAD TELEPORTED: ${before.topic} -> ${after.topic} ***`);
await p.screenshot({ path: S + '/vc-reload-eventdriven.png' });

// ================= REPORT =================
console.log('\n\n================ CONSOLE / NETWORK GROUND TRUTH ================');
const errsOnly = consoleMsgs.filter(m => m.t === 'error');
const warnsOnly = consoleMsgs.filter(m => m.t === 'warning');
console.log('console messages total :', consoleMsgs.length);
console.log('  console ERRORS       :', errsOnly.length, errsOnly.map(m => m.text).slice(0, 10));
console.log('  console WARNINGS     :', warnsOnly.length, warnsOnly.map(m => m.text).slice(0, 10));
console.log('uncaught page errors   :', pageErrors.length, pageErrors.slice(0, 10));
console.log('unhandled rejections   :', rej.length, rej.slice(0, 10));
console.log('network requests       :', requests.length);
for (const r of [...new Set(requests)]) console.log('    ', r);
console.log('failed requests        :', failed.length, failed);

console.log('\n---- EXCEPTIONS THROWN (incl. ones swallowed by catch{}) ----');
console.log('total thrown:', thrown.length);
const grouped = {};
for (const t of thrown) {
  const k = `${t.reason} | ${t.desc} | fn=${t.fn} | dist line ${t.line}`;
  grouped[k] = (grouped[k] || 0) + 1;
}
for (const [k, n] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) console.log(`  x${String(n).padStart(3)}  ${k}`);

await b.close();
