import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-desktop';
fs.mkdirSync(SHOTS, { recursive: true });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => { const o = document.getElementById('_index-overlay'); if (o) o.classList.remove('open', 'vis'); document.body.style.overflow = ''; });

async function setView(t) { await p.evaluate(v => document.querySelector(`.sidebar .seg button[data-tab="${v}"]`).click(), t); await p.waitForTimeout(700); }
async function setTopic(t) { await p.evaluate(v => TopicRegistry.setTopic(v), t); await p.waitForTimeout(800); }

const VIEWS = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
// md-authored (38) vs hand-authored dirs (8)
const TOPICS = [
  ['event-driven', 'MD'], ['slos', 'MD'], ['caching', 'MD'],
  ['content-pipeline', 'HAND'], ['authz', 'HAND'], ['signing', 'HAND'],
];

const R = { deadCanvas: {}, companion: {}, wbFoot: {}, drillBtns: null };

// discover drill's real buttons once
await setView('drill');
R.drillBtns = await p.evaluate(() => {
  const root = document.querySelector('deep-drill')?.shadowRoot;
  return [...root.querySelectorAll('button')].map(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { id: el.id, cls: el.className, txt: el.textContent.trim().slice(0, 22), w: +r.width.toFixed(1), h: +r.height.toFixed(1), area: Math.round(r.width * r.height), fontSize: cs.fontSize, fontWeight: cs.fontWeight, radius: cs.borderRadius, bg: cs.backgroundImage !== 'none' ? 'gradient' : cs.backgroundColor, color: cs.color, shadow: cs.boxShadow === 'none' ? 'none' : 'yes' };
  }).filter(x => x.w > 0);
});

for (const [tid, kind] of TOPICS) {
  await setTopic(tid);
  R.deadCanvas[tid] = { kind, views: {} };
  R.companion[tid] = { kind, views: {} };

  for (const v of VIEWS) {
    await setView(v);
    const m = await p.evaluate((view) => {
      const stage = document.querySelector('.stage');
      const pane = document.getElementById(view);
      const pr = pane.getBoundingClientRect();
      const cmp = document.querySelector('.companion');
      return {
        paneBottom: Math.round(pr.bottom), paneH: Math.round(pr.height),
        stageH: stage.clientHeight,
        deadCanvasAtFold: Math.round(900 - pr.bottom),   // + = empty space on first screen
        stagePadBottom: parseInt(getComputedStyle(stage).paddingBottom),
        canvasBelowPaneFullPage: stage.scrollHeight - Math.round(pr.bottom - stage.getBoundingClientRect().top),
        cmpScrollH: cmp.scrollHeight, cmpClientH: cmp.clientHeight, cmpOver: cmp.scrollHeight - cmp.clientHeight,
      };
    }, v);
    R.deadCanvas[tid].views[v] = { paneBottom: m.paneBottom, paneH: m.paneH, stageH: m.stageH, deadAtFold: m.deadCanvasAtFold, canvasBelow: m.canvasBelowPaneFullPage };
    R.companion[tid].views[v] = { scrollH: m.cmpScrollH, clientH: m.cmpClientH, over: m.cmpOver };
  }

  // wb-foot on this topic
  await setView('wb');
  R.wbFoot[tid] = await p.evaluate(() => {
    const root = document.querySelector('deep-whiteboard')?.shadowRoot;
    const foots = [...root.querySelectorAll('.wb-foot')];
    return foots.map(f => { const r = f.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), textLen: f.textContent.trim().length, empty: f.textContent.trim().length === 0, html: f.innerHTML.slice(0, 50) }; });
  });
  if (kind === 'MD') { await p.screenshot({ path: SHOTS + `/wb-${tid}.png` }); }
}

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_vd-topicaxis.json', JSON.stringify({ R, errs }, null, 1));

console.log('=== DRILL BUTTONS (real) ===');
R.drillBtns.forEach(x => console.log(`  ${String(x.id || '.' + x.cls).padEnd(16)} "${x.txt.padEnd(22)}" ${String(x.w).padStart(6)}x${String(x.h).padStart(4)} = ${String(x.area).padStart(6)}px2 ${x.fontSize}/${x.fontWeight} r=${x.radius} bg=${x.bg} shadow=${x.shadow}`));

console.log('\n=== DEAD CANVAS AT FOLD (positive = empty screen space) ===');
console.log('topic'.padEnd(18) + 'kind '.padEnd(6) + VIEWS.map(v => v.padStart(7)).join(''));
for (const [t, d] of Object.entries(R.deadCanvas)) {
  console.log(t.padEnd(18) + d.kind.padEnd(6) + VIEWS.map(v => String(d.views[v].deadAtFold).padStart(7)).join(''));
}
console.log('\n=== COMPANION OVERFLOW px ===');
console.log('topic'.padEnd(18) + 'kind '.padEnd(6) + VIEWS.map(v => v.padStart(7)).join(''));
for (const [t, d] of Object.entries(R.companion)) {
  console.log(t.padEnd(18) + d.kind.padEnd(6) + VIEWS.map(v => String(d.views[v].over).padStart(7)).join(''));
}
console.log('\n=== WB-FOOT ===');
for (const [t, f] of Object.entries(R.wbFoot)) console.log('  ' + t.padEnd(18) + JSON.stringify(f));
console.log('\nERRORS:', errs.length ? errs : 'none');
await b.close();
