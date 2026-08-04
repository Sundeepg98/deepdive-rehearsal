'use strict';
/* ===== print_truth -- THE GATE'S FIRST PRINT CHECK =====
 *
 * WHY THIS EXISTS. The cram sheet is the app's one printable artifact -- "read five minutes before
 * a loop" -- and its Print button emitted ONE A4 page and silently dropped 66-80% of the sheet, in
 * Firefox 151, Chromium 149 and WebKit 26.5 alike. The print stylesheet reset four properties on
 * .cram-panel (box-shadow / max-width / border-radius / margin) and not the two that decide whether
 * paper gets the content: the screen rule carries `overflow:hidden` and
 * `max-height:calc(100vh - var(--space-36))`, so on paper the sheet stayed a height-capped,
 * overflow-hidden scroll box. There is no scrollbar on paper. The remainder was simply gone.
 *
 * Sixty-seven checks did not see it, because not one of them had ever looked at print media. This
 * is the first. It measures the two things a printed artifact can be wrong about -- IS THE CONTENT
 * IN THE LAYOUT, and DOES IT REACH THE PAPER -- and it settles the second one against a real
 * Chromium `page.pdf`, not against a DOM proxy for it.
 *
 * WHAT IT ASSERTS (six arms; A-E were every one RED on the pre-fix build -- captured verbatim in
 * _audit/2026-07-30-w16-print-truth.md -- and F was added by W-ADDRESSES cycle 3):
 *   A GEOMETRY   under print media the panel has no height cap and no hidden overflow, the body
 *                clips nothing (scrollHeight == clientHeight), and no CONTROL surface prints.
 *   B PAGINATION a real A4 page.pdf yields a page count at or above the arithmetic floor implied
 *                by the measured content height, and not wildly above it.
 *   C ON PAPER   the LAST section's heading is extractable FROM THE PDF BYTES -- the whole defect
 *                was that it was not.
 *   D TOKENS     the Ctrl/Cmd+P "Print Q&A" document -- a SEPARATE document, which the app's :root
 *                does not reach -- computes a real typographic hierarchy instead of collapsing
 *                every heading to 14px/400.
 *   E BREAKS     the cram sheet's atomic units carry break-inside:avoid inside the shadow root.
 *   F LATTICE    the printed HOME still carries the marks its figures name. Measured in PDF
 *                BYTES at printBackground:false -- the reader default -- with and without the
 *                print-color-adjust declarations, because every mark on that panel is a
 *                background and the reader's default is to drop background paint to save ink.
 *
 * PLATFORM-DETERMINISTIC. No wall clock, no sleep-then-assert, no font-metric assertion beyond
 * "these sizes differ". Page counts are compared against a floor DERIVED FROM A MEASUREMENT taken
 * in this same run, never against a number someone once observed and typed in.
 *
 * THREE NEGATIVE CONTROLS, because this repo has shipped checks that could not fail:
 *   1. print media is asserted live in-page (matchMedia('print').matches) before anything is read;
 *   2. a planted class-less div in the cram shadow root must compute break-inside:auto while the
 *      cram units compute avoid -- so "everything reads avoid" cannot pass for a fix;
 *   3. the PDF text extractor must find the FIRST section's heading. If it cannot, the extractor
 *      is dead and the run ABORTS -- a broken extractor must never be able to buy a green, and it
 *      must never be able to buy a red either.
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { chromium } = require('playwright');
const B = require('./_boot.cjs');

const HTML = process.argv[2] || 'deepdive_content_pipeline_rehearsal.html';
/* Write the review PDFs only when asked; the gate run stays read-only. */
const PDF_DIR = process.env.PRINT_TRUTH_PDF_DIR || '';
const LABEL = process.env.PRINT_TRUTH_LABEL || 'after';

/* A4 in CSS px. The print box is 96dpi by definition (1in = 96 CSS px), and the app's own
 * `@page{margin:1.5cm}` (styles.css, inside the print block) is what page.pdf honours via
 * preferCSSPageSize -- so these are the app's real numbers, not this file's opinion. */
const MM = 96 / 25.4;
const PAGE_W = 210 * MM;                 /* 793.70 */
const PAGE_H = 297 * MM;                 /* 1122.52 */
const MARGIN = 15 * MM;                  /* 56.69 -- 1.5cm */
const BOX_W = PAGE_W - 2 * MARGIN;       /* 680.31 */
const BOX_H = PAGE_H - 2 * MARGIN;       /* 1009.13 */
/* Measure content at a viewport at least as wide as the real print box. A NARROWER measurement
 * would report a TALLER document and inflate the floor into a false red; ceil() keeps the floor a
 * genuine lower bound. */
const MEASURE_W = Math.ceil(BOX_W);      /* 681 */
const MEASURE_H = Math.round(BOX_H);     /* 1009 */

const FLAGSHIP = 'content-pipeline';
const TALLEST = 'consistency-models';

/* ARM F's record. A COLD home paints no keel and no fill, so a lattice arm driven on one would
 * measure the same bytes either way and report a green it did not earn. This is the same shape as
 * test/scoreboard_salience.cjs's GAUGE_SEED -- two thirds of the topics graded, the solid share
 * walking the whole --lv range so both keel variants paint at every fill step -- and the fixed
 * `ts` keeps the record's age strings, and therefore the PDF's bytes, identical run to run. */
const LATTICE_SEED = () => {
  localStorage.clear();
  let j = -1;
  TopicRegistry.ids().forEach((id, k) => {
    if (k % 3 === 2) return;               /* every third topic left UNGRADED: the denominator */
    j++;
    const cards = TopicRegistry.get(id).data.bank.cards;
    const keys = CardId.forCards(cards); const map = {};
    const share = (j % 4) / 4;             /* 0, .25, .5, .75 -- all keel-bearing */
    const bad = (Math.floor(j / 4) % 2) ? 1 : 2;   /* MISSED and SHAKY, four topics at a time */
    cards.forEach((c, i) => { map[keys[i]] = (i / cards.length < share) ? 3 : bad; });
    const solid = Object.keys(map).filter((x) => map[x] >= 3).length;
    localStorage.setItem('ddr.v1.progress.' + id, JSON.stringify({
      got: solid, shk: cards.length - solid, done: cards.length, tot: cards.length,
      revisit: ['idempotency'], cards: map, cv: 1, ts: 1750000000000 }));
  });
};
/* See CONTROL 3b. Anchored on measured healthy coverage (0.94 / 0.98) with room beneath it, and
 * far above the two death modes it exists to catch (0.35 partial, 0.00 total). */
const COVERAGE_FLOOR = 0.70;

const fails = [];
const notes = [];
function ok(cond, label, detail) {
  if (cond) { notes.push('  PASS  ' + label + (detail ? '  ' + detail : '')); return true; }
  fails.push(label + (detail ? '  ' + detail : ''));
  notes.push('  FAIL  ' + label + (detail ? '  ' + detail : ''));
  return false;
}

/* ===== PDF text extraction, PER PAGE =====
 * Chromium writes page content as Type0/Identity-H subset fonts, so a content stream carries GLYPH
 * IDS, not characters: a `<0037> Tj` is whatever glyph 0x37 is in THAT font's subset. The mapping
 * back to text is the font's /ToUnicode CMap, which Chromium does emit. So: inflate the stream,
 * build a per-font glyph->unicode map, track the current font through the `Tf` operator, and decode.
 *
 * PER PAGE, not per document, because "the last section is on the paper" and "the last section is
 * on the LAST page" are different claims and only the second one is the acceptance test. The page
 * tree gives the order directly -- /Type /Pages carries /Kids in page order, and each /Page names
 * its /Contents. Chromium then puts the actual marking operators in a Form XObject that the page's
 * content stream merely invokes, so a page's text is its content stream PLUS the forms named in
 * its /Resources /XObject; each form may carry its own /Resources /Font, which shadows the page's.
 *
 * Two things this deliberately does NOT do, because the assertion does not need them and each
 * would add a way to be subtly wrong: it does not reconstruct spatial layout (no line/word
 * reordering from Td/Tm), and it does not decode `TJ` arrays. Chromium emits one `Tj` per glyph
 * with a `Td` advance between, which is what this reads. The assertion is PRESENCE of a heading's
 * letters in order, on a named page, and control 3 proves on every run that the reading works. */
function parsePdf(buf) {
  const s = buf.toString('latin1');
  const objs = new Map();
  const objRe = /(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g;
  let m;
  while ((m = objRe.exec(s))) objs.set(Number(m[1]), m[2]);

  const dictHead = (body) => {
    const i = body.indexOf('stream');
    return i < 0 ? body : body.slice(0, i);
  };
  const streamOf = (body) => {
    const i = body.indexOf('stream');
    if (i < 0) return null;
    let j = i + 6;
    if (body[j] === '\r') j++;
    if (body[j] === '\n') j++;
    const k = body.lastIndexOf('endstream');
    if (k < 0) return null;
    const raw = Buffer.from(body.slice(j, k), 'latin1');
    /* Always TRY to inflate: gating on a /FlateDecode string in the dict silently returns the
     * compressed bytes for anything phrased differently, and compressed bytes contain no `Tj`, so
     * the extractor would report "no text" for a PDF full of text. */
    try { return zlib.inflateSync(raw); } catch (e) { return raw; }
  };

  /* glyph -> unicode, per font object */
  const fontMap = new Map();
  for (const [num, body] of objs) {
    const head = dictHead(body);
    if (!/\/Type\s*\/Font/.test(head)) continue;
    const r = head.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    if (!r) continue;
    const cm = objs.get(Number(r[1]));
    if (!cm) continue;
    const data = streamOf(cm);
    if (!data) continue;
    const txt = data.toString('latin1');
    const map = new Map();
    let blk;
    const bfchar = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((blk = bfchar.exec(txt))) {
      const pr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let p;
      while ((p = pr.exec(blk[1]))) map.set(parseInt(p[1], 16), String.fromCharCode(parseInt(p[2].slice(0, 4), 16)));
    }
    const bfrange = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((blk = bfrange.exec(txt))) {
      const pr = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let p;
      while ((p = pr.exec(blk[1]))) {
        const lo = parseInt(p[1], 16), hi = parseInt(p[2], 16), u = parseInt(p[3].slice(0, 4), 16);
        for (let g = lo; g <= hi && g - lo < 4096; g++) map.set(g, String.fromCharCode(u + (g - lo)));
      }
    }
    fontMap.set(num, map);
  }

  /* name -> object number, out of a /Resources sub-dictionary */
  const subRes = (head, key) => {
    const d = head.match(new RegExp('/' + key + '\\s*<<([\\s\\S]*?)>>'));
    const out = {};
    if (!d) return out;
    const r = /\/(\w+)\s+(\d+)\s+\d+\s+R/g;
    let f;
    while ((f = r.exec(d[1]))) out[f[1]] = Number(f[2]);
    return out;
  };

  const decode = (txt, fonts) => {
    let out = '';
    let cur = null;
    const tok = /\/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]+)>\s*Tj/g;
    let t;
    while ((t = tok.exec(txt))) {
      if (t[1] !== undefined) { cur = fontMap.get(fonts[t[1]]) || null; continue; }
      const hx = t[2];
      for (let i = 0; i + 4 <= hx.length; i += 4) {
        const g = parseInt(hx.slice(i, i + 4), 16);
        if (cur && cur.has(g)) out += cur.get(g);
      }
    }
    return out;
  };

  /* Text of one content-bearing object, descending into the Form XObjects IT names.
   *
   * THE BUG THIS SHAPE EXISTS TO PREVENT (cold verify, 2026-07-30, BLOCKING 1). The first version
   * merged the INHERITED XObject map into every level (`Object.assign({}, xobjs, own)`) and then
   * iterated the merged map, so a form re-descended into its own siblings and `depth` counted path
   * length through a CROSS-PRODUCT of the resource maps rather than nesting depth. Past a cap of 4
   * the decoder never reached a `Tf`, `cur` stayed null, and whole pages decoded to nothing --
   * silently, on a provably correct artifact. Chromium emits a VARIABLE number of Form XObjects for
   * byte-identical input, so this was a coin flip: measured 5 forms -> [1657,1664,1468] (healthy),
   * 20 forms -> [1657,0,0] (a FALSE FAILURE reported as an app defect), 24 forms -> [0,0,0].
   *
   * So: a form's children are the XObjects ITS OWN /Resources name, and nothing else. The page
   * supplies the map exactly once, at the top, for its content stream -- which has no /Resources of
   * its own and must resolve the page's forms. Below that, `null`. `depth` is now true nesting
   * depth, and `seen` (not the cap) is what guards cycles -- which is what the cap was standing in
   * for. The cap survives only as a stack guard and is set where it cannot bind: `seen` already
   * bounds the walk by the object count.
   *
   * FONT resources ARE still merged down, because that inheritance is real and harmless -- a form
   * that names no font of its own draws with the enclosing scope's. */
  const MAX_FORM_DEPTH = 64;
  const textOf = (objNum, fonts, childX, depth, seen) => {
    if (objNum == null || depth > MAX_FORM_DEPTH || seen.has(objNum)) return '';
    seen.add(objNum);
    const body = objs.get(objNum);
    if (!body) return '';
    const head = dictHead(body);
    const myFonts = Object.assign({}, fonts, subRes(head, 'Font'));
    const own = subRes(head, 'XObject');
    const kids = Object.keys(own).length ? own : (childX || {});
    let out = '';
    const data = streamOf(body);
    if (data) out += decode(data.toString('latin1'), myFonts);
    for (const name of Object.keys(kids)) {
      const n = kids[name];
      const b = objs.get(n);
      if (!b) continue;
      if (/\/Subtype\s*\/Image/.test(dictHead(b))) continue;
      out += textOf(n, myFonts, null, depth + 1, seen);
    }
    return out;
  };

  /* ===== page order, from the ROOT of the page tree =====
   *
   * THE BUG THIS REPLACES (cold verify, 2026-07-30, BLOCKING 2). The page tree is a TREE, not a
   * list, and Chromium splits it once a document gets long enough. The Print Q&A document has
   * three /Type /Pages nodes -- /Count 8 (8 kids), /Count 3 (3 kids), and /Count 11 (2 kids, the
   * two above). The ROOT is the 11. The first version took the node with the MOST KIDS, which is
   * the 8 -- an intermediate node -- so an 11-page document was read as 8 pages, and the last three
   * pages were never examined at all. pdfPageCount took the FIRST /Type /Pages node in byte order,
   * which is also the 8, so the arm that exists to cross-check the two readers COULD NOT CATCH IT:
   * both shared the failure mode. That is how a wrong number reached the freeze report, where it
   * was then explained away as a margin difference. It was not; it was this.
   *
   * Resolve the root properly: trailer /Root -> catalog /Pages, and failing that, the /Pages node
   * that is no other node's kid. Then walk it, descending through intermediate nodes, and collect
   * the LEAVES in order. */
  const pagesNodes = new Map();
  for (const [num, body] of objs) {
    const head = dictHead(body);
    if (!/\/Type\s*\/Pages\b/.test(head)) continue;
    const k = head.match(/\/Kids\s*\[([\s\S]*?)\]/);
    const list = [];
    if (k) {
      const r = /(\d+)\s+\d+\s+R/g;
      let f;
      while ((f = r.exec(k[1]))) list.push(Number(f[1]));
    }
    pagesNodes.set(num, list);
  }
  let root = null;
  const rootRef = s.match(/\/Root\s+(\d+)\s+\d+\s+R/);
  if (rootRef) {
    const cat = objs.get(Number(rootRef[1]));
    if (cat) {
      const p = dictHead(cat).match(/\/Pages\s+(\d+)\s+\d+\s+R/);
      if (p && pagesNodes.has(Number(p[1]))) root = Number(p[1]);
    }
  }
  if (root == null) {
    const referenced = new Set();
    for (const list of pagesNodes.values()) for (const k of list) referenced.add(k);
    for (const num of pagesNodes.keys()) if (!referenced.has(num)) { root = num; break; }
  }
  const kids = [];
  const walk = (num, guard) => {
    if (num == null || guard.has(num)) return;
    guard.add(num);
    if (pagesNodes.has(num)) { for (const k of pagesNodes.get(num)) walk(k, guard); return; }
    const b = objs.get(num);
    if (b && /\/Type\s*\/Page(?![s])/.test(dictHead(b))) kids.push(num);
  };
  walk(root, new Set());

  const pages = kids.map((pn) => {
    const body = objs.get(pn);
    if (!body) return '';
    const head = dictHead(body);
    const fonts = subRes(head, 'Font');
    const xobjs = subRes(head, 'XObject');
    const cm = head.match(/\/Contents\s+(\d+)\s+\d+\s+R/);
    const seen = new Set();
    let out = cm ? textOf(Number(cm[1]), fonts, xobjs, 0, seen) : '';
    /* a page whose content stream only invokes its form still owns that form's text */
    for (const name of Object.keys(xobjs)) {
      const b = objs.get(xobjs[name]);
      if (!b || /\/Subtype\s*\/Image/.test(dictHead(b))) continue;
      out += textOf(xobjs[name], fonts, null, 1, seen);
    }
    return out;
  });

  return { pages, root };
}

/* Compare on letters only. The heading passes through HTML entities, a text-transform:uppercase,
 * a font subset and a CMap; punctuation and spacing are the parts of that journey that legitimately
 * differ, and the letters are the part that cannot. */
const norm = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');

/* THE SECOND, INDEPENDENT READER. It counts /Type /Page LEAF OBJECTS in the file and never looks
 * at the page tree at all, so it cannot fail the way parsePdf's tree walk fails, which is the whole
 * point of having it: the previous version read a /Count off a /Type /Pages node, and since
 * parsePdf also picked a node, the two agreed on the same wrong answer and the cross-check arm was
 * decorative. (The old function's own unused fallback branch was this count, and it would have been
 * right: 11, where the node-based read said 8.) Two readers that share a failure mode are one
 * reader. */
function pdfPageCount(buf) {
  return (buf.toString('latin1').match(/\/Type\s*\/Page(?![s])/g) || []).length;
}

/* ---------- in-page helpers ---------- */
async function showCram(page, topicId) {
  await page.evaluate(async (tid) => {
    const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cur = window.TopicRegistry.current();
    if (!cur || cur.id !== tid) {
      await new Promise((res) => {
        let done = false;
        const on = () => { if (done) return; done = true; window.removeEventListener('deeptopicchange', on); res(); };
        window.addEventListener('deeptopicchange', on);
        if (!window.TopicRegistry.setTopic(tid)) { on(); return; }
        setTimeout(on, 3000);
      });
    }
    const ov = document.getElementById('cramov');
    if (!ov.classList.contains('open')) document.getElementById('cramopen').click();
    await raf2();
  }, topicId);
  /* the sheet renders lazily on `.cram-ov.open`; wait for the CONTENT, never for a duration */
  await B.until(page, () => {
    const h = document.querySelector('deep-cram');
    return !!(h && h.shadowRoot && h.shadowRoot.querySelectorAll('.cs-sec').length > 0);
  }, null, null, 'deep-cram renders its sections');
  await B.settle(page);
}

async function readPrintGeometry(page) {
  return page.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const panel = document.querySelector('.cram-panel');
    const body = document.getElementById('cram');
    const jump = document.getElementById('cramjump');
    const top = document.querySelector('.cram-top');
    const host = document.querySelector('deep-cram');
    const sr = host && host.shadowRoot;
    const secs = sr ? Array.from(sr.querySelectorAll('.cs-sec')) : [];
    const headText = (sec) => {
      const st = sec.querySelector('.cs-st');
      return st ? (st.textContent || '').trim() : '';
    };
    return {
      printMedia: window.matchMedia('print').matches,
      iw: window.innerWidth,
      ih: window.innerHeight,
      panelMaxH: cs(panel).maxHeight,
      panelOverflowY: cs(panel).overflowY,
      panelOverflowX: cs(panel).overflowX,
      bodyOverflowY: cs(body).overflowY,
      bodyClient: body.clientHeight,
      bodyScroll: body.scrollHeight,
      jumpDisplay: cs(jump).display,
      topDisplay: cs(top).display,
      docScroll: document.documentElement.scrollHeight,
      secCount: secs.length,
      firstHead: secs.length ? headText(secs[0]) : '',
      lastHead: secs.length ? headText(secs[secs.length - 1]) : '',
      /* the sheet's own rendered text -- the independent yardstick the PDF reader is measured
       * against, so PARTIAL extractor death has something to be caught by */
      sheetText: sr ? (sr.textContent || '') : '',
    };
  });
}

async function readBreakControl(page) {
  return page.evaluate(() => {
    const host = document.querySelector('deep-cram');
    const sr = host && host.shadowRoot;
    if (!sr) return { err: 'no deep-cram shadow root' };
    const one = (sel) => {
      const el = sr.querySelector(sel);
      if (!el) return null;
      const c = getComputedStyle(el);
      return { inside: c.breakInside, after: c.breakAfter };
    };
    /* NEGATIVE CONTROL: a div with no cram class, in the same shadow root, under the same print
     * emulation. It must read `auto`. If it reads `avoid`, something is blanket-applying the
     * property and the arm below would pass without the rule existing. */
    const plant = document.createElement('div');
    plant.setAttribute('data-print-truth-control', '1');
    plant.textContent = 'negative control';
    sr.appendChild(plant);
    const control = getComputedStyle(plant).breakInside;
    const out = {
      control,
      st: one('.cs-st'),
      one: one('.cs-one'),
      ha: one('.cs-ha'),
      trap: one('.cs-trap'),
      dec: one('.cs-dec'),
      num: one('.cs-num'),
      thirty: one('.cs-30'),
      tellsLi: one('.cs-tells li'),
      spineLi: one('.cs-spine li'),
    };
    plant.remove();
    return out;
  });
}

/* The PDF reader is exported so it can be pointed at a COMMITTED artifact without launching a
 * browser -- which is how the pre-fix red for the final-page arm was demonstrated against
 * _audit/w16-print-before-after/before-*.pdf. Guarding the run on require.main keeps the gate's
 * `node test/print_truth.cjs <deliverable>` invocation behaving exactly as before. */
module.exports = { parsePdf, norm, pdfPageCount };

if (require.main === module) main();

function main() {
(async () => {
  if (!fs.existsSync(HTML)) {
    console.log('deliverable not found: ' + HTML);
    return B.finish(1, null);
  }
  if (PDF_DIR) fs.mkdirSync(PDF_DIR, { recursive: true });

  const browser = await chromium.launch(B.launchOpts());
  /* One isolated context; innerWidth is asserted on every read below. */
  const ctx = await browser.newContext({ viewport: { width: MEASURE_W, height: MEASURE_H } });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('pageerror', (e) => consoleErrs.push(String(e && e.message ? e.message : e)));

  await B.gotoApp(page, HTML, { hash: '#walk' });
  await B.enterApp(page);

  const pdfMeta = {};

  for (const topic of [FLAGSHIP, TALLEST]) {
    await showCram(page, topic);
    await page.emulateMedia({ media: 'print' });
    await B.settle(page);

    const g = await readPrintGeometry(page);
    const tag = '[' + topic + ']';

    /* CONTROL 1 -- print media really is active. Everything below is meaningless otherwise. */
    if (!ok(g.printMedia === true, tag + ' print media emulation is ACTIVE', 'matchMedia(print)=' + g.printMedia)) {
      console.log(notes.join('\n'));
      await browser.close();
      return B.finish(1, 'print_truth: print emulation never engaged -- the instrument is dead, not the app');
    }
    ok(g.iw === MEASURE_W, tag + ' viewport is the A4 content box', 'innerWidth=' + g.iw + ' expected=' + MEASURE_W);
    ok(g.secCount > 0, tag + ' the cram sheet rendered sections', 'sections=' + g.secCount);

    /* ---------- ARM A: geometry ---------- */
    ok(g.panelMaxH === 'none', tag + ' .cram-panel has NO height cap on paper', 'max-height=' + g.panelMaxH);
    ok(g.panelOverflowY !== 'hidden' && g.panelOverflowX !== 'hidden',
      tag + ' .cram-panel does NOT hide overflow on paper', 'overflow=' + g.panelOverflowX + '/' + g.panelOverflowY);
    ok(g.bodyOverflowY === 'visible', tag + ' #cram overflow is visible on paper', 'overflow-y=' + g.bodyOverflowY);
    const clipped = g.bodyScroll - g.bodyClient;
    ok(clipped <= 1, tag + ' #cram clips NOTHING', 'scrollH=' + g.bodyScroll + ' clientH=' + g.bodyClient + ' clipped=' + clipped + 'px');
    /* Control surfaces must not print. .cram-top was already handled; .cram-jump was not -- and the
     * A4 content box is 680px, which is INSIDE the app's <=919px mobile breakpoint, so the jump nav
     * is display:flex in exactly the layout the printer uses. */
    ok(g.topDisplay === 'none', tag + ' .cram-top (close/print controls) does not print', 'display=' + g.topDisplay);
    ok(g.jumpDisplay === 'none', tag + ' .cram-jump (section nav) does not print', 'display=' + g.jumpDisplay);

    /* ---------- ARM E: page-break control ---------- */
    const bc = await readBreakControl(page);
    if (bc.err) {
      ok(false, tag + ' break-control probe reached the shadow root', bc.err);
    } else {
      /* CONTROL 2 */
      if (!ok(bc.control === 'auto', tag + ' NEGATIVE CONTROL: a class-less div still reads break-inside:auto',
        'control=' + bc.control)) {
        console.log(notes.join('\n'));
        await browser.close();
        return B.finish(1, 'print_truth: the break-inside control read "' + bc.control + '" -- the arm below cannot fail, so it is not run');
      }
      for (const [sel, v] of [['.cs-one', bc.one], ['.cs-ha', bc.ha], ['.cs-trap', bc.trap],
        ['.cs-dec', bc.dec], ['.cs-num', bc.num], ['.cs-30', bc.thirty],
        ['.cs-tells li', bc.tellsLi], ['.cs-spine li', bc.spineLi]]) {
        if (v === null) continue;   /* not every topic renders every unit; absent is not a failure */
        ok(v.inside === 'avoid', tag + ' ' + sel + ' avoids splitting across a page', 'break-inside=' + v.inside);
      }
      if (bc.st) ok(bc.st.after === 'avoid', tag + ' .cs-st keeps its section head with what follows', 'break-after=' + bc.st.after);
    }

    /* ---------- ARM B: real A4 pagination ---------- */
    /* H is the height of the document Chromium is about to paginate, measured in the same layout.
     * The band is ARITHMETIC, derived from H in this run -- not a count someone once observed:
     *
     *   LOWER  ceil(H / PAGE_H)  -- content of height H cannot fit in fewer pages than this, and
     *          PAGE_H is the FULL A4 height, so the bound holds whatever margin the printer
     *          applies. Deliberately the weaker of the two available floors: the tighter one
     *          (H / BOX_H) would be asserting the 1.5cm margin as well as the pagination, and a
     *          margin assumption is not what this arm is for.
     *   UPPER  ceil(H / BOX_H) + 2 -- the tight floor plus honest headroom, since fragmentation
     *          (a break-inside:avoid unit pushed to the next page) can only ADD pages. It catches
     *          runaway page-per-item, which is the way an over-eager X9 would fail. */
    const H = Math.max(g.docScroll, g.bodyScroll);
    const loFloor = Math.ceil(H / PAGE_H);
    const hiCeil = Math.ceil(H / BOX_H) + 2;
    const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
    const pages = pdfPageCount(pdf);
    if (PDF_DIR) fs.writeFileSync(path.join(PDF_DIR, LABEL + '-' + topic + '.pdf'), pdf);

    ok(pages >= loFloor, tag + ' A4 page count reaches the floor implied by the content',
      'pages=' + pages + ' floor=ceil(' + H + '/' + PAGE_H.toFixed(2) + ')=' + loFloor);
    ok(pages <= hiCeil, tag + ' A4 page count is not inflated by runaway fragmentation',
      'pages=' + pages + ' ceiling=ceil(' + H + '/' + BOX_H.toFixed(2) + ')+2=' + hiCeil);

    /* ---------- ARM C: the last section is ON THE FINAL PAGE ---------- */
    const parsed = parsePdf(pdf);
    const pageText = parsed.pages.map(norm);
    const whole = pageText.join('');
    const first = norm(g.firstHead);
    const last = norm(g.lastHead);
    /* CONTROL 3 -- the extractor works on THIS pdf. A dead extractor must not be able to report
     * either verdict, so this aborts rather than failing the arm. */
    if (!first || !last) {
      console.log(notes.join('\n'));
      await browser.close();
      return B.finish(1, 'print_truth: could not read the section headings from the DOM (first="' + g.firstHead + '" last="' + g.lastHead + '")');
    }
    if (whole.indexOf(first) < 0) {
      console.log(notes.join('\n'));
      await browser.close();
      return B.finish(1, 'print_truth: PDF text extractor is DEAD -- the FIRST heading "' + g.firstHead +
        '" is not in the extracted text (' + whole.length + ' chars over ' + pageText.length + ' pages). ' +
        'Refusing to report on the last heading with a broken instrument.');
    }
    /* The two readers must AGREE, and they now fail differently: this one walks the page tree from
     * its root, pdfPageCount counts leaf objects and never looks at the tree. */
    ok(parsed.pages.length === pages, tag + ' the two page readers agree',
      'treeWalk=' + parsed.pages.length + ' leafObjects=' + pages);

    /* CONTROL 3b -- PARTIAL extractor death. Control 3 above only asks about page 1, and a reader
     * that decodes page 1 and nothing else passes it while delivering a verdict on pages it cannot
     * read. That is not hypothetical: it shipped, and it produced a FALSE FAILURE reported as an
     * app defect (`per-page 1657/0/0`, "found on page 0 of 3") on a provably correct build.
     * The yardstick is the sheet's OWN rendered text, measured in the DOM through a different code
     * path entirely -- so this compares two independent readings of the same content rather than
     * asking the PDF reader to vouch for itself. Healthy coverage measured 0.94 (flagship,
     * 4789/5104) and 0.98 (consistency-models, 16088/16405); the shortfall is punctuation and the
     * handful of glyphs no /ToUnicode entry covers. The floor is 0.70 -- far below the worst
     * healthy reading, far above the failures it must catch (0.35 partial, 0.00 total). */
    const domChars = norm(g.sheetText).length;
    const coverage = domChars ? whole.length / domChars : 0;
    /* GATED ON THE GEOMETRY, or it blames the reader for the app's defect. A CLIPPED sheet is
     * genuinely missing most of its text on paper, so coverage collapses -- 0.32 on the re-cap
     * mutant -- and an ungated control would abort with "the extractor is partially dead" while
     * pointing at the one artifact whose truncation is the entire finding. When ARM A has already
     * reported clipping, the low coverage is EXPLAINED, ARM C's red is the correct verdict, and
     * this control has nothing to add. It fires only when the sheet is whole and the reader still
     * came back short -- which is exactly the case it was built for. */
    const truncated = clipped > 1;
    if (!truncated && coverage < COVERAGE_FLOOR) {
      console.log(notes.join('\n'));
      await browser.close();
      return B.finish(1, 'print_truth: PDF text extractor is PARTIALLY DEAD -- the sheet is NOT clipped (' +
        clipped + 'px) yet the reader recovered only ' + whole.length + ' of ' + domChars +
        ' rendered characters (' + coverage.toFixed(2) + ' < ' + COVERAGE_FLOOR + '), per-page ' +
        pageText.map((t) => t.length).join('/') +
        '. Refusing to deliver a verdict on pages it cannot read.');
    }
    if (truncated) {
      notes.push('  ctrl  ' + tag + ' coverage ' + coverage.toFixed(2) + ' is LOW but the sheet is clipped ' +
        clipped + 'px -- the document is short, not the reader; ARM A owns this failure');
    }
    notes.push('  ctrl  ' + tag + ' extractor liveness: FIRST heading "' + g.firstHead + '" found on page ' +
      (pageText.findIndex((t) => t.indexOf(first) >= 0) + 1) + ' of ' + pageText.length +
      '; coverage ' + whole.length + '/' + domChars + ' = ' + coverage.toFixed(2) +
      ' (floor ' + COVERAGE_FLOOR + '); per-page ' + pageText.map((t) => t.length).join('/'));

    /* With coverage proven, an EMPTY page is the document's fault, not the reader's -- so it is an
     * arm, not a control. A blank sheet of paper in the middle of a cram sheet is a real defect,
     * and it is the failure mode an over-eager break-inside:avoid would produce. */
    const blanks = pageText.map((t, i) => (t.length ? null : i + 1)).filter((x) => x !== null);
    ok(blanks.length === 0, tag + ' no printed page is blank',
      'pages=' + pageText.length + ' blank=[' + blanks.join(',') + ']');

    /* THE ACCEPTANCE TEST. Not "somewhere in the document" -- on the LAST sheet of paper. The
     * defect put it nowhere at all; a half-fix that grew the page count without carrying the tail
     * across would still fail here. Asked of the final page DIRECTLY rather than by searching for
     * the first page that carries the heading: if that text ever also appeared earlier, a
     * first-match search would report the early page and false-red a correct document. */
    const lastPageIdx = pageText.length - 1;
    const onFinal = lastPageIdx >= 0 && pageText[lastPageIdx].indexOf(last) >= 0;
    const alsoOn = pageText.map((t, i) => (t.indexOf(last) >= 0 ? i + 1 : null)).filter((x) => x !== null);
    ok(onFinal, tag + ' the LAST section is printed ON THE FINAL PAGE',
      'heading="' + g.lastHead + '" pages=' + pageText.length + ' appears on page(s) [' + alsoOn.join(',') + ']');

    pdfMeta[topic] = {
      pages, band: [loFloor, hiCeil], H, bytes: pdf.length, clipped,
      lastHead: g.lastHead, lastHeadPage: lastPageIdx + 1, chars: whole.length,
      coverage: Number(coverage.toFixed(3)),
    };

    await page.emulateMedia({ media: null });
    await B.settle(page);
  }

  /* ---------- ARM F: the path that made X1 a P1, which the arms above never touch ----------
   * Every arm so far opens the sheet with #cramopen first. But the reason X1 was filed P1 rather
   * than P2 is that `styles.css:508` has NO `.open` requirement, so `body:not(.print-session)
   * .cram-ov` goes display:none -> block on print REGARDLESS -- a native File -> Print from any
   * view emits the cram sheet, for a user who never opened it. That is the path most likely to be
   * hit by accident and the one nothing was guarding. Measured pre-fix on a walkthrough view with
   * the sheet never opened: clipped 1784px, 1 page, last heading absent. */
  {
    /* A FRESH page that never touches #cramopen -- not an open-then-close, which would leave the
     * lazily-rendered sheet already mounted and quietly test something easier. */
    const fresh = await ctx.newPage();
    await B.gotoApp(fresh, HTML, { hash: '#walk' });
    await B.enterApp(fresh);
    const screenState = await fresh.evaluate(() => ({
      open: document.getElementById('cramov').classList.contains('open'),
      display: getComputedStyle(document.getElementById('cramov')).display,
    }));
    ok(screenState.open === false && screenState.display === 'none',
      '[file-print] precondition: the cram sheet was NEVER opened and is hidden on screen',
      'open=' + screenState.open + ' display=' + screenState.display);

    await fresh.emulateMedia({ media: 'print' });
    await B.settle(fresh);
    const fg = await readPrintGeometry(fresh);
    ok(fg.printMedia === true, '[file-print] print media emulation is ACTIVE', 'matchMedia(print)=' + fg.printMedia);
    /* The sheet materialises on paper without ever having been opened -- that is the app's design,
     * and it is exactly why the clamp mattered so much. Assert it still arrives WHOLE. */
    ok(fg.secCount > 0, '[file-print] a never-opened sheet still renders to paper', 'sections=' + fg.secCount);
    ok(fg.panelMaxH === 'none', '[file-print] .cram-panel has NO height cap on paper', 'max-height=' + fg.panelMaxH);
    const fClipped = fg.bodyScroll - fg.bodyClient;
    ok(fClipped <= 1, '[file-print] #cram clips NOTHING',
      'scrollH=' + fg.bodyScroll + ' clientH=' + fg.bodyClient + ' clipped=' + fClipped + 'px');

    const fPdf = await fresh.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
    const fParsed = parsePdf(fPdf);
    const fPages = pdfPageCount(fPdf);
    const fText = fParsed.pages.map(norm);
    const fLast = norm(fg.lastHead);
    const fFloor = Math.ceil(Math.max(fg.docScroll, fg.bodyScroll) / PAGE_H);
    ok(fPages >= fFloor, '[file-print] A4 page count reaches the floor implied by the content',
      'pages=' + fPages + ' floor=' + fFloor);
    ok(fText.length > 0 && fText[fText.length - 1].indexOf(fLast) >= 0,
      '[file-print] the LAST section is printed ON THE FINAL PAGE',
      'heading="' + fg.lastHead + '" pages=' + fText.length + ' per-page ' + fText.map((t) => t.length).join('/'));
    if (PDF_DIR) fs.writeFileSync(path.join(PDF_DIR, LABEL + '-file-print-never-opened.pdf'), fPdf);
    pdfMeta['file-print-never-opened'] = { pages: fPages, clipped: fClipped, bytes: fPdf.length };
    await fresh.close();
  }

  /* ---------- ARM F: PAPER CARRIES THE LATTICE (W-ADDRESSES cycle 3, R9) ----------
   * styles.css:637's print block hands #home to the BROWSER's own print rather than to
   * print-qa.js, so the altitude gauge really does reach paper -- and every mark it draws is a
   * BACKGROUND. Under the reader's default (`print-color-adjust:economy`, Background graphics
   * unticked, which is what `printBackground:false` reproduces) the browser is free to drop
   * background paint, and it does: 138 capsule fills, 70 keel marks, the `.open` bases, the inset
   * rules and every swatch the key renders all vanish, leaving "41 flagged" beside a blank strip
   * and a legend keying marks that are not on the page. The grade lives in the fill and nowhere
   * else, so there is no channel to degrade to.
   *
   * THE MEASUREMENT IS BYTES, NOT PIXELS, and that is the point: a PDF's content stream carries
   * one paint op per printed background, so removing the declarations removes the ops. It is a
   * property of the DOCUMENT rather than of a rasteriser, which is why it needs no baseline image
   * and cannot drift with a font or a driver.
   *
   * THREE CONTROLS, because a byte comparison is exactly the shape of check that passes on noise:
   *   (1) two IDENTICAL renders must agree to within delta/NOISE_FACTOR -- a RELATIVE control,
   *       measured in the same run on the same machine;
   *   (2) the delta must clear LATTICE_MIN (100k);
   *   (3) and it must clear LATTICE_RATIO as a fraction, which is the dimensionless form of the
   *       same claim and survives a platform whose PDFs are simply bigger or smaller.
   *
   * THE ABSOLUTE NOISE CEILING THIS SHIPPED WITH WAS A WIN32 ASSUMPTION, AND THE FREE CI GATE
   * FALSIFIED IT ON THE FIRST RUN. It read `noise <= 3000`, which is what three pairs measured
   * here -- exactly 0 bytes every time. On ubuntu-latest the same pair measured
   * `exact 315723/291886, economy 168507/167418`: 23,837 bytes of run-to-run wobble on the
   * exact side, 7.5% of the render. The SIGNAL was never in doubt (123,379 bytes, clearing the
   * floor by 23%) -- only the control's constant was, and a constant that is 0 on one platform
   * and 23k on another is not a threshold, it is a local observation. A control measured in the
   * SAME RUN and expressed as a ratio to the effect is the portable form.
   *
   * MOST OF THAT WOBBLE WAS THE BOOT SPLASH, which is the same defect class W-ADDRESSES cycle 3
   * found in scoreboard_salience: #_bootsplash is a fixed, full-viewport div filled with
   * var(--bg) that fades for 400ms after the app is otherwise ready, and while it is up it is
   * REAL CONTENT IN THE PDF. On a slow runner one render of a pair can carry it and the next
   * cannot. This arm waits for the element to be GONE, not merely faded.
   *
   * A warm-up render is taken first regardless: the FIRST page.pdf() of a page differs from every
   * later one by ~7k, a font-cache artefact that was mistaken for signal in this arm's first
   * draft. */
  {
    const NOISE_FACTOR = 3;      /* the effect must be at least 3x the run's own reproducibility */
    const LATTICE_MIN = 100000;  /* measured 125,001 on win32 and 123,379 on ubuntu-latest       */
    const LATTICE_RATIO = 1.35;  /* measured 1.707 on win32 and 1.732 on ubuntu-latest           */
    const OFF = '.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,.hm-k i,.hm-k i::after,'
      + '.hm-gr-t,.hm-room-n,.hm-room-bar,.hm-room-bar i,.ix-goal-bar,.ix-goal-bar span'
      + '{print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}';
    const hp = await ctx.newPage();
    await B.gotoApp(hp, HTML, { hash: '#home' });
    await hp.evaluate(LATTICE_SEED);
    await B.gotoApp(hp, HTML, { hash: '#home' });
    await B.until(hp, () => !!document.querySelector('#home .hm-alt .hm-seg.keel'), null, B.ACT_MS,
      'a gauge with keel marks on it');
    /* the splash is CONTENT while it is up -- see the note above */
    await B.until(hp, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,
      'the boot splash to be REMOVED (while it is up it is real content in the PDF)');
    await B.settle(hp);
    const shot = async (css) => {
      await hp.evaluate((c) => {
        const old = document.getElementById('_r9'); if (old) old.remove();
        if (!c) return;
        const s = document.createElement('style'); s.id = '_r9'; s.textContent = c;
        document.head.appendChild(s);
      }, css || '');
      await B.settle(hp);
      /* printBackground:false IS THE READER DEFAULT. With it true the browser prints backgrounds
       * whatever the stylesheet says, and this arm would measure nothing at all. */
      return (await hp.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: false })).length;
    };
    await shot(null);                       /* warm-up -- see the note above */
    const on1 = await shot(null);
    const off1 = await shot(OFF);
    const on2 = await shot(null);
    const off2 = await shot(OFF);
    await hp.evaluate(() => { const o = document.getElementById('_r9'); if (o) o.remove(); });
    const noise = Math.max(Math.abs(on1 - on2), Math.abs(off1 - off2));
    const delta = Math.min(on1, on2) - Math.max(off1, off2);
    const ratio = Math.min(on1, on2) / Math.max(off1, off2);
    /* `noise * 3 <= delta` IS SATISFIED BY THE NULL RESULT, and cycle 3 shipped it that way.
     * Pressed on the whole-rule-deleted mutant it printed PASS with "worst identical pair differs
     * 0 bytes against a 0-byte effect (3x noise = 0)" -- 0 <= 0 -- so a control whose job is to
     * prove the effect outruns the noise announced success when there was no effect at all. The
     * `delta > 0` conjunct is the whole fix and it costs nothing. */
    ok(delta > 0 && noise * NOISE_FACTOR <= delta,
      '[lattice] CONTROL: there IS an effect, and it is at least ' + NOISE_FACTOR + 'x the '
      + 'reproducibility of the renderer that measured it -- two IDENTICAL renders, in this run, '
      + 'on this machine',
      'exact ' + on1 + '/' + on2 + ', economy ' + off1 + '/' + off2 + ' -- worst identical pair '
      + 'differs ' + noise + ' bytes against a ' + delta + '-byte effect (' + NOISE_FACTOR + 'x '
      + 'noise = ' + (noise * NOISE_FACTOR) + ')'
      + (delta > 0 ? '' : ' -- A ZERO EFFECT SATISFIES the ratio trivially, which is why the '
        + 'control demands a nonzero delta first'));
    /* THE ASSERTION IS NARROWED TO WHAT THE BYTES CAN CARRY (cycle 4, judge item 4). This line
     * used to claim the room bars and the room counts too, and the measurement beside it could
     * not see them.
     * THE FIGURE, RE-MEASURED IN CYCLE 5 AND WITH THE MUTATION NAMED, because the two sentences
     * that quoted it described two DIFFERENT experiments and neither produced the "14 bytes" both
     * of them printed. Re-run through this arm itself -- the same seed, the same warm-up, the same
     * alternating on/off/on/off sequence that produces the number in the PASS line -- twice per
     * configuration, noise 0 each time, on a baseline that reproduces exactly at delta 125,089:
     *     the FIVE selectors listed on the next line, dropped from OFF   ->  21 bytes  (0.017%)
     *     all SIX of GRADE_SEL (those five and .hm-gr-t), dropped from OFF ->  38 bytes  (0.030%)
     * (A standalone re-implementation of this measurement reads a DIFFERENT baseline -- a fresh
     * page's consecutive `exact` renders drift ~7k, which is the font-cache artefact the warm-up
     * and the interleave exist to defeat -- so the drop has to be taken through this arm to be
     * comparable to this arm's own number.)
     * Either way the answer is the same: with `.hm-room-n,.hm-room-bar,.hm-room-bar i,
     * .ix-goal-bar,.ix-goal-bar span` gone from the override the delta moves 21 bytes of 125,089
     * against a 100,000-byte floor with 25% headroom, so two thirds of the sentence was
     * unfalsifiable by the number printed under it. The bytes are sensitive to the 138 capsule
     * fills, the keel marks and EVERY SWATCH THE KEY RENDERS -- five since cycle 9, and this arm
     * names the selector rather than the count because it never counted to one -- and that is now
     * all they claim. The six grade-bearing selectors are asserted by ARM F2 instead, on a
     * property of the document. */
    ok(delta >= LATTICE_MIN && ratio >= LATTICE_RATIO,
      '[lattice] the altitude gauge and its legend SURVIVE the reader default: forcing '
      + 'print-color-adjust:exact adds real paint to the PDF, where economy drops it and prints '
      + '"41 flagged" beside a blank strip',
      'exact - economy = ' + delta + ' bytes (floor ' + LATTICE_MIN + ') and exact/economy = '
      + ratio.toFixed(3) + ' (floor ' + LATTICE_RATIO + ', the dimensionless form, so a platform '
      + 'whose PDFs are simply bigger cannot buy a pass); a build that has lost the declarations '
      + 'comes back at economy size, which is a page with no lattice on it');
    pdfMeta.lattice = { exact: on1, economy: off1, delta, noise, ratio: Number(ratio.toFixed(3)) };

    /* ---------- ARM F2: THE GRADE-BEARING SELECTORS, ASSERTED ON THE DOCUMENT ----------
     * R9's CHECK-NOT-FIX SURVEY added six selectors -- the room count disc, both room-bar tracks
     * and their fill, the week's goal bar and its fill, and the gauge's own trough -- and put
     * them in ARM F's PASS line while the byte arm could not see them: dropping all six from the
     * OFF override moves the delta 38 bytes of 125,089, 0.030% (re-measured in cycle 5, twice,
     * noise 0 -- see the note on the byte assertion above for why the mutation has to be named).
     * A property written into a PASS line with nothing in the gate driving it is judge item 6's
     * exact defect class, committed inside the cycle that closed item 6.
     *
     * The fix is not a bigger byte budget, it is a DIFFERENT INSTRUMENT. `print-color-adjust` is
     * a computed property of the document: it is deterministic, it needs no threshold, no
     * rasteriser and no platform assumption, and under `emulateMedia({media:'print'})` it is the
     * exact value the reader's own print path resolves. .hm-room-n is the survey's worst case --
     * white text on a coloured disc, so dropping the background prints the room's count WHITE ON
     * WHITE, the figure gone rather than merely unmarked -- and it is worth 5 bytes in a PDF.
     *
     * TWO CONTROLS, because an assertion that everything computes 'exact' is exactly the shape
     * that passes when the read is broken:
     *   (1) DISCRIMINATION -- the surfaces styles.css deliberately did NOT fix (the panel, the
     *       body, a chip, a button: grounds and affordances, correct to drop on paper) must come
     *       back 'economy'. If they read 'exact' the reader is not reading anything.
     *   (2) LIVENESS -- with an economy override applied, the same six reads must FLIP. If they
     *       do not, the assertion cannot go red and is decoration. */
    const GRADE_SEL = ['.hm-room-n', '.hm-room-bar', '.hm-room-bar i', '.ix-goal-bar',
      '.ix-goal-bar span', '.hm-gr-t'];
    const NOT_FIXED = ['#home .hm-panel', '#home .hm-chip', 'body'];
    const OFF_GRADE = GRADE_SEL.join(',')
      + '{print-color-adjust:economy!important;-webkit-print-color-adjust:economy!important}';
    await hp.emulateMedia({ media: 'print' });
    await B.settle(hp);
    const readPca = (sels) => hp.evaluate((ss) => ss.map((s) => {
      const el = document.querySelector(s);
      if (!el) return [s, 'NO ELEMENT'];
      const cs = getComputedStyle(el);
      return [s, cs.printColorAdjust || cs.getPropertyValue('print-color-adjust') || '(undefined)'];
    }), sels);
    const inPrint = await hp.evaluate(() => matchMedia('print').matches);
    const onG = await readPca(GRADE_SEL);
    const ctlG = await readPca(NOT_FIXED);
    await hp.evaluate((c) => {
      const old = document.getElementById('_r9b'); if (old) old.remove();
      const s = document.createElement('style'); s.id = '_r9b'; s.textContent = c;
      document.head.appendChild(s);
    }, OFF_GRADE);
    await B.settle(hp);
    const offG = await readPca(GRADE_SEL);
    await hp.evaluate(() => { const o = document.getElementById('_r9b'); if (o) o.remove(); });
    await hp.emulateMedia({ media: null });
    const show = (rows) => rows.map((r) => r[0] + '=' + r[1]).join(', ');
    ok(inPrint, '[lattice/prop] CONTROL: the page really is under PRINT media when these '
      + 'properties are read -- a screen-media read would be measuring the wrong cascade',
      "matchMedia('print').matches = " + inPrint);
    ok(onG.every((r) => r[1] === 'exact'),
      '[lattice/prop] the room counts, both room-bar tracks and their fill, the week goal bar and '
      + 'its fill, and the gauge trough all compute print-color-adjust:exact under print media -- '
      + 'the reader default drops .hm-room-n and the count prints WHITE ON WHITE',
      show(onG));
    ok(ctlG.every((r) => r[1] === 'economy'),
      '[lattice/prop] CONTROL: the surfaces styles.css DECLARED rather than fixed -- the panel, a '
      + 'chip, the body -- come back economy, so "exact" above is a declaration and not the '
      + 'browser default or an artefact of the read',
      show(ctlG));
    ok(offG.every((r) => r[1] === 'economy'),
      '[lattice/prop] CONTROL: with the declarations overridden the same six reads FLIP to '
      + 'economy, so this assertion can go red',
      show(offG));
    pdfMeta.latticeProp = { exact: onG.filter((r) => r[1] === 'exact').length,
      of: GRADE_SEL.length, control: ctlG.map((r) => r[1]).join('/') };
    await hp.close();
  }

  /* ---------- ARM D: the Print Q&A document's design tokens ---------- */
  /* This is a SECOND print surface and it owns Ctrl/Cmd+P. It is a separate document built by
   * print-qa.js, so the app's :root never reached it and every token resolved (UNDEFINED): h1 and
   * h2 computed 14px/400, identical to body copy, across 22 probes and 11 A4 pages.
   *
   * window.print() is neutralised in the popup before it opens: the real openPrint() calls it on a
   * timer, and a headless print is not the thing under test here -- the DOCUMENT is. Nothing else
   * about the popup is stubbed; it is built and opened by the app's own button. */
  await ctx.addInitScript(() => { window.print = function () {}; });
  await showCram(page, FLAGSHIP);
  await page.evaluate(() => { const x = document.getElementById('cramx'); if (x) x.click(); });
  await B.settle(page);

  const popupPromise = ctx.waitForEvent('page', { timeout: B.ACT_MS });
  await page.evaluate(() => { document.getElementById('printqa').click(); });
  let popup = null;
  try { popup = await popupPromise; } catch (e) { /* reported below */ }

  if (!ok(!!popup, 'Print Q&A opens its document', popup ? '' : 'no popup page appeared')) {
    /* fall through -- the remaining arms cannot be measured */
  } else {
    await popup.waitForLoadState('domcontentloaded').catch(() => {});
    await popup.waitForFunction(() => !!document.querySelector('article h2'), null, { timeout: B.ACT_MS })
      .catch(() => {});
    await popup.emulateMedia({ media: 'print' });
    await popup.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const t = await popup.evaluate(() => {
      const px = (el, p) => (el ? parseFloat(getComputedStyle(el)[p]) : NaN);
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('article h2');
      const a = document.querySelector('article .a');
      const sig = document.querySelector('article .sig');
      /* a code span may not exist in every topic's answers -- plant one INSIDE a real answer so the
       * measurement is of this document's cascade, not of a detached node */
      let code = a ? a.querySelector('code') : null;
      let planted = false;
      if (!code && a) { code = document.createElement('code'); code.textContent = 'x'; a.appendChild(code); planted = true; }
      const out = {
        printMedia: window.matchMedia('print').matches,
        articles: document.querySelectorAll('article').length,
        bodyMaxWidth: getComputedStyle(document.body).maxWidth,
        bodyFont: px(document.body, 'fontSize'),
        h1Font: px(h1, 'fontSize'),
        h1Weight: getComputedStyle(h1).fontWeight,
        h2Font: px(h2, 'fontSize'),
        h2Weight: getComputedStyle(h2).fontWeight,
        aFont: px(a, 'fontSize'),
        sigFont: px(sig, 'fontSize'),
        codeFont: px(code, 'fontSize'),
        articleMarginBottom: px(document.querySelector('article'), 'marginBottom'),
        title: document.title,
      };
      if (planted && code) code.remove();
      return out;
    });

    ok(t.printMedia === true, 'Print Q&A: print media emulation is ACTIVE', 'matchMedia(print)=' + t.printMedia);
    ok(t.articles > 0, 'Print Q&A: the probe bank rendered', 'articles=' + t.articles);
    /* The defect, stated as the assertion: a heading must not be the same size as body copy. */
    ok(t.h1Font > t.h2Font, 'Print Q&A: h1 is larger than h2', 'h1=' + t.h1Font + 'px h2=' + t.h2Font + 'px');
    ok(t.h2Font > t.aFont, 'Print Q&A: h2 is larger than the answer body', 'h2=' + t.h2Font + 'px answer=' + t.aFont + 'px');
    ok(new Set([t.h1Font, t.h2Font, t.aFont, t.sigFont]).size === 4,
      'Print Q&A: title / question / answer / signal are four DISTINCT sizes',
      'h1=' + t.h1Font + ' h2=' + t.h2Font + ' a=' + t.aFont + ' sig=' + t.sigFont);
    ok(Number(t.h1Weight) >= 700, 'Print Q&A: the title is actually bold', 'font-weight=' + t.h1Weight);
    ok(t.codeFont > 0 && t.codeFont !== t.aFont, 'Print Q&A: inline code is distinguishable from prose',
      'code=' + t.codeFont + 'px answer=' + t.aFont + 'px');
    ok(t.bodyMaxWidth !== 'none', 'Print Q&A: the page has a measure (body max-width resolves)',
      'max-width=' + t.bodyMaxWidth);
    ok(t.articleMarginBottom > 0, 'Print Q&A: Q&A blocks are separated', 'article margin-bottom=' + t.articleMarginBottom + 'px');

    if (PDF_DIR) {
      const qa = await popup.pdf({ format: 'A4', preferCSSPageSize: true, printBackground: true });
      fs.writeFileSync(path.join(PDF_DIR, LABEL + '-print-qa.pdf'), qa);
      pdfMeta['print-qa'] = { pages: pdfPageCount(qa), bytes: qa.length };
    }
    await popup.close().catch(() => {});
  }

  ok(consoleErrs.length === 0, 'no page errors during the print run', consoleErrs.slice(0, 3).join(' | '));

  console.log(notes.join('\n'));
  console.log('  ----  pdf summary: ' + JSON.stringify(pdfMeta));
  await browser.close();

  if (fails.length) return B.finish(1, 'print_truth: ' + fails.length + ' FAILED -- ' + fails[0]);
  return B.finish(0, null);
})().catch(async (e) => {
  console.log('print_truth: threw -- ' + (e && e.stack ? e.stack : e));
  return B.finish(1, 'print_truth: threw -- ' + (e && e.message ? e.message : e));
});
}
