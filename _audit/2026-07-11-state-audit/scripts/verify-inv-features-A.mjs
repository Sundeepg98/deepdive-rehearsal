/* Adversarial verification probe A: data-layer census + cram/scope/report/companion */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-inv-features';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') { errs.push(m.text()); console.log('CONSOLE-ERROR:', m.text()); } });
p.on('pageerror', e => { errs.push(e.message); console.log('PAGE-ERROR:', e.message); });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(700);

/* --- 0. globals reachable? --- */
const sanity = await p.evaluate(() => ({
  hasRegistry: typeof TopicRegistry !== 'undefined',
  nTopics: typeof TopicRegistry !== 'undefined' ? TopicRegistry.ids().length : -1,
  firstById: typeof TopicRegistry !== 'undefined' ? TopicRegistry.ids()[0] : null,
  currentAtBoot: typeof TopicRegistry !== 'undefined' ? TopicRegistry.current().id : null,
  hash: location.hash
}));
console.log('SANITY:', JSON.stringify(sanity));

/* --- 1. dataKey + cmpNotes + identity.total census across all 46 --- */
const census = await p.evaluate(() => {
  const KEYS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open', 'visual'];
  const CMP = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
  const out = { n: 0, dataKeyCount: {}, cmpFull: [], cmpPartial: [], cmpOther: [], totals: {}, visualTopics: [], reportTitles: {} };
  KEYS.forEach(k => out.dataKeyCount[k] = 0);
  TopicRegistry.ids().forEach(id => {
    const t = TopicRegistry.get(id); out.n++;
    KEYS.forEach(k => { if (t.data && t.data[k]) out.dataKeyCount[k]++; });
    if (t.data && t.data.visual) out.visualTopics.push(id);
    const cn = t.identity.cmpNotes || {};
    const have = CMP.filter(k => cn[k]);
    if (have.length === 9) out.cmpFull.push(id);
    else if (have.length === 2 && cn.walk && cn.drill) out.cmpPartial.push(id);
    else out.cmpOther.push(id + ':' + have.length);
    const tot = t.identity.total;
    out.totals[tot] = (out.totals[tot] || 0) + 1;
    out.reportTitles[id] = t.identity.reportTitle;
  });
  return out;
});
console.log('\n=== CENSUS ===');
console.log('topics:', census.n);
console.log('dataKey presence:', JSON.stringify(census.dataKeyCount));
console.log('visual topics:', JSON.stringify(census.visualTopics));
console.log('cmpNotes 9/9 count:', census.cmpFull.length, JSON.stringify(census.cmpFull));
console.log('cmpNotes walk+drill-only count:', census.cmpPartial.length);
console.log('cmpNotes OTHER shapes:', JSON.stringify(census.cmpOther));
console.log('identity.total distribution:', JSON.stringify(census.totals));
console.log('cmpNotes.walk[0] sample (generated kafka-internals):',
  JSON.stringify(await p.evaluate(() => TopicRegistry.get('kafka-internals').identity.cmpNotes.walk)));
console.log('cmpNotes.walk[0] sample (hand-authored content-pipeline):',
  JSON.stringify(await p.evaluate(() => TopicRegistry.get('content-pipeline').identity.cmpNotes.walk)));

/* --- 2. CRAM: is the body identical across topics while the header changes? --- */
async function cramProbe(topicId) {
  await p.evaluate(id => { if (TopicRegistry.current().id !== id) TopicRegistry.setTopic(id); }, topicId);
  await p.waitForTimeout(250);
  await p.evaluate(() => { const f = document.getElementById('cramov'); if (f && !f.classList.contains('open')) { if (window.openCram) window.openCram(); } });
  await p.waitForTimeout(400);
  return await p.evaluate(() => {
    const ov = document.getElementById('cramov');
    const title = ov ? (ov.querySelector('.cram-title') || {}).textContent : null;
    const el = document.querySelector('deep-cram');
    const sr = el && el.shadowRoot;
    const one = sr ? (sr.querySelector('.cs-one') || {}).textContent : null;
    const spine1 = sr ? (sr.querySelector('.cs-spine li') || {}).textContent : null;
    const bodyLen = sr ? sr.textContent.length : 0;
    const bodyHash = sr ? sr.textContent.replace(/\s+/g, ' ').trim() : '';
    return { title, one, spine1, bodyLen, bodyHash };
  });
}
const cramCP = await cramProbe('content-pipeline');
await p.screenshot({ path: SHOTS + '/A1-cram-content-pipeline.png' });
await p.evaluate(() => { const x = document.querySelector('#cramov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(200);
const cramCache = await cramProbe('caching');
await p.screenshot({ path: SHOTS + '/A2-cram-caching-SHOWS-CP-BODY.png' });
console.log('\n=== CRAM ===');
console.log('content-pipeline title:', JSON.stringify(cramCP.title));
console.log('caching          title:', JSON.stringify(cramCache.title));
console.log('CP   one-liner:', JSON.stringify((cramCP.one || '').slice(0, 90)));
console.log('CACHE one-liner:', JSON.stringify((cramCache.one || '').slice(0, 90)));
console.log('CACHE spine step1:', JSON.stringify(cramCache.spine1));
console.log('BODY IDENTICAL ACROSS TOPICS:', cramCP.bodyHash === cramCache.bodyHash, '(len', cramCP.bodyLen, 'vs', cramCache.bodyLen, ')');
await p.evaluate(() => { const x = document.querySelector('#cramov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(200);

/* --- 3. SCOPE overlay identical? --- */
async function scopeProbe(topicId) {
  await p.evaluate(id => { if (TopicRegistry.current().id !== id) TopicRegistry.setTopic(id); }, topicId);
  await p.waitForTimeout(250);
  await p.evaluate(() => { if (window.openScope) window.openScope(); });
  await p.waitForTimeout(400);
  return await p.evaluate(() => {
    const el = document.querySelector('deep-scope');
    const sr = el && el.shadowRoot;
    if (!sr) return null;
    const secs = [...sr.querySelectorAll('.cs-st')].map(x => x.textContent);
    const firstQ = (sr.querySelector('.cs-ha-l') || {}).textContent;
    return { secs, firstQ, bodyHash: sr.textContent.replace(/\s+/g, ' ').trim(), len: sr.textContent.length };
  });
}
const scCP = await scopeProbe('content-pipeline');
await p.evaluate(() => { const x = document.querySelector('#scopeov .mock-x, #scopeov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(200);
const scCache = await scopeProbe('caching');
await p.screenshot({ path: SHOTS + '/A3-scope-caching-SHOWS-FILE-INGEST.png' });
console.log('\n=== SCOPE ===');
console.log('caching sections:', JSON.stringify(scCache && scCache.secs));
console.log('caching firstQ:', JSON.stringify(scCache && scCache.firstQ));
console.log('BODY IDENTICAL ACROSS TOPICS:', scCP && scCache && scCP.bodyHash === scCache.bodyHash);
await p.evaluate(() => { const x = document.querySelector('#scopeov .mock-x, #scopeov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(200);

/* --- 4. SESSION REPORT title on kafka-internals --- */
await p.evaluate(() => TopicRegistry.setTopic('kafka-internals'));
await p.waitForTimeout(300);
const rep = await p.evaluate(() => {
  if (window.openSess) window.openSess();
  const r = document.getElementById('sessreport');
  return {
    domTitle: r ? (r.querySelector('.sr-ttl') || {}).textContent : '(no #sessreport)',
    domFoot: r ? (r.querySelector('.sr-foot') || {}).textContent : null,
    reportTitleData: TopicRegistry.current().identity.reportTitle,
    h1: document.querySelector('.hdr h1').textContent
  };
});
console.log('\n=== SESSION REPORT (on kafka-internals) ===');
console.log('h1 shows:', JSON.stringify(rep.h1));
console.log('identity.reportTitle =', JSON.stringify(rep.reportTitleData));
console.log('report .sr-ttl       =', JSON.stringify(rep.domTitle));
console.log('report .sr-foot      =', JSON.stringify((rep.domFoot || '').slice(0, 70)));
await p.screenshot({ path: SHOTS + '/A4-sessreport-kafka-says-content-pipeline.png' });
await p.evaluate(() => { const x = document.querySelector('#sessov .mock-x, #sessov .cram-x'); if (x) x.click(); });
await p.waitForTimeout(200);

/* --- 5. COMPANION staleness: walk -> drill -> num on a generated topic --- */
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(300);
const compSeq = [];
for (const v of ['walk', 'drill', 'num', 'wb', 'trade', 'model', 'sys', 'rf', 'open']) {
  await p.evaluate(t => window.goView(t), v);
  await p.waitForTimeout(180);
  const s = await p.evaluate(() => ({
    cmpView: (document.getElementById('cmpView') || {}).textContent,
    stageHead: (document.getElementById('stagehead') || {}).textContent,
    activeTab: (document.querySelector('.seg button.on') || {}).getAttribute?.('data-tab')
  }));
  compSeq.push({ requested: v, ...s });
}
console.log('\n=== COMPANION (topic=caching, generated) ===');
compSeq.forEach(r => console.log(`  view=${r.requested.padEnd(6)} activeTab=${String(r.activeTab).padEnd(6)} stageHead="${r.stageHead}" companionSays="${r.cmpView}"`));
await p.evaluate(() => window.goView('num'));
await p.waitForTimeout(250);
await p.screenshot({ path: SHOTS + '/A5-companion-stale-num-says-drill.png' });

/* --- 6. RAIL width across all 9 views --- */
const rail = [];
for (const v of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.evaluate(t => window.goView(t), v);
  await p.waitForTimeout(120);
  const w = await p.evaluate(() => {
    const r = document.getElementById('rail');
    return { inline: r.style.width, computedPx: getComputedStyle(r).width, parentPx: getComputedStyle(r.parentElement).width };
  });
  rail.push({ v, ...w });
}
console.log('\n=== RAIL ===');
rail.forEach(r => console.log(`  ${r.v.padEnd(6)} inline-width="${r.inline}"  computed=${r.computedPx} (track ${r.parentPx})`));

console.log('\n=== CONSOLE ERRORS:', errs.length, '===');
await b.close();
