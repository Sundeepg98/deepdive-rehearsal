// Root-cause the 0x0 canvas + verify the fix hypothesis, with clean screenshots.
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-trainer/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
const R = {};

// close any transient overlay (the topic index auto-opens on first run)
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
await p.waitForTimeout(300);

R.topicIds = await p.evaluate(() => TopicRegistry.ids());

// --- go to kafka viz --------------------------------------------------------
await p.evaluate(() => { TopicRegistry.setTopic('kafka-internals'); });
await p.waitForTimeout(300);
await p.evaluate(() => window.goView('viz'));
await p.waitForTimeout(2000);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); });
await p.waitForTimeout(200);

const paneSel = 'deep-visual';
R.beforeResize = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  return { attrW: c.width, attrH: c.height, clientW: c.clientWidth, clientH: c.clientHeight,
           boundingH: c.getBoundingClientRect().height };
});
await p.locator(paneSel).screenshot({ path: SHOTS + 'A-viz-pane-AS-SHIPPED.png' });
await p.screenshot({ path: SHOTS + 'A-full-AS-SHIPPED.png' });

// --- ROOT-CAUSE PROBE: fire the window resize the scene listens for ---------
await p.setViewportSize({ width: 1281, height: 900 });   // triggers window 'resize'
await p.waitForTimeout(1200);
R.afterResize = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  return { attrW: c.width, attrH: c.height, clientW: c.clientWidth, clientH: c.clientHeight,
           boundingH: c.getBoundingClientRect().height };
});
// now measure paint
R.paintAfterResize = await p.evaluate(() => {
  const c = document.querySelector('deep-visual').shadowRoot.querySelector('canvas');
  if (!c.width || !c.height) return { PAINT_IMPOSSIBLE: true };
  const c2 = document.createElement('canvas');
  c2.width = c.width; c2.height = c.height;
  c2.getContext('2d').drawImage(c, 0, 0);
  const d = c2.getContext('2d').getImageData(0, 0, c2.width, c2.height).data;
  let nonBg = 0; const total = c2.width * c2.height;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - 13) > 8 || Math.abs(d[i + 1] - 17) > 8 || Math.abs(d[i + 2] - 23) > 8) nonBg++;
  }
  return { nonBgPct: +(100 * nonBg / total).toFixed(2), total };
});
await p.locator(paneSel).screenshot({ path: SHOTS + 'B-viz-pane-AFTER-window-resize.png' });
await p.screenshot({ path: SHOTS + 'B-full-AFTER-window-resize.png' });

// --- the tab-leak: kafka (visual) -> a topic with NO visual -----------------
const other = R.topicIds.find(i => i !== 'kafka-internals');
await p.evaluate((id) => { TopicRegistry.setTopic(id); }, other);
await p.waitForTimeout(600);
R.tabLeak = await p.evaluate((id) => ({
  switchedTo: id,
  curTopic: TopicRegistry.current().id,
  topicHasVisual: !!(TopicRegistry.current().data && TopicRegistry.current().data.visual),
  vizTabHidden: document.querySelector('button[data-tab="viz"]').hidden,
  hash: location.hash,
}), other);
await p.screenshot({ path: SHOTS + 'C-tab-leak-on-nonvisual-topic.png' });

R.errors = errs;
console.log(JSON.stringify(R, null, 2));
await b.close();
