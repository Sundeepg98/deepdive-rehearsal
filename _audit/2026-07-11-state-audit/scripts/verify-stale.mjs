import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);

// ---- A. COMPANION "This view" staleness across tab switches ----
await p.click('.ix-card'); await p.waitForTimeout(900);
console.log('=== A. COMPANION #cmpView vs stage-head (2500ms settle each) ===');
for (const t of ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open']) {
  await p.click(`.seg button[data-tab="${t}"]`);
  await p.waitForTimeout(2500);   // generous settle: rules out a race
  const r = await p.evaluate(() => ({
    stage: document.querySelector('.stage-head .sh-name')?.textContent.trim(),
    cmp: document.getElementById('cmpView')?.textContent.trim(),
    mcmp: document.getElementById('mCmpView')?.textContent.trim(),
    note: document.getElementById('cmpNote')?.textContent.trim().slice(0, 46),
  }));
  const ok = r.stage === r.cmp ? 'OK  ' : 'STALE';
  console.log(` ${ok} tab=${t.padEnd(6)} stage="${r.stage}"  companion="${r.cmp}"  note="${r.note}..."`);
}

// ---- B. CRAM SHEET content vs current topic ----
console.log('\n=== B. CRAM SHEET body vs selected topic ===');
async function gotoTopicByIndex(i) {
  await p.click('#idxopen'); await p.waitForTimeout(600);
  const cards = await p.$$('.ix-card');
  const name = await cards[i].evaluate(e => e.querySelector('.ix-c-name').textContent.trim());
  await cards[i].click(); await p.waitForTimeout(900);
  return name;
}
for (const i of [0, 3, 12]) {
  const name = await gotoTopicByIndex(i);
  await p.click('#cramopen'); await p.waitForTimeout(900);
  const cram = await p.evaluate(() => {
    const t = document.querySelector('.cram-title')?.textContent.trim();
    const body = document.querySelector('.cram-body')?.innerText.replace(/\s+/g, ' ').trim();
    return { title: t, first: body?.slice(0, 130), len: body?.length };
  });
  console.log(`\n topic clicked : "${name}"`);
  console.log(` cram title    : "${cram.title}"`);
  console.log(` cram body[0..130]: "${cram.first}"`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
}

// ---- C. MOCK RUN undefined ----
console.log('\n=== C. MOCK RUN body ===');
await p.click('#mockopen'); await p.waitForTimeout(1200);
const mock = await p.evaluate(() => {
  const panel = document.querySelector('.mock-ov.open .mock-panel') || document.querySelector('.mock-panel');
  const undef = [];
  const w = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (/^(undefined|null|NaN)$/.test(t)) undef.push({ text: t, parentCls: String(n.parentElement.className), fs: getComputedStyle(n.parentElement).fontSize }); }
  return { undef, text: panel.innerText.replace(/\s+/g, ' ').slice(0, 160) };
});
console.log(' literal-undefined nodes:', JSON.stringify(mock.undef));
console.log(' panel text:', mock.text);

await b.close();
