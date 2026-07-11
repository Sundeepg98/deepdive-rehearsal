// Honest viz-reachability test: dismiss the boot topic-index overlay, then drive the real UI.
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/code-health';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);
console.log('A. boot hash:', await p.evaluate(() => location.hash));
console.log('   boot: topic-index overlay open?', await p.evaluate(() => !!document.querySelector('#_index-overlay.open')));

// Dismiss the boot overlay the way a user would
await p.keyboard.press('Escape');
await p.waitForTimeout(600);
console.log('B. after Escape, overlay open?', await p.evaluate(() => !!document.querySelector('#_index-overlay.open')));

// Switch to kafka-internals via the app's own topic API
const after = await p.evaluate(async () => {
  window.TopicRegistry.setTopic('kafka-internals');
  await new Promise((r) => setTimeout(r, 1500));
  return { hash: location.hash, current: window.TopicRegistry.current().id };
});
console.log('C. after setTopic("kafka-internals"):', JSON.stringify(after));

const viz = await p.evaluate(() => {
  const btn = document.querySelector('button[data-tab="viz"]');
  const pane = document.querySelector('deep-visual');
  const cur = window.TopicRegistry.current();
  return {
    currentTopic: cur.id,
    currentHasVisualInData: !!(cur.data && cur.data.visual),
    vizBtnHidden: btn ? btn.hidden : 'no btn',
    vizBtnVisible: btn ? getComputedStyle(btn).display !== 'none' : null,
    paneData: pane ? (pane._data ? 'PRESENT' : 'NULL') : 'no pane',
  };
});
console.log('D. viz state on kafka-internals:', JSON.stringify(viz, null, 1));
await p.screenshot({ path: `${SHOTS}/viz-tab-on-kafka.png` });

if (viz.vizBtnHidden === false) {
  await p.click('button[data-tab="viz"]');
  await p.waitForTimeout(4000);
  const mounted = await p.evaluate(() => {
    const c = document.querySelector('deep-visual');
    const canvas = (c && c.shadowRoot && c.shadowRoot.querySelector('canvas')) || document.querySelector('#viz canvas');
    return {
      hash: location.hash,
      inst: c ? !!c._inst : null,
      canvas: canvas ? canvas.width + 'x' + canvas.height : 'NO CANVAS',
      webgl2: canvas ? !!canvas.getContext('webgl2') : null,
      vizGlobal: typeof window.__VIZ,
    };
  });
  console.log('E. after clicking the viz tab:', JSON.stringify(mounted, null, 1));
  await p.screenshot({ path: `${SHOTS}/viz-WORKING.png` });
} else {
  console.log('E. SKIPPED -- viz tab still hidden on the one topic that has a visual.');
}
console.log('errors:', errors.length, errors.slice(0, 5));
await b.close();
