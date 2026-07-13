/* Two decisive 200%-text-zoom questions:
 *  1. styles.css:527 sets  button,.inttog{position:relative;overflow:hidden}
 *     (it exists to clip the ripple effect). Every tool row is a <button>.
 *     At 200% text the label needs 83px in a 42px box -> is the label CUT?
 *  2. The drill is the app's core loop and its ONLY feedback is the scoreboard.
 *     Does the drill remain gradeable at 200%?
 * Overlap check is viewport-restricted this time: two controls that are both
 * scrolled off-screen "overlapping" in rect space is not a finding.
 */
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const ZOOM = `
window.__setTextZoom = function (factor) {
  const all = [];
  const walk = (root) => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  walk(document);
  for (const el of all) {
    if (!el.dataset) continue;
    if (el.dataset.__basefs === undefined) el.dataset.__basefs = parseFloat(getComputedStyle(el).fontSize) || 16;
    el.style.setProperty('font-size', (parseFloat(el.dataset.__basefs) * factor) + 'px', 'important');
  }
  return all.length;
};
window.__onScreenOverlaps = function () {
  const ctrls = window.__deepAll(window.__INTERACTIVE).map((r) => r.el).filter((el) => {
    try {
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
      const r = el.getBoundingClientRect();
      // ON SCREEN ONLY
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    } catch (e) { return false; }
  });
  const out = [];
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
    const A = ctrls[i], B = ctrls[j];
    if (A.contains(B) || B.contains(A)) continue;
    const a = A.getBoundingClientRect(), b = B.getBoundingClientRect();
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 2 && oy > 2) out.push({ a: window.__selOf(A), b: window.__selOf(B), overlap: Math.round(ox) + 'x' + Math.round(oy) });
  }
  return out;
};
window.__rowClip = function (sel) {
  return [...document.querySelectorAll(sel)].map((el) => {
    const cs = getComputedStyle(el);
    return {
      sel: window.__selOf(el),
      clientH: el.clientHeight, scrollH: el.scrollHeight,
      cutY: el.scrollHeight - el.clientHeight,
      overflow: cs.overflow, overflowY: cs.overflowY,
      cssHeight: cs.height, minHeight: cs.minHeight,
      text: el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 46),
    };
  });
};`;

const b = await launch();
const out = {};
const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.evaluate(ZOOM);
await p.locator('.ix-card').first().click().catch(() => {});
await p.waitForTimeout(1000);

/* ---------- 1. TOOLS DRAWER at 100% vs 200% ---------- */
await p.evaluate(() => document.querySelector('#toolsfab')?.click());
await p.waitForTimeout(600);
const rows100 = await p.evaluate(() => window.__rowClip('.mockbar .crambtn'));
await p.screenshot({ path: path.join(SHOTS, '04b-390-tools-drawer-100pct.png') });

await p.evaluate(() => window.__setTextZoom(2));
await p.waitForTimeout(800);
const rows200 = await p.evaluate(() => window.__rowClip('.mockbar .crambtn'));
await p.screenshot({ path: path.join(SHOTS, '04b-390-tools-drawer-200pct.png') });
const ovDrawer = await p.evaluate(() => window.__onScreenOverlaps());

console.log('=============== TOOLS DRAWER: button{overflow:hidden} at 200% text ===============');
console.log('  row                          100%: box/content    200%: box/content   CUT');
for (let i = 0; i < rows200.length; i++) {
  const a = rows100[i], z = rows200[i];
  const flag = z.cutY > 1 ? 'CLIPPED' : 'ok';
  console.log(`  ${(z.text.slice(0, 26)).padEnd(28)} ${String(a.clientH).padStart(3)}/${String(a.scrollH).padEnd(4)}      ${String(z.clientH).padStart(3)}/${String(z.scrollH).padEnd(4)}   ${flag} ${z.cutY > 1 ? '-' + z.cutY + 'px  (css height:' + z.cssHeight + ', overflow:' + z.overflow + ')' : ''}`);
}
const clippedRows = rows200.filter((r) => r.cutY > 1);
console.log(`\n  => ${clippedRows.length}/${rows200.length} tool rows lose text at 200%.`);
console.log(`  on-screen control overlaps in the open drawer @200%: ${ovDrawer.length}`);
for (const o of ovDrawer.slice(0, 5)) console.log(`     OVERLAP ${o.overlap}px  ${o.a}  <>  ${o.b}`);

/* ---------- 2. THE DRILL at 200%: can you still grade a card? ---------- */
await p.evaluate(() => window.__setTextZoom(1));
await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('#toolsfab')?.click());
await p.waitForTimeout(400);
await p.evaluate(() => document.querySelector('.seg button[data-tab="drill"]')?.click());
await p.waitForTimeout(900);
await p.evaluate(() => window.__setTextZoom(2));
await p.waitForTimeout(800);

// scroll to the drill's grading controls and shoot them
const drill = await p.evaluate(() => {
  const host = document.querySelector('deep-drill');
  const root = host.shadowRoot;
  const adv = root.querySelector('#adv');
  if (adv) adv.scrollIntoView({ block: 'center' });
  return { hasReveal: !!adv };
});
await p.waitForTimeout(500);
await p.screenshot({ path: path.join(SHOTS, '04b-390-drill-grading-200pct.png') });
const drillState = await p.evaluate(() => {
  const root = document.querySelector('deep-drill').shadowRoot;
  const pick = (s) => {
    const el = root.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      rect: `${Math.round(r.width)}x${Math.round(r.height)} @y=${Math.round(r.top)}`,
      onScreen: r.top >= 0 && r.bottom <= innerHeight,
      clientH: el.clientHeight, scrollH: el.scrollHeight, cutY: el.scrollHeight - el.clientHeight,
      overflow: cs.overflow,
      text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30),
    };
  };
  return {
    reveal: pick('#adv'),
    scoreboard: pick('#dsb') || pick('.dsb') || pick('#dscore'),
    gradeButtons: [...root.querySelectorAll('#dgrade button, .grade button, [data-g]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: el.textContent.trim().slice(0, 18), rect: `${Math.round(r.width)}x${Math.round(r.height)}`, clientH: el.clientHeight, scrollH: el.scrollHeight, cutY: el.scrollHeight - el.clientHeight };
    }),
  };
});
console.log('\n=============== THE DRILL at 200% text ===============');
console.log(JSON.stringify(drillState, null, 1));
const ovDrill = await p.evaluate(() => window.__onScreenOverlaps());
console.log(`  on-screen control overlaps in the drill @200%: ${ovDrill.length}`);
for (const o of ovDrill.slice(0, 6)) console.log(`     OVERLAP ${o.overlap}px  ${o.a}  <>  ${o.b}`);

/* ---------- NEGATIVE CONTROL for the overlap detector ---------- */
await p.evaluate(() => window.__setTextZoom(1));
await p.waitForTimeout(400);
const ovBase = await p.evaluate(() => window.__onScreenOverlaps());
await p.evaluate(() => {
  const fab = document.querySelector('#toolsfab');
  fab.style.cssText += ';position:fixed;left:8px;top:8px;width:300px;height:300px;z-index:9999';
});
await p.waitForTimeout(400);
const ovBroken = await p.evaluate(() => window.__onScreenOverlaps());
console.log('\n=============== NEGATIVE CONTROL (overlap detector) ===============');
console.log(`  baseline on-screen overlaps            : ${ovBase.length}`);
console.log(`  after parking a 300x300 FAB over the UI: ${ovBroken.length}`);
console.log('  ' + (ovBroken.length > ovBase.length
  ? 'OK — the overlap detector GOES RED when controls really collide.'
  : '*** DETECTOR DEAD ***'));

save('04b-zoom-drawer-drill.json', { rows100, rows200, clippedRows, ovDrawer, drillState, ovDrill, negControl: { base: ovBase.length, broken: ovBroken.length } });
await b.close();
