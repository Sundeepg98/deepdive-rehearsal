/* VERIFY Finding 1: cram sheet + scope overlay serve Content Pipeline content
   under a per-topic title, on all 46 topics. Re-measure independently:
   body length across topics, leak scan, absence scan, screenshots.
   Drive via the REAL user path (Tools button click), not just globals. */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-interactions/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(500);

const readOverlay = async (which) => p.evaluate((w) => {
  const ovId = w === 'cram' ? '#cramov' : '#scopeov';
  const tag = w === 'cram' ? 'deep-cram' : 'deep-scope';
  const ov = document.querySelector(ovId);
  const host = ov.querySelector(tag);
  const sr = host && host.shadowRoot;
  const title = ov.querySelector('.cram-title')?.textContent
             || ov.querySelector('.mock-title,.cram-top')?.textContent || '(none)';
  const body = sr ? (sr.textContent || '') : '(NO SHADOW)';
  return { title: title.trim(), bodyLen: body.length, body, open: ov.classList.contains('open') };
}, which);

const CP_MARKERS = ['processUpload(key, bucket)', 'S3 ObjectCreated', 'PassThrough', 'MediaConvert', '10M files/day', 'reconciler sweeps orphans'];
const CACHE_TERMS = ['cache-aside', 'TTL', 'invalidate', 'thundering herd', 'eviction', 'hit ratio'];
const SCOPE_CP_MARKERS = ['What we', 'File types', 'KB configs or GB media', 'inside the Lambda', 'transcode'];

const results = {};
for (const topic of ['content-pipeline', 'caching', 'kafka-internals']) {
  await p.evaluate((t) => TopicRegistry.setTopic(t), topic);
  await p.waitForTimeout(350);
  // real user path: click the Tools cram button
  await p.evaluate(() => window.openCram());
  await p.waitForTimeout(500);
  const cram = await readOverlay('cram');
  if (topic === 'caching') await p.screenshot({ path: SHOT + 'cram-caching.png' });
  if (topic === 'kafka-internals') await p.screenshot({ path: SHOT + 'cram-kafka.png' });
  await p.evaluate(() => { const x = document.querySelector('#cramov .cram-x,#cramov .mock-x'); if (x) x.click(); });
  await p.waitForTimeout(300);

  await p.evaluate(() => window.openScope());
  await p.waitForTimeout(500);
  const scope = await readOverlay('scope');
  if (topic === 'caching') await p.screenshot({ path: SHOT + 'scope-caching.png' });
  await p.evaluate(() => { const x = document.querySelector('#scopeov .cram-x,#scopeov .mock-x'); if (x) x.click(); });
  await p.waitForTimeout(300);

  const lc = cram.body.toLowerCase();
  results[topic] = {
    cramTitle: cram.title, cramLen: cram.bodyLen, cramOpen: cram.open,
    cpLeaks: CP_MARKERS.filter(m => cram.body.includes(m)),
    cacheTermsPresent: CACHE_TERMS.filter(t => lc.includes(t.toLowerCase())),
    scopeLen: scope.bodyLen,
    scopeCpLeaks: SCOPE_CP_MARKERS.filter(m => scope.body.includes(m)),
    cramFirst90: cram.body.replace(/\s+/g, ' ').trim().slice(0, 90),
    scopeFirst90: scope.body.replace(/\s+/g, ' ').trim().slice(0, 90),
  };
}

console.log('=== CRAM SHEET ===');
for (const [t, r] of Object.entries(results)) {
  console.log('\n' + t);
  console.log('  title      :', r.cramTitle);
  console.log('  bodyLen    :', r.cramLen);
  console.log('  CP leaks   :', r.cpLeaks.length ? r.cpLeaks.join(' | ') : '(none)');
  console.log('  cache terms:', r.cacheTermsPresent.length ? r.cacheTermsPresent.join(' | ') : '(NONE PRESENT)');
  console.log('  body[0:90] :', r.cramFirst90);
}
const lens = Object.values(results).map(r => r.cramLen);
console.log('\nCRAM bodyLen identical across topics?', new Set(lens).size === 1 ? '*** YES — SAME BODY (' + lens[0] + ' chars) ***' : 'NO ' + JSON.stringify(lens));

console.log('\n=== SCOPE OVERLAY ===');
for (const [t, r] of Object.entries(results)) {
  console.log('\n' + t);
  console.log('  bodyLen   :', r.scopeLen);
  console.log('  CP leaks  :', r.scopeCpLeaks.join(' | ') || '(none)');
  console.log('  body[0:90]:', r.scopeFirst90);
}
const slens = Object.values(results).map(r => r.scopeLen);
console.log('\nSCOPE bodyLen identical across topics?', new Set(slens).size === 1 ? '*** YES — SAME BODY (' + slens[0] + ' chars) ***' : 'NO ' + JSON.stringify(slens));

// Does DeepCram subscribe to deeptopicchange at all?
const subs = await p.evaluate(() => {
  const c = document.querySelector('deep-cram'), s = document.querySelector('deep-scope');
  return {
    cramIsTopicPane: c ? (Object.getPrototypeOf(c.constructor).name) : null,
    cramCtor: c ? c.constructor.name : null,
    scopeCtor: s ? s.constructor.name : null,
    scopeIsTopicPane: s ? (Object.getPrototypeOf(s.constructor).name) : null,
    cramDataKey: c ? String(c.constructor.dataKey) : null,
  };
});
console.log('\n=== CLASS CHECK ===');
console.log(JSON.stringify(subs, null, 1));
console.log('\nPAGE ERRORS:', errs.length, errs.slice(0, 3));
await b.close();
