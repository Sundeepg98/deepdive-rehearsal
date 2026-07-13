/* Two gaps the above-the-fold pass could not see:
 *   1. Targets BELOW the fold in each pane (scroll sweep).
 *   2. Content permanently trapped under the FIXED bottom chrome
 *      (.mockcta "Mock run" bar + the Tools FAB). A modal covering the app is
 *      correct. Persistent chrome covering the app's own controls is a bug,
 *      and it is invisible to any check that never scrolls.
 *
 * NEGATIVE CONTROL: inflate the fixed bar to 300px tall and show the
 * "trapped under chrome" count climbs - proving the detector responds to
 * real occlusion and is not just printing zero.
 */
import path from 'node:path';
import { launch, phone, installDeep, judge, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';

ensureDirs();
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const FIXED_CHROME = '.mockcta, .mockbar, .tools-fab, #toolsfab, .scrolltop, .topbar, .side-id';

const PROBE = `
window.__fixedChromeOcclusion = function () {
  const chrome = [...document.querySelectorAll('${FIXED_CHROME}')].filter((e) => {
    const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0;
  });
  const isChrome = (el) => chrome.some((c) => c === el || c.contains(el));
  const trapped = [];
  for (const rec of window.__deepAll(window.__INTERACTIVE)) {
    const el = rec.el;
    if (el.disabled) continue;
    if (isChrome(el)) continue;
    try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue; } catch (e) { continue; }
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) continue;
    const hit = window.__deepFromPoint(cx, cy);
    if (!hit) continue;
    if (isChrome(hit)) {
      const c = chrome.find((c2) => c2 === hit || c2.contains(hit));
      trapped.push({
        sel: window.__selOf(el),
        host: rec.host || '(light)',
        text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 44),
        rect: Math.round(r.width) + 'x' + Math.round(r.height) + ' @y=' + Math.round(r.top),
        under: c ? (c.tagName.toLowerCase() + (c.id ? '#' + c.id : '.' + (c.getAttribute('class') || '').split(' ')[0])) : '?',
      });
    }
  }
  return trapped;
};
window.__chromeGeom = function () {
  return [...document.querySelectorAll('${FIXED_CHROME}')].map((e) => {
    const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { sel: window.__selOf(e), position: cs.position, top: Math.round(r.top), h: Math.round(r.height), zIndex: cs.zIndex };
  }).filter((x) => x.position === 'fixed' || x.position === 'sticky');
};
window.__stagePad = function () {
  const st = document.querySelector('.stage');
  if (!st) return null;
  const cs = getComputedStyle(st);
  return { paddingBottom: cs.paddingBottom, scrollH: document.documentElement.scrollHeight, innerH: innerHeight };
};
`;

const b = await launch();
const report = { viewports: {} };

for (const [vpName, vp] of Object.entries(PHONES)) {
  const p = await phone(b, vp);
  await installDeep(p);
  await p.evaluate(PROBE);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(1000);

  const chromeGeom = await p.evaluate(() => window.__chromeGeom());
  const stagePad = await p.evaluate(() => window.__stagePad());
  console.log(`\n===== ${vp.width}x${vp.height} =====`);
  console.log('fixed/sticky chrome:', JSON.stringify(chromeGeom));
  console.log('stage padding-bottom:', stagePad.paddingBottom, '| page scrollHeight:', stagePad.scrollH);

  const vres = { chromeGeom, stagePad, panes: {} };

  for (const pane of PANES) {
    // switch pane
    await p.evaluate((t) => document.querySelector(`.seg button[data-tab="${t}"]`)?.click(), pane);
    await p.waitForTimeout(750);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(250);
    await p.evaluate(() => window.__deepAll && 0);

    const seen = new Map();
    const trapped = new Map();
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.max(1, Math.ceil(H / (vp.height * 0.8)));
    for (let s = 0; s < steps; s++) {
      await p.evaluate((y) => window.scrollTo(0, y), Math.round(s * vp.height * 0.8));
      await p.waitForTimeout(320);
      const got = await p.evaluate(() => window.__collectTargets());
      for (const g of got) {
        if (g.kind !== 'semantic' || g.occluded) continue;
        const k = `${g.host}|${g.sel}|${g.text}`;
        const v = judge(g, 44);
        // keep the best (largest) reading for an element seen at several scroll offsets
        if (!seen.has(k) || (seen.get(k).verdict === 'FAIL' && v === 'PASS')) seen.set(k, { ...g, verdict: v, verdictAA: judge(g, 24) });
      }
      const tr = await p.evaluate(() => window.__fixedChromeOcclusion());
      for (const t of tr) trapped.set(`${t.host}|${t.sel}|${t.text}`, t);
    }
    // scroll to the very bottom - the worst case for a fixed bottom bar
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(400);
    for (const t of await p.evaluate(() => window.__fixedChromeOcclusion())) trapped.set(`${t.host}|${t.sel}|${t.text}`, t);
    await p.screenshot({ path: path.join(SHOTS, `02-${vp.width}-${pane}-scrolled-bottom.png`) });

    const arr = [...seen.values()];
    const fails = arr.filter((x) => x.verdict === 'FAIL');
    vres.panes[pane] = { measured: arr.length, fail44: fails.length, fails, trapped: [...trapped.values()] };
    console.log(`  ${pane.padEnd(6)} scrolled: ${arr.length} targets, ${fails.length} under 44px, ${trapped.size} TRAPPED under fixed chrome`);
    for (const t of trapped.values()) console.log(`        TRAPPED: ${t.sel}  ${t.rect}  under ${t.under}  "${t.text}"`);
  }
  report.viewports[vpName] = vres;
  await p.context().close();
}

/* ---------- NEGATIVE CONTROL: make the bar taller, trapped count must rise ---------- */
{
  const p = await phone(b, PHONES.p390);
  await installDeep(p);
  await p.evaluate(PROBE);
  await p.locator('.ix-card').first().click().catch(() => {});
  await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]')?.click());
  await p.waitForTimeout(800);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(400);
  const before = (await p.evaluate(() => window.__fixedChromeOcclusion())).length;
  await p.addStyleTag({ content: '.mockcta{height:300px !important;min-height:300px !important;background:rgba(255,0,0,.35) !important}' });
  await p.waitForTimeout(500);
  const after = (await p.evaluate(() => window.__fixedChromeOcclusion())).length;
  await p.screenshot({ path: path.join(SHOTS, '02-NEGCONTROL-fat-bottom-bar.png') });
  console.log('\n=============== NEGATIVE CONTROL (fixed-chrome detector) ===============');
  console.log(`  trapped controls with the real 90px bar : ${before}`);
  console.log(`  trapped after inflating the bar to 300px: ${after}`);
  console.log('  ' + (after > before
    ? 'OK — the detector RESPONDS to occlusion. It is measuring, not printing zero.'
    : '*** DETECTOR DEAD: inflating the bar changed nothing ***'));
  report.negControl = { before, after };
  await p.context().close();
}
await b.close();
save('02-scroll-fixed-chrome.json', report);
