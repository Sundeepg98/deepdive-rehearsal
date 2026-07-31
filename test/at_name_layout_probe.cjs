#!/usr/bin/env node
'use strict';
/* THE LAYOUT RECEIPT for Real-AT wave A -- deliberately NOT registered in the gate.
 *
 * The audit makes one condition binding for P2-4: "any 'glue fixed' check that runs at a single
 * viewport and text size proves nothing. Verify at two widths at minimum, and remember text zoom
 * goes to 116 percent, which re-wraps everything." That is because the PRE-WAVE behaviour was
 * genuinely layout-dependent -- the same three companion controls were spoken with separators in
 * at1-d3 and glued in at1-d4, at different effective widths, because the only thing between them
 * was a rendered line break.
 *
 * WHY THIS IS A RECEIPT AND NOT A GATE ARM. Once the separator is an authored character in the
 * DOM, the layout dependence is gone by construction: a text node does not appear and disappear
 * with the wrap. The ongoing guard is therefore the SOURCE assertion in test/at_name_hygiene.cjs
 * (arm A), which runs on every gate and never SKIPs. A browser arm here would SKIP wherever Chrome
 * is absent and would re-assert, at 3x the cost, something the source already pins. So this runs
 * on demand and its output is committed as evidence:
 *
 *     node test/at_name_layout_probe.cjs <deliverable.html> [label]
 *     committed output: _audit/2026-07-31-w24-names-layout.txt
 *
 * It reads the FLATTENING path (innerText), not the accessible name, because that is the path the
 * glue lived on. And it drives the app's OWN text-size control to the 116% ceiling rather than
 * injecting a font-size, then reads --read-zoom back to prove the state was really reached -- an
 * unverified zoom would make a green here worthless.
 */
const { chromium } = require('playwright');

const file = process.argv[2];
const LABEL = process.argv[3] || '';
if (!file) { console.error('usage: at_name_layout_probe.cjs <deliverable.html> [label]'); process.exit(2); }

/* Each site: where it lives, how to reach its text, and the separator that must be in it. */
/* The patterns allow whitespace on BOTH sides of the comma: innerText inserts its own break at a
   block boundary, so the flattened text of an authored "1" + ", " + "Messaging" reads "1 ,
   Messaging" at some sites and "1, Messaging" at others. What is being asserted is that the
   SEPARATOR CHARACTER is at the seam -- that is the thing the pre-wave build did not have at any
   width, and the base run below is the negative control that proves these can fail. */
const SITES = [
  ['room button (numeral / name)', 'light', '.hm-room .hm-room-k', /\d\s*,\s*[A-Z]/],
  ['topic card (title / kicker / description)', 'light', '.ix-card', /\S\s*,\s*[A-Z]/],
  ['companion relation (title / tail)', 'light', '.cmp-rel', /\S\s*,\s*[a-z]/],
  ['focus timer (value / phase)', 'light', '.pomodoro-meta', /\d\s*,\s*Focus/i],
  ['walkthrough arc step (numeral / title)', 'deep-walkthrough', '.arc-step', /\d\s*,\s*\S/],
  ['model-script summary (label / sub)', 'deep-walkthrough', 'details.model>summary', /like\s*,\s*model/i],
  ['drill probe nav (numeral / signal)', 'deep-drill', '.dn-step', /\d\s*,\s*\S/],
];

async function readSites(page) {
  return page.evaluate((sites) => {
    const out = {};
    for (const [name, host, sel] of sites) {
      let root = document;
      if (host !== 'light') {
        const h = document.querySelector(host);
        if (!h || !h.shadowRoot) { out[name] = null; continue; }
        root = h.shadowRoot;
      }
      const el = root.querySelector(sel);
      out[name] = el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90) : null;
    }
    return out;
  }, SITES.map(([n, h, s]) => [n, h, s]));
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [w, h, zoom] of [[1440, 900, false], [1024, 768, false], [1440, 900, true]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('file:///' + file.replace(/\\/g, '/'));
    await page.waitForTimeout(7000);
    await page.evaluate(() => { const c = document.querySelector('.hm-cta'); if (c) c.click(); });
    await page.waitForTimeout(3000);

    let readZoom = '1 (default)';
    if (zoom) {
      /* the app's own control, twice, to its documented 116% ceiling */
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')]
          .find((x) => (x.getAttribute('aria-label') || '') === 'Increase text size');
        if (b) { b.click(); b.click(); }
      });
      await page.waitForTimeout(1200);
      readZoom = await page.evaluate(() => {
        const s = document.querySelector('.stage');
        return s ? (getComputedStyle(s).getPropertyValue('--read-zoom') || '').trim() || '(unset)' : '(no stage)';
      });
      if (readZoom !== '1.16') {
        console.log('ABORT: text zoom did not reach the 116% ceiling (--read-zoom = ' + readZoom + ')');
        await browser.close();
        process.exit(1);
      }
    }
    /* walk a few steps and into the drill so the shadow sites exist */
    await page.evaluate(() => {
      const h2 = document.querySelector('deep-walkthrough');
      if (h2 && h2.shadowRoot) {
        h2.shadowRoot.querySelectorAll('details').forEach((d) => { d.open = true; });
        const n = h2.shadowRoot.getElementById('wnext'); if (n && !n.disabled) n.click();
      }
      const t = document.querySelector('.seg button[data-tab="drill"]'); if (t) t.click();
    });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const t = document.querySelector('.seg button[data-tab="walk"]'); if (t) t.click(); });
    await page.waitForTimeout(1500);

    rows.push({ cond: w + 'x' + h + (zoom ? ' @116% text' : ''), readZoom, text: await readSites(page) });
    await page.close();
  }
  await browser.close();

  console.log('=== ' + LABEL + ' -- authored separator across the audit\'s binding layout conditions ===');
  let bad = 0, absent = 0;
  for (const [name, , , re] of SITES) {
    console.log('\n' + name);
    for (const r of rows) {
      const t = r.text[name];
      const ok = t != null && re.test(t);
      if (t == null) absent++; else if (!ok) bad++;
      console.log('  %s  %s  %s', (t == null ? 'n/a ' : ok ? 'SEP ' : 'GLUE'),
        r.cond.padEnd(18), t == null ? '(not rendered in this state)' : JSON.stringify(t));
    }
  }
  console.log('\n--read-zoom measured: ' + rows.map((r) => r.cond + ' -> ' + r.readZoom).join(' | '));
  console.log('sites x conditions: ' + (SITES.length * rows.length) +
    '   separator present: ' + (SITES.length * rows.length - bad - absent) +
    '   GLUED: ' + bad + '   not rendered: ' + absent);
  process.exit(bad ? 1 : 0);
})();
