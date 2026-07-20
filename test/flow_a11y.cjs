/* ===================== FLOW-SPINE CHROME A11Y CONTRACT (D4 #10 / #18 / #19 / #20) =====================
 *
 * The forward-flow chrome (Continue dock, seg recommendation pip, terminal hand-off strip) is
 * visual-first; this guards the screen-reader / keyboard half of it.
 *
 * #10  The global `n` (NextUp) key -- shipped W2, the dock go button wears aria-keyshortcuts="N",
 *      shell.js handles it -- was MISSING from the Shortcuts overlay's key map. Assert it is listed.
 * #18  The dock's meso/macro CTA is ANNOUNCED to a polite live region when it appears; the MICRO
 *      armed grade legend is NOT (it echoes the drill's own announced judge buttons, and speaking it
 *      at the reveal would talk over the answer -- "a judgment point must not shout over the answer").
 *      Uses a DEDICATED region, not the shared announcer the drill debrief fires through on the same
 *      microtask (they would collapse).
 * #19  The pip conveys "recommended next" only visually (a ::before dot); AT gets nothing. The pipped
 *      tab must carry an accessible DESCRIPTION (aria-describedby -> "Recommended next") -- a name, per
 *      #18's philosophy, not a live announcement.
 * #20  The terminal strip's .flow-go lives in a shadow root, where the document's button:focus-visible
 *      ring cannot reach -- so Tab landed the ~1px UA outline. It must get the app's 2px var(--acc)
 *      ring (matching the sibling .revset-b in the same drill scope; OUTWARD so the ring paints on the
 *      pane bg, not invisibly accent-on-accent over the button's own accent gradient).
 *
 * WATCHED RED against the pre-fix build (each item fails without its fix). #18b carries a per-run
 * self-test (a planted armed-legend leak must be detected) so "the legend is silent" cannot go inert.
 *
 * Usage: node test/flow_a11y.cjs [deliverable.html]   (CHROME=<path>)
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fails = [], notes = [];
const chk = (name, ok, detail) => { notes.push((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '  -- ' + detail)); if (!ok) fails.push(name); };

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => { window.__liveText = () => Array.prototype.map.call(document.querySelectorAll('[aria-live],[role="status"]'), (n) => (n.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean); });

  /* ---------- #10: the Shortcuts overlay documents the N key ---------- */
  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);
  const kbd = await page.evaluate(async () => {
    if (typeof openKeys === 'function') openKeys();
    await new Promise((r) => setTimeout(r, 150));
    const ov = document.querySelector('#keyov deep-keyboard');
    const root = ov && ov.shadowRoot;
    if (!root) return { err: 'keyboard overlay shadow root not found' };
    const rows = Array.prototype.slice.call(root.querySelectorAll('.ks-row, .ks-row2'));
    let nRow = null;
    for (const r of rows) {
      const keys = Array.prototype.map.call(r.querySelectorAll('kbd'), (k) => k.textContent.trim().toUpperCase());
      if (keys.length === 1 && keys[0] === 'N') { nRow = (r.textContent || '').replace(/\s+/g, ' ').trim(); break; }
    }
    return { nRow, total: rows.length };
  });
  if (kbd.err) chk('#10 keyboard overlay opens', false, kbd.err);
  else chk('#10 the Shortcuts overlay documents the N key (a single-kbd "N" row describing the next step)',
    !!kbd.nRow && /next/i.test(kbd.nRow), 'no N row found among ' + kbd.total + ' rows (or its text does not mention "next"): ' + (kbd.nRow || '(absent)'));
  await page.evaluate(() => { const x = document.querySelector('#keyov .mock-x'); if (x) x.click(); });
  await sleep(120);

  /* ---------- #18a: the dock CTA is announced to a polite live region ---------- */
  await B.gotoApp(page, HTML);
  await page.evaluate(() => localStorage.clear());
  await B.gotoApp(page, HTML, { hash: '#event-driven/walk' });   /* fresh topic -> rec=drill -> dock meso CTA */
  await page.waitForFunction(() => { const d = document.getElementById('ndock'); return d && !d.hidden && d.querySelector('.nd-go'); }, null, { timeout: B.ACT_MS }).catch(() => {});
  await sleep(200);
  const a = await page.evaluate(() => {
    const d = document.getElementById('ndock');
    const label = d && d.querySelector('.nd-go') ? d.querySelector('.nd-go').textContent.replace(/\s*→\s*$/, '').replace(/\s+/g, ' ').trim() : null;
    const regions = window.__liveText();
    return { label, regions, announced: label ? regions.some((t) => t.indexOf(label) !== -1) : false };
  });
  chk('#18a the dock CTA (' + (a.label || '?') + ') is announced to a polite live region',
    !!a.label && a.announced, 'CTA label not found in any aria-live region. Regions: ' + JSON.stringify(a.regions));

  /* ---------- #19: the seg recommendation pip carries an accessible description ---------- */
  const pip = await page.evaluate(() => {
    const t = document.querySelector('.seg button.flow-pip');
    if (!t) return { err: 'no pipped tab on a fresh topic' };
    const db = t.getAttribute('aria-describedby');
    const desc = db ? document.getElementById(db) : null;
    return { tab: t.getAttribute('data-tab'), describedby: db, descText: desc ? (desc.textContent || '').replace(/\s+/g, ' ').trim() : null };
  });
  if (pip.err) chk('#19 the pipped tab exists', false, pip.err);
  else chk('#19 the pipped tab (' + pip.tab + ') carries an accessible "recommended next" description (aria-describedby)',
    !!pip.descText && /recommend/i.test(pip.descText), 'aria-describedby=' + JSON.stringify(pip.describedby) + ' -> ' + JSON.stringify(pip.descText));

  /* ---------- #18b: revealing to the judgment point does NOT announce the armed legend ---------- */
  await page.evaluate((t) => switchTab(t), 'drill');
  await page.waitForFunction((t) => { const e = document.getElementById(t); return e && getComputedStyle(e).display !== 'none'; }, 'drill', { timeout: B.ACT_MS });
  await B.settle(page);
  await page.evaluate(() => { window.__preArm = window.__liveText(); });
  const armed = await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const z = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0; while (r.getElementById('adv') && g++ < 25) { r.getElementById('adv').click(); await z(4); }
    await z(200);
    const d = document.getElementById('ndock');
    const armedShown = !!(d && !d.hidden && /Missed/.test(d.textContent) && d.querySelector('.nd-armed'));
    const pre = window.__preArm || [];
    const leaked = window.__liveText().filter((t) => (/Missed/.test(t) && /Solid/.test(t) && /Grade/i.test(t)) && pre.indexOf(t) === -1);
    return { armedShown, leaked };
  });
  chk('#18b the armed grade legend is shown in the dock but NOT pushed to a live region',
    armed.armedShown && armed.leaked.length === 0,
    armed.armedShown ? ('a live region leaked the armed legend: ' + JSON.stringify(armed.leaked)) : 'armed legend never rendered -- test precondition failed');

  const st = await page.evaluate(() => {
    const el = document.createElement('div'); el.setAttribute('aria-live', 'polite');
    el.textContent = 'Grade 1 Missed 2 Shaky 3 Solid'; document.body.appendChild(el);
    const detected = window.__liveText().some((t) => /Missed/.test(t) && /Solid/.test(t) && /Grade/i.test(t));
    el.remove(); return detected;
  });
  chk('[self-test] the #18b detector flags a planted armed-legend announcement', st === true,
    'planting the armed legend into a live region did NOT trip the detector -- the #18b assertion is inert');

  /* ---------- #20: the terminal strip's .flow-go gets the app's 2px var(--acc) focus ring ---------- */
  /* grade the whole drill SOLID -> an all-solid debrief renders the "Try the whiteboard" strip (.flow-go). */
  await B.gotoApp(page, HTML);
  await page.evaluate(() => localStorage.clear());
  await B.gotoApp(page, HTML, { hash: '#event-driven/drill' });
  await B.until(page, () => !!document.querySelector('#drill deep-drill'), null, 15000, 'drill pane');
  await B.settle(page);
  await page.evaluate(async () => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const z = (ms) => new Promise((x) => setTimeout(x, ms));
    let g = 0;
    while (g++ < 600) {
      if (r.getElementById('adv')) { r.getElementById('adv').click(); await z(2); continue; }
      const jg = r.getElementById('jg'); if (!jg) break; jg.click(); await z(3);
    }
  });
  await sleep(250);
  const ring = await page.evaluate(() => {
    const r = document.querySelector('#drill deep-drill').shadowRoot;
    const go = r.querySelector('.flow-go');
    if (!go) return { err: 'no .flow-go strip at the all-solid debrief' };
    go.focus({ focusVisible: true });   /* deterministic :focus-visible, no modality heuristic */
    const fv = go.matches(':focus-visible');
    const cs = getComputedStyle(go);
    const probe = document.createElement('span'); probe.style.color = 'var(--acc)'; go.appendChild(probe);
    const accRgb = getComputedStyle(probe).color; probe.remove();   /* resolve var(--acc) to rgb, compare like-for-like */
    return { fv, width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, accRgb };
  });
  if (ring.err) chk('#20 the .flow-go strip renders', false, ring.err);
  else {
    const w = parseFloat(ring.width);
    chk('#20 the .flow-go focus ring is a >=2px solid var(--acc) outline (matches .revset-b, reaches the shadow)',
      ring.fv && ring.style === 'solid' && w >= 2 && ring.color === ring.accRgb,
      ':focus-visible=' + ring.fv + ' outline=' + ring.width + ' ' + ring.style + ' ' + ring.color + ' vs --acc ' + ring.accRgb + ' (UA default would not be var(--acc) at 2px solid)');
  }

  await browser.close();
  notes.forEach((n) => console.log(n));
  if (fails.length) { fails.forEach((f) => console.log('  - ' + f)); return B.finish(1, 'FLOW A11Y: FAIL (' + fails.length + ')'); }
  console.log('FLOW A11Y: PASS  (' + notes.length + ' assertions: N documented; dock CTA announced; armed legend silent; pip described; strip focus ring)');
  return B.finish(0);
})().catch((e) => { console.error(e && e.stack || e); return B.finish(1, 'FLOW A11Y: FAIL (harness error: ' + (e && e.message) + ')'); });
