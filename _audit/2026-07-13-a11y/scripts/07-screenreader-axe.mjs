/* SCREEN READER ON A TOUCH DEVICE.
 * A TalkBack/VoiceOver user swipes through the accessibility tree in DOM order.
 * Three things decide whether that works:
 *   1. Is everything reachable, and in an order that matches the screen?
 *   2. WCAG 2.4.11 Focus Not Obscured (AA): when a control takes focus, is it
 *      hidden behind the fixed bottom bar?
 *   3. Are off-screen surfaces (the closed tools sheet) excluded from the tree?
 * Plus axe-core at a real phone viewport, which the app has never run.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, phone, installDeep, ensureDirs, save, SHOTS, PHONES } from './lib.mjs';
ensureDirs();

const AXE = fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/node_modules/axe-core/axe.min.js', 'utf8');
const b = await launch();
const out = {};

const p = await phone(b, PHONES.p390);
await installDeep(p);
await p.locator('.ix-card').first().tap().catch(() => {});
await p.waitForTimeout(1000);

/* ---------- 1. VISUAL ORDER vs FOCUS ORDER ---------- */
const order = [];
await p.evaluate(() => document.body.focus());
for (let i = 0; i < 40; i++) {
  await p.keyboard.press('Tab');
  const info = await p.evaluate(() => {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    if (!a || a === document.body) return null;
    const r = a.getBoundingClientRect();
    const mb = document.querySelector('.sidebar .mockbar');
    // is it covered by the fixed bottom chrome? (WCAG 2.4.11)
    const chrome = [...document.querySelectorAll('.mockcta, #scrolltop')].filter((e) => {
      const cs = getComputedStyle(e); const cr = e.getBoundingClientRect();
      return cs.position === 'fixed' && cr.height > 0 && cr.top < innerHeight;
    });
    let covered = 0;
    for (const c of chrome) {
      const cr = c.getBoundingClientRect();
      const ox = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const oy = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      if (ox > 0 && oy > 0) covered += ox * oy;
    }
    const area = Math.max(1, r.width * r.height);
    return {
      el: a.tagName.toLowerCase() + (a.id ? '#' + a.id : '.' + (a.getAttribute('class') || '').split(' ')[0]),
      label: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30),
      y: Math.round(r.top),
      inClosedSheet: !!(mb && mb.contains(a) && mb.getBoundingClientRect().top >= innerHeight),
      offscreen: r.bottom <= 0 || r.top >= innerHeight,
      coveredPct: Math.round((covered / area) * 100),
    };
  });
  if (info) order.push(info);
}
const phantom = order.filter((o) => o.inClosedSheet);
const obscured = order.filter((o) => !o.inClosedSheet && o.coveredPct >= 100);
const partly = order.filter((o) => !o.inClosedSheet && o.coveredPct > 0 && o.coveredPct < 100);

console.log('=============== FOCUS ORDER (40 stops from the top) ===============');
for (const o of order) {
  const tag = o.inClosedSheet ? 'PHANTOM' : o.coveredPct >= 100 ? 'BURIED ' : o.coveredPct > 0 ? 'part-cov' : '       ';
  console.log(`  ${tag.padEnd(8)} y=${String(o.y).padStart(5)}  ${o.el.padEnd(24)} "${o.label}"${o.coveredPct ? '  covered ' + o.coveredPct + '%' : ''}`);
}
console.log(`\n  ${phantom.length} stops inside the CLOSED off-screen tools sheet (not inert, not aria-hidden)`);
console.log(`  ${obscured.length} stops ENTIRELY buried under the fixed bottom bar  <- WCAG 2.4.11 (AA)`);
console.log(`  ${partly.length} stops partially covered`);

/* visual order vs focus order: the pane tabs sit at y=8 but are reached when? */
const segIdx = order.findIndex((o) => o.label.startsWith('Walkthrough'));
console.log(`  the pane tabs render at y=8 (top of screen) but are focus stop #${segIdx + 1} of ${order.length}`);
out.focusOrder = { order, phantom: phantom.length, obscured: obscured.length, partly: partly.length, segTabIndex: segIdx + 1 };

/* ---------- 2. NEGATIVE CONTROL for the "focus obscured" detector ---------- */
{
  const before = obscured.length;
  await p.addStyleTag({ content: '.mockcta{height:400px !important;min-height:400px !important}' });
  await p.waitForTimeout(400);
  await p.evaluate(() => document.body.focus());
  let after = 0;
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const c = await p.evaluate(() => {
      let a = document.activeElement;
      while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
      if (!a || a === document.body) return 0;
      const r = a.getBoundingClientRect();
      const bar = document.querySelector('.mockcta');
      const cr = bar.getBoundingClientRect();
      const ox = Math.min(r.right, cr.right) - Math.max(r.left, cr.left);
      const oy = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top);
      const area = Math.max(1, r.width * r.height);
      return ox > 0 && oy > 0 ? Math.round((ox * oy / area) * 100) : 0;
    });
    if (c >= 100) after++;
  }
  console.log('\n=============== NEGATIVE CONTROL (focus-obscured detector) ===============');
  console.log(`  fully-buried focus stops, real 72px bar : ${before}`);
  console.log(`  fully-buried focus stops, 400px bar     : ${after}`);
  console.log('  ' + (after > before ? 'OK — the detector GOES RED when the bar really swallows controls.' : '*** DETECTOR DEAD ***'));
  out.focusObscuredNC = { before, after };
}

await p.context().close();

/* ---------- 3. ACCESSIBILITY TREE: is the closed sheet exposed? ---------- */
{
  const p2 = await phone(b, PHONES.p390);
  await installDeep(p2);
  await p2.locator('.ix-card').first().tap().catch(() => {});
  await p2.waitForTimeout(900);
  const snap = await p2.accessibility.snapshot({ interestingOnly: true });
  const flat = [];
  (function walk(n, d) { if (!n) return; flat.push({ role: n.role, name: (n.name || '').slice(0, 34), d }); (n.children || []).forEach((c) => walk(c, d + 1)); })(snap, 0);
  const sheetNames = ['Topic index', 'Search', 'Copy link', 'Star this topic', 'Your notes', 'Print Q&A', 'One-page cram sheet', 'Session progress', 'Mixed fire', 'Game plan', 'Scope it first'];
  const exposed = sheetNames.filter((n) => flat.some((f) => f.name.startsWith(n)));
  console.log('\n=============== ACCESSIBILITY TREE (tools sheet CLOSED) ===============');
  console.log(`  total exposed nodes: ${flat.length}`);
  console.log(`  controls from the CLOSED, off-screen tools sheet still announced to a screen reader: ${exposed.length}/${sheetNames.length}`);
  console.log(`    ${exposed.join(', ')}`);
  out.a11yTree = { total: flat.length, exposedClosedSheetControls: exposed };

  /* ---------- 4. AXE-CORE at a phone viewport ---------- */
  await p2.evaluate(AXE);
  const res = await p2.evaluate(async () => await window.axe.run(document, {
    resultTypes: ['violations'],
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
  }));
  console.log('\n=============== AXE-CORE @ 390x844 (light DOM; axe cannot see closed shadow roots) ===============');
  const vs = res.violations.sort((a, c) => c.nodes.length - a.nodes.length);
  for (const v of vs) {
    console.log(`  [${v.impact}] ${v.id} - ${v.help}  (${v.nodes.length} nodes)`);
    for (const n of v.nodes.slice(0, 3)) console.log(`        ${n.target.join(' ')}`);
  }
  console.log(`  => ${vs.length} violation types, ${vs.reduce((a, v) => a + v.nodes.length, 0)} nodes`);
  out.axe = vs.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));

  /* axe negative control: it must catch a deliberately broken control */
  await p2.evaluate(() => {
    const btn = document.createElement('button');
    btn.id = '__nc_nolabel';
    btn.style.cssText = 'position:fixed;top:0;left:0;width:30px;height:30px';
    document.body.appendChild(btn); // a button with NO accessible name
    const img = document.createElement('img');
    img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; // no alt
    document.body.appendChild(img);
  });
  const res2 = await p2.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
  const caughtBtn = res2.violations.some((v) => v.id === 'button-name');
  const caughtImg = res2.violations.some((v) => v.id === 'image-alt');
  console.log('\n=============== NEGATIVE CONTROL (axe) ===============');
  console.log(`  injected an unlabelled <button> -> axe raised button-name: ${caughtBtn}`);
  console.log(`  injected an <img> with no alt   -> axe raised image-alt  : ${caughtImg}`);
  console.log('  ' + (caughtBtn && caughtImg ? 'OK — axe is live and CAN fail on this page.' : '*** axe not firing ***'));
  out.axeNC = { caughtBtn, caughtImg };
  await p2.context().close();
}
await b.close();
save('07-screenreader-axe.json', out);
