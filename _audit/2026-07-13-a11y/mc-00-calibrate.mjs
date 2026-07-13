/* mc-00-calibrate.mjs — PROVE THE INSTRUMENTS CAN FAIL.
 *
 * Three negative controls. If any of these does not move, the corresponding check in this
 * audit is decoration and I must say so rather than certify anything with it.
 *
 *  NC-1  painted pixels: force body{opacity:0} -> painted MUST collapse to ~0 while the
 *        naive "visible text node" counter keeps reporting hundreds. (Reproduces the exact
 *        trap that let a blank page be certified as passing.)
 *  NC-2  contrast pipeline: run it over swatches whose WCAG ratio is computed independently
 *        in node straight from the hex pairs. Decoded must match hand-computed, AND the
 *        deliberately-failing swatch (#777 on #fff, 4.48) must be reported as a FAIL while
 *        the boundary swatch (#767676 on #fff, 4.54) is reported as a PASS.
 *  NC-3  forced-colors emulation: assert the emulation ACTUALLY forces colours (computed
 *        colours change). A forced-colors "check" against an emulation that only flips the
 *        media query would be another check that cannot fail.
 */
import { chromium } from 'playwright';
import * as L from './mc-lib.mjs';
import fs from 'node:fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y';
const SHOTS = OUT + '/shots/motion-contrast';
fs.mkdirSync(SHOTS, { recursive: true });

/* --- independent WCAG implementation (node side), for cross-checking the browser one --- */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ratio = (f, b) => {
  const l1 = lum(hex(f)), l2 = lum(hex(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const log = [];
const say = (s) => { console.log(s); log.push(s); };

const browser = await chromium.launch();
const decoder = await L.makeDecoder(browser);
let allPass = true;

/* ============================ NC-1: PAINTED PIXELS ============================ */
say('=== NC-1  PAINTED PIXELS vs THE NODE-COUNT TRAP ===\n');
{
  const page = await L.openApp(browser, { reducedMotion: 'reduce' });

  const healthyShot = await L.shotBuf(page);
  const healthy = await L.paintedPixels(decoder, healthyShot);
  const healthyNodes = await L.naiveVisibleNodeCount(page);
  await page.screenshot({ path: SHOTS + '/nc1-a-healthy.png', animations: 'disabled' });

  // BREAK IT: exactly the failure the last audit certified as passing.
  await page.addStyleTag({ content: 'body{opacity:0!important}' });
  await page.waitForTimeout(300);
  const blankShot = await L.shotBuf(page);
  const blank = await L.paintedPixels(decoder, blankShot);
  const blankNodes = await L.naiveVisibleNodeCount(page);
  await page.screenshot({ path: SHOTS + '/nc1-b-blank-negative-control.png', animations: 'disabled' });

  say(`  healthy : painted=${healthy.painted.toLocaleString()} (${healthy.paintedPct}%)  uniqueColors=${healthy.uniqueColors}  naiveVisibleNodes=${healthyNodes}`);
  say(`  BLANKED : painted=${blank.painted.toLocaleString()} (${blank.paintedPct}%)  uniqueColors=${blank.uniqueColors}  naiveVisibleNodes=${blankNodes}`);
  const ok = blank.painted === 0 && healthy.painted > 100000 && blankNodes > 100;
  say(`  -> painted collapsed ${healthy.painted.toLocaleString()} -> ${blank.painted.toLocaleString()}`);
  say(`  -> the naive node counter STILL reports ${blankNodes} "visible" nodes on a page that paints NOTHING.`);
  say(`  NC-1 ${ok ? 'PASS  (instrument can go red; the node counter demonstrably cannot)' : 'FAIL  (instrument is decoration)'}\n`);
  if (!ok) allPass = false;
  await page.context().close();
}

/* ============================ NC-2: CONTRAST PIPELINE ============================ */
say('=== NC-2  CONTRAST PIPELINE vs HAND-COMPUTED SWATCHES ===\n');
{
  const ctx = await browser.newContext({ viewport: { width: 500, height: 560 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file:///D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/mc-swatches.html');
  await page.waitForTimeout(300);

  const targets = await L.collectTargets(page, [{ sel: '.sw', label: 'swatch' }]);
  const N = await L.shotBuf(page);
  await L.forceTargetColor(page, 'transparent'); const T = await L.shotBuf(page);
  await L.forceTargetColor(page, '#000000'); const A = await L.shotBuf(page);
  await L.forceTargetColor(page, '#ffffff'); const B = await L.shotBuf(page);
  await L.forceTargetColor(page, null);
  await page.screenshot({ path: SHOTS + '/nc2-swatches.png' });

  const res = await L.analyzeContrast(decoder, { N, T, A, B, targets });

  /* Ground truth, computed independently in node from the hex pairs.
   *  kind:'exact'  -> the local background under every glyph is a single known colour.
   *  kind:'bounds' -> a genuinely varying gradient. There is NO single hand-computable answer:
   *                   the glyphs are centred, so they never sit on the gradient's extreme end.
   *                   The honest assertion is that the decoded worst-under-a-glyph lies between
   *                   the two endpoint ratios. (Reporting the ENDPOINT is precisely the naive
   *                   "worst background pixel in the element" artefact this pipeline exists to
   *                   avoid -- it is what manufactured six bogus ~3.1:1 failures.) */
  const EXPECT = {
    s_21: { kind: 'exact', r: ratio('#000000', '#FFFFFF'), verdict: 'PASS' },
    s_pass: { kind: 'exact', r: ratio('#767676', '#FFFFFF'), verdict: 'PASS' },
    s_fail: { kind: 'exact', r: ratio('#777777', '#FFFFFF'), verdict: 'FAIL' },
    s_hard: { kind: 'exact', r: ratio('#949494', '#FFFFFF'), verdict: 'FAIL' },
    s_stok: { kind: 'exact', r: ratio('#FFFFFF', '#1D6F3F'), verdict: 'PASS' },
    s_stokd: { kind: 'exact', r: ratio('#1A1622', '#5BD08A'), verdict: 'PASS' },
    s_gradflat: { kind: 'exact', r: ratio('#FFFFFF', '#C53DAF'), verdict: 'PASS' },
    s_grad: { kind: 'bounds', lo: ratio('#FFFFFF', '#C53DAF'), hi: ratio('#FFFFFF', '#963D86'), verdict: 'PASS' },
    s_gradbad: { kind: 'bounds', lo: ratio('#FFFFFF', '#F2CDEA'), hi: ratio('#FFFFFF', '#E8A8D8'), verdict: 'FAIL' },
  };

  const ids = await page.evaluate(() => [...document.querySelectorAll('.sw')].map((e) => ({ id: +e.getAttribute('data-mc-target'), dom: e.id })));
  const domOf = Object.fromEntries(ids.map((o) => [o.id, o.dom]));

  say('  swatch       decoded  expected            delta  floor  verdict  want   core-px  aMax  spread(edge/core)');
  let nc2 = true;
  for (const r of res) {
    const dom = domOf[r.id];
    const exp = EXPECT[dom];
    if (!exp) continue;
    const floor = L.wcagFloor(r.fontSize, r.fontWeight);
    const verdict = r.min >= floor ? 'PASS' : 'FAIL';
    let numOk, expStr, delta;
    if (exp.kind === 'exact') {
      delta = Math.abs(r.min - exp.r);
      numOk = delta < 0.15;
      expStr = exp.r.toFixed(2).padStart(6) + '        ';
    } else {
      numOk = r.min >= exp.lo - 0.15 && r.min <= exp.hi + 0.15;
      expStr = `[${exp.lo.toFixed(2)},${exp.hi.toFixed(2)}]`;
      delta = 0;
    }
    const vOk = verdict === exp.verdict;
    if (!numOk || !vOk) { nc2 = false; allPass = false; }
    say(`  ${dom.padEnd(11)} ${String(r.min).padStart(6)}  ${expStr.padEnd(16)} ${exp.kind === 'exact' ? delta.toFixed(3) : '  -  '}  ${floor}    ${verdict}    ${exp.verdict}   ${String(r.corePx).padStart(5)}  ${r.alphaMax}   ${r.chanSpreadMax} / ${r.coreChanSpread}  ${numOk && vOk ? 'ok' : '<<<< MISMATCH'}`);
  }
  // the gradient case: prove getComputedStyle is useless here
  const gcs = await page.evaluate(() => getComputedStyle(document.getElementById('s_grad')).backgroundImage);
  const gbc = await page.evaluate(() => getComputedStyle(document.getElementById('s_grad')).backgroundColor);
  say(`\n  getComputedStyle(#s_grad).backgroundColor = "${gbc}"   <- transparent. tells you NOTHING.`);
  say(`  getComputedStyle(#s_grad).backgroundImage = "${gcs.slice(0, 58)}..."  <- a string. tells you NOTHING.`);
  say(`  the pipeline decoded the background actually under each glyph regardless.`);
  say(`  spread(edge/core): Chromium uses SUBPIXEL antialiasing here, so per-channel coverage disagrees badly at glyph`);
  say(`  EDGES (~0.7) and collapses to ~0 on the glyph CORE. Sampling only the core is what makes alpha recovery exact --`);
  say(`  and the exact agreement with the hand-computed column above is the proof that it is.`);
  say(`  NC-2 ${nc2 ? 'PASS  (reproduces hand-computed values; correctly FAILS 4.48 while PASSING 4.54; brackets both gradients)' : 'FAIL  (contrast instrument is not trustworthy)'}\n`);
  await ctx.close();
}

/* ============================ NC-3: FORCED-COLORS EMULATION IS REAL ============================ */
say('=== NC-3  IS forcedColors EMULATION ACTUALLY FORCING COLOURS? ===\n');
{
  const norm = await L.openApp(browser, {});
  const fc = await L.openApp(browser, { forcedColors: 'active' });
  const probe = (p) => p.evaluate(() => {
    const card = document.querySelector('deep-walkthrough')?.shadowRoot?.querySelector('.card');
    const btn = document.getElementById('mockopen');
    return {
      mq: matchMedia('(forced-colors: active)').matches,
      bodyColor: getComputedStyle(document.body).color,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      btnBgImage: btn ? getComputedStyle(btn).backgroundImage.slice(0, 40) : null,
      btnBgColor: btn ? getComputedStyle(btn).backgroundColor : null,
      btnColor: btn ? getComputedStyle(btn).color : null,
      cardBg: card ? getComputedStyle(card).backgroundColor : null,
      cardBorder: card ? getComputedStyle(card).borderColor : null,
    };
  });
  const a = await probe(norm), b = await probe(fc);
  say('  normal        : ' + JSON.stringify(a));
  say('  forcedColors  : ' + JSON.stringify(b));
  const changed = a.bodyColor !== b.bodyColor || a.bodyBg !== b.bodyBg || a.btnColor !== b.btnColor;
  const ok = b.mq === true && changed;
  say(`  media query matches: ${b.mq};  computed colours actually changed: ${changed}`);
  say(`  NC-3 ${ok ? 'PASS  (emulation genuinely substitutes system colours -- not just an MQ flip)' : 'FAIL  (emulation is cosmetic; a forced-colors check on it would be decoration)'}\n`);
  if (!ok) allPass = false;
  await norm.context().close();
  await fc.context().close();
}

say(`\n================  CALIBRATION ${allPass ? 'PASS — instruments proven able to go red' : 'FAIL — DO NOT TRUST THESE CHECKS'}  ================`);
fs.writeFileSync(OUT + '/mc-data-calibration.txt', log.join('\n'));
await browser.close();
process.exit(allPass ? 0 : 1);
