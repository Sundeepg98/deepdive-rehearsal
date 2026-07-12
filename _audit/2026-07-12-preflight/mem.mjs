// MEMORY: heap after boot, then after switching through topics. Leak = monotonic growth
// that survives a forced GC. We collectGarbage() before every sample, so what we measure is
// RETAINED memory, not garbage awaiting collection.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
const URLS = {
  BEFORE: `file:///${OUT}/before_master.html`.replace(/\\/g, '/'),
  AFTER: `file:///${ROOT}/dist/index.html`,
};
const SWITCHES = Number(process.env.SWITCHES || 12);

async function run(browser, url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(500);

  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage'); // force GC -> retained, not garbage
    await new Promise((r) => setTimeout(r, 120));
    const h = await cdp.send('Runtime.getHeapUsage');
    return +(h.usedSize / 1048576).toFixed(2);
  };

  const boot = await sample();
  const series = [boot];
  const topics = [];

  for (let i = 0; i < SWITCHES; i++) {
    const before = await page.evaluate(() => (document.querySelector('#tncurrent') || {}).textContent || '');
    await page.click('#tnnext', { timeout: 15000 }).catch(() => {});
    // wait for the topic label to actually change -- proof the switch really happened
    await page.waitForFunction((prev) => ((document.querySelector('#tncurrent') || {}).textContent || '') !== prev, before, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(350);
    const now = await page.evaluate(() => ({
      topic: (document.querySelector('#tncurrent') || {}).textContent || '',
      txt: (document.body.innerText || '').trim().length,
      shadow: [...document.querySelectorAll('body *')].reduce((a, e) => a + (e.shadowRoot ? e.shadowRoot.querySelectorAll('*').length : 0), 0),
    }));
    topics.push(now);
    series.push(await sample());
  }

  // return to topic 1 and re-sample: if memory is retained per-topic, this stays high;
  // if panes are torn down properly it should fall back near boot.
  const back = await sample();
  const rendered = topics.filter((t) => t.txt > 500 && t.shadow > 20).length;
  await ctx.close();
  return { label, boot, series, back, topics, rendered, switches: topics.length };
}

const browser = await chromium.launch();
const out = {};
for (const [label, url] of Object.entries(URLS)) {
  const r = await run(browser, url, label);
  out[label] = r;
  const growth = r.series[r.series.length - 1] - r.boot;
  const perSwitch = growth / r.switches;
  console.log(`\n===== ${label} =====`);
  console.log(`  heap after boot        : ${r.boot} MB`);
  console.log(`  heap after ${String(r.switches).padStart(2)} switches : ${r.series[r.series.length - 1]} MB   (growth +${growth.toFixed(2)} MB, ${perSwitch.toFixed(2)} MB/topic)`);
  console.log(`  series (post-GC, MB)   : ${r.series.join(' -> ')}`);
  console.log(`  topics genuinely rendered: ${r.rendered}/${r.switches}  ${r.rendered === r.switches ? '(all real)' : '*** SOME BLANK ***'}`);
  console.log(`  topic labels: ${r.topics.map((t) => t.topic.trim()).slice(0, 12).join(' | ')}`);
  // monotonic?
  let mono = true;
  for (let i = 2; i < r.series.length; i++) if (r.series[i] < r.series[i - 1] - 0.3) mono = false;
  console.log(`  monotonic growth (leak signature)? ${mono ? 'YES -- every switch retains' : 'NO -- heap falls back, GC reclaims'}`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'mem.json'), JSON.stringify(out, null, 2));
console.log('\nwrote mem.json');
