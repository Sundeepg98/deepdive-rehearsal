import { chromium } from 'playwright';
import fs from 'fs';

const BUILDS = {
  BEFORE: 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html',
  AFTER: 'D:/claude-workspace/deepdive-rehearsal/dist/index.html',
};
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight';

const browser = await chromium.launch();
const report = { contrast: [], reducedMotion: [], groups: [], mobile: [], tapTargets: [] };

// ============ 1. REDUCED MOTION: does it RENDER? ============
for (const [build, path] of Object.entries(BUILDS)) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await page.goto('file:///' + path);
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => {
    const vis = el => { const rc = el.getBoundingClientRect(); const s = getComputedStyle(el); return rc.width > 0 && rc.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.01; };
    let n = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const t = w.currentNode; if (t.nodeValue.trim() && t.parentElement && vis(t.parentElement)) n++; }
    // also: pixels actually painted? check main content bbox
    const main = document.querySelector('.pane.on') || document.body;
    const mr = main.getBoundingClientRect();
    return {
      visibleTextNodes: n,
      innerTextLen: document.body.innerText.trim().length,
      mainW: Math.round(mr.width), mainH: Math.round(mr.height),
      mainOpacity: getComputedStyle(main).opacity,
      bodyOpacity: getComputedStyle(document.body).opacity,
      prefersReduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  });
  await page.screenshot({ path: `${OUT}/shots/reducedmotion_desktop_light_${build}.png` });
  report.reducedMotion.push({ build, ...r, pageErrors: errs });
  await ctx.close();
}

// ============ 2. CONTRAST: measure REAL rendered elements, all 6 groups x 2 themes ============
const GROUPS = ['messaging-events', 'data-storage', 'reliability-observability', 'platform-infra', 'architecture-apis', 'security-tenancy'];

const relLum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const cr = (a, b) => { const L1 = relLum(a), L2 = relLum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); };
const parse = s => { const m = s.match(/(\d+\.?\d*)/g); return m ? [ +m[0], +m[1], +m[2] ] : null; };

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('file:///' + BUILDS.AFTER);
  await page.waitForTimeout(2200);

  for (const theme of ['light', 'dark']) {
    for (const g of GROUPS) {
      const vals = await page.evaluate(({ t, grp }) => {
        const root = document.documentElement;
        root.setAttribute('data-theme', t);
        root.setAttribute('data-group', grp);
        const cs = getComputedStyle(root);
        const get = n => cs.getPropertyValue(n).trim();
        // resolve to rgb by painting into a probe element
        const probe = document.createElement('div');
        document.body.appendChild(probe);
        const resolve = expr => { probe.style.color = ''; probe.style.color = expr; return getComputedStyle(probe).color; };
        const out = {
          ink: resolve('var(--topic-ink)'),
          solid: resolve('var(--topic-solid)'),
          wash: resolve('var(--topic-wash)'),
          edge: resolve('var(--topic-edge)'),
          acc: resolve('var(--acc)'),
          pageBg: getComputedStyle(document.body).backgroundColor,
          cardBg: (() => { const c = document.querySelector('.card,.stage,.pane.on'); return c ? getComputedStyle(c).backgroundColor : null; })(),
          bodyInk: getComputedStyle(document.body).color,
        };
        // the .locator uses var(--acc) as TEXT -- the real-world accent-text case
        const loc = document.querySelector('.locator');
        if (loc) { out.locatorColor = getComputedStyle(loc).color; out.locatorBg = (() => { let e = loc; while (e && e !== document.documentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba?\(0, 0, 0, 0\)/.test(b)) return b; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor; })(); out.locatorSize = getComputedStyle(loc).fontSize; out.locatorWeight = getComputedStyle(loc).fontWeight; }
        probe.remove();
        return out;
      }, { t: theme, grp: g });

      const bg = parse(vals.pageBg);
      const push = (label, fg, bgc, note) => {
        const F = parse(fg), B = parse(bgc);
        if (!F || !B) return;
        report.contrast.push({ theme, group: g, sample: label, fg, bg: bgc, ratio: +cr(F, B).toFixed(2), AA: cr(F, B) >= 4.5, AA_large: cr(F, B) >= 3, note });
      };
      push('--acc as text on page bg', vals.acc, vals.pageBg, 'accent used as body-ish text');
      push('--topic-ink on page bg', vals.ink, vals.pageBg, '');
      push('--topic-solid on page bg', vals.solid, vals.pageBg, 'fill colour, not necessarily text');
      if (vals.locatorColor) push('.locator (REAL rendered)', vals.locatorColor, vals.locatorBg, `${vals.locatorSize}/${vals.locatorWeight}`);
      push('body ink on page bg', vals.bodyInk, vals.pageBg, 'baseline body text');
    }
  }
  await ctx.close();
}

// ============ 3. GROUP DISTINCTNESS: are the 6 rooms actually distinguishable? ============
{
  // deltaE-ish: compare each pair of room accents
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('file:///' + BUILDS.AFTER);
  await page.waitForTimeout(1500);
  for (const theme of ['light', 'dark']) {
    const cols = await page.evaluate(({ t, GROUPS }) => {
      const root = document.documentElement; root.setAttribute('data-theme', t);
      const probe = document.createElement('div'); document.body.appendChild(probe);
      const o = {};
      for (const g of GROUPS) { root.setAttribute('data-group', g); probe.style.color = 'var(--topic-ink)'; o[g] = getComputedStyle(probe).color; }
      probe.remove(); return o;
    }, { t: theme, GROUPS });
    report.groups.push({ theme, colors: cols });
  }
  await ctx.close();
}

// ============ 4. MOBILE: drill question clipping + tap targets ============
for (const [build, path] of Object.entries(BUILDS)) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('file:///' + path);
  await page.waitForTimeout(2200);
  try { await page.click('[data-tab="drill"]', { timeout: 5000 }); await page.waitForTimeout(1200); } catch (e) {}

  const m = await page.evaluate(() => {
    const out = { clipped: [], smallTaps: [], overflowX: false };
    out.overflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    out.scrollW = document.documentElement.scrollWidth;
    out.clientW = document.documentElement.clientWidth;
    // clipping: any element whose scrollHeight far exceeds clientHeight while overflow hidden
    document.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      if ((s.overflow === 'hidden' || s.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0) {
        const r = el.getBoundingClientRect();
        if (r.width > 40 && el.innerText && el.innerText.trim().length > 30) {
          out.clipped.push({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.'), clientH: el.clientHeight, scrollH: el.scrollHeight, lost: el.scrollHeight - el.clientHeight, text: el.innerText.trim().slice(0, 60) });
        }
      }
    });
    // tap targets: interactive elements under 44px (WCAG 2.5.5 / Apple HIG)
    document.querySelectorAll('button,a,[role=button],input,select,summary').forEach(el => {
      const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.display === 'none') return;
      if (r.height < 44 || r.width < 44) {
        out.smallTaps.push({ sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + (el.className || '').toString().split(' ').filter(Boolean)[0]), w: Math.round(r.width), h: Math.round(r.height), txt: (el.innerText || el.value || '').trim().slice(0, 22) });
      }
    });
    return out;
  });
  await page.screenshot({ path: `${OUT}/shots/drillMOBILE_probe_${build}.png`, fullPage: false });
  report.mobile.push({ build, overflowX: m.overflowX, scrollW: m.scrollW, clientW: m.clientW, clippedCount: m.clipped.length, clipped: m.clipped.slice(0, 8), smallTapCount: m.smallTaps.length, smallTaps: m.smallTaps.slice(0, 14) });
  await ctx.close();
}

fs.writeFileSync(`${OUT}/measure.json`, JSON.stringify(report, null, 2));

// ---- print summary ----
console.log('=== REDUCED MOTION (does it render?) ===');
report.reducedMotion.forEach(r => console.log(`  ${r.build}: visibleTextNodes=${r.visibleTextNodes} innerTextLen=${r.innerTextLen} bodyOpacity=${r.bodyOpacity} prefersReduced=${r.prefersReduced} errs=${r.pageErrors.length}`));

console.log('\n=== CONTRAST FAILURES (AA 4.5:1 for text) ===');
const fails = report.contrast.filter(c => !c.AA && /locator|--acc as text|topic-ink|body ink/.test(c.sample));
if (!fails.length) console.log('  none in sampled text roles');
fails.forEach(f => console.log(`  ${f.theme.padEnd(5)} ${f.group.padEnd(26)} ${f.sample.padEnd(28)} ${String(f.ratio).padStart(5)}:1  ${f.AA_large ? '(passes AA-large 3:1)' : 'FAILS EVEN 3:1'}  ${f.note}`));

console.log('\n=== .locator REAL rendered contrast (accent-as-text) ===');
report.contrast.filter(c => c.sample === '.locator (REAL rendered)').forEach(c => console.log(`  ${c.theme.padEnd(5)} ${c.group.padEnd(26)} ${String(c.ratio).padStart(5)}:1 ${c.AA ? 'PASS' : (c.AA_large ? 'fails AA, passes large' : 'FAIL')}  ${c.note}`));

console.log('\n=== MOBILE ===');
report.mobile.forEach(m => console.log(`  ${m.build}: overflowX=${m.overflowX} (${m.scrollW}/${m.clientW}) clipped=${m.clippedCount} tapTargets<44px=${m.smallTapCount}`));

await browser.close();
