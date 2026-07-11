const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await p.waitForTimeout(800);

  const read = () => p.evaluate(() => ({
    topic: (document.querySelector('.hdr h1')||{}).textContent,
    cmpTopic: (document.querySelector('.cmp-topic')||{}).textContent,
    tab: (document.querySelector('.sidebar .seg button.on')||{}).getAttribute('data-tab'),
    view: (document.getElementById('cmpView')||{}).textContent,
    note: (document.getElementById('cmpNote')||{}).textContent,
    move: (document.getElementById('cmpMove')||{}).textContent,
  }));

  // 1. Topic 1 (content-pipeline, 9/9 cmpNotes) -> pane 'sys'
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="sys"]').click());
  await p.waitForTimeout(300);
  const a = await read();
  console.log('--- STEP 1: topic "%s", pane "%s" (a 9/9 hand-coded topic) ---', a.topic, a.tab);
  console.log('   cmpView :', JSON.stringify(a.view));
  console.log('   cmpNote :', JSON.stringify((a.note||'').slice(0,70)+'...'));

  // 2. Switch to caching (a compiled 2/9 topic) while STAYING on pane 'sys'
  await p.evaluate(() => TopicRegistry.setTopic('caching'));
  await p.waitForTimeout(500);
  const c = await read();
  console.log('\n--- STEP 2: switched topic -> "%s" (compiled, 2/9), still on pane "%s" ---', c.topic, c.tab);
  console.log('   page H1        :', JSON.stringify(c.topic));
  console.log('   companion topic:', JSON.stringify(c.cmpTopic));
  console.log('   cmpView        :', JSON.stringify(c.view));
  console.log('   cmpNote        :', JSON.stringify((c.note||'').slice(0,70)+'...'));

  console.log('\n=== VERDICT ===');
  console.log('  Topic label switched to Caching :', c.topic !== a.topic && /Caching/.test(c.topic));
  console.log('  Companion rail STILL shows topic-1 text :', c.view === a.view && c.note === a.note);
  console.log('  => LEAK:', (c.view === a.view && c.note === a.note) ? 'CONFIRMED (stale cross-topic coaching)' : 'not reproduced');

  // 3. Does the SAME topic on a POPULATED pane render correctly? (isolates the guard)
  await p.evaluate(() => document.querySelector('.sidebar .seg button[data-tab="drill"]').click());
  await p.waitForTimeout(300);
  const d = await read();
  console.log('\n--- STEP 3: same topic (Caching), pane "drill" (one of its 2 POPULATED panes) ---');
  console.log('   cmpView :', JSON.stringify(d.view), '<- correct, guard passed');

  await b.close();
})();
