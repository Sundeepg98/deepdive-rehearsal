#!/usr/bin/env node
/*
 * W4 REVIEW-PAIR CAPTURE -- the images the OPERATOR decides sub-scope A from.
 *
 *   node _audit/2026-07-29-w4-pairs.cjs <before.html> <after.html> <outdir>
 *
 * WHY A COMMITTED SCRIPT AND NOT LOOSE SCREENSHOTS (the W2 pattern). A before/after pair is only
 * evidence if both halves were framed identically. Screenshots taken by hand differ in viewport,
 * scroll position, theme and which topic was loaded, and every one of those differences reads as
 * "the change did that". So the framing is CODE, it runs against both builds from one definition,
 * and it ASSERTS the frame it claimed to use -- a pair whose two halves were not framed the same
 * way is not published, it throws.
 *
 * WHAT IT ASSERTS ON EVERY SHOT, refusing to write the file if any fails:
 *   - the viewport actually applied (innerWidth/innerHeight match what was asked)
 *   - the theme actually applied (documentElement's data-theme is what was asked)
 *   - the intended topic is the current one (not topic 1 because a switch silently lost)
 *   - the target element is mounted and has non-zero area
 * A capture harness that quietly falls back is how a pair ends up comparing two different things.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', 'test', '_boot.cjs'));

const [BEFORE, AFTER, OUTDIR] = process.argv.slice(2);
if (!BEFORE || !AFTER || !OUTDIR) {
  console.log('usage: node _audit/2026-07-29-w4-pairs.cjs <before.html> <after.html> <outdir>');
  process.exit(1);
}
fs.mkdirSync(OUTDIR, { recursive: true });

/* The pair list. `surface` decides what gets mounted and clipped. */
const PAIRS = [
  /* --- P2-5, the cram sheet: the flagship (the spec) and the corpus worst case --- */
  { name: 'cram-flagship',   surface: 'cram',    topic: 'content-pipeline',     theme: 'light', w: 1280, h: 800 },
  { name: 'cram-worstcase',  surface: 'cram',    topic: 'sharding-strategies',  theme: 'light', w: 1280, h: 800 },
  { name: 'cram-tallest',    surface: 'cram',    topic: 'consistency-models',   theme: 'light', w: 1280, h: 800 },
  /* --- P3-4, .dec-tell: the worst case named by the audit, and the flagship as control --- */
  { name: 'dectell-multiregion', surface: 'trade', topic: 'multi-region',       theme: 'light', w: 1280, h: 800 },
  { name: 'dectell-flagship',    surface: 'trade', topic: 'content-pipeline',   theme: 'light', w: 1280, h: 800 },
  /* --- sub-scope B, the sidebar, both themes --- */
  { name: 'sidebar',         surface: 'sidebar', topic: 'event-driven',         theme: 'light', w: 1280, h: 800 },
  { name: 'sidebar-dark',    surface: 'sidebar', topic: 'event-driven',         theme: 'dark',  w: 1280, h: 800 },
];

async function shoot(html, spec, outPath) {
  const browser = await chromium.launch(B.launchOpts());
  try {
    const ctx = await browser.newContext({
      viewport: { width: spec.w, height: spec.h }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
      colorScheme: spec.theme === 'dark' ? 'dark' : 'light',
    });
    const page = await ctx.newPage();
    await B.gotoApp(page, html, { hash: '#' + spec.topic + '/walk' });
    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');

    /* theme + topic, then WAIT for both to be true rather than assuming the call landed */
    await page.evaluate((s) => {
      document.documentElement.setAttribute('data-theme', s.theme);
      if (typeof TopicRegistry !== 'undefined') {
        const cur = TopicRegistry.current();
        if (!cur || cur.id !== s.topic) TopicRegistry.setTopic(s.topic);
      }
      const ix = document.querySelector('.ix-x'); if (ix) ix.click();
    }, spec);
    await B.until(page, (s) => document.documentElement.getAttribute('data-theme') === s.theme
      && (typeof TopicRegistry === 'undefined' || (TopicRegistry.current() || {}).id === s.topic),
      spec, B.ACT_MS, 'theme + topic applied');

    let clip = null;
    if (spec.surface === 'cram') {
      await page.evaluate(() => document.getElementById('cramopen').click());
      await B.until(page, () => {
        const h = document.querySelector('deep-cram');
        return !!h && !!h.shadowRoot && h.shadowRoot.querySelectorAll('.cs-spine li').length > 0;
      }, null, B.ACT_MS, 'cram sheet rendered');
      await page.waitForTimeout(400);          /* the panel's entry animation, reducedMotion=reduce */
      clip = await page.evaluate(() => {
        const p = document.querySelector('.cram-panel');
        const r = p.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
                 width: Math.round(r.width), height: Math.round(Math.min(r.height, window.innerHeight - r.y)) };
      });
    } else if (spec.surface === 'trade') {
      await page.evaluate(() => { if (typeof switchTab === 'function') switchTab('trade'); });
      await B.until(page, () => {
        const roots = [document];
        for (let i = 0; i < roots.length; i++) {
          roots[i].querySelectorAll('*').forEach((el) => {
            if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) roots.push(el.shadowRoot);
          });
          if (roots[i].querySelector('.dec-tell')) return true;
        }
        return false;
      }, null, B.ACT_MS, 'trade pane rendered a .dec-tell');
      await page.waitForTimeout(300);
      clip = await page.evaluate(() => {
        const st = document.querySelector('.stage');
        const r = st.getBoundingClientRect();
        return { x: Math.max(0, Math.round(r.x)), y: 0,
                 width: Math.round(r.width), height: window.innerHeight };
      });
    } else if (spec.surface === 'sidebar') {
      await B.until(page, () => !!document.querySelector('.sidebar .seg button'), null, B.ACT_MS, 'sidebar nav mounted');
      await page.waitForTimeout(300);
      clip = await page.evaluate(() => {
        const s = document.querySelector('.sidebar');
        const r = s.getBoundingClientRect();
        return { x: 0, y: 0, width: Math.ceil(r.width) + 12, height: window.innerHeight };
      });
    }

    /* THE FRAME ASSERTIONS. Refuse to write a shot whose frame is not what it claims. */
    const frame = await page.evaluate(() => ({
      w: window.innerWidth, h: window.innerHeight,
      theme: document.documentElement.getAttribute('data-theme'),
      topic: (typeof TopicRegistry !== 'undefined' && TopicRegistry.current()) ? TopicRegistry.current().id : null,
    }));
    const bad = [];
    if (frame.w !== spec.w || frame.h !== spec.h) bad.push('viewport ' + frame.w + 'x' + frame.h + ' != ' + spec.w + 'x' + spec.h);
    if (frame.theme !== spec.theme) bad.push('theme ' + frame.theme + ' != ' + spec.theme);
    if (frame.topic !== spec.topic) bad.push('topic ' + frame.topic + ' != ' + spec.topic);
    if (!clip || clip.width <= 0 || clip.height <= 0) bad.push('target not mounted / zero area');
    if (bad.length) throw new Error(spec.name + ': FRAME ASSERTION FAILED -- ' + bad.join('; '));

    await page.screenshot({ path: outPath, clip: clip });
    await ctx.close();
    return { clip: clip, frame: frame };
  } finally {
    await browser.close();
  }
}

(async () => {
  const rows = [];
  for (const spec of PAIRS) {
    for (const side of ['before', 'after']) {
      const html = side === 'before' ? BEFORE : AFTER;
      const out = path.join(OUTDIR, spec.name + '.' + side + '.png');
      const r = await shoot(html, spec, out);
      rows.push({ pair: spec.name, side: side, file: path.basename(out),
                  clip: r.clip.width + 'x' + r.clip.height + '@' + r.clip.x + ',' + r.clip.y,
                  theme: r.frame.theme, topic: r.frame.topic, bytes: fs.statSync(out).size });
      console.log('  ' + spec.name.padEnd(22) + side.padEnd(7) + rows[rows.length - 1].clip.padEnd(18)
        + r.frame.topic + '  ' + r.frame.theme);
    }
  }
  /* The two halves of a pair must share a frame, or the pair is not a comparison. */
  const bad = [];
  PAIRS.forEach((s) => {
    const b = rows.find((r) => r.pair === s.name && r.side === 'before');
    const a = rows.find((r) => r.pair === s.name && r.side === 'after');
    if (!b || !a) { bad.push(s.name + ': missing a half'); return; }
    /* Height may differ legitimately -- a taller sheet IS the finding -- but x/y/width must not. */
    const bx = b.clip.split('@')[1], ax = a.clip.split('@')[1];
    const bw = b.clip.split('x')[0], aw = a.clip.split('x')[0];
    if (bx !== ax || bw !== aw) bad.push(s.name + ': frames differ  before=' + b.clip + '  after=' + a.clip);
  });
  fs.writeFileSync(path.join(OUTDIR, 'INVENTORY.json'), JSON.stringify({ pairs: PAIRS, shots: rows, framesMatched: !bad.length, frameProblems: bad }, null, 2) + '\n', 'ascii');
  if (bad.length) { console.log('\nFRAME MISMATCH:'); bad.forEach((x) => console.log('  ' + x)); process.exit(1); }
  console.log('\n' + rows.length + ' shots, ' + PAIRS.length + ' pairs, every frame asserted and matched -> ' + OUTDIR);
})().catch((e) => { console.log('PAIRS: FAIL -- ' + (e && e.message ? e.message : String(e))); process.exit(1); });
