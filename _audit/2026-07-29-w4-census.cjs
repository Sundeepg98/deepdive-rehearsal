#!/usr/bin/env node
/*
 * W4 CENSUS -- the one instrument behind every number in _audit/2026-07-29-w4-longform.md.
 *
 * Run it against the COMMITTED PRE-FIX deliverable and against the built tree, and diff the two
 * JSON blobs. Same boot path, same viewport, same routes, both sides -- so a delta is a delta in
 * the app, not in how it was measured. (The W3 census set this pattern; this is its W4 twin.)
 *
 *   node _audit/2026-07-29-w4-census.cjs <html> [--out FILE]
 *
 * WHAT IT MEASURES, and why each number is here.
 *
 *   A1  CRAM GEOMETRY, all 46 topics, desktop 1280x800. The sheet's own scrollHeight, the
 *       screens-of-scrolling it costs, the tallest single spine line, and the median answer
 *       length. P2-5's table is four topics; the ceiling this wave adds is anchored on all 46,
 *       so the corpus is what gets measured.
 *   A2  THE PROMPT->RECALL CONTRACT. computed display + font-weight of .cs-cue, and whether an
 *       inline .cs-arr sits between cue and answer. P2-5's structural half: you cannot cover an
 *       inline continuation to self-test, so `display` is the finding, not a detail of it.
 *   A3  .dec-tell LINE COUNTS per topic (P3-4). Lines are measured with Range rects -- the same
 *       way a reader counts them -- not divided out of a height, which rounds a 7-line block to
 *       6 the moment line-height changes.
 *   B1  .tn-current clientWidth vs scrollWidth at five desktop widths (P2-4).
 *   B2  Pane tabs above the fold at 1280x800 + the sidebar's scrollHeight (P2-6).
 *
 * DISCIPLINE. Isolated context per viewport; innerWidth asserted on every measurement (a
 * viewport that silently did not apply turns a red into a green); ASCII only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const B = require(path.join(__dirname, '..', 'test', '_boot.cjs'));

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : null;
/* `--out FILE` -- FILE does not start with `--`, so a naive "first non-flag arg" scan picks the
   OUTPUT path up as the INPUT html and the run dies (or, worse, measures the wrong file). */
const HTML = args.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1)[0]
  || path.join(__dirname, '..', 'deepdive_content_pipeline_rehearsal.html');

const DESKTOP_WIDTHS = [1024, 1280, 1440, 1600, 1920];

/* ---------------------------------------------------------------- A: content weight ------- */

/* Mount the real cram overlay once, then switch topics underneath it -- the live re-render path
   (cram_scope_distinct.cjs proved a fixed sleep races the view transition, so switching waits on
   the `deeptopicchange` event, never a stopwatch). */
const MEASURE_CRAM = async () => {
  const out = { assertWidth: window.innerWidth, assertHeight: window.innerHeight, topics: {} };
  if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };

  const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ix = document.querySelector('.ix-x'); if (ix) ix.click();
  await sleep(200);

  const switchTo = async (id) => {
    const cur = TopicRegistry.current();
    if (cur && cur.id === id) return;
    await new Promise((res) => {
      let done = false;
      const on = () => { if (done) return; done = true; window.removeEventListener('deeptopicchange', on); res(); };
      window.addEventListener('deeptopicchange', on);
      if (!TopicRegistry.setTopic(id)) { on(); return; }
      setTimeout(on, 3000);
    });
    await raf2();
  };

  const host = document.querySelector('deep-cram');
  const body = document.querySelector('.cram-body');
  if (!host || !body) return { fatal: 'deep-cram / .cram-body not in the DOM' };
  document.getElementById('cramopen').click();
  await sleep(250);                                   /* lazy IntersectionObserver render */
  await raf2();

  /* Count the visual lines of one element the way a reader does: client rects of a Range over its
     text, CLUSTERED INTO LINE BOXES. Height/line-height division gets this wrong the moment
     line-height changes, which is exactly what W4 changed.

     W23 CORRECTION (ledger L2 "Residuals"). This counted DISTINCT ROUNDED RECT TOPS, and that
     over-counts any element holding an inline <code>: the code span carries its own font-size
     (11px) and line-height (17.05px) inside 14px/21.7px prose, plus 1px 5px of padding, so its
     fragments land at tops that are neither the line tops nor a line-height apart -- and each one
     scored as another "line". Measured over all 324 .dec-tell in 46 topics on the deliverable
     committed at 96deb28: the old counter disagreed with the block's own height on 28 tells, and
     those 28 are EXACTLY the 28 tells containing an inline <code>. No disagreement anywhere else,
     and not one code-bearing tell agreed -- a clean double implication, not a correlation.

     This is the counter that reported cdc's third tell as 9 lines and put a ragged-break defect
     into the W4 freeze that the rendering does not contain: that block is 108px of 21.7px line
     boxes, which is FIVE -- the same as four of its six siblings. Rects are now grouped by the
     element's own line-height, so an inline box of any size counts as part of the line it sits
     on. Corpus totals move 1532 -> 1435 for the same 324 tells. */
  const lineCount = (el) => {
    if (!el) return 0;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = Array.from(r.getClientRects()).filter((q) => q.width > 0.5 && q.height > 0.5);
    if (!rects.length) return 0;
    /* Half a line box is the widest gap that can still be the SAME line: a smaller inline box is
       offset from its line's top by at most its own leading. A `normal` line-height falls back to
       a 4px quantum rather than silently collapsing the element to one line. */
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const quantum = lh > 0 ? lh / 2 : 4;
    const tops = rects.map((q) => q.top).sort((a, b) => a - b);
    let lines = 1, anchor = tops[0];
    for (let i = 1; i < tops.length; i++) {
      if (tops[i] - anchor > quantum) { lines++; anchor = tops[i]; }
    }
    return lines;
  };

  for (const id of TopicRegistry.ids()) {
    await switchTo(id);
    const sr = host.shadowRoot;
    if (!sr) { out.topics[id] = { err: 'no shadowRoot' }; continue; }

    const lis = Array.from(sr.querySelectorAll('.cs-spine li'));
    const cues = Array.from(sr.querySelectorAll('.cs-cue'));
    const arrs = Array.from(sr.querySelectorAll('.cs-spine li > .cs-arr'));
    const cue0 = cues[0] || null;
    const cs = cue0 ? getComputedStyle(cue0) : null;

    /* the answer text = the composed line minus its cue (the unit P2-5's "median answer" is) */
    const ansLens = lis.map((li) => {
      const whole = (li.textContent || '').replace(/\s+/g, ' ').trim();
      const c = li.querySelector('.cs-cue');
      const cueTx = c ? (c.textContent || '').replace(/\s+/g, ' ').trim() : '';
      let rest = whole;
      if (cueTx && whole.indexOf(cueTx) === 0) rest = whole.slice(cueTx.length);
      return rest.replace(/^[\s→>-]+/, '').trim().length;
    }).filter((n) => n > 0).sort((a, b) => a - b);
    const median = ansLens.length ? (ansLens.length % 2
      ? ansLens[(ansLens.length - 1) / 2]
      : Math.round((ansLens[ansLens.length / 2 - 1] + ansLens[ansLens.length / 2]) / 2)) : 0;

    const sheetH = sr.host.scrollHeight || 0;
    const bodyClient = body.clientHeight || 1;

    out.topics[id] = {
      sheetH,
      bodyClient,
      screens: Math.round((sheetH / bodyClient) * 100) / 100,
      steps: lis.length,
      tallestStepPx: lis.length ? Math.round(Math.max.apply(null, lis.map((li) => li.getBoundingClientRect().height))) : 0,
      tallestStepLines: lis.length ? Math.max.apply(null, lis.map(lineCount)) : 0,
      medianAnswerChars: median,
      maxAnswerChars: ansLens.length ? ansLens[ansLens.length - 1] : 0,
      cueDisplay: cs ? cs.display : null,
      cueWeight: cs ? cs.fontWeight : null,
      cueColor: cs ? cs.color : null,
      inlineArrows: arrs.length,
      cueCount: cues.length,
    };
  }
  document.getElementById('cramx').click();
  await sleep(80);
  return out;
};

/* .dec-tell lives in the Trade-offs pane (light DOM, TRADE_STYLE). Mount the pane per topic and
   count the rendered lines of every tell. */
const MEASURE_TELL = async () => {
  const out = { assertWidth: window.innerWidth, topics: {} };
  if (typeof TopicRegistry === 'undefined') return { fatal: 'TopicRegistry undefined' };
  const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ix = document.querySelector('.ix-x'); if (ix) ix.click();
  await sleep(150);

  /* Same counter, same correction as MEASURE_CRAM's -- the two run in separate page.evaluate
     calls, so they cannot share a closure. See the note there for the 28-of-324 measurement. */
  const lineCount = (el) => {
    if (!el) return 0;
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = Array.from(r.getClientRects()).filter((q) => q.width > 0.5 && q.height > 0.5);
    if (!rects.length) return 0;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    const quantum = lh > 0 ? lh / 2 : 4;
    const tops = rects.map((q) => q.top).sort((a, b) => a - b);
    let lines = 1, anchor = tops[0];
    for (let i = 1; i < tops.length; i++) {
      if (tops[i] - anchor > quantum) { lines++; anchor = tops[i]; }
    }
    return lines;
  };

  /* THE SECOND OPINION, and the one that caught the defect above. A .dec-tell's height is nothing
     but its line boxes stacked, so (clientHeight - padding) / line-height IS the line count --
     arrived at through the box model rather than through Range rects, sharing no mechanism with
     the counter it checks. The runner FAILS the census if the two ever disagree, because a line
     counter that silently miscounts is how a rendering defect gets recorded that does not exist. */
  const boxLines = (el) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight);
    if (!(lh > 0)) return null;
    const inner = el.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    return Math.round(inner / lh);
  };

  const switchTo = async (id) => {
    const cur = TopicRegistry.current();
    if (cur && cur.id === id) return;
    await new Promise((res) => {
      let done = false;
      const on = () => { if (done) return; done = true; window.removeEventListener('deeptopicchange', on); res(); };
      window.addEventListener('deeptopicchange', on);
      if (!TopicRegistry.setTopic(id)) { on(); return; }
      setTimeout(on, 3000);
    });
    await raf2();
  };

  if (typeof switchTab === 'function') switchTab('trade');
  await sleep(200); await raf2();

  for (const id of TopicRegistry.ids()) {
    await switchTo(id);
    if (typeof switchTab === 'function') switchTab('trade');
    await sleep(60); await raf2();
    /* .dec-tell lives inside <deep-trade-offs>'s SHADOW root (TRADE_STYLE is adopted there), so
       a document-level querySelectorAll returns zero and the whole class reads as "already
       fixed". Walk into every shadow root. */
    /* Contrast of the tell ink against what is actually painted behind it. The weight change
       cannot move a contrast ratio, but the CLAIM "AA is unaffected" must be measured rather
       than reasoned -- and the large-text threshold (18.66px bold / 24px) is weight-dependent,
       so the size is recorded beside it. */
    const srgb = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (rgb) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
    const parse = (s) => { const m = String(s).match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : null; };
    const bgOf = (el) => {
      let n = el;
      while (n) {
        const b = getComputedStyle(n).backgroundColor;
        const p = parse(b);
        if (p && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(b) && !/transparent/.test(b)) {
          const a = String(b).match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/);
          if (!a || Number(a[1]) > 0.5) return p;
        }
        n = n.parentElement || (n.getRootNode() && n.getRootNode().host) || null;
      }
      return [255, 255, 255];
    };
    const ratio = (fg, bg) => { const a = lum(fg), b = lum(bg); const hi = Math.max(a, b), lo = Math.min(a, b); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };

    const tells = (() => {
      const acc = [];
      const roots = [document];
      for (let i = 0; i < roots.length; i++) {
        roots[i].querySelectorAll('*').forEach((el) => {
          if (el.shadowRoot && roots.indexOf(el.shadowRoot) === -1) roots.push(el.shadowRoot);
        });
        roots[i].querySelectorAll('.dec-tell').forEach((el) => acc.push(el));
      }
      return acc;
    })();
    const t0 = tells[0] ? getComputedStyle(tells[0]) : null;
    const bSpans = tells.reduce((n, t) => n + t.querySelectorAll('b').length, 0);
    out.topics[id] = {
      count: tells.length,
      lines: tells.map(lineCount),
      linesByBox: tells.map(boxLines),
      heights: tells.map((t) => Math.round(t.getBoundingClientRect().height)),
      chars: tells.map((t) => (t.textContent || '').replace(/\s+/g, ' ').trim().length),
      weight: t0 ? t0.fontWeight : null,
      color: t0 ? t0.color : null,
      fontSize: t0 ? t0.fontSize : null,
      lineHeight: t0 ? t0.lineHeight : null,
      bSpans,
      contrast: (tells[0] && t0) ? ratio(parse(t0.color), bgOf(tells[0])) : null,
      bWeight: (() => { const b = tells[0] && tells[0].querySelector('b'); return b ? getComputedStyle(b).fontWeight : null; })(),
      bContrast: (() => {
        const b = tells[0] && tells[0].querySelector('b');
        return b ? ratio(parse(getComputedStyle(b).color), bgOf(b)) : null;
      })(),
    };
  }
  return out;
};

/* ---------------------------------------------------------------- B: sidebar geometry ------ */

const MEASURE_SWITCHER = () => {
  const el = document.getElementById('tncurrent');
  const trig = document.getElementById('tntrigger');
  const eb = document.querySelector('.tn-eyebrow');
  const nav = document.getElementById('topicnav');
  if (!el) return { assertWidth: window.innerWidth, err: '#tncurrent not in the DOM' };
  const r = el.getBoundingClientRect();
  const tr = trig ? trig.getBoundingClientRect() : null;
  return {
    assertWidth: window.innerWidth,
    navHidden: nav ? nav.hasAttribute('hidden') : null,
    text: (el.textContent || '').trim(),
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
    ratio: el.scrollWidth ? Math.round((el.clientWidth / el.scrollWidth) * 1000) / 1000 : null,
    boxW: Math.round(r.width * 10) / 10,
    boxH: Math.round(r.height * 10) / 10,
    triggerW: tr ? Math.round(tr.width * 10) / 10 : null,
    triggerH: tr ? Math.round(tr.height * 10) / 10 : null,
    eyebrowFlexBasis: eb ? getComputedStyle(eb).flexBasis : null,
    triggerWrap: trig ? getComputedStyle(trig).flexWrap : null,
  };
};

const MEASURE_FOLD = () => {
  const side = document.querySelector('.sidebar');
  if (!side) return { assertWidth: window.innerWidth, err: 'no .sidebar' };
  const fold = window.innerHeight;
  const tabs = Array.from(document.querySelectorAll('.sidebar .seg button'))
    .filter((b) => !b.hasAttribute('hidden'))
    .map((b) => {
      const r = b.getBoundingClientRect();
      return {
        tab: b.getAttribute('data-tab'),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        fullyAbove: r.bottom <= fold,
        anyAbove: r.top < fold,
      };
    });
  const named = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { top: Math.round(r.top), h: Math.round(r.height) };
  };
  /* DOM order of the sidebar's direct children -- the reorder is a DOM move, not flex `order`
     (styles.css:628 forbids `order` in this column: it desyncs paint from tab order). */
  const domOrder = Array.from(side.children).map((c) => c.id || (String(c.className || '').trim().split(/\s+/)[0]) || c.tagName.toLowerCase());
  /* Tab order = the DOM order of focusables, which is what a keyboard actually walks. */
  const focusables = Array.from(side.querySelectorAll('button:not([hidden]),a[href],input,select,textarea'))
    .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
  const firstSegIdx = focusables.findIndex((e) => e.closest('.seg'));
  return {
    assertWidth: window.innerWidth,
    assertHeight: window.innerHeight,
    sidebarScrollH: side.scrollHeight,
    sidebarClientH: side.clientHeight,
    tabsTotal: tabs.length,
    tabsFullyAbove: tabs.filter((t) => t.fullyAbove).length,
    tabsAnyAbove: tabs.filter((t) => t.anyAbove).length,
    firstTabTop: tabs.length ? tabs[0].top : null,
    tabs,
    textzoom: named('#textzoom'),
    pomodoro: named('#pomodoro'),
    mockcta: named('.mockcta'),
    seg: named('.sidebar .seg'),
    mockbar: named('.mockbar'),
    domOrder,
    focusableCount: focusables.length,
    firstSegTabStop: firstSegIdx >= 0 ? firstSegIdx + 1 : null,
  };
};

/* ---------------------------------------------------------------- runner ------------------- */

async function withCtx(browser, w, h, fn, opts) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1,
    reducedMotion: 'reduce', forcedColors: 'none', locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await B.gotoApp(page, HTML, (opts || {}));
  await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS, 'boot splash');
  const r = await page.evaluate(fn);
  await ctx.close();
  if (errs.length) r.pageErrors = errs;
  /* A viewport that silently did not apply turns a red into a green. Assert it, every time. */
  if (r && r.assertWidth !== undefined && r.assertWidth !== w) {
    throw new Error('viewport did not apply: asked ' + w + ', page reports ' + r.assertWidth);
  }
  return r;
}

(async () => {
  if (!fs.existsSync(HTML)) { console.log('W4 CENSUS: deliverable not found: ' + HTML); process.exit(1); }
  const browser = await chromium.launch(B.launchOpts());
  const rep = { html: path.resolve(HTML), bytes: fs.statSync(HTML).size, when: new Date().toISOString() };
  try {
    rep.cram = await withCtx(browser, 1280, 800, MEASURE_CRAM, { hash: '#event-driven/walk' });
    rep.tell = await withCtx(browser, 1280, 800, MEASURE_TELL, { hash: '#event-driven/trade' });
    /* CROSS-CHECK, every run. Two independent line counts over the same 324 blocks must agree;
       if they do not, this instrument cannot be trusted to report a line count at all and it says
       so rather than printing a number someone will quote in a freeze report. (W23: the old rect-
       top counter failed exactly here, on the 28 tells that contain an inline <code>.) */
    const disagree = [];
    Object.keys(rep.tell.topics || {}).forEach((id) => {
      const t = rep.tell.topics[id];
      (t.lines || []).forEach((n, i) => {
        const b = (t.linesByBox || [])[i];
        if (b !== null && b !== undefined && b !== n) disagree.push(id + ' #' + i + ': rects=' + n + ' box=' + b);
      });
    });
    rep.tellLineCrossCheck = { disagreements: disagree.length, detail: disagree.slice(0, 20) };
    if (disagree.length) {
      /* Thrown, not exited: the `finally` below owns the browser, and process.exit would skip it
         and leave a Chromium behind on the very run that already went wrong. */
      throw new Error('the two line counters disagree on ' + disagree.length + ' of '
        + Object.keys(rep.tell.topics).reduce((n, k) => n + rep.tell.topics[k].lines.length, 0)
        + ' tells, so no line number here can be trusted -- ' + disagree.slice(0, 6).join('; '));
    }
    rep.switcher = {};
    for (const w of DESKTOP_WIDTHS) {
      rep.switcher[w] = await withCtx(browser, w, 900, MEASURE_SWITCHER, { hash: '#event-driven/walk' });
    }
    /* 360/500/600/919 prove the ~<=600px wrap rule's fate: W2's @media(max-width:919px) block
       clips .tn-current to 1px (a chevron-only control), and it is LATER and more specific
       ((0,2,0) vs (0,1,0)), so the older wrap never applies at any width it was written for. */
    for (const w of [360, 500, 600, 919]) {
      rep.switcher[String(w)] = await withCtx(browser, w, 800, MEASURE_SWITCHER, { hash: '#event-driven/walk' });
    }
    rep.fold = await withCtx(browser, 1280, 800, MEASURE_FOLD, { hash: '#event-driven/walk' });
  } finally {
    await browser.close();
  }

  const text = JSON.stringify(rep, null, 2);
  if (OUT) { fs.writeFileSync(OUT, text + '\n', 'ascii'); console.log('W4 CENSUS -> ' + OUT); }

  /* human summary */
  const t = rep.cram.topics || {};
  const ids = Object.keys(t);
  const screens = ids.map((k) => t[k].screens).filter((n) => typeof n === 'number').sort((a, b) => a - b);
  const heights = ids.map((k) => t[k].sheetH).filter((n) => typeof n === 'number').sort((a, b) => a - b);
  const pct = (arr, p) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0);
  console.log('');
  console.log('  CRAM (1280x800, ' + ids.length + ' topics)');
  console.log('    sheet scrollHeight  min ' + heights[0] + '  p50 ' + pct(heights, 0.5) + '  p90 ' + pct(heights, 0.9) + '  max ' + heights[heights.length - 1]);
  console.log('    screens             min ' + screens[0] + '  p50 ' + pct(screens, 0.5) + '  p90 ' + pct(screens, 0.9) + '  max ' + screens[screens.length - 1]);
  ['content-pipeline', 'observability', 'consistent-hashing', 'sharding-strategies'].forEach((k) => {
    if (t[k]) console.log('    ' + k.padEnd(22) + ' h=' + String(t[k].sheetH).padStart(5) + '  screens=' + String(t[k].screens).padStart(5)
      + '  tallest=' + String(t[k].tallestStepPx).padStart(4) + 'px/' + t[k].tallestStepLines + 'ln  medAns=' + t[k].medianAnswerChars + 'ch');
  });
  const c0 = t['content-pipeline'] || {};
  console.log('    .cs-cue  display=' + c0.cueDisplay + '  weight=' + c0.cueWeight + '  inline .cs-arr per sheet=' + c0.inlineArrows);

  const tt = rep.tell.topics || {};
  const allLines = [];
  Object.keys(tt).forEach((k) => (tt[k].lines || []).forEach((n) => allLines.push(n)));
  allLines.sort((a, b) => a - b);
  console.log('');
  console.log('  DEC-TELL (' + Object.keys(tt).length + ' topics, ' + allLines.length + ' tells)');
  console.log('    lines  min ' + allLines[0] + '  p50 ' + pct(allLines, 0.5) + '  p90 ' + pct(allLines, 0.9) + '  max ' + allLines[allLines.length - 1]);
  console.log('    cross-check (rect clusters vs box height): '
    + rep.tellLineCrossCheck.disagreements + ' disagreement(s) -- must be 0 or the run aborts');
  ['content-pipeline', 'multi-region', 'cdc'].forEach((k) => {
    if (tt[k]) console.log('    ' + k.padEnd(22) + ' [' + tt[k].lines.join(',') + ']  weight=' + tt[k].weight
      + '/' + tt[k].bWeight + '  b=' + tt[k].bSpans + '  size=' + tt[k].fontSize
      + '  contrast=' + tt[k].contrast + ' (b ' + tt[k].bContrast + ')');
  });

  console.log('');
  console.log('  SWITCHER  .tn-current clientWidth/scrollWidth');
  Object.keys(rep.switcher).forEach((w) => {
    const s = rep.switcher[w];
    console.log('    ' + String(w).padStart(5) + 'px  ' + String(s.clientWidth).padStart(4) + ' / ' + String(s.scrollWidth).padStart(4)
      + '  ratio=' + s.ratio + '  boxH=' + s.boxH + '  wrap=' + s.triggerWrap);
  });

  const f = rep.fold;
  console.log('');
  console.log('  FOLD (1280x800)   sidebar scrollH=' + f.sidebarScrollH + '  tabs fully above fold: '
    + f.tabsFullyAbove + '/' + f.tabsTotal + '  (any part above: ' + f.tabsAnyAbove + ')');
  console.log('    first tab top=' + f.firstTabTop + '  seg top=' + (f.seg && f.seg.top)
    + '  textzoom top=' + (f.textzoom && f.textzoom.top) + '  pomodoro top=' + (f.pomodoro && f.pomodoro.top));
  console.log('    sidebar DOM order: ' + f.domOrder.join(' > '));
  console.log('    first .seg tab stop: ' + f.firstSegTabStop + ' of ' + f.focusableCount);
  console.log('');
})().catch((e) => { console.log('W4 CENSUS: FAIL -- ' + (e && e.message ? e.message : String(e))); process.exit(1); });
