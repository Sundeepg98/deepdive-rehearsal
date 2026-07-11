import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/visual-mobile';
fs.mkdirSync(SHOTS, { recursive: true });
const out = [];
const L = (...a) => { const s = a.map(x => typeof x === 'object' ? JSON.stringify(x) : x).join(' '); console.log(s); out.push(s); };

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const b = await chromium.launch();

/* =============== 1. CHROME BUDGET at 390 and 360 =============== */
for (const W of [390, 360]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);

  const budget = await p.evaluate(() => {
    const r = s => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect();
      return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1) }; };
    const vh = innerHeight;
    const seg = r('.sidebar .seg'), cta = r('.sidebar .mockcta'), side = r('.side-id'), sh = r('.stage-head'), mc = r('.mcomp');
    // first real content element inside the active pane (after stage-head/mcomp)
    const pane = document.querySelector('.pane.on');
    const firstCard = pane ? pane.firstElementChild : null;
    const fc = firstCard ? firstCard.getBoundingClientRect() : null;
    const contentTop = fc ? +fc.top.toFixed(1) : null;
    const contentBottom = cta ? cta.top : vh;
    return {
      vh, segH: seg && seg.h, ctaH: cta && cta.h, sideIdH: side && side.h, stageHeadH: sh && sh.h, mcompH: mc && mc.h,
      firstContentTop: contentTop,
      firstContentTag: firstCard ? firstCard.tagName.toLowerCase() + '.' + (firstCard.className || '').split(' ')[0] : null,
      visibleContentPx: contentTop != null ? +(contentBottom - contentTop).toFixed(1) : null,
      chromePct: contentTop != null ? +(100 - ((contentBottom - contentTop) / vh * 100)).toFixed(1) : null,
      segScrollW: (() => { const s = document.querySelector('.sidebar .seg'); return s ? s.scrollWidth : null; })(),
      segClientW: (() => { const s = document.querySelector('.sidebar .seg'); return s ? s.clientWidth : null; })(),
      docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth
    };
  });
  L(`\n### CHROME BUDGET @ ${W}x844 (first paint, #walk)`);
  L(JSON.stringify(budget, null, 2));

  // horizontal-overflow probe
  const ovf = await p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.stage *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > innerWidth + 1 || r.left < -1)) {
        bad.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''),
          left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), text: (el.textContent || '').trim().slice(0, 30) });
      }
    });
    return bad.slice(0, 12);
  });
  L(`OVERFLOW past viewport (${W}px): ` + JSON.stringify(ovf));
  await p.screenshot({ path: `${SHOTS}/chrome-budget-${W}.png` });
  await ctx.close();
}

/* =============== 2. TOUCH TARGET AUDIT across all panes =============== */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(400);

  L('\n### TOUCH TARGETS < 44px (WCAG 2.2 AA "Target Size (Minimum)" = 24px; Apple HIG/Material = 44/48)');
  const seen = new Set();
  const small = [];
  for (const id of PANES) {
    await p.evaluate(v => { location.hash = '#' + v; }, id);
    await p.waitForTimeout(500);
    const res = await p.evaluate(v => {
      const bad = [];
      const roots = [document.querySelector('.pane.on'), document.querySelector('.sidebar')].filter(Boolean);
      roots.forEach(root => {
        root.querySelectorAll('button, a[href], input, select, [role="button"], summary').forEach(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          if (r.height < 44 || r.width < 44) {
            bad.push({ view: v, cls: (typeof el.className === 'string' ? el.className : '').split(' ').filter(Boolean).slice(0, 2).join('.') || el.id || el.tagName,
              w: +r.width.toFixed(1), h: +r.height.toFixed(1), text: (el.textContent || el.value || '').trim().slice(0, 26) });
          }
        });
      });
      return bad;
    }, id);
    res.forEach(x => { const k = x.view + '|' + x.cls + '|' + x.text; if (!seen.has(k)) { seen.add(k); small.push(x); } });
  }
  // group by class
  const byCls = {};
  small.forEach(x => { byCls[x.cls] = byCls[x.cls] || { cls: x.cls, count: 0, minH: 999, minW: 999, sample: x.text, views: new Set() };
    const g = byCls[x.cls]; g.count++; g.minH = Math.min(g.minH, x.h); g.minW = Math.min(g.minW, x.w); g.views.add(x.view); });
  const rows = Object.values(byCls).sort((a, b) => a.minH - b.minH)
    .map(g => ({ cls: g.cls, n: g.count, minH: g.minH, minW: g.minW, views: [...g.views].join(','), sample: g.sample }));
  L(`Total undersized interactive elements found: ${small.length}`);
  rows.forEach(r => L(`  ${String(r.minH).padStart(6)}h x ${String(r.minW).padStart(6)}w  n=${String(r.n).padStart(3)}  .${r.cls}  [${r.views}]  "${r.sample}"`));

  /* =============== 3. TYPOGRAPHY / READING =============== */
  L('\n### TYPOGRAPHY (body copy on mobile)');
  const typo = await p.evaluate(() => {
    const samples = [];
    const push = (label, el) => { if (!el) return; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const fs = parseFloat(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
      // rough chars-per-line: width / (0.5 * fontsize)
      samples.push({ label, fontSize: +fs.toFixed(1), lineHeight: +lh.toFixed(1), ratio: +(lh / fs).toFixed(2),
        widthPx: +r.width.toFixed(0), cpl: +(r.width / (fs * 0.5)).toFixed(0), color: cs.color, family: cs.fontFamily.split(',')[0] });
    };
    location.hash = '#walk';
    return new Promise(res => setTimeout(() => {
      push('walk step body (.wk-note/p)', document.querySelector('#walk p, #walk .wk-note, #walk .note'));
      push('stage-head .sh-name', document.querySelector('.stage-head .sh-name'));
      push('stage-head .sh-kick', document.querySelector('.stage-head .sh-kick'));
      push('side-id h1', document.querySelector('.side-id h1'));
      push('.locator', document.querySelector('.locator'));
      push('seg button label', document.querySelector('.sidebar .seg button span'));
      push('.mockbtn', document.querySelector('.mockbtn'));
      push('.inttog-lbl', document.querySelector('.inttog-lbl'));
      push('.crambtn .mb-t', document.querySelector('.crambtn .mb-t'));
      push('.crambtn .mb-d', document.querySelector('.crambtn .mb-d'));
      push('.mcomp-cue', document.querySelector('.mcomp-cue'));
      push('body', document.body);
      res(samples);
    }, 400));
  });
  typo.forEach(t => L(`  ${t.label.padEnd(28)} fs=${String(t.fontSize).padStart(5)}px lh=${String(t.lineHeight).padStart(5)}px (${t.ratio}x) w=${String(t.widthPx).padStart(4)}px ~${t.cpl}cpl  ${t.color}  ${t.family}`));

  // measure model-answer long-form body specifically
  await p.evaluate(() => { location.hash = '#model'; });
  await p.waitForTimeout(700);
  const modelTypo = await p.evaluate(() => {
    const els = [...document.querySelectorAll('#model p, #model li, #model .ma-body, #model .ma-say')].slice(0, 4);
    return els.map(el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const fs = parseFloat(cs.fontSize);
      const lh = cs.lineHeight === 'normal' ? fs * 1.2 : parseFloat(cs.lineHeight);
      return { cls: (typeof el.className === 'string' ? el.className : '').slice(0, 24), fs: +fs.toFixed(1), lh: +lh.toFixed(1), ratio: +(lh / fs).toFixed(2),
        w: +r.width.toFixed(0), cpl: +(r.width / (fs * 0.5)).toFixed(0), txt: el.textContent.trim().slice(0, 40) }; });
  });
  L('\n### MODEL-ANSWER long-form reading metrics');
  modelTypo.forEach(t => L(`  .${t.cls.padEnd(22)} fs=${t.fs} lh=${t.lh} (${t.ratio}x) w=${t.w}px ~${t.cpl}cpl  "${t.txt}"`));

  /* =============== 4. SCROLL-TOP FAB COLLISION =============== */
  L('\n### SCROLL-TOP FAB vs BOTTOM BAR');
  await p.evaluate(() => { location.hash = '#walk'; });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(1000);
  const fab = await p.evaluate(() => {
    const st = document.querySelector('.scrolltop'), cta = document.querySelector('.sidebar .mockcta'), it = document.querySelector('.inttog');
    if (!st) return null;
    const a = st.getBoundingClientRect(), c = cta.getBoundingClientRect(), i = it.getBoundingClientRect();
    const overlapCta = !(a.right < c.left || a.left > c.right || a.bottom < c.top || a.top > c.bottom);
    const overlapInttog = !(a.right < i.left || a.left > i.right || a.bottom < i.top || a.top > i.bottom);
    return { shown: st.classList.contains('show'), fab: { x: +a.x.toFixed(1), y: +a.y.toFixed(1), w: +a.width.toFixed(1), h: +a.height.toFixed(1) },
      cta: { y: +c.y.toFixed(1), h: +c.height.toFixed(1) }, inttog: { x: +i.x.toFixed(1), y: +i.y.toFixed(1), w: +i.width.toFixed(1), h: +i.height.toFixed(1) },
      overlapsBottomBar: overlapCta, overlapsInterviewerToggle: overlapInttog,
      fabZ: getComputedStyle(st).zIndex, ctaZ: getComputedStyle(cta).zIndex,
      elementAtFabCenter: (() => { const el = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2); return el ? el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') : null; })()
    };
  });
  L(JSON.stringify(fab, null, 2));
  await p.screenshot({ path: `${SHOTS}/scrolltop-collision-390.png` });

  /* =============== 5. ACTIVE TAB SCROLL-INTO-VIEW =============== */
  L('\n### ACTIVE TAB VISIBILITY in the top strip');
  for (const id of ['walk', 'sys', 'rf', 'open']) {
    await p.evaluate(v => { location.hash = '#' + v; }, id);
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const seg = document.querySelector('.sidebar .seg'); const on = seg.querySelector('button.on');
      const sr = seg.getBoundingClientRect(), br = on.getBoundingClientRect();
      const fullyVisible = br.left >= sr.left - 0.5 && br.right <= sr.right + 0.5;
      const clippedPx = Math.max(0, br.right - sr.right) + Math.max(0, sr.left - br.left);
      return { tab: on.textContent.trim().slice(0, 20), segScrollLeft: seg.scrollLeft, btnLeft: +br.left.toFixed(1), btnRight: +br.right.toFixed(1),
        stripRight: +sr.right.toFixed(1), fullyVisible, clippedPx: +clippedPx.toFixed(1) };
    });
    L(`  hash #${id.padEnd(6)} -> ${JSON.stringify(r)}`);
  }
  // now via CLICK
  await p.evaluate(() => { location.hash = '#walk'; document.querySelector('.sidebar .seg').scrollLeft = 0; });
  await p.waitForTimeout(400);
  const clickRes = await p.evaluate(() => {
    const btns = [...document.querySelectorAll('.sidebar .seg button')];
    const rf = btns.find(b => b.getAttribute('data-tab') === 'rf');
    rf.click();
    return new Promise(res => setTimeout(() => {
      const seg = document.querySelector('.sidebar .seg'); const on = seg.querySelector('button.on');
      const sr = seg.getBoundingClientRect(), br = on.getBoundingClientRect();
      res({ via: 'click', tab: on.textContent.trim().slice(0, 20), segScrollLeft: seg.scrollLeft,
        fullyVisible: br.left >= sr.left - 0.5 && br.right <= sr.right + 0.5 });
    }, 600));
  });
  L(`  via CLICK on hidden tab -> ${JSON.stringify(clickRes)}`);

  /* =============== 6. SWIPE gesture =============== */
  L('\n### SWIPE between panes (touch-swipe.js)');
  await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
  await p.waitForTimeout(500);
  const before = await p.evaluate(() => location.hash);
  // simulate a left swipe on the stage
  await p.evaluate(() => {
    const el = document.querySelector('.stage');
    const mk = (t, x, y) => { const ev = new TouchEvent(t, { bubbles: true, cancelable: true,
      touches: t === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })] }); el.dispatchEvent(ev); };
    mk('touchstart', 320, 500); mk('touchmove', 200, 500); mk('touchmove', 90, 502); mk('touchend', 60, 502);
  });
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => location.hash);
  L(`  swipe left: ${before} -> ${after}  ${before !== after ? 'SWIPE WORKS' : 'NO CHANGE'}`);

  /* =============== 7. MOTION / TRANSITIONS =============== */
  L('\n### MOTION');
  const motion = await p.evaluate(() => {
    const g = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const mb = document.querySelector('.sidebar .mockbar');
    const pane = document.querySelector('.pane.on');
    return {
      tokens: { instant: g('--duration-instant'), fast: g('--duration-fast'), base: g('--duration-base'),
        moderate: g('--duration-moderate'), slow: g('--duration-slow'), slowest: g('--duration-slowest') },
      toolsSheetTransition: getComputedStyle(mb).transition,
      paneAnimation: getComputedStyle(pane).animation,
      stageMeshAnimA: getComputedStyle(document.querySelector('.stage'), '::before').animation,
      segTransition: getComputedStyle(document.querySelector('.sidebar .seg button')).transition
    };
  });
  L(JSON.stringify(motion, null, 2));

  /* =============== 8. NUMBER INPUTS keyboard type =============== */
  await p.evaluate(() => { location.hash = '#num'; });
  await p.waitForTimeout(700);
  const inputs = await p.evaluate(() => [...document.querySelectorAll('#num input')].map(i => ({
    type: i.type, inputmode: i.getAttribute('inputmode'), pattern: i.getAttribute('pattern'), value: i.value,
    h: +i.getBoundingClientRect().height.toFixed(1), fs: getComputedStyle(i).fontSize })));
  L('\n### NUMBERS pane inputs (mobile keyboard + iOS zoom-on-focus check: fontSize < 16px triggers zoom)');
  inputs.forEach(i => L('  ' + JSON.stringify(i)));

  await ctx.close();
}

/* =============== 9. DARK THEME (set via data-theme, no Store pollution) =============== */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SHOTS}/home-390-dark.png` });
  await p.click('.ix-x').catch(() => {});
  await p.waitForTimeout(500);
  for (const id of PANES) {
    await p.evaluate(v => { location.hash = '#' + v; document.documentElement.dataset.theme = 'dark'; }, id);
    await p.waitForTimeout(650);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${SHOTS}/pane-${id}-390-dark.png` });
  }
  await p.evaluate(() => { location.hash = '#walk'; window.scrollTo(0, 0); });
  await p.waitForTimeout(400);
  await p.click('#toolsfab'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${SHOTS}/tools-drawer-390-dark.png` });

  // contrast probe in dark
  const contrast = await p.evaluate(() => {
    const lum = c => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return +(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05))).toFixed(2); };
    const bgOf = el => { let e = el; while (e && e !== document.documentElement) { const bg = getComputedStyle(e).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && !/, 0\)$/.test(bg)) return bg; e = e.parentElement; } return 'rgb(21,20,26)'; };
    const probe = (label, sel) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el);
      return { label, color: cs.color, bg: bgOf(el), ratio: ratio(cs.color, bgOf(el)), fs: cs.fontSize }; };
    return [
      probe('mb-d (tools row desc)', '.mockbar .mb-d'),
      probe('mb-t (tools row title)', '.mockbar .mb-t'),
      probe('mb-sec (tools section)', '.mockbar .mb-sec'),
      probe('inttog label', '.inttog-lbl'),
      probe('locator', '.locator'),
      probe('mcomp cue', '.mcomp-cue'),
      probe('seg inactive tab', '.sidebar .seg button:not(.on) span')
    ].filter(Boolean);
  });
  console.log('\n### DARK CONTRAST PROBE');
  out.push('\n### DARK CONTRAST PROBE (WCAG AA body = 4.5:1, large = 3:1)');
  contrast.forEach(c => L(`  ${c.label.padEnd(26)} ${c.color} on ${c.bg} = ${c.ratio}:1  (fs ${c.fs})  ${c.ratio < 4.5 ? '<-- BELOW 4.5' : ''}`));
  await ctx.close();
}

await b.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/visual-mobile-metrics.log', out.join('\n'));
