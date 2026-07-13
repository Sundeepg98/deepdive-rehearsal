/* kb-18: the focus ring across all SIX ROOMS x TWO THEMES.
   The ring is `outline:2px solid var(--acc)` and --acc is re-aliased per room from --topic-solid
   (styles.css:133-152). So the ring's colour is a function of which topic you are on. A ring that
   is invisible against its own room's tint is a real bug, and nothing in the build checks it.
   Measure, per room x theme, on a representative control from each surface (sidebar nav, tool
   button, topic switcher, focus toggle, and a pane control): painted signal + the contrast of
   the ring against what it painted over. WCAG 2.4.11 wants >= 3:1. */
import { open, inject, pxdiff, shotBox, CR, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const CONTROLS = [
  ['#_focus-toggle', 'focus toggle'],
  ['#tntrigger', 'topic switcher'],
  ['#searchopen', 'tool button'],
  ['.sidebar .seg button', 'pane switcher'],
];

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

/* one topic per group, straight from the registry */
const topicsByGroup = await page.evaluate(() => {
  const out = {};
  const ids = window.TopicRegistry.ids();
  for (const id of ids) {
    const t = window.TopicRegistry.get ? window.TopicRegistry.get(id) : null;
    const g = t?.identity?.group || t?.group;
    if (g && !out[g]) out[g] = id;
  }
  return out;
});
console.log('one topic per room:', JSON.stringify(topicsByGroup, null, 1), '\n');

async function measure(sel) {
  const el = await page.$(sel);
  if (!el) return null;
  await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(160);
  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (rect.w < 1) return null;
  const b = await shotBox(page, rect);
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(200);
  const a = await shotBox(page, rect);
  await page.evaluate(() => { const x = document.activeElement; if (x && x.blur) x.blur(); });
  const d = await pxdiff(page, b, a, 8);
  return { signal: d.changed, contrast: d.best ? +CR(d.best.from, d.best.to).toFixed(2) : 1, ring: d.best?.to, over: d.best?.from };
}

const rows = [];
console.log('room                        theme  --acc      control          signal  ring-vs-bg contrast');
console.log('-'.repeat(96));
for (const [group, topic] of Object.entries(topicsByGroup)) {
  for (const theme of ['light', 'dark']) {
    await page.evaluate(([t, th]) => {
      window.TopicRegistry.setTopic(t);
      document.documentElement.setAttribute('data-theme', th);
    }, [topic, theme]);
    await page.waitForTimeout(700);
    const acc = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
    const realGroup = await page.evaluate(() => document.documentElement.getAttribute('data-group'));
    for (const [sel, name] of CONTROLS) {
      const m = await measure(sel);
      if (!m) continue;
      rows.push({ group: realGroup, theme, acc, control: name, ...m });
      const flag = m.contrast < 3 ? '  <-- BELOW 3:1' : '';
      console.log(`${String(realGroup).padEnd(27)} ${theme.padEnd(6)} ${acc.padEnd(10)} ${name.padEnd(16)} ${String(m.signal).padStart(6)}  ${String(m.contrast).padStart(6)}${flag}`);
    }
    // one proof shot per room x theme, focus on the pane switcher
    const el = await page.$('.sidebar .seg button');
    await el.evaluate(e => { e.scrollIntoView({ block: 'center', behavior: 'instant' }); e.focus(); });
    await page.waitForTimeout(220);
    const r = await el.evaluate(e => { const x = e.getBoundingClientRect(); return { x: x.x, y: x.y, w: x.width, h: x.height }; });
    await page.screenshot({ path: `${SHOTS}/room-${realGroup}-${theme}.png`, clip: { x: Math.max(0, r.x - 14), y: Math.max(0, r.y - 14), width: Math.min(r.w + 28, 1400), height: Math.min(r.h + 28, 900) } });
  }
}

console.log('\n=== SUMMARY ===');
const fails = rows.filter(r => r.contrast < 3);
const min = rows.reduce((m, r) => r.contrast < m.contrast ? r : m, rows[0]);
console.log(`measurements: ${rows.length} (6 rooms x 2 themes x ${CONTROLS.length} controls)`);
console.log(`focus rings below the WCAG 2.4.11 3:1 threshold: ${fails.length}`);
fails.forEach(f => console.log(`   ${f.group}/${f.theme} ${f.control}: ${f.contrast}:1  (ring rgb(${f.ring}) over rgb(${f.over}))`));
console.log(`weakest ring overall: ${min.contrast}:1  (${min.group}/${min.theme}, ${min.control})`);
const zero = rows.filter(r => r.signal === 0);
console.log(`rings that painted NOTHING: ${zero.length}`);

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-rooms.json', JSON.stringify(rows, null, 1));
await browser.close();
