// Verify finding #2: "deep-linking / reloading on the viz route dumps the user
// on an unrelated topic (#kafka-internals/viz -> #content-pipeline/walk)".
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify';
const b = await chromium.launch();
const out = { coldLoads: {}, };

// --- A: cold deep-link into each route, fresh context each time (no storage) ---
for (const hash of ['kafka-internals/viz', 'kafka-internals/walk', 'kafka-internals/drill', 'kafka-internals/num']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
  await p.goto(BASE + '#' + hash, { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  out.coldLoads[hash] = await p.evaluate(() => ({
    endHash: location.hash,
    currentTopic: (window.TopicRegistry && TopicRegistry.current()) ? TopicRegistry.current().id : null,
    kitMounted: !!window.__VIZ,
    vizTabVisible: document.querySelector('button[data-tab="viz"]').offsetWidth > 0,
    activePane: [...document.querySelectorAll('.pane.on')].map((e) => e.id),
  }));
  out.coldLoads[hash].errors = errs;
  if (hash.endsWith('/viz')) await p.screenshot({ path: `${SHOTS}/deeplink-coldload-viz.png` });
  await ctx.close();
}

// --- B: navigate to viz normally, THEN reload (the "F5 while viewing" case) ---
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { const x = document.querySelector('.ix-x'); if (x) x.click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.tn-trigger').click());
  await p.waitForTimeout(300);
  await p.evaluate(() => [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes('Kafka Internals')).click());
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector('button[data-tab="viz"]').click());
  await p.waitForTimeout(1200);
  out.beforeReload = await p.evaluate(() => ({ hash: location.hash, topic: TopicRegistry.current().id }));
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(2600);
  out.afterReload = await p.evaluate(() => ({
    hash: location.hash,
    topic: (window.TopicRegistry && TopicRegistry.current()) ? TopicRegistry.current().id : null,
    kitMounted: !!window.__VIZ,
    activePane: [...document.querySelectorAll('.pane.on')].map((e) => e.id),
  }));
  await p.screenshot({ path: `${SHOTS}/deeplink-reload-on-viz.png` });
  await ctx.close();
}

// --- C: is content-pipeline really the FIRST registered topic? (the seed claim) --
{
  const p = await b.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  out.registryOrder = await p.evaluate(() => ({
    firstFive: TopicRegistry.ids().slice(0, 5),
    total: TopicRegistry.ids().length,
  }));
  await p.close();
}

await b.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-deeplink.json', JSON.stringify(out, null, 1));
