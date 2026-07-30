/* ===== W21 / W-X6 RASTERISER PROBE -- what the GPU was actually handed =====
 *
 * The instrument the W4 cold verify used to establish F-2, re-run here as this wave's
 * before/after proof. It does NOT read getComputedStyle().fontFamily -- that returns the
 * DECLARED list, which is precisely the thing that lies. CDP's
 * `CSS.getPlatformFontsForNode` returns the faces Chromium's font stack ACTUALLY resolved
 * and rasterised, per node, with a glyph count.
 *
 *   declared  : font: var(--font-weight-semibold) 10.5px -apple-system,sans-serif
 *   rasterised: [ { familyName: "Arial", glyphCount: 21 } ]
 *
 * WHY A GLYPH COUNT AND NOT A BOOLEAN. Two buttons legitimately report `Arial: 1` after the
 * fix and are not misses: `.crambtn` and `#homeBtn.tn-step.tn-home` carry a single ICON
 * character in their own direct text (U+2302 and friends) that Segoe UI does not contain,
 * so Chromium falls back for that ONE glyph while every label glyph is Segoe. The W4 verdict
 * names both. A boolean "any Arial?" would call the fix incomplete; the count shows the
 * difference between a re-faced button and one icon codepoint.
 *
 * SHADOW DOM. Half the buttons this wave touches live inside adoptedStyleSheets shadow roots
 * that `document.querySelectorAll` cannot see. The walk pierces them, then hands each element
 * to CDP by objectId -> DOM.requestNode -> nodeId, which is the only route that reaches a node
 * inside a shadow root.
 *
 * Usage:  node _audit/w21-typeface-before-after/rasteriser-probe.cjs <out.json> [label]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const ROOT = path.join(__dirname, '..', '..');
/* W21_HTML lets the same instrument be pointed at an OLD deliverable (e.g. one extracted with
   `git show HEAD:...`), which is how the before/after pair is measured with ONE binary rather
   than two, so no instrument difference can be mistaken for a typeface difference. */
const HTML = process.env.W21_HTML || path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');
const OUT = process.argv[2] || path.join(__dirname, 'rasteriser.json');
const LABEL = process.argv[3] || 'run';

/* The same four surfaces latent_arial walks -- between them they mount every button the app has. */
const SURFACES = [
  { label: 'home', hash: '', open: null },
  { label: 'walk', hash: '#event-driven/walk', open: null },
  { label: 'index-overlay', hash: '#event-driven/walk', open: 'index' },
  { label: 'search-overlay', hash: '#event-driven/walk', open: 'search' },
];

/* Collect every button, piercing shadow roots, and park them on window for CDP to fetch
   by objectId. Returns a stable key per button so before/after rows line up. */
const COLLECT = () => {
  const out = [];
  const walk = (root, host) => {
    let els;
    try { els = root.querySelectorAll('button'); } catch (e) { return; }
    els.forEach((el) => {
      if (el.hasAttribute('data-latent-probe')) return;
      const cls = (el.className && el.className.baseVal !== undefined
        ? el.className.baseVal : el.className) || '';
      const key = (host ? host + '>>' : '')
        + (el.id ? '#' + el.id : '')
        + (cls ? '.' + String(cls).trim().split(/\s+/).join('.') : (el.id ? '' : 'button'));
      out.push({
        el: el,
        key: key,
        declared: getComputedStyle(el).fontFamily,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      });
    });
    const all = root.querySelectorAll('*');
    all.forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot, el.tagName.toLowerCase()); });
  };
  walk(document, null);
  window.__w21 = out;
  return out.map((r) => ({ key: r.key, declared: r.declared, text: r.text }));
};

async function surface(page, cdp, s) {
  await B.gotoApp(page, HTML, { hash: s.hash });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,
    'boot splash (' + s.label + ')');
  /* latent_arial's own open + readiness conditions, verbatim -- wait for a CONDITION, never a
     duration (test/_boot.cjs). An earlier draft here clicked #ixopen, an id that does not
     exist (the opener is #idxopen), so the index surface silently re-walked the plain topic
     route and reported it as overlay coverage. */
  if (s.open === 'index') {
    await page.evaluate(() => { if (window.IndexOverlay) IndexOverlay.open(); });
    await B.until(page, () => !!document.querySelector('.ix-ov.open .ix-card'), null, B.ACT_MS,
      'index overlay mounted');
  } else if (s.open === 'search') {
    await page.evaluate(() => { if (window.SearchOverlay) SearchOverlay.open(); });
    await B.until(page, () => !!document.getElementById('_search-overlay'), null, B.ACT_MS,
      'search overlay mounted');
  } else {
    await B.until(page, () => !!document.querySelector('button'), null, B.ACT_MS, 'buttons mounted');
  }
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) { /* non-fatal */ }
  await B.settle(page);

  const meta = await page.evaluate(COLLECT);
  /* DOM.requestNode can only return a nodeId for a node CDP has already seen, and a
     navigation empties that map. Pull the whole tree (pierce: true, so shadow roots are in
     it) after EVERY navigation -- without this every lookup fails with "Could not find node
     with given id" and the probe reports a serene, entirely false, zero. */
  await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
  const rows = [];
  for (let i = 0; i < meta.length; i++) {
    const handle = await cdp.send('Runtime.evaluate',
      { expression: 'window.__w21[' + i + '].el' });
    if (!handle.result || !handle.result.objectId) continue;
    const node = await cdp.send('DOM.requestNode', { objectId: handle.result.objectId });
    let fonts = [];
    try {
      const r = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
      fonts = (r.fonts || []).map((f) => ({ family: f.familyName, glyphs: f.glyphCount }));
    } catch (e) { fonts = [{ family: '(unreadable: ' + e.message + ')', glyphs: 0 }]; }
    await cdp.send('Runtime.releaseObject', { objectId: handle.result.objectId }).catch(() => {});
    rows.push(Object.assign({ surface: s.label }, meta[i], { rasterised: fonts }));
  }
  return rows;
}

(async () => {
  const browser = await chromium.launch(B.launchOpts());
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');

  const all = [];
  for (const s of SURFACES) all.push(...(await surface(page, cdp, s)));

  /* De-duplicate: the same component appears on more than one surface. Key on
     surface+key+text so a genuinely distinct button is never collapsed away. */
  const seen = new Set();
  const rows = all.filter((r) => {
    const k = r.surface + '|' + r.key + '|' + r.text;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  /* A probe whose CDP calls all failed reports "0 buttons in Arial" and looks like a pass.
     That is this repo's defining bug -- a check that cannot fail. Refuse to write one. */
  const unreadable = rows.filter((r) => r.rasterised.some((f) => /^\(unreadable/.test(f.family)));
  if (unreadable.length) {
    console.error('RASTERISER PROBE ABORT -- ' + unreadable.length + ' of ' + rows.length
      + ' nodes returned no platform fonts. A zero from this run would be an artefact.');
    console.error('  first: ' + unreadable[0].key + '  ' + unreadable[0].rasterised[0].family);
    await browser.close();
    process.exit(1);
  }
  if (!rows.length) {
    console.error('RASTERISER PROBE ABORT -- the walk enumerated zero buttons.');
    await browser.close();
    process.exit(1);
  }

  const fam = {};
  let arialButtons = 0, arialGlyphs = 0, iconOnly = 0;
  for (const r of rows) {
    for (const f of r.rasterised) fam[f.family] = (fam[f.family] || 0) + f.glyphs;
    /* "Arial Black" counts. A rule at --font-weight-heavy (900) on the truncated stack
       rasterises as Arial BLACK, not Arial -- `/^Arial$/` silently dropped .nd-go and
       .mockbtn from the count and reported 42 real-text buttons where there are 48. */
    const a = r.rasterised.filter((f) => /^(Arial|Helvetica)( |$)/i.test(f.family));
    if (a.length) {
      arialButtons++;
      const g = a.reduce((n, f) => n + f.glyphs, 0);
      arialGlyphs += g;
      if (g <= 1) iconOnly++;
    }
  }

  const summary = {
    label: LABEL,
    when: new Date().toISOString(),
    viewport: '1280x800',
    surfaces: SURFACES.map((s) => s.label),
    buttonsProbed: rows.length,
    buttonsWithArial: arialButtons,
    arialGlyphsTotal: arialGlyphs,
    buttonsWithArialSingleGlyph: iconOnly,
    buttonsWithArialRealText: arialButtons - iconOnly,
    familyGlyphHistogram: fam,
    rows: rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== W21 RASTERISER PROBE (' + LABEL + ') -- CSS.getPlatformFontsForNode ===');
  console.log('  buttons probed            : ' + rows.length + ' over ' + SURFACES.length + ' surfaces');
  console.log('  buttons rasterising Arial : ' + arialButtons
    + '   (' + (arialButtons - iconOnly) + ' with real label text, ' + iconOnly + ' single-glyph icon fallback)');
  console.log('  Arial glyphs total        : ' + arialGlyphs);
  console.log('  family glyph histogram    :');
  Object.keys(fam).sort((a, b) => fam[b] - fam[a]).forEach((k) => {
    console.log('      ' + String(k).padEnd(28) + fam[k]);
  });
  console.log('  written                   : ' + path.relative(ROOT, OUT).replace(/\\/g, '/'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
