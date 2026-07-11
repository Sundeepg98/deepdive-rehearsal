/* LENS: core flows — TOPIC SWITCHING / stale-content matrix.
   For N topics x 10 panes: fingerprint each pane's rendered shadow text and
   assert it changes with the topic, and that it MATCHES the topic's own data. */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);

// close the boot index overlay
await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
await p.waitForTimeout(400);

const TOPICS = ['content-pipeline', 'caching', 'kafka-internals', 'rate-limiting', 'saga', 'content-pipeline'];

async function fingerprintAll() {
  return await p.evaluate(() => {
    const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
    const out = {};
    for (const id of panes) {
      const host = document.querySelector('#' + id + ' > *');
      if (!host || !host.shadowRoot) { out[id] = { err: 'no shadow' }; continue; }
      const txt = (host.shadowRoot.textContent || '').replace(/\s+/g, ' ').trim();
      out[id] = { len: txt.length, head: txt.slice(0, 110), full: txt };
    }
    const cur = TopicRegistry.current();
    out.__id = cur.id;
    out.__h1 = (document.querySelector('.hdr h1') || {}).textContent;
    out.__locator = (document.querySelector('.locator') || {}).textContent;
    out.__cmpTopic = (document.querySelector('.cmp-topic') || {}).textContent;
    out.__cramTitle = (document.querySelector('.cram-title') || {}).textContent;
    out.__tncurrent = (document.getElementById('tncurrent') || {}).textContent;
    out.__hash = location.hash;
    // expected markers straight from the topic data
    const d = cur.data;
    out.__markers = {
      drill: d.drill.cards[0].signal,
      wb: d.wb.steps[0].c,
      walk: (d.walk.steps && d.walk.steps[0]) ? (d.walk.steps[0].t || d.walk.steps[0].c || '') : '',
      num: JSON.stringify(d.num).slice(0, 60),
      trade: JSON.stringify(d.trade).slice(0, 60),
      rf: JSON.stringify(d.rf).slice(0, 60),
      open: JSON.stringify(d.open).slice(0, 60),
      model: JSON.stringify(d.model).slice(0, 60),
      sys: JSON.stringify(d.sys).slice(0, 60),
    };
    return out;
  });
}

const results = [];
for (const t of TOPICS) {
  await p.evaluate((id) => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(700);
  const fp = await fingerprintAll();
  results.push(fp);
  console.log(`\n=== TOPIC ${t}  (registry says: ${fp.__id}) hash=${fp.__hash}`);
  console.log(`   h1="${fp.__h1}" | locator="${fp.__locator}" | cmp-topic="${fp.__cmpTopic}" | tnav="${fp.__tncurrent}"`);
  for (const k of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
    console.log(`   ${k.padEnd(6)} len=${String(fp[k].len).padStart(5)}  ${JSON.stringify(fp[k].head.slice(0, 80))}`);
  }
}

// --- ANALYSIS: does each pane's text change when the topic changes?
console.log('\n\n########## STALE-CONTENT MATRIX ##########');
const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
for (let i = 1; i < results.length; i++) {
  const prev = results[i - 1], cur = results[i];
  if (prev.__id === cur.__id) continue;
  const stale = [];
  for (const k of panes) {
    if (prev[k].full === cur[k].full) stale.push(k);
  }
  console.log(`${prev.__id} -> ${cur.__id}:  ${stale.length ? 'STALE PANES: ' + stale.join(', ') : 'all 9 panes changed OK'}`);
}

// --- ANALYSIS: does each pane CONTAIN its own topic's data marker?
console.log('\n########## DATA-MARKER MATCH (pane text must contain a token from ITS OWN topic data) ##########');
for (const r of results) {
  const bad = [];
  for (const k of ['drill', 'wb']) {
    const marker = (r.__markers[k] || '').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').trim();
    if (marker && !r[k].full.includes(marker.slice(0, 40))) bad.push(k + ' (want: "' + marker.slice(0, 40) + '")');
  }
  console.log(`${r.__id}: ${bad.length ? 'MISMATCH -> ' + bad.join(' | ') : 'drill+wb markers present OK'}`);
}

// --- A/B/A identity check: content-pipeline first vs last must be identical
const first = results[0], last = results[results.length - 1];
console.log('\n########## ROUND-TRIP (content-pipeline -> ... -> content-pipeline) ##########');
for (const k of panes) {
  const same = first[k].full === last[k].full;
  console.log(`  ${k.padEnd(6)} ${same ? 'identical OK' : 'DIFFERS len ' + first[k].len + ' -> ' + last[k].len}`);
  if (!same) {
    console.log('     first: ' + first[k].head.slice(0, 90));
    console.log('     last : ' + last[k].head.slice(0, 90));
  }
}

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_fp.json', JSON.stringify(results.map(r => { const c = { ...r }; for (const k of panes) c[k] = { len: c[k].len, head: c[k].head }; return c; }), null, 1));
await b.close();
