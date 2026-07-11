import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';

const b = await chromium.launch();

async function newPage(w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGE-ERROR:', e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  // dismiss home overlay
  const x = await p.$('.ix-ov.open .ix-x');
  if (x) { await x.click(); await p.waitForTimeout(500); }
  return { ctx, p };
}

const MEASURE = () => {
  const r = e => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), w: +b.width.toFixed(1), right: +b.right.toFixed(1) }; };
  const q = s => document.querySelector(s);
  const vw = document.documentElement.clientWidth;
  const tn = q('#topicnav'), tnnext = q('#tnnext'), tntrig = q('#tntrigger'), tncur = q('#tncurrent');
  const sideid = q('.side-id'), mockcta = q('.sidebar .mockcta'), fab = q('#toolsfab'), mockbtn = q('#mockopen');
  const out = {
    vw,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    overflowPx: document.documentElement.scrollWidth - vw,
    topicnav: r(tn), tnnext: r(tnnext), tntrigger: r(tntrig), tncurrent: r(tncur),
    sideId: r(sideid), mockcta: r(mockcta), toolsfab: r(fab), mockbtn: r(mockbtn),
    // is the topic name actually ellipsized?
    tncurText: tncur.textContent,
    tncurScrollW: tncur.scrollWidth, tncurClientW: tncur.clientWidth,
    ellipsisFiring: tncur.scrollWidth > tncur.clientWidth,
    // computed
    tncurMinWidth: getComputedStyle(tncur).minWidth,
    tncurOverflow: getComputedStyle(tncur).overflow,
    topicnavMinWidth: getComputedStyle(tn).minWidth,
    tntriggerMinWidth: getComputedStyle(tntrig).minWidth,
    sideIdDisplay: getComputedStyle(sideid).display,
    sideIdFlexWrap: getComputedStyle(sideid).flexWrap,
    mockctaPosition: getComputedStyle(mockcta).position,
  };
  // visible portion of tnnext & toolsfab
  const vis = e => { const bb = e.getBoundingClientRect(); const v = Math.max(0, Math.min(bb.right, vw) - Math.max(bb.left, 0)); return { visiblePx: +v.toFixed(1), totalPx: +bb.width.toFixed(1), hiddenPct: +(100 * (1 - v / bb.width)).toFixed(0) }; };
  out.tnnextVis = vis(tnnext);
  out.toolsfabVis = vis(fab);
  // can you pan to see it?
  const before = window.scrollX; window.scrollTo(9999, window.scrollY);
  out.canPan = window.scrollX > before; out.maxScrollX = window.scrollX; window.scrollTo(0, window.scrollY);
  return out;
};

console.log('===================== BASELINE SWEEP =====================');
for (const w of [430, 412, 393, 390, 375, 360, 320]) {
  const { ctx, p } = await newPage(w, 844);
  const m = await p.evaluate(MEASURE);
  console.log(`\n--- viewport ${w}px ---`);
  console.log(JSON.stringify(m, null, 1));
  if (w === 360) {
    await p.screenshot({ path: `${SHOTS}/f1-baseline-360-full.png`, fullPage: false });
    await p.locator('.side-id').screenshot({ path: `${SHOTS}/f1-baseline-360-sideid.png` }).catch(() => {});
    await p.locator('.sidebar .mockcta').screenshot({ path: `${SHOTS}/f1-baseline-360-mockcta.png` }).catch(() => {});
  }
  await ctx.close();
}

console.log('\n\n===================== FIX BISECT @360px =====================');
const VARIANTS = {
  'A_baseline': '',
  'B_tncurrent_minwidth0  (THE LENS PRIMARY FIX)': '.tn-current{min-width:0 !important}',
  'C_topicnav_minwidth0   (lens belt-and-braces)': '.topic-nav{min-width:0 !important}',
  'D_both': '.tn-current{min-width:0 !important} .topic-nav{min-width:0 !important}',
  'E_sideid_children_minwidth0': '.side-id > *{min-width:0 !important}',
  'F_tntrigger_overflow_hidden': '.tn-trigger{overflow:hidden !important}',
  'G_topicnav_flexbasis100': '.topic-nav{flex-basis:100% !important;min-width:0 !important}',
};
for (const [name, css] of Object.entries(VARIANTS)) {
  const { ctx, p } = await newPage(360, 844);
  if (css) await p.addStyleTag({ content: css });
  await p.waitForTimeout(250);
  const m = await p.evaluate(MEASURE);
  console.log(`\n### ${name}`);
  console.log(`   css injected: ${css || '(none)'}`);
  console.log(`   docScrollWidth=${m.docScrollWidth} (vw=${m.vw}) overflow=${m.overflowPx}px`);
  console.log(`   #topicnav  w=${m.topicnav.w}  right=${m.topicnav.right}`);
  console.log(`   #tnnext    visible=${m.tnnextVis.visiblePx}/${m.tnnextVis.totalPx} hidden=${m.tnnextVis.hiddenPct}%`);
  console.log(`   .mockcta   w=${m.mockcta.w} right=${m.mockcta.right}   #toolsfab hidden=${m.toolsfabVis.hiddenPct}%`);
  console.log(`   ellipsis firing on topic name? ${m.ellipsisFiring} (scrollW=${m.tncurScrollW} clientW=${m.tncurClientW})`);
  if (name.startsWith('B_')) await p.screenshot({ path: `${SHOTS}/f1-fixB-tncurrent-only-360.png` });
  if (name.startsWith('D_')) await p.screenshot({ path: `${SHOTS}/f1-fixD-both-360.png` });
  await ctx.close();
}

console.log('\n\n===================== LONGEST TOPIC NAME TEST @360 =====================');
{
  const { ctx, p } = await newPage(360, 844);
  const names = await p.evaluate(() => [...document.querySelectorAll('.tn-item .tn-i-name')].map(e => e.textContent.trim()));
  const longest = names.slice().sort((a, b) => b.length - a.length)[0];
  console.log('topic count:', names.length, '| longest name:', JSON.stringify(longest), `(${longest?.length} chars)`);
  console.log('current name:', await p.evaluate(() => document.querySelector('#tncurrent').textContent));
  await ctx.close();
}

await b.close();
