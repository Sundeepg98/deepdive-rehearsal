/* (a) Clean same-viewport A/B: #keybody vs its FIXED sibling #cram, both verified open.
   (b) F5: re-run axe color-contrast and re-count pass / incomplete / violations + reasons. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-a11y';
const AXE = readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');

const b = await chromium.launch();

console.log('######## (a) A/B at 900x520 — both overlays verified OPEN, identical viewport ########');
async function probe(which) {
  const ctx = await b.newContext({ viewport: { width: 900, height: 520 } });
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
  if (!open) { console.log(which + ': OVERLAY DID NOT OPEN — aborting this probe'); await ctx.close(); return; }

  const attrs = await p.evaluate(id => {
    const el = document.getElementById(id);
    el.scrollTop = 0;
    return {
      tabIndex: el.tabIndex, role: el.getAttribute('role'), ariaLabel: el.getAttribute('aria-label'),
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, hiddenPx: el.scrollHeight - el.clientHeight
    };
  }, bodyId);

  // pure-keyboard tab cycle from wherever the app parked focus on open
  const cycle = [];
  for (let i = 0; i < 6; i++) {
    await p.keyboard.press('Tab');
    await p.waitForTimeout(90);
    cycle.push(await p.evaluate(() => document.activeElement.id || document.activeElement.className || document.activeElement.tagName));
  }
  const reachable = cycle.includes(bodyId);

  // keyboard-only scroll attempt: Tab to wherever you can, then ArrowDown x8
  await p.evaluate(id => { document.getElementById(id).scrollTop = 0; }, bodyId);
  for (let i = 0; i < 8; i++) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); }
  const scrolled = await p.evaluate(id => document.getElementById(id).scrollTop, bodyId);

  console.log('\n--- #' + bodyId + ' (' + (which === 'key' ? 'NO fix' : 'HAS the 2954f71 fix') + ') @900x520, overlay open=' + open);
  console.log('    attrs:', JSON.stringify(attrs));
  console.log('    Tab cycle:', JSON.stringify(cycle));
  console.log('    reachable by Tab?', reachable);
  console.log('    scrollTop after keyboard Tab-cycle + 8x ArrowDown:', scrolled, scrolled > 0 ? '<-- SCROLLS' : '<-- CANNOT SCROLL');
  await p.screenshot({ path: SHOTS + '/ab-' + bodyId + '-900x520.png' });
  await ctx.close();
}
await probe('key');
await probe('cram');

console.log('\n\n######## (b) F5: axe color-contrast adjudication rate ########');
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.keyboard.press('Escape');
await p.waitForTimeout(800);
await p.addScriptTag({ content: AXE });
const res = await p.evaluate(async () => {
  const r = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
  const reasons = {};
  let incompleteNodes = 0;
  for (const inc of r.incomplete) {
    for (const n of inc.nodes) {
      incompleteNodes++;
      for (const c of (n.any || [])) {
        const msg = (c.message || '').split('\n')[0].trim();
        reasons[msg] = (reasons[msg] || 0) + 1;
      }
    }
  }
  return {
    passNodes: r.passes.reduce((a, x) => a + x.nodes.length, 0),
    incompleteNodes,
    violationNodes: r.violations.reduce((a, x) => a + x.nodes.length, 0),
    reasons
  };
});
const decided = res.passNodes + res.violationNodes;
const total = decided + res.incompleteNodes;
console.log(JSON.stringify(res, null, 1));
console.log('\nADJUDICATED = ' + decided + ' / ' + total + ' = ' + (100 * decided / total).toFixed(1) + '%   (lens claimed ~7%)');
console.log('ABSTAINED   = ' + res.incompleteNodes + ' / ' + total + ' = ' + (100 * res.incompleteNodes / total).toFixed(1) + '%');

// full-page axe (all rules) to double-check "zero violations"
const full = await p.evaluate(async () => {
  const r = await window.axe.run(document);
  return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), violationCount: r.violations.length };
});
console.log('\nFULL axe run (all rules) on the default view:', JSON.stringify(full, null, 1));
await ctx.close();
await b.close();
