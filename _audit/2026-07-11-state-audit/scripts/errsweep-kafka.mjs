/* kafka-internals is the ONLY topic with a `## Visual` section (src/topics-md/kafka-internals.md).
   The click-matrix recorded its canvas as 0x0. Verify the Visualize pane end-to-end:
   does the WebGL visual actually render? And does its deep link work? */
import { chromium } from 'playwright';
const F = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();

const inspect = () => ({
  onPane: document.querySelector('.pane.on')?.id,
  topic: TopicRegistry.current().id,
  hash: location.hash,
  hasVisualData: !!TopicRegistry.current().data.visual,
  hasVisualKit: typeof window.VisualKit !== 'undefined',
  vizInstance: !!window.__VIZ,
  ...(() => {
    const on = document.querySelector('.pane.on');
    const host = on?.querySelector('*')?.shadowRoot || on;
    const c = host?.querySelector('canvas');
    const r = c?.getBoundingClientRect();
    const paneR = on?.getBoundingClientRect();
    return {
      paneH: Math.round(paneR?.height || 0),
      canvasAttr: c ? `${c.width}x${c.height}` : null,
      canvasCSS: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
      emptyMsgShown: (() => { const e = host?.getElementById?.('vzempty'); return e ? !e.hidden : null; })(),
      emptyMsgText: (() => { const e = host?.getElementById?.('vzempty'); return e ? e.textContent : null; })(),
    };
  })(),
});

// ---- 1) CLICK path on kafka-internals ----
console.log('=== 1) kafka-internals -> click the Visualize tab ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('  PAGE-ERROR:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('  CONSOLE-ERROR:', m.text()); });
  await p.goto(F + '#kafka-internals/walk', { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  const pre = await p.evaluate(() => ({
    topic: TopicRegistry.current().id,
    hasVisualData: !!TopicRegistry.current().data.visual,
    vizTabHidden: document.querySelector('[data-tab="viz"]')?.hidden,
  }));
  console.log('  landed:', JSON.stringify(pre));

  await p.locator('[data-tab="viz"]').first().click({ timeout: 6000 });
  await p.waitForTimeout(3000);   // give WebGL time to init + animate
  const s = await p.evaluate(inspect);
  console.log('  after clicking Visualize:');
  console.log(JSON.stringify(s, null, 1));
  await p.screenshot({ path: `${SHOTS}/kafka-viz-clicked.png` });
  // screenshot just the pane
  const pane = p.locator('#viz');
  if (await pane.count()) await pane.screenshot({ path: `${SHOTS}/kafka-viz-pane-only.png` }).catch(() => {});

  if (s.canvasAttr === '0x0' || s.canvasCSS === '0x0') {
    console.log('\n  *** BUG: the canvas exists but is 0x0 -- the visual renders NOTHING ***');
  } else if (!s.canvasAttr) {
    console.log('\n  *** BUG: no canvas at all ***');
  } else {
    console.log('\n  canvas looks real:', s.canvasAttr);
  }

  // is there actually anything painted? sample pixels from the pane region
  const painted = await p.evaluate(() => {
    const on = document.querySelector('.pane.on');
    const host = on?.querySelector('*')?.shadowRoot || on;
    const c = host?.querySelector('canvas');
    if (!c) return 'no canvas';
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return { glContext: !!gl, drawingBuffer: gl ? `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}` : null };
  });
  console.log('  GL:', JSON.stringify(painted));
  await p.close();
}

// ---- 2) DEEP LINK path on kafka-internals ----
console.log('\n=== 2) deep link straight to #kafka-internals/viz ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('  PAGE-ERROR:', e.message));
  await p.goto(F + '#kafka-internals/viz', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const s = await p.evaluate(inspect);
  console.log(JSON.stringify(s, null, 1));
  await p.screenshot({ path: `${SHOTS}/kafka-viz-deeplink.png` });
  console.log(s.onPane === 'viz'
    ? (s.canvasAttr && s.canvasAttr !== '0x0' ? '  -> deep link OK and canvas renders' : '  *** on the viz pane but the canvas is ' + s.canvasAttr + ' ***')
    : `  *** BUG: deep link to viz landed on "${s.onPane}" (topic "${s.topic}", hash "${s.hash}") ***`);
  await p.close();
}

// ---- 3) deep link to a VIZ-LESS topic's viz pane: does it keep the topic? ----
console.log('\n=== 3) deep link to a viz-LESS topic\'s viz pane (#saga/viz) ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(F + '#saga/viz', { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const s = await p.evaluate(() => ({
    onPane: document.querySelector('.pane.on')?.id,
    topic: TopicRegistry.current().id,
    hash: location.hash,
    h1: document.querySelector('.hdr h1')?.textContent.trim(),
  }));
  console.log('  ', JSON.stringify(s));
  console.log(s.topic === 'saga'
    ? '  -> topic preserved (bounced to walk, which is correct for a viz-less topic)'
    : `  *** BUG: asked for topic "saga", landed on topic "${s.topic}" -- the deep link's TOPIC was thrown away ***`);
  await p.screenshot({ path: `${SHOTS}/vizless-deeplink-topic-lost.png` });
  await p.close();
}

// ---- 4) the `v` key produces such a URL -- copy-link then reopen ----
console.log('\n=== 4) user presses "v" on saga, copies the link, reopens it ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(F + '#saga/walk', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  await p.keyboard.press('v');
  await p.waitForTimeout(900);
  const mid = await p.evaluate(() => ({ hash: location.hash, pane: document.querySelector('.pane.on')?.id, topic: TopicRegistry.current().id }));
  console.log('  after pressing v:', JSON.stringify(mid));
  await p.close();
}

await b.close();
