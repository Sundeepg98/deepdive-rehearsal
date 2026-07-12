/* A contact sheet of the six rooms, both themes, at a GOOD score -- so the scoreboard state
   under test is the one in the picture. Built as an HTML page of the 12 PNGs and rasterised,
   so the whole palette can be judged in ONE look instead of twelve. */
import { chromium } from 'playwright';
import fs from 'node:fs';
const R = ['messaging-events','data-storage','reliability-observability','platform-infra','architecture-apis','security-tenancy'];
const CODE = { 'messaging-events':'MSG','data-storage':'DAT','reliability-observability':'REL','platform-infra':'PLT','architecture-apis':'ARC','security-tenancy':'SEC' };
const b64 = f => fs.readFileSync(f).toString('base64');
for (const theme of ['light','dark']) {
  const cells = R.map(g => {
    const f = `_audit/2026-07-13-vfix-css/shots/AFTER_ROOM_${g}_${theme}.png`;
    return `<figure><img src="data:image/png;base64,${b64(f)}"><figcaption>${CODE[g]} &middot; ${g}</figcaption></figure>`;
  }).join('');
  const html = `<style>body{margin:0;background:${theme==='dark'?'#0a0a0d':'#e9e6df'};font:12px -apple-system,sans-serif;color:${theme==='dark'?'#ddd':'#333'}}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:10px}
  figure{margin:0}img{width:100%;display:block;border-radius:6px}
  figcaption{padding:4px 2px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;font-size:10px}</style>
  <div class="grid">${cells}</div>`;
  const f = `_audit/2026-07-13-vfix-css/sheet_${theme}.html`;
  fs.writeFileSync(f, html);
  const br = await chromium.launch();
  const p = await (await br.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  await p.goto('file:///D:/claude-workspace/_worktrees/deepdive-rehearsal/vfix-css/' + f);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `_audit/2026-07-13-vfix-css/shots/AFTER_SHEET_${theme}.png`, fullPage: true });
  await br.close();
  fs.unlinkSync(f);
}
console.log('contact sheets written');
