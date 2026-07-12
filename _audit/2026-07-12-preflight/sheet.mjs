import { chromium } from 'playwright';
import fs from 'fs';

const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/shots';
const GROUPS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];

const b64 = f => 'data:image/png;base64,' + fs.readFileSync(`${SHOTS}/${f}`).toString('base64');

for (const [which, prefix] of [['AFTER', 'ROOM'], ['BEFORE', 'ROOMBEFORE']]) {
  for (const theme of ['light', 'dark']) {
    const cells = GROUPS.map(g => {
      const f = `${prefix}_${g}_${theme}.png`;
      if (!fs.existsSync(`${SHOTS}/${f}`)) return `<div class=c><h3>${g}</h3><p>missing</p></div>`;
      return `<div class=c><h3>${g}</h3><img src="${b64(f)}"></div>`;
    }).join('');
    const html = `<style>body{margin:0;background:#333;font:12px system-ui;color:#fff}
    h2{padding:10px 14px;margin:0;font:700 16px system-ui}
    .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px}
    .c h3{margin:0 0 4px;font:600 12px ui-monospace,monospace;color:#ffd;letter-spacing:.5px}
    .c img{width:100%;display:block;border:1px solid #666}</style>
    <h2>${which} — drill pane top region — ${theme.toUpperCase()} — 6 groups</h2><div class=g>${cells}</div>`;
    const f = `${SHOTS}/../sheet_${which}_${theme}.html`;
    fs.writeFileSync(f, html);

    const br = await chromium.launch();
    const p = await br.newPage({ viewport: { width: 1700, height: 1250 } });
    await p.goto('file:///' + f.replace(/\\/g, '/'));
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SHOTS}/SHEET_${which}_${theme}.png`, fullPage: true });
    await br.close();
    console.log('sheet:', `SHEET_${which}_${theme}.png`);
  }
}
