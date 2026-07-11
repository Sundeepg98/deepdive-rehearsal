/* LENS: core flows — do the OVERLAYS (not TopicPanes) follow a topic switch? */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/core-flows';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen()) IndexOverlay.close(); });
await p.waitForTimeout(300);

async function grabOverlay(openBtnId, closeSel, hostTag, name, topic) {
  await p.click('#' + openBtnId);
  await p.waitForTimeout(600);
  const data = await p.evaluate(({ hostTag }) => {
    const host = document.querySelector(hostTag);
    const shadow = host && host.shadowRoot ? host.shadowRoot : null;
    let txt = '';
    if (shadow) {
      const parts = [];
      shadow.childNodes.forEach(n => { if (n.nodeName !== 'STYLE') parts.push(n.textContent || ''); });
      txt = parts.join(' ').replace(/\s+/g, ' ').trim();
    } else if (host) txt = (host.textContent || '').replace(/\s+/g, ' ').trim();
    const titleEl = document.querySelector('.cram-ov.open .cram-title, .mock-ov.open .cram-title, .mock-ov.open .mock-title');
    return { title: titleEl ? titleEl.textContent.trim() : '(none)', len: txt.length, txt };
  }, { hostTag });
  await p.screenshot({ path: `${SHOTS}/${name}-${topic}.png` });
  await p.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, closeSel);
  await p.waitForTimeout(400);
  return data;
}

const CASES = [
  { openBtnId: 'cramopen', closeSel: '#cramx', hostTag: 'deep-cram', name: 'cram' },
  { openBtnId: 'scopeopen', closeSel: '#scopex', hostTag: 'deep-scope', name: 'scope' },
  { openBtnId: 'planopen', closeSel: '#planx', hostTag: 'deep-gameplan', name: 'gameplan' },
];

const byTopic = {};
for (const topic of ['content-pipeline', 'caching']) {
  await p.evaluate((id) => TopicRegistry.setTopic(id), topic);
  await p.waitForTimeout(700);
  byTopic[topic] = {};
  for (const c of CASES) {
    byTopic[topic][c.name] = await grabOverlay(c.openBtnId, c.closeSel, c.hostTag, c.name, topic);
  }
}

console.log('\n########## OVERLAY TOPIC-AWARENESS ##########');
for (const c of CASES) {
  const a = byTopic['content-pipeline'][c.name], bb = byTopic['caching'][c.name];
  const same = a.txt === bb.txt;
  console.log(`\n--- ${c.name.toUpperCase()} (<${c.hostTag}>)`);
  console.log(`  content-pipeline  title="${a.title}"  bodyLen=${a.len}`);
  console.log(`  caching           title="${bb.title}"  bodyLen=${bb.len}`);
  console.log(`  BODY IDENTICAL ACROSS TOPICS? ${same ? '*** YES -> STALE (body never re-renders) ***' : 'no (body changed)'}`);
  if (same) {
    console.log(`  body head: ${a.txt.slice(0, 260)}`);
  }
}

// hard proof: caching cram body must not contain content-pipeline-only strings
const cachingCram = byTopic['caching'].cram.txt;
const CP_ONLY = ['processUpload(key, bucket)', 'S3 ObjectCreated', 'PassThrough', 'reconciler sweeps orphans', 'MediaConvert', '10M files/day'];
console.log('\n########## CONTENT-PIPELINE-ONLY STRINGS LEAKING INTO THE *CACHING* CRAM SHEET ##########');
for (const s of CP_ONLY) {
  console.log(`  ${cachingCram.toLowerCase().includes(s.toLowerCase()) ? 'LEAK  ' : 'clean '} "${s}"`);
}
const CACHING_WORDS = ['cache-aside', 'TTL', 'invalidate', 'thundering herd', 'eviction'];
console.log('\n  ...and the CACHING words that SHOULD be there:');
for (const s of CACHING_WORDS) {
  console.log(`  ${cachingCram.toLowerCase().includes(s.toLowerCase()) ? 'present' : 'ABSENT'} "${s}"`);
}

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
