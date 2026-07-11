/* ROOT-CAUSE PROBE: why do the LAST 16 topics (index 30-45) never commit a pane switch?
   Hypotheses:
     H1 topic-specific  -> a fresh load jumped straight to leader-election also fails
     H2 cumulative      -> it breaks after N switches regardless of which topic
     H3 viz-triggered   -> only breaks if the viz pane was visited
     H4 time-based      -> breaks after T seconds
   switchTab() swaps panes inside document.startViewTransition() (shell.js:55). */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/runtime-errors';
const b = await chromium.launch();

const boot = async () => {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => console.log('   PAGE-ERROR:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('   CONSOLE-ERROR:', m.text()); });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  return p;
};

// does a pane switch actually commit within `ms`?
const commits = async (p, view, ms = 2500) => {
  await p.evaluate(v => window.switchTab(v), view);
  try {
    await p.waitForFunction(v => document.querySelector('.pane.on')?.id === v, view, { timeout: ms });
    return true;
  } catch { return false; }
};

// ---------- H1: topic-specific? fresh load -> jump STRAIGHT to leader-election ----------
console.log('=== H1: fresh load, FIRST switch is straight to leader-election (index 30) ===');
{
  const p = await boot();
  await p.evaluate(() => TopicRegistry.setTopic('leader-election'));
  await p.waitForTimeout(400);
  const cur = await p.evaluate(() => TopicRegistry.current().id);
  const results = {};
  for (const v of ['drill', 'wb', 'sys', 'num', 'viz', 'walk']) results[v] = await commits(p, v);
  console.log('  current topic:', cur);
  console.log('  pane commits:', JSON.stringify(results));
  const allOk = Object.values(results).every(Boolean);
  console.log('  -> ' + (allOk ? 'ALL COMMIT. Not topic-specific. H1 REJECTED.' : 'FAILS on a fresh load -> topic-specific!'));
  await p.close();
}

// ---------- H2: cumulative? walk topics in order, test a pane switch after each ----------
console.log('\n=== H2: switch topics in registry order; after each, test walk->drill commit ===');
{
  const p = await boot();
  const ids = await p.evaluate(() => TopicRegistry.ids());
  const t0 = Date.now();
  let firstFail = -1;
  for (let i = 0; i < ids.length; i++) {
    await p.evaluate(id => TopicRegistry.setTopic(id), ids[i]);
    await p.waitForTimeout(80);
    // alternate between two panes so each switch is a real change
    const target = (i % 2 === 0) ? 'drill' : 'walk';
    const ok = await commits(p, target, 2000);
    const el = ((Date.now() - t0) / 1000).toFixed(1);
    if (!ok && firstFail < 0) {
      firstFail = i;
      console.log(`  *** FIRST FAILURE at index ${i} (${ids[i]}), t=${el}s, ${i} topic-switches in ***`);
      await p.screenshot({ path: `${SHOTS}/vtstall-first-failure.png` });
    }
    if (i % 5 === 0 || (firstFail >= 0 && i <= firstFail + 2)) console.log(`   [${String(i).padStart(2)}] ${ids[i].padEnd(24)} commit=${ok}  t=${el}s`);
  }
  console.log('  -> first failing index:', firstFail);
  await p.close();
}

// ---------- H3: is the viz pane the trigger? ----------
console.log('\n=== H3: same walk, but NEVER visit viz (only walk<->drill) ===');
{
  const p = await boot();
  const ids = await p.evaluate(() => TopicRegistry.ids());
  let firstFail = -1;
  for (let i = 0; i < ids.length; i++) {
    await p.evaluate(id => TopicRegistry.setTopic(id), ids[i]);
    await p.waitForTimeout(80);
    const ok = await commits(p, (i % 2 === 0) ? 'drill' : 'walk', 2000);
    if (!ok && firstFail < 0) { firstFail = i; console.log(`  *** first failure at index ${i} (${ids[i]}) ***`); }
  }
  console.log('  -> first failing index (no viz):', firstFail, firstFail < 0 ? '(NEVER FAILED)' : '');
  await p.close();
}

// ---------- H4: pane-switch churn alone on ONE topic (no topic switching) ----------
console.log('\n=== H4: 60 pane switches on ONE topic, no topic switching ===');
{
  const p = await boot();
  let fails = 0, firstFail = -1;
  const panes = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
  for (let i = 0; i < 60; i++) {
    const ok = await commits(p, panes[i % panes.length], 2000);
    if (!ok) { fails++; if (firstFail < 0) firstFail = i; }
  }
  console.log(`  -> ${fails}/60 pane switches failed to commit; first fail at #${firstFail}`);
  await p.close();
}

// ---------- H5: does it recover? and what does the VT state look like when stuck? ----------
console.log('\n=== H5: after the stall, inspect state + can a click still switch panes? ===');
{
  const p = await boot();
  const ids = await p.evaluate(() => TopicRegistry.ids());
  for (let i = 0; i < 34; i++) {
    await p.evaluate(id => TopicRegistry.setTopic(id), ids[i]);
    await p.waitForTimeout(70);
    await p.evaluate(v => window.switchTab(v), (i % 2 === 0) ? 'drill' : 'walk');
    await p.waitForTimeout(70);
  }
  const stuck = await p.evaluate(() => ({
    onPane: document.querySelector('.pane.on')?.id,
    activeTab: document.querySelector('.seg button.on')?.getAttribute('data-tab'),
    topic: TopicRegistry.current().id,
    hasVT: typeof document.startViewTransition === 'function',
  }));
  console.log('  state after 34 topic switches:', JSON.stringify(stuck));
  console.log('  NOTE: .seg button.on = what the UI HIGHLIGHTS; .pane.on = what is actually SHOWN');
  if (stuck.activeTab !== stuck.onPane) {
    console.log('  *** DESYNC: tab bar highlights "' + stuck.activeTab + '" but the visible pane is "' + stuck.onPane + '" ***');
  }
  await p.screenshot({ path: `${SHOTS}/vtstall-desync.png`, fullPage: false });

  // real user click -- does the UI still respond?
  await p.locator('[data-tab="num"]').first().click({ timeout: 5000 }).catch(e => console.log('  click failed:', e.message.split('\n')[0]));
  await p.waitForTimeout(1500);
  const afterClick = await p.evaluate(() => ({
    onPane: document.querySelector('.pane.on')?.id,
    activeTab: document.querySelector('.seg button.on')?.getAttribute('data-tab'),
  }));
  console.log('  after a REAL CLICK on the "Numbers" tab:', JSON.stringify(afterClick));
  if (afterClick.onPane !== 'num') console.log('  *** USER-VISIBLE BUG: clicked Numbers, pane shown is "' + afterClick.onPane + '" ***');
  await p.screenshot({ path: `${SHOTS}/vtstall-after-click.png` });
  await p.close();
}

await b.close();
