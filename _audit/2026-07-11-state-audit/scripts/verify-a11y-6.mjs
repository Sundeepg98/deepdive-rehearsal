/* DEFINITIVE keyboard-user journey: open overlay, Tab step by step, and at EVERY focus
   position try ArrowDown/PageDown. Answers "can a keyboard-only user read the whole panel?"
   Plus: #tntrigger aria-expanded (missed-item candidate). */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';
const b = await chromium.launch();

async function journey(which, W, H) {
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
  if (which === 'key') await p.keyboard.press('?');
  else await p.evaluate(() => document.getElementById('cramopen').click());
  await p.waitForTimeout(900);

  const ovId = which === 'key' ? 'keyov' : 'cramov';
  const bodyId = which === 'key' ? 'keybody' : 'cram';
  const open = await p.evaluate(id => document.getElementById(id).classList.contains('open'), ovId);
  const geom = await p.evaluate(id => {
    const el = document.getElementById(id);
    return { hiddenPx: el.scrollHeight - el.clientHeight, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
  }, bodyId);

  console.log('\n===== #' + bodyId + ' @' + W + 'x' + H + ' | overlay open=' + open + ' | hidden=' + geom.hiddenPx + 'px of ' + geom.scrollHeight + ' =====');

  const journeyLog = [];
  let bestScroll = 0;
  // Simulate a keyboard-only user: at each Tab position, try to scroll the panel.
  for (let step = 0; step <= 6; step++) {
    if (step > 0) { await p.keyboard.press('Tab'); await p.waitForTimeout(90); }
    const focused = await p.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName);
    await p.evaluate(id => { document.getElementById(id).scrollTop = 0; }, bodyId);
    for (let i = 0; i < 8; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(45); }
    const afterArrow = await p.evaluate(id => document.getElementById(id).scrollTop, bodyId);
    await p.evaluate(id => { document.getElementById(id).scrollTop = 0; }, bodyId);
    await p.keyboard.press('End'); await p.waitForTimeout(120);
    const afterEnd = await p.evaluate(id => document.getElementById(id).scrollTop, bodyId);
    bestScroll = Math.max(bestScroll, afterArrow, afterEnd);
    journeyLog.push({ tabStep: step, focus: focused, scrollAfter8xArrowDown: afterArrow, scrollAfterEnd: afterEnd });
  }
  console.table ? console.table(journeyLog) : console.log(journeyLog);
  const pct = geom.hiddenPx ? (100 * bestScroll / geom.hiddenPx).toFixed(0) : 'n/a';
  console.log('>>> BEST scroll a keyboard user can achieve at ANY tab position: ' + bestScroll + 'px of ' + geom.hiddenPx + 'px hidden (' + pct + '% of the hidden content)');
  console.log('>>> VERDICT: ' + (bestScroll > 0 ? 'READABLE by keyboard' : '*** UNREADABLE by keyboard — hidden content is unreachable ***'));
  await p.screenshot({ path: SHOTS + '/journey-' + bodyId + '-' + W + 'x' + H + '.png' });
  await ctx.close();
  return { bodyId, hiddenPx: geom.hiddenPx, bestScroll };
}

console.log('######## DEFINITIVE KEYBOARD JOURNEY — identical viewport, both overlays ########');
const r1 = await journey('key', 900, 520);
const r2 = await journey('cram', 900, 520);
const r3 = await journey('key', 640, 400);

console.log('\n\n######## SUMMARY ########');
for (const r of [r1, r2, r3]) {
  console.log('  #' + r.bodyId.padEnd(9) + ' hidden=' + String(r.hiddenPx).padStart(5) + 'px  keyboard-scrollable=' + String(r.bestScroll).padStart(5) + 'px  ' + (r.bestScroll > 0 ? 'OK' : '<-- UNREACHABLE'));
}

console.log('\n\n######## MISSED-HUNT C: #tntrigger aria-expanded (topic menu disclosure) ########');
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(600);
const tnBefore = await p.evaluate(() => {
  const t = document.getElementById('tntrigger'), m = document.getElementById('tnmenu');
  return { ariaExpanded: t.getAttribute('aria-expanded'), ariaHaspopup: t.getAttribute('aria-haspopup'), menuHidden: m.hasAttribute('hidden'), menuRole: m.getAttribute('role') };
});
await p.click('#tntrigger');
await p.waitForTimeout(600);
const tnAfter = await p.evaluate(() => {
  const t = document.getElementById('tntrigger'), m = document.getElementById('tnmenu');
  return { ariaExpanded: t.getAttribute('aria-expanded'), menuHidden: m.hasAttribute('hidden'), menuVisible: !!m.getClientRects().length };
});
console.log('#tntrigger BEFORE open:', JSON.stringify(tnBefore));
console.log('#tntrigger AFTER  open:', JSON.stringify(tnAfter));
console.log(tnAfter.ariaExpanded === 'true' ? '>>> aria-expanded IS maintained — healthy, no finding' : '>>> aria-expanded NOT updated — candidate finding');
await ctx.close();
await b.close();
