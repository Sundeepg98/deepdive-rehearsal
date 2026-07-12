import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/shots';
const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};
const browser = await chromium.launch();
const log = [];

async function dismiss(page) {
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelectorAll('.ix-ov.open,.ov.open,.open.vis').forEach(e => e.classList.remove('open', 'vis')));
  await page.waitForTimeout(200);
}

for (const [build, path] of Object.entries(BUILDS)) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('file:///' + path);
    await page.waitForTimeout(2000);
    await dismiss(page);
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(400);
    const tag = `desktop_${theme}_${build}`;

    // DESKTOP: tools live in the sidebar permanently -> shoot the sidebar as the "tools" surface
    try {
      const sb = await page.$('.sidebar');
      if (sb) { await sb.screenshot({ path: `${OUT}/tools_${tag}.png` }); log.push({ build, theme, view: 'tools(sidebar)', ok: true }); }
      else log.push({ build, theme, view: 'tools', ERROR: 'no .sidebar' });
    } catch (e) { log.push({ build, theme, view: 'tools', ERROR: e.message.slice(0, 70) }); }

    // session progress overlay -- direct click, no FAB
    for (const [view, sel, wait] of [['sess', '#sessopen', 1000], ['cram', '#cramopen', 1400]]) {
      try {
        await page.click(sel, { timeout: 6000 });
        await page.waitForTimeout(wait);
        await page.screenshot({ path: `${OUT}/${view}_${tag}.png` });
        const n = await page.evaluate(() => { const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && +s.opacity > 0.01; }; let c = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode; if (t.nodeValue.trim() && t.parentElement && vis(t.parentElement)) c++; } return c; });
        log.push({ build, theme, view, ok: true, visibleTextNodes: n });
        await dismiss(page);
      } catch (e) { log.push({ build, theme, view, ERROR: e.message.split('\n')[0].slice(0, 70) }); await dismiss(page); }
    }
    await ctx.close();
    console.log('done', build, theme);
  }
}
console.log(JSON.stringify(log, null, 1));
await browser.close();
