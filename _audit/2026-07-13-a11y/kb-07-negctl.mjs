/* kb-07: THE NEGATIVE CONTROL, done correctly. Two independent designs; both must go red.

   Why my first two attempts failed (both instructive, both MY bug, not the app's):
     attempt 1  `background:inherit!important` on :focus — `inherit` is not "no change", it is
                the PARENT's value, which differs from the element's own. I painted a NEW change
                on focus and the differ correctly reported it. Check "passed" for a real reason.
     attempt 2  `box-shadow:none!important` on :focus — but #searchopen carries a resting drop
                shadow and the active .seg button carries a resting glow. Zeroing box-shadow ON
                FOCUS *deletes styling the element has at rest*, which is again a visible change.
   The rule those two failures teach: a negative control must make the FOCUSED state pixel-
   identical to the RESTING state. It must PIN properties to their resting values, never zero
   them. So:

   DESIGN A (break the real control, faithfully): read each target's RESTING computed values for
     every property that can paint a ring, then inject a :focus/:focus-visible rule pinning each
     one to exactly that resting value. The control then genuinely has no focus indicator, while
     looking untouched at rest. My check must call it INVISIBLE.

   DESIGN B (independent, cascade-free): inject two synthetic buttons — one with a normal ring,
     one with outline:none and nothing else — and run the identical measurement pipeline over
     both. A working instrument must say OK for one and INVISIBLE for the other. This depends on
     none of the app's CSS, so it cannot be fooled by the app's cascade. */
import { open, inject, pxdiff, shotBox, CR, SHOTS } from './kb-lib.mjs';
import fs from 'fs';

const TOL = 8;
const PIN = ['outline-style', 'outline-width', 'outline-color', 'outline-offset', 'box-shadow',
  'background-color', 'background-image', 'border-color', 'color', 'transform', 'opacity', 'filter'];

/* the exact measurement used in kb-05, factored out so control and subject are measured identically */
async function measure(page, el) {
  await el.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  await page.waitForTimeout(170);
  const rect = await el.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const b1 = await shotBox(page, rect);
  await page.waitForTimeout(110);
  const b2 = await shotBox(page, rect);
  const noise = await pxdiff(page, b1, b2, TOL);
  await el.evaluate(e => e.focus());
  await page.waitForTimeout(200);
  const after = await shotBox(page, rect);
  const sig = await pxdiff(page, b2, after, TOL);
  const perim = 4 * rect.w + 4 * rect.h + 16;
  const contrast = sig.best ? CR(sig.best.from, sig.best.to) : 1;
  const verdict = sig.changed <= noise.changed ? 'INVISIBLE'
    : (sig.changed < perim * 0.5 || contrast < 3) ? 'WEAK' : 'OK';
  return { signal: sig.changed, noise: noise.changed, perim: Math.round(perim), contrast: +contrast.toFixed(2), verdict, rect };
}

const { browser, page } = await open();
await inject(page);
await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
fs.mkdirSync(SHOTS, { recursive: true });

const TARGETS = ['#_focus-toggle', '#searchopen', '#cramopen', '.sidebar .seg button', '#tntrigger'];

/* ---------- 1. BEFORE: the app as shipped ---------- */
console.log('=========== A. SUBJECT (app as shipped) ===========');
const before = {};
for (const sel of TARGETS) {
  const el = await page.$(sel);
  before[sel] = await measure(page, el);
  const r = before[sel];
  console.log(`  ${r.verdict.padEnd(10)} signal=${String(r.signal).padStart(5)} noise=${String(r.noise).padStart(3)} contrast=${String(r.contrast).padStart(6)}  ${sel}`);
}
await page.screenshot({ path: `${SHOTS}/negctl-01-ring-present.png`, clip: { x: 0, y: 300, width: 300, height: 400 } });

/* ---------- 2. DESIGN A: pin focus styling to resting values ---------- */
const css = await page.evaluate((args) => {
  const [sels, props] = args;
  let out = '';
  for (const sel of sels) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const s = getComputedStyle(el);                       // RESTING values (nothing focused)
    const decls = props.map(p => `${p}:${s.getPropertyValue(p)}!important`).join(';');
    out += `${sel}:focus,${sel}:focus-visible{${decls}}\n`;
  }
  return out;
}, [TARGETS, PIN]);
await page.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
await page.addStyleTag({ content: css });
console.log('\n=========== B. NEGATIVE CONTROL — focus styling pinned to RESTING values ===========');
console.log('   (injected: every ring-capable property forced to its unfocused value on :focus)\n');

const after = {};
let redA = 0;
for (const sel of TARGETS) {
  const el = await page.$(sel);
  after[sel] = await measure(page, el);
  const r = after[sel], b = before[sel];
  const red = (r.verdict === 'INVISIBLE');
  if (red) redA++;
  console.log(`  ${r.verdict.padEnd(10)} signal=${String(r.signal).padStart(5)} (was ${String(b.signal).padStart(5)})  ${red ? 'WENT RED' : '!! STILL PASSES !!'}  ${sel}`);
}
await page.screenshot({ path: `${SHOTS}/negctl-02-ring-killed.png`, clip: { x: 0, y: 300, width: 300, height: 400 } });
console.log(`\n  DESIGN A: ${redA}/${TARGETS.length} targets flipped to INVISIBLE when their ring was removed.`);

/* ---------- 3. DESIGN B: synthetic ringed vs ringless button, cascade-free ---------- */
await page.evaluate(() => {
  const host = document.createElement('div');
  host.id = 'kb-synth';
  host.style.cssText = 'position:fixed;left:400px;top:400px;z-index:99999;display:flex;gap:20px;background:#888;padding:20px';
  host.innerHTML = '<button id="kbPos" type="button">ringed</button><button id="kbNeg" type="button">ringless</button>';
  document.body.appendChild(host);
  const st = document.createElement('style');
  st.textContent = `
    #kbPos,#kbNeg{all:unset;display:inline-block;padding:8px 14px;background:#fff;color:#000;font:14px sans-serif;cursor:pointer}
    #kbPos:focus,#kbPos:focus-visible{outline:3px solid #d00;outline-offset:2px}
    #kbNeg:focus,#kbNeg:focus-visible{outline:none}`;
  document.head.appendChild(st);
});
await page.waitForTimeout(200);
console.log('\n=========== C. NEGATIVE CONTROL — synthetic pair (independent of the app\'s CSS) ===========');
const pos = await measure(page, await page.$('#kbPos'));
const neg = await measure(page, await page.$('#kbNeg'));
console.log(`  #kbPos (outline:3px solid red) -> ${pos.verdict.padEnd(10)} signal=${pos.signal}`);
console.log(`  #kbNeg (outline:none)          -> ${neg.verdict.padEnd(10)} signal=${neg.signal}`);
await page.screenshot({ path: `${SHOTS}/negctl-03-synthetic-pair.png`, clip: { x: 380, y: 380, width: 260, height: 90 } });

const designB = pos.verdict === 'OK' && neg.verdict === 'INVISIBLE';
console.log(`\n  DESIGN B: ${designB ? 'PASS — instrument reports OK for a ring and INVISIBLE for no ring.' : 'FAIL — instrument cannot tell a ring from no ring.'}`);

console.log('\n================= INSTRUMENT VERDICT =================');
const valid = redA === TARGETS.length && designB;
console.log(valid
  ? `VALID. The focus-visibility check GOES RED when the ring is removed (${redA}/${TARGETS.length} real controls + the synthetic pair).\nIts passes are therefore evidence, and its one INVISIBLE finding (#scrolltop) is real.`
  : `NOT VALID YET. redA=${redA}/${TARGETS.length}, designB=${designB}. Do not report findings from this check.`);

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-13-a11y/kb-negctl.json', JSON.stringify({ before, after, pos, neg, css }, null, 1));
await browser.close();
