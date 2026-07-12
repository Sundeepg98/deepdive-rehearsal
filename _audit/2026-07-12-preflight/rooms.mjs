import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/shots';
const AFTER = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const BEFORE = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html';

// one representative topic per group (from the index overlay groupings)
const TOPIC_BY_GROUP = {
  'messaging-events': 'event-driven',
  'data-storage': 'cdc',
  'reliability-observability': null,
  'platform-infra': null,
  'architecture-apis': null,
  'security-tenancy': null,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('file:///' + AFTER);
await page.waitForTimeout(2200);

// discover a topic id for each group from the app's own data
const map = await page.evaluate(() => {
  const out = {};
  document.querySelectorAll('.ix-group[data-group]').forEach(sec => {
    const g = sec.getAttribute('data-group');
    const first = sec.querySelector('[data-topic]');
    if (first) out[g] = first.getAttribute('data-topic');
  });
  return out;
});
console.log('topic per group:', JSON.stringify(map, null, 1));

await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// For each group: force data-group + navigate to its topic, screenshot the drill pane top region
for (const theme of ['light', 'dark']) {
  for (const [g, topic] of Object.entries(map)) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    // navigate by hash to the topic's drill pane
    await page.evaluate(t => { location.hash = '#' + t + '/drill'; }, topic);
    await page.waitForTimeout(1100);
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(500);
    const realGroup = await page.evaluate(() => document.documentElement.getAttribute('data-group'));
    // crop: the top-left identity + masthead + CTA region, where room colour should live
    await page.screenshot({ path: `${OUT}/ROOM_${g}_${theme}.png`, clip: { x: 0, y: 0, width: 1100, height: 620 } });
    console.log(`  ${theme} ${g} -> topic=${topic} rendered data-group=${realGroup} ${realGroup === g ? 'OK' : '!!! MISMATCH'}`);
  }
}

// BEFORE equivalent (to prove the rooms did NOT exist)
const p2 = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p2.goto('file:///' + BEFORE);
await p2.waitForTimeout(2000);
await p2.keyboard.press('Escape'); await p2.waitForTimeout(400);
for (const theme of ['light', 'dark']) {
  for (const [g, topic] of Object.entries(map)) {
    await p2.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p2.evaluate(t => { location.hash = '#' + t + '/drill'; }, topic);
    await p2.waitForTimeout(1000);
    await p2.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await p2.waitForTimeout(400);
    await p2.screenshot({ path: `${OUT}/ROOMBEFORE_${g}_${theme}.png`, clip: { x: 0, y: 0, width: 1100, height: 620 } });
  }
}
console.log('BEFORE room shots done');
await browser.close();
