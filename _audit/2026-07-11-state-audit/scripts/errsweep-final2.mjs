/* Remaining checks:
   C) viz via CLICK (works?) and RELOAD of that URL (survives?)
   E) bare-hash ambiguity: ids()[0] ('event-driven') gets a BARE hash, but the
      BOOT topic is the first-REGISTERED one ('content-pipeline') -> does the
      event-driven URL round-trip? (router.js:54-59 vs topic-protocol.js:104)
   F) mobile 390x844 boot + interaction error check */
import { chromium } from 'playwright';
const F = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();

// ---------------- C) viz by click, then reload ----------------
console.log('=== C) reach viz by CLICK, then RELOAD that URL ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('  PAGE-ERROR:', e.message));
  await p.goto(F + '#stream-batch-processing/walk', { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  const pre = await p.evaluate(() => ({
    topic: TopicRegistry.current().id,
    vizHidden: document.querySelector('[data-tab="viz"]')?.hidden,
    hasVisual: !!TopicRegistry.current().data.visual,
  }));
  console.log('  after deep-linking to #stream-batch-processing/walk:', JSON.stringify(pre));

  if (!pre.vizHidden) {
    await p.locator('[data-tab="viz"]').first().click({ timeout: 5000 });
    await p.waitForTimeout(2500);
    const s = await p.evaluate(() => {
      const on = document.querySelector('.pane.on');
      const host = on?.querySelector('*')?.shadowRoot || on;
      const c = host?.querySelector('canvas');
      return { onPane: on?.id, canvas: c ? `${c.width}x${c.height}` : null, hash: location.hash };
    });
    console.log('  CLICK path ->', JSON.stringify(s), (s.onPane === 'viz' && s.canvas) ? '  (WORKS: canvas renders)' : '  (broken)');
    await p.screenshot({ path: `${SHOTS}/final2-viz-click-works.png` });

    const url = await p.evaluate(() => location.href);
    console.log('\n  Now RELOAD the very URL the user is looking at:', url.split('index.html')[1]);
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForTimeout(2600);
    const s2 = await p.evaluate(() => {
      const on = document.querySelector('.pane.on');
      const host = on?.querySelector('*')?.shadowRoot || on;
      return { onPane: on?.id, topic: TopicRegistry.current().id, hash: location.hash, canvas: !!host?.querySelector('canvas') };
    });
    console.log('  AFTER RELOAD ->', JSON.stringify(s2),
      s2.onPane === 'viz' ? '  (survives)' : '  *** REFRESH LOSES IT: bounced to ' + s2.onPane + ', topic -> ' + s2.topic + ' ***');
    await p.screenshot({ path: `${SHOTS}/final2-viz-after-reload.png` });
  } else {
    console.log('  viz tab still hidden -> cannot click');
  }
  await p.close();
}

// ---------------- E) bare-hash ambiguity ----------------
console.log('\n=== E) bare-hash / first-topic ambiguity ===');
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(F + '#walk', { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  const meta = await p.evaluate(() => ({
    sortedFirst: TopicRegistry.ids()[0],          // what router.js treats as "bare"
    bootTopic: TopicRegistry.current().id,        // what actually loads on a bare hash
  }));
  console.log('  router treats as the bare-hash topic (ids()[0]):', meta.sortedFirst);
  console.log('  topic that actually BOOTS on a bare hash        :', meta.bootTopic);
  console.log('  mismatch:', meta.sortedFirst !== meta.bootTopic ? 'YES' : 'no');

  // Go to the sort-first topic and see what URL the app produces
  await p.evaluate(f => TopicRegistry.setTopic(f), meta.sortedFirst);
  await p.waitForTimeout(500);
  await p.locator('[data-tab="num"]').first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(600);
  const shared = await p.evaluate(() => ({ href: location.href, topic: TopicRegistry.current().id, pane: document.querySelector('.pane.on')?.id }));
  console.log(`\n  User is on "${shared.topic}" / "${shared.pane}". The URL (what Copy-link shares) is: ${shared.href.split('index.html')[1]}`);

  await p.goto(shared.href, { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  const back = await p.evaluate(() => ({ topic: TopicRegistry.current().id, pane: document.querySelector('.pane.on')?.id }));
  console.log('  Reopening that URL lands on:', JSON.stringify(back));
  if (back.topic !== shared.topic) {
    console.log(`  *** BUG: the URL for "${shared.topic}" reopens on "${back.topic}" -- bookmark/share/refresh silently changes the topic ***`);
    await p.screenshot({ path: `${SHOTS}/final2-barehash-wrong-topic.png` });
  } else console.log('  (round-trips OK)');
  await p.close();
}

// ---------------- F) mobile ----------------
console.log('\n=== F) mobile 390x844: boot + drive, error check ===');
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  const reqs = [];
  p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
  p.on('request', r => reqs.push(r.url().slice(0, 100)));
  await p.goto(F + '#walk', { waitUntil: 'load' });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${SHOTS}/final2-mobile-boot.png` });

  // drive: panes via keys, a few topics, open tools
  for (const k of ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o']) { await p.keyboard.press(k); await p.waitForTimeout(160); }
  for (let i = 0; i < 5; i++) { await p.keyboard.press(']'); await p.waitForTimeout(350); }
  await p.keyboard.press('/'); await p.waitForTimeout(400); await p.keyboard.type('shard'); await p.waitForTimeout(500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.keyboard.press('\\'); await p.waitForTimeout(600);
  await p.screenshot({ path: `${SHOTS}/final2-mobile-index.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // tools FAB is the mobile entry point
  const fab = await p.locator('#toolsfab').isVisible().catch(() => false);
  console.log('  #toolsfab visible on mobile:', fab);
  if (fab) {
    await p.locator('#toolsfab').click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/final2-mobile-tools.png` });
    await p.keyboard.press('Escape');
  }
  await p.waitForTimeout(800);
  console.log('  mobile ERRORS:', errs.length, errs.length ? JSON.stringify(errs, null, 1) : '(none)');
  console.log('  mobile REQUESTS:', reqs.length, JSON.stringify([...new Set(reqs)]));
  await p.close();
}

await b.close();
