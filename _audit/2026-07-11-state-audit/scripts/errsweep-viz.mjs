/* The viz tab is unclickable on 45/46 topics. Is that an intentional guard --
   and do the `v` KEY and the #<topic>/viz DEEP LINK bypass it? */
import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#walk';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1800);

const ids = await p.evaluate(() => TopicRegistry.ids());

// 1) tab state per topic
console.log('=== viz TAB state across 46 topics ===');
const states = {};
let withVisual = [];
for (const t of ids) {
  await p.evaluate(id => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(45);
  const s = await p.evaluate(() => {
    const tab = document.querySelector('[data-tab="viz"]');
    if (!tab) return { missing: true };
    const cs = getComputedStyle(tab);
    const r = tab.getBoundingClientRect();
    return {
      disabled: tab.disabled, hidden: tab.hidden,
      ariaDisabled: tab.getAttribute('aria-disabled'),
      display: cs.display, visibility: cs.visibility, pointerEvents: cs.pointerEvents,
      opacity: cs.opacity,
      w: Math.round(r.width), h: Math.round(r.height),
      cls: tab.className,
    };
  });
  const key = `disabled=${s.disabled} hidden=${s.hidden} display=${s.display} pe=${s.pointerEvents} wxh=${s.w}x${s.h}`;
  (states[key] ||= []).push(t);
  if (s.w > 0 && s.display !== 'none' && !s.disabled) withVisual.push(t);
}
for (const [k, ts] of Object.entries(states)) {
  console.log(`\n [${ts.length} topics] ${k}`);
  console.log('   ', ts.slice(0, 6).join(', ') + (ts.length > 6 ? ' ...' : ''));
}
console.log('\nTopics where the viz tab is REACHABLE:', JSON.stringify(withVisual));

// 2) What does the viz pane show when reached PROGRAMMATICALLY on a topic with NO visual?
const noVis = ids.find(t => !withVisual.includes(t));
console.log(`\n=== press "v" (keyboard) on "${noVis}" -- a topic with NO visual ===`);
await p.evaluate(id => TopicRegistry.setTopic(id), noVis);
await p.waitForTimeout(300);
await p.keyboard.press('v');
await p.waitForTimeout(900);
const viaKey = await p.evaluate(() => {
  const on = document.querySelector('.pane.on');
  const ce = on?.querySelector('*');
  const sr = ce?.shadowRoot;
  const host = sr || on;
  return {
    onPane: on?.id,
    hash: location.hash,
    activeTab: document.querySelector('.seg button.on')?.getAttribute('data-tab'),
    text: (host?.textContent || '').trim().replace(/\s+/g, ' '),
    canvas: !!host?.querySelector('canvas'),
    paneHeight: Math.round(on?.getBoundingClientRect().height || 0),
  };
});
console.log('  pane now  :', viaKey.onPane, ' hash:', viaKey.hash, ' tabHighlighted:', viaKey.activeTab);
console.log('  canvas    :', viaKey.canvas, ' paneHeight:', viaKey.paneHeight);
console.log('  FULL TEXT :', JSON.stringify(viaKey.text));
await p.screenshot({ path: `${SHOTS}/viz-via-keyboard-no-visual.png` });

// 3) deep link straight to #<topic>/viz on a no-visual topic
console.log(`\n=== deep link to #${noVis}/viz ===`);
await p.goto(`file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#${noVis}/viz`, { waitUntil: 'load' });
await p.waitForTimeout(2000);
const viaLink = await p.evaluate(() => {
  const on = document.querySelector('.pane.on');
  const ce = on?.querySelector('*');
  const host = ce?.shadowRoot || on;
  return {
    onPane: on?.id, topic: TopicRegistry.current().id,
    text: (host?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
    canvas: !!host?.querySelector('canvas'),
    h: Math.round(on?.getBoundingClientRect().height || 0),
  };
});
console.log('  ', JSON.stringify(viaLink, null, 1));
await p.screenshot({ path: `${SHOTS}/viz-via-deeplink-no-visual.png` });

// 4) the ONE topic that DOES have a visual -- does it actually render a canvas?
if (withVisual.length) {
  const good = withVisual[0];
  console.log(`\n=== the topic WITH a visual: ${good} ===`);
  await p.goto(`file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html#${good}/viz`, { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const g = await p.evaluate(() => {
    const on = document.querySelector('.pane.on');
    const ce = on?.querySelector('*');
    const host = ce?.shadowRoot || on;
    const c = host?.querySelector('canvas');
    return {
      onPane: on?.id, topic: TopicRegistry.current().id,
      canvas: c ? `${c.width}x${c.height}` : null,
      ctx: c ? (!!(c.getContext('webgl2') || c.getContext('webgl'))) : null,
      text: (host?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200),
      h: Math.round(on?.getBoundingClientRect().height || 0),
    };
  });
  console.log('  ', JSON.stringify(g, null, 1));
  await p.screenshot({ path: `${SHOTS}/viz-topic-with-visual.png` });
}
await b.close();
