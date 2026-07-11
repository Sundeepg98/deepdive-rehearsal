// LENS: topic-inventory -- visual evidence of the two content classes.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/topic-inventory';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(500);
// dismiss the first-visit Topic index overlay so panes are visible
await p.keyboard.press('Escape');
await p.waitForTimeout(400);

async function go(topic, view) {
  await p.evaluate(([t, v]) => { window.location.hash = '#' + t + '/' + v; }, [topic, view]);
  await p.waitForTimeout(700);
}

// --- SYS pane: legacy (populated chain) vs markdown (empty chain)
for (const [topic, label] of [['content-pipeline', 'legacy'], ['caching', 'markdown']]) {
  await go(topic, 'sys');
  const m = await p.evaluate(() => {
    const root = document.querySelector('deep-system-map')?.shadowRoot;
    const chain = root?.getElementById('smChain');
    const stages = chain ? chain.querySelectorAll('.stg').length : -1;
    const pivots = root ? root.querySelectorAll('details.piv, .piv').length : -1;
    return { stages, pivots, chainHTML: chain ? chain.innerHTML.slice(0, 60) : 'NO CHAIN EL', chainH: chain ? Math.round(chain.getBoundingClientRect().height) : -1 };
  });
  console.log(`SYS ${label.padEnd(9)} ${topic.padEnd(18)} stages=${m.stages} pivots=${m.pivots} chainHeight=${m.chainH}px chainHTML="${m.chainHTML}"`);
  await p.screenshot({ path: `${SHOTS}/sys-${label}-${topic}.png`, fullPage: true });
}

// --- OPEN pane: legacy has open+close, markdown has open only
for (const [topic, label] of [['content-pipeline', 'legacy'], ['caching', 'markdown']]) {
  await go(topic, 'open');
  const m = await p.evaluate(() => {
    const root = document.querySelector('deep-opener')?.shadowRoot;
    const cards = root ? root.querySelectorAll('.op, .card').length : -1;
    return { cards, text: root ? root.textContent.replace(/\s+/g, ' ').slice(0, 100) : '' };
  });
  console.log(`OPEN ${label.padEnd(9)} ${topic.padEnd(18)} cards=${m.cards} :: ${m.text}`);
  await p.screenshot({ path: `${SHOTS}/open-${label}-${topic}.png`, fullPage: true });
}

// --- WALK pane depth: 9 steps vs 4
for (const [topic, label] of [['content-pipeline', 'legacy'], ['caching', 'markdown']]) {
  await go(topic, 'walk');
  await p.screenshot({ path: `${SHOTS}/walk-${label}-${topic}.png`, fullPage: true });
}

// --- VIZ tab: visible only on kafka-internals
for (const t of ['kafka-internals', 'caching']) {
  await go(t, 'walk');
  const viz = await p.evaluate(() => {
    const btn = document.querySelector('button[data-tab="viz"]');
    return btn ? { hidden: btn.hidden, offset: btn.offsetParent !== null } : null;
  });
  console.log(`VIZ tab on ${t.padEnd(18)} ->`, JSON.stringify(viz));
}
await go('kafka-internals', 'viz');
await p.waitForTimeout(1800);
await p.screenshot({ path: `${SHOTS}/viz-kafka-internals.png` });

console.log('PAGE ERRORS:', errs.length ? errs.join(' | ') : 'none');
await b.close();
