/* 00-calibrate.mjs -- PROVE THE INSTRUMENT BEFORE QUOTING A SINGLE NUMBER.
 *
 * This repo has shipped SIX checks that could not fail. An a11y audit certified a completely
 * blank page as PASSING. So: calibrate the pixel-contrast pipeline against hand-computed
 * swatches and show it correctly SPLITS the WCAG AA boundary -- FAILS 4.48, PASSES 4.54.
 * If it cannot do that, nothing downstream is evidence.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeDecoder, collectTargets, forceTargetColor, analyzeContrast } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SW_URL = 'file:///' + path.join(HERE, 'swatches.html').replace(/\\/g, '/');

/* Hand-computed reference, straight from the WCAG formula on the hex pairs.
 * Nothing here is derived from the instrument under test. */
function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function wcag(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
/* composite fg over bg at alpha (what an ancestor `opacity` does to the glyph) */
function comp(fg, bg, a) {
  const h = (x, i) => parseInt(x.slice(1 + 2 * i, 3 + 2 * i), 16);
  const out = [0, 1, 2].map((i) => Math.round(a * h(fg, i) + (1 - a) * h(bg, i)));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

const EXPECT = {
  s_21: { ref: wcag('#000000', '#FFFFFF'), floor: 4.5, verdict: 'PASS' },
  s_pass: { ref: wcag('#767676', '#FFFFFF'), floor: 4.5, verdict: 'PASS' },
  s_fail: { ref: wcag('#777777', '#FFFFFF'), floor: 4.5, verdict: 'FAIL' },
  s_stok: { ref: wcag('#FFFFFF', '#1D6F3F'), floor: 4.5, verdict: 'PASS' },
  s_stokd: { ref: wcag('#1A1622', '#5BD08A'), floor: 4.5, verdict: 'PASS' },
  s_gradflat: { ref: wcag('#FFFFFF', '#C53DAF'), floor: 4.5, verdict: 'PASS' },
  /* the two REAL pill nodes: different ink, different WCAG floor (the value is LARGE text) */
  s_lab62: { ref: wcag(comp('#67615A', '#FCFBF9', 0.62), '#FCFBF9'), floor: 4.5, verdict: 'FAIL' },
  s_lab90: { ref: wcag(comp('#67615A', '#FCFBF9', 0.90), '#FCFBF9'), floor: 4.5, verdict: 'PASS' },
  s_val62: { ref: wcag(comp('#6B6862', '#FCFBF9', 0.62), '#FCFBF9'), floor: 3.0, verdict: 'FAIL' },
  s_val90: { ref: wcag(comp('#6B6862', '#FCFBF9', 0.90), '#FCFBF9'), floor: 3.0, verdict: 'PASS' },
};

const browser = await chromium.launch();
const decoder = await makeDecoder(browser);
const ctx = await browser.newContext({ viewport: { width: 500, height: 700 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(SW_URL, { waitUntil: 'load' });
await page.waitForTimeout(300);

/* ---- THE FIXTURE MUST BE VERIFIED TOO ------------------------------------------------
 * The first cut of this file put the `.backdrop` rule immediately after a CSS comment I had
 * accidentally closed twice. The stray prose became raw CSS, error-recovery ate the next rule,
 * and `.backdrop` NEVER APPLIED -- so the opacity swatches silently composited over body{#808080}
 * and disagreed with the hand-computed reference by 0.5. The instrument was right; my FIXTURE was
 * a no-op, and I could not tell the difference from the numbers alone.
 * That is the same failure mode as the app's dead light-DOM rules. Assert the fixture RENDERS
 * what it claims -- at runtime, in pixels -- before believing a single reading off it. */
const fixture = await page.evaluate(() => {
  const bd = document.querySelector('.backdrop');
  const sw = document.getElementById('s_lab62');
  const need = ['s_21', 's_pass', 's_fail', 's_stok', 's_stokd', 's_gradflat', 's_lab62', 's_lab90', 's_val62', 's_val90'];
  return {
    backdropBg: bd ? getComputedStyle(bd).backgroundColor : 'MISSING',
    swOpacity: sw ? getComputedStyle(sw).opacity : 'MISSING',
    allOnScreen: need.every((id) => {
      const e = document.getElementById(id);
      return e && e.getBoundingClientRect().bottom <= window.innerHeight;
    }),
    missing: need.filter((id) => !document.getElementById(id)),
  };
});
const fixtureOk = fixture.backdropBg === 'rgb(252, 251, 249)' && fixture.swOpacity === '0.62'
  && fixture.allOnScreen && fixture.missing.length === 0;
console.log('\n=== FIXTURE SELF-CHECK (the swatch page must render what it claims) ===');
console.log('  .backdrop background : %s   (must be rgb(252, 251, 249))', fixture.backdropBg);
console.log('  #s_lab62 opacity     : %s   (must be 0.62)', fixture.swOpacity);
console.log('  all swatches on-screen: %s', fixture.allOnScreen);
if (!fixtureOk) {
  console.error('\n*** THE FIXTURE ITSELF IS BROKEN. Every number below would be measured off a page');
  console.error('    that is not what it says it is. This is the dead-CSS bug, in the harness. ABORT.\n');
  await browser.close();
  process.exit(3);
}

const targets = await collectTargets(page, [{ label: 'swatch', sel: '.sw' }]);
const N = await page.screenshot({ animations: 'disabled' });
await forceTargetColor(page, 'transparent');
const T = await page.screenshot({ animations: 'disabled' });
await forceTargetColor(page, '#000000');
const A = await page.screenshot({ animations: 'disabled' });
await forceTargetColor(page, '#ffffff');
const B = await page.screenshot({ animations: 'disabled' });
await forceTargetColor(page, null);

const res = await analyzeContrast(decoder, { N, T, A, B, targets });
/* map results back to swatch ids by DOM order */
const ids = await page.evaluate(() => [...document.querySelectorAll('.sw')].map((e) => e.id));

console.log('\n=== CONTRAST INSTRUMENT CALIBRATION ===');
console.log('  (reference = hand-computed WCAG from the hex pairs; measured = decoded from pixels)\n');
console.log('  swatch        hand-computed  measured   d       floor  expect  instrument says');
console.log('  ' + '-'.repeat(76));

let allOk = true;
res.forEach((r, i) => {
  const id = ids[i];
  const exp = EXPECT[id];
  if (!exp) return;
  const measured = r.median;                       // the glyph-core value
  const says = measured >= exp.floor ? 'PASS' : 'FAIL';
  const delta = Math.abs(measured - exp.ref);
  const verdictOk = says === exp.verdict;
  const numOk = delta < 0.12;                      // tight: the pipeline is exact on a flat bg
  if (!verdictOk || !numOk) allOk = false;
  console.log('  %s %s %s %s %s %s %s  %s',
    id.padEnd(13),
    exp.ref.toFixed(2).padStart(9),
    String(measured).padStart(10),
    ('±' + delta.toFixed(3)).padStart(8),
    String(exp.floor).padStart(6),
    exp.verdict.padStart(7),
    says.padStart(6),
    (verdictOk && numOk) ? 'ok' : (!verdictOk ? '*** WRONG VERDICT ***' : '*** VALUE OFF ***'));
});

console.log('\n  THE BOUNDARY TEST (this is the whole point):');
const iFail = ids.indexOf('s_fail'), iPass = ids.indexOf('s_pass');
const vFail = res[iFail].median, vPass = res[iPass].median;
const splits = vFail < 4.5 && vPass >= 4.5;
console.log('    #777777/#fff -> %s   must be < 4.5  ->  %s', vFail, vFail < 4.5 ? 'FAIL, correctly' : '*** PASSED A 4.48 ***');
console.log('    #767676/#fff -> %s   must be >= 4.5 ->  %s', vPass, vPass >= 4.5 ? 'PASS, correctly' : '*** FAILED A 4.54 ***');
console.log('    splits the AA boundary: %s', splits ? 'YES' : 'NO');

console.log('\n  THE OPACITY TEST -- and why the glyph-core cut must be RELATIVE.');
console.log('  .pill.z is opacity:.62. A naive ABSOLUTE core cut (alpha >= 0.85) finds ZERO core');
console.log('  pixels on it and would silently report a CLEAN BILL on the failing tile.');
const OP = [['.pill .l  --mut2 @ .62', 's_lab62'], ['.pill .l  --mut2 @ .90', 's_lab90'],
             ['.pill .v  --mut  @ .62', 's_val62'], ['.pill .v  --mut  @ .90', 's_val90']];
for (const [lbl, id] of OP) {
  const i = ids.indexOf(id), r = res[i], exp = EXPECT[id];
  console.log('    %s -> %s (hand %s, floor %s)  alphaMax %s  corePx: relative %s / absolute-.85-cut %s',
    lbl.padEnd(22), String(r.median).padStart(5), exp.ref.toFixed(2), exp.floor,
    r.alphaMax, String(r.corePx).padStart(3), r.alphaMax >= 0.85 ? r.corePx : 0);
}
console.log('    -> at opacity .62 an ABSOLUTE cut measures 0 pixels: it cannot see the failing tile');
console.log('       at all, and would report it CLEAN. The relative cut measures it. That is the bug class.');

console.log('\n  GRADIENT TEST (getComputedStyle returns a literal string here and can see NOTHING):');
const gcs = await page.evaluate(() => getComputedStyle(document.getElementById('s_gradflat')).backgroundColor);
console.log('    getComputedStyle(.backgroundColor) = %s   <- useless', gcs);
console.log('    pixel-decoded contrast             = %s   (hand-computed %s)',
  res[ids.indexOf('s_gradflat')].median, EXPECT.s_gradflat.ref.toFixed(2));

await browser.close();

console.log('\n' + (allOk && splits
  ? 'CALIBRATED: the instrument reproduces every hand-computed value and splits the AA boundary.\n'
  : '*** CALIBRATION FAILED -- DO NOT TRUST ANY NUMBER FROM THIS PIPELINE ***\n'));
process.exit(allOk && splits ? 0 : 1);
