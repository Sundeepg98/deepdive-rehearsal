// Rigorous: is the VisualKit (492KB, 9.55% of payload) reachable AT ALL?
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/code-health';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1500);

// 1. Did the topic global for kafka's visual even get emitted?
const globals = await p.evaluate(() =>
  Object.getOwnPropertyNames(window).filter((k) => /VISUAL|VIZ/i.test(k))
);
console.log('1. visual-related globals in the bundle:', JSON.stringify(globals));

// 2. Does the registered kafka topic carry a .visual in its data?
const reg = await p.evaluate(() => {
  const R = window.TopicRegistry;
  if (!R) return 'NO TopicRegistry';
  const all = (R.all && R.all()) || (R.list && R.list()) || R.topics || null;
  if (!all) return 'registry present, no enumerator; keys=' + Object.keys(R).join(',');
  const arr = Array.isArray(all) ? all : Object.values(all);
  const k = arr.find((t) => t && t.id === 'kafka-internals');
  return {
    totalTopics: arr.length,
    withVisual: arr.filter((t) => t && t.data && t.data.visual).map((t) => t.id),
    kafkaHasVisual: !!(k && k.data && k.data.visual),
    kafkaVisual: k && k.data && k.data.visual ? JSON.stringify(k.data.visual).slice(0, 160) : null,
  };
});
console.log('2. registry:', JSON.stringify(reg, null, 1));

// 3. Route directly to the viz pane on kafka-internals
await p.goto(URL + '#/kafka-internals/viz', { waitUntil: 'load' });
await p.waitForTimeout(3000);
const routed = await p.evaluate(() => {
  const btn = document.querySelector('button[data-tab="viz"]');
  const pane = document.querySelector('#viz');
  const canvas = document.querySelector('#viz canvas');
  return {
    currentHash: location.hash,
    vizBtnHidden: btn ? btn.hidden : 'no btn',
    vizPaneExists: !!pane,
    vizPaneDisplay: pane ? getComputedStyle(pane).display : null,
    vizPaneActiveClass: pane ? pane.className : null,
    canvasPresent: !!canvas,
    canvasSize: canvas ? canvas.width + 'x' + canvas.height : null,
  };
});
console.log('3. direct route #/kafka-internals/viz:', JSON.stringify(routed, null, 1));
await p.screenshot({ path: `${SHOTS}/viz-direct-route.png` });

// 4. Force-unhide the tab and click it -- does the kit mount?
const forced = await p.evaluate(async () => {
  const btn = document.querySelector('button[data-tab="viz"]');
  if (!btn) return 'no btn';
  btn.hidden = false;
  btn.click();
  await new Promise((r) => setTimeout(r, 2500));
  const canvas = document.querySelector('#viz canvas');
  return {
    mounted: !!canvas,
    canvasSize: canvas ? canvas.width + 'x' + canvas.height : null,
    webgl2: canvas ? !!canvas.getContext('webgl2') : null,
    vizInnerLen: (document.querySelector('#viz') || {}).innerHTML?.length ?? null,
  };
});
console.log('4. force-unhide + click:', JSON.stringify(forced, null, 1));
await p.screenshot({ path: `${SHOTS}/viz-forced.png` });

console.log('TOTAL console errors:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('  ERR:', e.slice(0, 160)));
await b.close();
