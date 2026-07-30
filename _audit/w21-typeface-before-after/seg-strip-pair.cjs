/* ===== W21 / W-X6 REVIEW PAIR -- the seg pane-tab strip, before and after =====
 *
 * The most user-visible consequence of this wave on Windows: the nine .seg pane tabs, the nav
 * this campaign lifted above the fold, stop rasterising in Arial and render in the app stack
 * (Segoe UI here). This script captures that strip from the OLD deliverable and the NEW one,
 * light and dark, at 1280x800, with the SAME binary and the same crop box -- so a reader is
 * comparing typefaces, not two different screenshot recipes.
 *
 * FRAMING IS ASSERTED, NOT ASSUMED. A review pair that silently crops the subject out is worse
 * than no pair: it is evidence-shaped and evidence-free. Before writing a single PNG the script
 * requires, and fails loudly without:
 *   - the .seg element exists and has a non-zero box on every capture
 *   - exactly NINE RENDERED tab buttons inside it (there is a tenth, hidden at height 0)
 *   - the crop contains each strip's full WIDTH and everything the RAIL SHOWS of it. The strip
 *     itself overflows the rail in both builds, so "contains the whole strip" is not available
 *     and is not claimed; the crop is the union over BOTH builds AND BOTH schemes, computed up
 *     front and then held fixed for all four shots (the two themes place the rail 2px apart,
 *     and a crop fitted to light alone put the dark strip outside it)
 *   - the strip box has not moved between the measuring pass and the capture pass
 *   - window.innerWidth is really 1280 (a devtools/scrollbar surprise would silently reframe)
 *   - scrollY is 0, so the page-coordinate clip means what it says
 *
 * Usage: node _audit/w21-typeface-before-after/seg-strip-pair.cjs
 *        (reads the committed HEAD deliverable for BEFORE via git, and the working tree for AFTER)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', '..', 'test', '_boot.cjs'));

const ROOT = path.join(__dirname, '..', '..');
const AFTER_HTML = path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html');
const OUTDIR = __dirname;
const VW = 1280, VH = 800;
const PAD = 12;                     /* breathing room around the strip in the crop */
const HASH = '#event-driven/walk';

/* The BEFORE build is the deliverable as committed at the branch point. Materialise it from git
   rather than keeping a binary copy around, so the pair cannot drift from the record. */
function beforeHtml() {
  const tmp = path.join(OUTDIR, '_before.tmp.html');
  const base = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const buf = execFileSync('git',
    ['-C', ROOT, 'show', base + ':deepdive_content_pipeline_rehearsal.html'],
    { maxBuffer: 1 << 30 });
  fs.writeFileSync(tmp, buf);
  return { file: tmp, rev: base };
}

async function open(browser, html, scheme) {
  const ctx = await browser.newContext({
    viewport: { width: VW, height: VH }, deviceScaleFactor: 1, colorScheme: scheme,
    reducedMotion: 'reduce', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  await B.gotoApp(page, html, { hash: HASH });
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
  await B.until(page, () => !!document.querySelector('.seg button'), null, B.ACT_MS, 'seg mounted');
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch (e) {}
  await B.settle(page);
  const w = await page.evaluate(() => window.innerWidth);
  if (w !== VW) throw new Error('FRAMING ASSERT: innerWidth is ' + w + ', expected ' + VW);
  return { ctx, page };
}

async function segBox(page, label) {
  const box = await page.evaluate(() => {
    const seg = document.querySelector('.seg');
    if (!seg) return null;
    const r = seg.getBoundingClientRect();
    /* The strip carries TEN buttons: the nine pane tabs plus a hidden "Visualize / GPU MODE"
       tab that mounts at height 0. Asserting 9 against querySelectorAll('button') fails on a
       correct build -- count what is RENDERED, and record the hidden one so the number is not
       a mystery to the next reader. */
    const all = Array.from(seg.querySelectorAll('button'));
    const tabs = all.map((b) => {
      const t = b.getBoundingClientRect();
      return { x: t.x, y: t.y, w: t.width, h: t.height,
               shown: t.height > 0 && getComputedStyle(b).display !== 'none',
               inside: t.top >= r.top - 0.5 && t.bottom <= r.bottom + 0.5 };
    }).filter((t) => t.shown);
    /* The strip is TALLER than the rail that shows it: the sidebar scrolls, so the user sees the
       intersection, not the 456px box. The pair is therefore cropped to what is VISIBLE, with
       the full box reported alongside -- a crop fitted to the box framed ~140px of empty page
       below the rail and read as if the strip simply stopped there.
       MEASURED, because the obvious guess is wrong: 4px x9 taller tabs do NOT cost a tab. The
       rail clears SIX tabs before and six after (tab pitch 46.67 -> 50.67px against ~323px of
       rail); the seventh is partially visible in both, slightly more clipped after. */
    let sc = seg.parentElement, vis = null;
    while (sc) {
      const cs = getComputedStyle(sc);
      if (/(auto|scroll|hidden)/.test(cs.overflowY) && sc.clientHeight > 0) {
        const cr = sc.getBoundingClientRect();
        vis = { top: cr.top, bottom: cr.top + sc.clientHeight };
        break;
      }
      sc = sc.parentElement;
    }
    if (!vis) vis = { top: 0, bottom: window.innerHeight };
    return { x: r.x, y: r.y, w: r.width, h: r.height, tabs: tabs, hidden: all.length - tabs.length,
             visTop: vis.top, visBottom: Math.min(vis.bottom, window.innerHeight),
             tabsFullyVisible: tabs.filter((t) => t.y >= vis.top && t.y + t.h <= Math.min(vis.bottom, window.innerHeight)).length,
             face: getComputedStyle(seg.querySelector('button')).fontFamily };
  });
  if (!box) throw new Error('FRAMING ASSERT (' + label + '): no .seg element');
  if (!(box.w > 0 && box.h > 0)) throw new Error('FRAMING ASSERT (' + label + '): .seg has a zero box');
  if (box.tabs.length !== 9) {
    throw new Error('FRAMING ASSERT (' + label + '): expected 9 RENDERED pane tabs, found '
      + box.tabs.length + ' (plus ' + box.hidden + ' hidden)');
  }
  const stray = box.tabs.filter((t) => !t.inside).length;
  if (stray) throw new Error('FRAMING ASSERT (' + label + '): ' + stray + ' tab(s) outside the strip box');
  return box;
}

(async () => {
  const before = beforeHtml();
  const browser = await chromium.launch(B.launchOpts());
  const shots = [];
  try {
    /* pass 1: measure ALL FOUR shots so the crop is the union over builds AND schemes. Measuring
       light only put the dark strip 1px outside the fixed crop -- the two themes do not place
       the rail identically. */
    const boxes = {};
    for (const [label, html] of [['before', before.file], ['after', AFTER_HTML]]) {
      for (const scheme of ['light', 'dark']) {
        const { ctx, page } = await open(browser, html, scheme);
        boxes[label + '/' + scheme] = await segBox(page, label + '/' + scheme);
        await ctx.close();
      }
    }
    const every = Object.keys(boxes).map((k) => boxes[k]);
    const x0 = Math.floor(Math.min.apply(null, every.map((b) => b.x)) - PAD);
    const y0 = Math.floor(Math.min.apply(null, every.map((b) => b.y)) - PAD);
    const x1 = Math.ceil(Math.max.apply(null, every.map((b) => b.x + b.w)) + PAD);
    /* bottom = where the RAIL stops showing the strip, not where the strip's box ends */
    const y1 = Math.ceil(Math.max.apply(null,
      every.map((b) => Math.min(b.y + b.h, b.visBottom))));
    /* The strip is 456px tall at y=476, so it runs PAST the 800px fold -- clamping the crop to
       the viewport silently cut the bottom four tabs off the very comparison this pair exists
       to show. The captures are full-page (the document is ~1137px tall here) and the clip is
       in PAGE coordinates, which equal viewport coordinates at scrollY 0. */
    const clip = { x: Math.max(0, x0), y: Math.max(0, y0),
                   width: Math.min(VW, x1) - Math.max(0, x0), height: y1 - Math.max(0, y0) };

    console.log('=== W21 SEG-STRIP REVIEW PAIR ===');
    console.log('  BEFORE deliverable : git ' + before.rev.slice(0, 7) + ':deepdive_content_pipeline_rehearsal.html');
    /* console.log's format has no width specifiers -- %-14s prints literally and shifts every
       argument one place left, which is how this block first reported "rail shows 44 of 9". */
    for (const k of Object.keys(boxes)) {
      const b = boxes[k];
      console.log('  ' + k.padEnd(14) + ' strip y=' + b.y + ' h=' + b.h
        + '  tab=' + b.tabs[0].h + 'px  rail clears ' + b.tabsFullyVisible + ' of 9'
        + '  face=' + b.face.slice(0, 34));
    }
    console.log('  crop (union, fixed): x=%s y=%s w=%s h=%s', clip.x, clip.y, clip.width, clip.height);

    /* The crop must contain each strip's full WIDTH, its top, and everything the rail shows of
       it. It deliberately does NOT contain the overflowing tail -- that is the point being
       illustrated -- so the assert is about the visible region, and it is stated as such. */
    for (const key of Object.keys(boxes)) {
      const b = boxes[key];
      const visibleBottom = Math.min(b.y + b.h, b.visBottom);
      if (b.x < clip.x || b.x + b.w > clip.x + clip.width) {
        throw new Error('FRAMING ASSERT: the crop does not contain the ' + key + ' strip WIDTH');
      }
      if (b.y < clip.y || visibleBottom > clip.y + clip.height + 0.5) {
        throw new Error('FRAMING ASSERT: the crop does not contain the ' + key
          + ' strip VISIBLE region (' + b.y + '..' + visibleBottom + ' vs crop '
          + clip.y + '..' + (clip.y + clip.height) + ')');
      }
    }

    /* pass 2: the four captures, same clip for all */
    for (const [label, html] of [['before', before.file], ['after', AFTER_HTML]]) {
      for (const scheme of ['light', 'dark']) {
        const { ctx, page } = await open(browser, html, scheme);
        const box = await segBox(page, label + "/" + scheme);
        const ref = boxes[label + '/' + scheme];
        if (Math.abs(box.y - ref.y) > 0.5 || Math.abs(box.h - ref.h) > 0.5) {
          throw new Error('FRAMING ASSERT: ' + label + '/' + scheme + ' strip box moved between '
            + 'the measuring pass and the capture pass -- the fixed crop is no longer valid');
        }
        const docH = await page.evaluate(() => document.documentElement.scrollHeight);
        if (docH < clip.y + clip.height) {
          throw new Error('FRAMING ASSERT: ' + label + '/' + scheme + ' page is only ' + docH
            + 'px tall, crop needs ' + (clip.y + clip.height));
        }
        const sy = await page.evaluate(() => window.scrollY);
        if (sy !== 0) throw new Error('FRAMING ASSERT: page is scrolled (' + sy + '), crop coords would shift');
        const out = path.join(OUTDIR, 'seg-' + scheme + '-' + label.toUpperCase() + '.png');
        await page.screenshot({ path: out, clip: clip, fullPage: true });
        shots.push([path.basename(out), fs.statSync(out).size, box.h]);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    try { fs.unlinkSync(before.file); } catch (e) {}
  }

  console.log('  written:');
  for (const [name, size, h] of shots) {
    console.log('    ' + name.padEnd(26) + String(size).padStart(8) + ' bytes  (strip box ' + h + 'px)');
  }
})().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
