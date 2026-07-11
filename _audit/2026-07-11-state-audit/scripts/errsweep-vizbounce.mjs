/* PROVE: deep-linking to #stream-batch-processing/viz (the ONLY topic with a
   visual) bounces to the walk pane.
   Mechanism (visual-pane.js:35-40): the bounce guard runs against the FIRST-REGISTERED
   topic (content-pipeline, visual=null) because setTopic defers `deeptopicchange`
   through a ViewTransition (topic-protocol.js:114), so the setTimeout(...,0) bounce
   fires BEFORE renderTopic ever sees the deep-linked topic's real visual data. */
import { chromium } from 'playwright';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const F = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();

const land = async (hash, { instrument = false } = {}) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const trace = [];
  p.on('pageerror', e => trace.push('PAGE-ERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') trace.push('CONSOLE-ERROR: ' + m.text()); else if (instrument && m.text().startsWith('TRACE')) trace.push(m.text()); });
  if (instrument) {
    await p.addInitScript(() => {
      const iv = setInterval(() => {
        if (window.goView && !window.__wrapped) {
          window.__wrapped = true;
          const orig = window.goView;
          window.goView = function (v) { console.log('TRACE goView(' + v + ')  <-- BOUNCE if walk'); return orig.apply(this, arguments); };
          clearInterval(iv);
        }
      }, 1);
    });
  }
  await p.goto(F + hash, { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const s = await p.evaluate(() => {
    const on = document.querySelector('.pane.on');
    const ce = on?.querySelector('*');
    const host = ce?.shadowRoot || on;
    return {
      onPane: on?.id,
      topic: TopicRegistry.current().id,
      hash: location.hash,
      canvas: !!host?.querySelector('canvas'),
      vizTabHidden: document.querySelector('[data-tab="viz"]')?.hidden,
      hasVisualKit: typeof window.VisualKit !== 'undefined',
      topicHasVisual: !!TopicRegistry.current().data.visual,
    };
  });
  await p.screenshot({ path: `${SHOTS}/vizbounce-${hash.replace(/[#/]/g, '_') || 'none'}.png` });
  await p.close();
  return { s, trace };
};

console.log('=== A) DEEP LINK to the ONE topic that HAS a visual ===');
const a = await land('#stream-batch-processing/viz', { instrument: true });
console.log(JSON.stringify(a.s, null, 1));
a.trace.forEach(t => console.log('  ' + t));
console.log(a.s.onPane === 'viz'
  ? '  -> OK, landed on viz'
  : `  *** BUG: asked for the viz pane, landed on "${a.s.onPane}" -- the visual never renders ***`);

console.log('\n=== B) CONTROL: deep link to the same topic\'s OTHER panes ===');
for (const v of ['num', 'drill', 'wb']) {
  const r = await land(`#stream-batch-processing/${v}`);
  console.log(`  #stream-batch-processing/${v.padEnd(5)} -> pane="${r.s.onPane}" topic="${r.s.topic}" ${r.s.onPane === v ? '(OK)' : '*** WRONG ***'}`);
}

console.log('\n=== C) CONTROL: reach viz by CLICK instead of deep link ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(F + '#walk', { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  await p.evaluate(() => TopicRegistry.setTopic('stream-batch-processing'));
  await p.waitForTimeout(600);
  await p.locator('[data-tab="viz"]').first().click({ timeout: 5000 });
  await p.waitForTimeout(2500);
  const s = await p.evaluate(() => {
    const on = document.querySelector('.pane.on');
    const host = on?.querySelector('*')?.shadowRoot || on;
    const c = host?.querySelector('canvas');
    return { onPane: on?.id, canvas: c ? `${c.width}x${c.height}` : null, hash: location.hash };
  });
  console.log('  click path ->', JSON.stringify(s), s.onPane === 'viz' && s.canvas ? '(WORKS -- canvas renders)' : '(also broken)');
  await p.screenshot({ path: `${SHOTS}/vizbounce-click-path-works.png` });

  // now RELOAD that exact URL the user is looking at (the bookmark case)
  const url = await p.evaluate(() => location.href);
  console.log('\n=== D) user is ON the working visual; RELOAD the page (bookmark/refresh) ===');
  console.log('  url:', url.split('index.html')[1]);
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const s2 = await p.evaluate(() => {
    const on = document.querySelector('.pane.on');
    const host = on?.querySelector('*')?.shadowRoot || on;
    return { onPane: on?.id, topic: TopicRegistry.current().id, canvas: !!host?.querySelector('canvas') };
  });
  console.log('  after reload ->', JSON.stringify(s2),
    s2.onPane === 'viz' ? '(survives)' : '*** REFRESH LOSES THE VISUAL -> bounced to ' + s2.onPane + ' ***');
  await p.screenshot({ path: `${SHOTS}/vizbounce-after-reload.png` });
  await p.close();
}

await b.close();
