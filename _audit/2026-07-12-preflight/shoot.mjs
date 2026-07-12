import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/shots';
const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };
const THEMES = ['light', 'dark'];

fs.mkdirSync(OUT, { recursive: true });
const log = [];
const browser = await chromium.launch();

const VIS = () => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01; };
  let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const t = w.currentNode; if (t.nodeValue.trim() && t.parentElement && vis(t.parentElement)) n++; }
  return n;
};

async function dismiss(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  await page.evaluate(() => document.querySelectorAll('.ix-ov.open,.ov.open,.open.vis').forEach(e => e.classList.remove('open', 'vis')));
  await page.waitForTimeout(250);
}

for (const [build, path] of Object.entries(BUILDS)) {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, ...(vpName === 'mobile' ? { isMobile: true, hasTouch: true } : {}) });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(e.message.slice(0, 100)));
      await page.addInitScript(() => { try { localStorage.setItem('ddr.v1.theme', 'light'); } catch (e) {} });
      await page.goto('file:///' + path);
      await page.waitForTimeout(2000);
      await dismiss(page);
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForTimeout(500);

      const tag = `${vpName}_${theme}_${build}`;
      const rec = (view, extra = {}) => log.push({ build, vp: vpName, theme, view, ...extra });

      // panes (walk is default)
      for (const pane of ['walk', 'drill', 'sys', 'model', 'num']) {
        try {
          if (pane !== 'walk') {
            await page.click(`[data-tab="${pane}"]`, { timeout: 5000 });
            await page.waitForTimeout(1000);
          }
          await page.screenshot({ path: `${OUT}/${pane}_${tag}.png` });
          rec(pane, { visibleTextNodes: await page.evaluate(VIS) });
        } catch (e) { rec(pane, { ERROR: e.message.split('\n')[0].slice(0, 90) }); }
      }

      // tools drawer
      try {
        await page.click('#toolsfab', { timeout: 5000 });
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${OUT}/tools_${tag}.png` });
        rec('tools', { visibleTextNodes: await page.evaluate(VIS) });
      } catch (e) { rec('tools', { ERROR: e.message.split('\n')[0].slice(0, 90) }); }

      // overlay 1: topic index
      try {
        await page.click('#idxopen', { timeout: 5000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/idx_${tag}.png` });
        rec('idx', { visibleTextNodes: await page.evaluate(VIS) });
        await dismiss(page);
      } catch (e) { rec('idx', { ERROR: e.message.split('\n')[0].slice(0, 90) }); await dismiss(page); }

      // overlay 2: session progress (the "instrumentation" claim)
      try {
        await page.click('#toolsfab', { timeout: 4000 }); await page.waitForTimeout(700);
        await page.click('#sessopen', { timeout: 4000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/sess_${tag}.png` });
        rec('sess', { visibleTextNodes: await page.evaluate(VIS) });
        await dismiss(page);
      } catch (e) { rec('sess', { ERROR: e.message.split('\n')[0].slice(0, 90) }); await dismiss(page); }

      // overlay 3: cram sheet
      try {
        await page.click('#toolsfab', { timeout: 4000 }); await page.waitForTimeout(700);
        await page.click('#cramopen', { timeout: 4000 });
        await page.waitForTimeout(1300);
        await page.screenshot({ path: `${OUT}/cram_${tag}.png` });
        rec('cram', { visibleTextNodes: await page.evaluate(VIS) });
        await dismiss(page);
      } catch (e) { rec('cram', { ERROR: e.message.split('\n')[0].slice(0, 90) }); await dismiss(page); }

      if (errs.length) rec('_pageErrors', { errs: [...new Set(errs)].slice(0, 4) });
      await ctx.close();
      console.log(`done ${build} ${vpName} ${theme}`);
    }
  }
}

fs.writeFileSync(`${OUT}/../render-log.json`, JSON.stringify(log, null, 2));
const bad = log.filter(l => l.ERROR || l.errs || (l.visibleTextNodes !== undefined && l.visibleTextNodes < 20));
console.log('\n=== PROBLEMS ===');
console.log(bad.length ? JSON.stringify(bad, null, 1) : '  none');
console.log('total shots:', fs.readdirSync(OUT).length);
await browser.close();
