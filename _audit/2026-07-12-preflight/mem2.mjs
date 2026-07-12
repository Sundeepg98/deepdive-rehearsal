// MEMORY v2. v1 was INVALID: it clicked #tnnext, which the boot-time topic-index overlay
// silently swallowed, so the topic never changed and I "measured" 12 switches that never
// happened. v1's own success check passed anyway -- a check that cannot fail.
// v2: switch by hash, and HARD-ASSERT the <h1> actually changed to the expected topic.
// If a switch does not land, the run ABORTS. No number is reported for work that didn't occur.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'D:/claude-workspace/deepdive-rehearsal';
const OUT = path.join(ROOT, '_audit/2026-07-12-preflight');
const URLS = {
  BEFORE: `file:///${OUT}/before_master.html`.replace(/\\/g, '/'),
  AFTER: `file:///${ROOT}/dist/index.html`,
};
const N = Number(process.env.N || 12);

async function run(browser, url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('HeapProfiler.enable');
  await page.goto(url, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => { const s = document.getElementById('_bootsplash'); return !s || s.classList.contains('_bs-done'); }, null, { timeout: 120000 });
  await page.waitForTimeout(600);

  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    await new Promise((r) => setTimeout(r, 150));
    return +((await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576).toFixed(2);
  };

  const ids = await page.evaluate(() => window.TopicRegistry.ids());
  const boot = await sample();
  const series = [{ topic: '(boot)', mb: boot, h1: await page.evaluate(() => document.querySelector('h1').textContent.trim()) }];
  const visited = ids.slice(0, N);

  for (const id of visited) {
    const prevH1 = await page.evaluate(() => document.querySelector('h1').textContent.trim());
    await page.evaluate((i) => { location.hash = '#' + i + '/walk'; }, id);
    // HARD assertion: h1 must change away from the previous topic. No .catch().
    await page.waitForFunction((prev) => document.querySelector('h1').textContent.trim() !== prev, prevH1, { timeout: 20000 });
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => ({
      h1: document.querySelector('h1').textContent.trim(),
      txt: document.body.innerText.trim().length,
      shadow: [...document.querySelectorAll('body *')].reduce((a, e) => a + (e.shadowRoot ? e.shadowRoot.querySelectorAll('*').length : 0), 0),
    }));
    if (st.txt < 2000 || st.shadow < 100) throw new Error(`topic ${id} rendered EMPTY (txt=${st.txt} shadow=${st.shadow})`);
    series.push({ topic: id, mb: await sample(), h1: st.h1, txt: st.txt, shadow: st.shadow });
  }

  // revisit the FIRST topic: does heap fall back (panes torn down) or stay high (retained)?
  await page.evaluate((i) => { location.hash = '#' + i + '/walk'; }, visited[0]);
  await page.waitForTimeout(800);
  const revisit = await sample();
  await ctx.close();
  return { label, boot, series, revisit, uniqueH1: new Set(series.slice(1).map((s) => s.h1)).size, n: visited.length };
}

const browser = await chromium.launch();
const out = {};
for (const [label, url] of Object.entries(URLS)) {
  const r = await run(browser, url, label);
  out[label] = r;
  const last = r.series[r.series.length - 1].mb;
  const growth = last - r.boot;
  console.log(`\n===== ${label} =====`);
  console.log(`  DISTINCT topics actually rendered: ${r.uniqueH1}/${r.n}  ${r.uniqueH1 === r.n ? '(every switch landed -- verified by <h1>)' : '*** SWITCHES DID NOT LAND ***'}`);
  console.log(`  heap after boot            : ${r.boot} MB`);
  console.log(`  heap after ${String(r.n).padStart(2)} real switches : ${last} MB   (+${growth.toFixed(2)} MB total, ${(growth / r.n).toFixed(3)} MB/topic)`);
  console.log(`  heap after revisiting #1   : ${r.revisit} MB`);
  console.log(`  post-GC series:`);
  for (const s of r.series) console.log(`     ${String(s.mb).padStart(6)} MB  ${s.topic.padEnd(24)} ${s.h1 || ''}`);
  let mono = true;
  for (let i = 2; i < r.series.length; i++) if (r.series[i].mb < r.series[i - 1].mb - 0.4) mono = false;
  console.log(`  strictly monotonic (leak signature)? ${mono ? 'YES' : 'NO -- heap falls back, memory is reclaimed'}`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'mem2.json'), JSON.stringify(out, null, 2));
console.log('\nwrote mem2.json');
