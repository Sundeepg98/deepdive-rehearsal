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
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });

const topicIds = await p.evaluate(() => TopicRegistry.ids());
const SAMPLE = ['event-driven', 'stream-batch-processing', 'shared-definition', 'retries-timeouts', 'slos', 'distributed-locks', 'content-pipeline', 'authz', 'caching'];

async function setTopic(id) { await p.evaluate(t => TopicRegistry.setTopic(t), id); await p.waitForTimeout(650); }
async function setView(tab) { await p.evaluate(t => document.querySelector(`.sidebar .seg button[data-tab="${t}"]`).click(), tab); await p.waitForTimeout(650); }

const R = { drill: [], sys: [], num: [], mock: null };

for (const tid of SAMPLE) {
  await setTopic(tid);

  // ---------- DRILL: tiernote "undefined" ----------
  await setView('drill');
  const dr = await p.evaluate(() => {
    const host = document.querySelector('deep-drill'); const root = host?.shadowRoot;
    if (!root) return { err: 'no shadow' };
    const tn = root.querySelector('.tiernote');
    // any text node in the pane that is literally "undefined"
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const undef = []; let n;
    while ((n = walker.nextNode())) { const t = n.nodeValue.trim(); if (t === 'undefined' || t === 'null' || t === 'NaN') undef.push({ v: t, parent: n.parentElement?.className }); }
    const r = tn ? tn.getBoundingClientRect() : null;
    return {
      tiernoteHTML: tn ? tn.innerHTML : null,
      tiernoteText: tn ? tn.textContent : null,
      isUndefined: tn ? tn.innerHTML === 'undefined' : null,
      rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
      undefNodes: undef,
    };
  });
  R.drill.push({ topic: tid, ...dr });

  // ---------- SYS: pivots ----------
  await setView('sys');
  const sy = await p.evaluate(() => {
    const root = document.querySelector('deep-system-map')?.shadowRoot;
    if (!root) return { err: 'no shadow' };
    const pivs = [...root.querySelectorAll('.piv')];
    return pivs.map(pv => {
      const sum = pv.querySelector('summary'), chip = pv.querySelector('.chip'), pa = pv.querySelector('.pa'), pq = pv.querySelector('.pq');
      const sr = sum.getBoundingClientRect(), pr = pv.getBoundingClientRect();
      return {
        pivW: Math.round(pr.width),
        sumScrollW: sum.scrollWidth, sumClientW: sum.clientWidth,
        overflow: sum.scrollWidth - sum.clientWidth,
        chipText: chip ? chip.textContent : null,
        chipLen: chip ? chip.textContent.length : 0,
        chipW: chip ? Math.round(chip.getBoundingClientRect().width) : 0,
        chipNowrap: chip ? getComputedStyle(chip).whiteSpace : null,
        paText: pa ? pa.textContent.trim().slice(0, 60) : null,
        paLen: pa ? pa.textContent.trim().length : 0,
        paEmpty: pa ? pa.textContent.trim().length === 0 : null,
        pqW: pq ? Math.round(pq.getBoundingClientRect().width) : 0,
        pivOverflowHidden: getComputedStyle(pv).overflow,
      };
    });
  });
  R.sys.push({ topic: tid, pivots: sy });

  // ---------- NUM: value column clipping ----------
  await setView('num');
  const nu = await p.evaluate(() => {
    const root = document.querySelector('deep-numbers')?.shadowRoot;
    if (!root) return { err: 'no shadow' };
    const card = root.querySelector('.card');
    const cardR = card ? card.getBoundingClientRect() : null;
    const rows = [...root.querySelectorAll('.nrow')].map(rw => {
      const v = rw.querySelector('.nrow-v'); if (!v) return null;
      const vr = v.getBoundingClientRect();
      return {
        text: v.textContent.trim(),
        clientW: v.clientWidth, scrollW: v.scrollWidth,
        clipped: v.scrollWidth > v.clientWidth,
        overflowPx: v.scrollWidth - v.clientWidth,
        right: Math.round(vr.right),
        overflowStyle: getComputedStyle(v).overflow,
        ws: getComputedStyle(v).whiteSpace,
      };
    }).filter(Boolean);
    return { cardRight: cardR ? Math.round(cardR.right) : null, cardBorderRight: cardR ? Math.round(cardR.right) : null, rows };
  });
  R.num.push({ topic: tid, ...nu });
}

// ---------- MOCK RUN: "undefined" ----------
await setTopic('event-driven');
await p.evaluate(() => document.getElementById('mockopen')?.click() || document.querySelector('.mockbtn')?.click());
await p.waitForTimeout(1200);
R.mock = await p.evaluate(() => {
  const host = document.querySelector('deep-mock-run'); const root = host?.shadowRoot || host;
  if (!root) return { err: 'no host' };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const undef = []; let n;
  while ((n = walker.nextNode())) { const t = n.nodeValue.trim(); if (t === 'undefined' || t === 'null' || t === 'NaN') undef.push({ v: t, parent: n.parentElement?.className, tag: n.parentElement?.tagName }); }
  const task = root.querySelector('.mb-task');
  return { undefNodes: undef, mbTaskHTML: task ? task.innerHTML.slice(0, 120) : null, mbTaskText: task ? task.textContent.trim() : null, overlayOpen: document.getElementById('mockov')?.classList.contains('open') };
});
await p.screenshot({ path: SHOTS + '/mock-run-open.png' });

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vd-panes.json', JSON.stringify({ R, errs }, null, 1));

// --- summary ---
console.log('=== DRILL tiernote ===');
R.drill.forEach(d => console.log(`  ${d.topic.padEnd(26)} innerHTML=${JSON.stringify(d.tiernoteHTML)} isUndefined=${d.isUndefined} rect=${JSON.stringify(d.rect)}`));
console.log('\n=== MOCK RUN ===');
console.log(' ', JSON.stringify(R.mock, null, 1));
console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
