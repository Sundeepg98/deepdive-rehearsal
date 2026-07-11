import { chromium } from 'playwright';
const SHOT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/content/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// STATIC check across all topics: does mxProbe/mxCurve produce "undefined"?
const scan = await p.evaluate(() => {
  const R = window.TopicRegistry, ids = R.ids();
  const ORIG = new Set(['content-pipeline', 'signing', 'authz', 'notifications', 'iac', 'aws-hardening', 'desired-state', 'eav']);
  const out = { origBadTask: 0, mdBadTask: 0, origBadSenior: 0, mdBadSenior: 0, mdCurveTotal: 0, origCurveTotal: 0, mdNoInt: 0, origNoInt: 0 };
  for (const id of ids) {
    const t = R.get(id), bank = (t.data || {}).bank || {};
    const cvs = bank.curveballs || [];
    const isO = ORIG.has(id);
    for (const cb of cvs) {
      if (isO) out.origCurveTotal++; else out.mdCurveTotal++;
      if (cb.task === undefined) { if (isO) out.origBadTask++; else out.mdBadTask++; }
      if (!cb.int) { if (isO) out.origNoInt++; else out.mdNoInt++; }
    }
    const cards = ((t.data || {}).drill || {}).cards || [];
    for (const c of cards) {
      if (!c.senior || !String(c.senior).trim()) { if (isO) out.origBadSenior++; else out.mdBadSenior++; }
    }
  }
  return out;
});
console.log('=== BANK CURVEBALL / SENIOR FIELD SCAN ===');
console.log(JSON.stringify(scan, null, 1));
console.log(`\n>> md curveballs MISSING .task (renders "undefined" in Mixed Fire): ${scan.mdBadTask}/${scan.mdCurveTotal}`);
console.log(`>> md curveballs MISSING .int (no interviewer cut-in):            ${scan.mdNoInt}/${scan.mdCurveTotal}`);
console.log(`>> ORIG curveballs missing .task: ${scan.origBadTask}/${scan.origCurveTotal}   missing .int: ${scan.origNoInt}/${scan.origCurveTotal}`);

// RUNTIME: open Mixed Fire on an md topic, cycle to a curveball, screenshot
await p.evaluate(() => window.TopicRegistry.setTopic('idempotency'));
await p.waitForTimeout(400);
await p.click('#mixopen');
await p.waitForTimeout(800);
for (let i = 0; i < 14; i++) {
  const hit = await p.evaluate(() => {
    const t = document.body.innerText || '';
    return /undefined/i.test(t);
  });
  const kind = await p.evaluate(() => {
    const el = document.querySelector('.mx-kind, [class*="mxb-"]');
    return el ? el.textContent.trim() : '?';
  });
  if (hit) {
    console.log(`\n*** "undefined" VISIBLE in Mixed Fire (item ${i + 1}, kind=${kind}) ***`);
    await p.screenshot({ path: SHOT + 'mixfire-UNDEFINED-idempotency.png' });
    const ctx = await p.evaluate(() => {
      const t = document.body.innerText;
      const i = t.toLowerCase().indexOf('undefined');
      return t.slice(Math.max(0, i - 180), i + 60).replace(/\n+/g, ' | ');
    });
    console.log('   context: ...' + ctx);
    break;
  }
  // advance
  const adv = await p.$('.mx-next, #mxnext, button:has-text("Next")');
  if (adv) { await adv.click(); await p.waitForTimeout(350); } else break;
}
await b.close();
