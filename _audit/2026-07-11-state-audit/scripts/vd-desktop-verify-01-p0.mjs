import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);

// helpers injected in page
await p.addInitScript(() => {});

const topicIds = await p.evaluate(() => TopicRegistry.ids());
console.log('TOPIC COUNT:', topicIds.length);
console.log('TOPIC IDS:', topicIds.join(', '));

// close the boot index overlay
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) { o.classList.remove('open', 'vis'); } document.body.style.overflow = ''; });

async function setTopic(id) {
  await p.evaluate(t => TopicRegistry.setTopic(t), id);
  await p.waitForTimeout(700);
}
async function setView(tab) {
  await p.evaluate(t => { const btn = document.querySelector(`.sidebar .seg button[data-tab="${t}"]`); btn.click(); }, tab);
  await p.waitForTimeout(600);
}
// deep text of a shadow host
const deepText = async (sel) => p.evaluate(s => {
  const host = document.querySelector(s);
  if (!host) return null;
  const root = host.shadowRoot || host;
  return (root.textContent || '').replace(/\s+/g, ' ').trim();
}, sel);

const RESULT = { topicCount: topicIds.length };

// ---------- A. COMPANION VIEW SYNC ----------
const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const cmpTest = {};
for (const tid of ['event-driven', 'content-pipeline', 'cdc']) {
  if (!topicIds.includes(tid)) { cmpTest[tid] = 'NOT_A_TOPIC'; continue; }
  await setTopic(tid);
  const rows = [];
  for (const v of VIEWS) {
    await setView(v);
    await p.waitForTimeout(1200); // generous settle, rules out race
    const r = await p.evaluate(() => ({
      stage: document.querySelector('.stage-head .sh-name')?.textContent?.trim(),
      cmpView: document.getElementById('cmpView')?.textContent?.trim(),
      cmpNote: document.getElementById('cmpNote')?.textContent?.trim().slice(0, 45),
      activeTab: document.querySelector('.sidebar .seg button.on')?.getAttribute('data-tab'),
      cmpKeys: (typeof TOPIC_CMP_NOTES !== 'undefined') ? Object.keys(TOPIC_CMP_NOTES) : null,
    }));
    rows.push({ view: v, ...r, MATCH: r.stage === r.cmpView });
  }
  cmpTest[tid] = rows;
}
RESULT.companionSync = cmpTest;

// ---------- B. CRAM BODY STALENESS ----------
const cramBodies = {};
for (const tid of ['event-driven', 'content-pipeline', 'consistency-models']) {
  if (!topicIds.includes(tid)) continue;
  await setTopic(tid);
  await p.evaluate(() => document.getElementById('cramopen').click());
  await p.waitForTimeout(700);
  const title = await p.evaluate(() => document.querySelector('.cram-title')?.textContent?.trim());
  const body = await deepText('deep-cram');
  cramBodies[tid] = { title, bodyLen: body?.length, bodyHash: body?.slice(0, 130), full: body };
  await p.evaluate(() => document.getElementById('cramx').click());
  await p.waitForTimeout(400);
}
RESULT.cram = Object.fromEntries(Object.entries(cramBodies).map(([k, v]) => [k, { title: v.title, bodyLen: v.bodyLen, head: v.bodyHash }]));
const cramVals = Object.values(cramBodies);
RESULT.cramBodiesIdentical = cramVals.length > 1 && cramVals.every(v => v.full === cramVals[0].full);

// ---------- C. SCOPE BODY STALENESS ----------
const scopeBodies = {};
for (const tid of ['event-driven', 'content-pipeline', 'consistency-models']) {
  if (!topicIds.includes(tid)) continue;
  await setTopic(tid);
  await p.evaluate(() => document.getElementById('scopeopen').click());
  await p.waitForTimeout(700);
  const title = await p.evaluate(() => document.querySelector('#scopeov .cram-title')?.textContent?.trim());
  const body = await deepText('deep-scope');
  scopeBodies[tid] = { title, bodyLen: body?.length, head: body?.slice(0, 110), full: body };
  await p.evaluate(() => document.getElementById('scopex').click());
  await p.waitForTimeout(400);
}
RESULT.scope = Object.fromEntries(Object.entries(scopeBodies).map(([k, v]) => [k, { title: v.title, bodyLen: v.bodyLen, head: v.head }]));
const scVals = Object.values(scopeBodies);
RESULT.scopeBodiesIdentical = scVals.length > 1 && scVals.every(v => v.full === scVals[0].full);

console.log(JSON.stringify(RESULT, null, 1));
console.log('ERRORS:', errs.length ? errs : 'none');
fs.writeFileSync(SHOTS + '/../../scripts/_vd-p0.json', JSON.stringify({ RESULT, errs, topicIds }, null, 1));
await b.close();
