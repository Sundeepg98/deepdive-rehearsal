import { chromium } from 'playwright';
const D = 'file:///D:/claude-workspace/_worktrees/deepdive-rehearsal/vfix-css/dist/index.html';
const br = await chromium.launch();
for (const theme of ['light','dark']) {
  const p = await (await br.newContext({ viewport: { width: 1100, height: 760 } })).newPage();
  await p.goto(D); await p.waitForTimeout(2400); await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  // stand in the SECURITY room -- raspberry is unmistakable if it leaks into a cross-group panel
  await p.evaluate(() => { location.hash = '#signing/drill'; }); await p.waitForTimeout(1200);
  await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(400);
  await p.evaluate(() => document.getElementById('idxopen').click());
  await p.waitForTimeout(900);
  await p.screenshot({ path: `_audit/2026-07-13-vfix-css/shots/AFTER_index_${theme}.png` });
  await p.close();
}
await br.close();
console.log('index overlay shots written (from the security-tenancy room)');
