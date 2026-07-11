import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-vd-mobile';

const b = await chromium.launch();

async function boot(w, css) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  const x = await p.$('.ix-ov.open .ix-x');
  if (x) { await x.click(); await p.waitForTimeout(400); }
  if (css) { await p.addStyleTag({ content: css }); await p.waitForTimeout(300); }
  return { ctx, p };
}

const M = () => {
  const q = s => document.querySelector(s);
  const vw = document.documentElement.clientWidth;
  const vis = e => { const bb = e.getBoundingClientRect(); const v = Math.max(0, Math.min(bb.right, vw) - Math.max(bb.left, 0)); return { w: +bb.width.toFixed(1), right: +bb.right.toFixed(1), hiddenPct: +(100 * (1 - v / bb.width)).toFixed(0) }; };
  const tncur = q('#tncurrent');
  return {
    icb: window.innerWidth, vw, docScrollWidth: document.documentElement.scrollWidth,
    overflowPx: document.documentElement.scrollWidth - vw,
    topicnav: vis(q('#topicnav')), tnnext: vis(q('#tnnext')), mockcta: vis(q('.sidebar .mockcta')),
    toolsfab: vis(q('#toolsfab')), seg: vis(q('.sidebar .seg')),
    ellipsisFiring: tncur.scrollWidth > tncur.clientWidth,
    tncurClientW: tncur.clientWidth, tncurScrollW: tncur.scrollWidth,
  };
};

// PROOF: what min-width do the elements ALREADY compute to?
{
  const { ctx, p } = await boot(360, null);
  const pre = await p.evaluate(() => {
    const g = s => { const e = document.querySelector(s); const c = getComputedStyle(e); return { sel: s, minWidth: c.minWidth, overflow: c.overflow, flex: c.flex, display: c.display, flexWrap: c.flexWrap }; };
    return [g('.side-id'), g('#topicnav'), g('#tntrigger'), g('#tncurrent')];
  });
  console.log('===== COMPUTED STYLES @360 (baseline, isMobile) =====');
  pre.forEach(o => console.log(`  ${o.sel.padEnd(12)} display=${o.display.padEnd(6)} flexWrap=${o.flexWrap.padEnd(8)} flex=${o.flex.padEnd(12)} min-width=${o.minWidth.padEnd(6)} overflow=${o.overflow}`));
  console.log('  ^^ NOTE: .tn-trigger ALREADY computes min-width:0px (styles.css:620 sets it).');
  console.log('  ^^ NOTE: .tn-current has overflow:hidden -> its min-width:auto ALREADY resolves to 0 (CSS Flexbox 4.5).');
  console.log('  ^^ NOTE: #topicnav computes min-width:auto AND is a flex ITEM of .side-id (display:flex;flex-wrap:wrap) => content-based floor.');
  await ctx.close();
}

const VARIANTS = [
  ['A. baseline (shipped)', ''],
  ['B. LENS PRIMARY FIX:  .tn-current{min-width:0}', '.tn-current{min-width:0 !important}'],
  ['C. LENS PARENTHETICAL: .topic-nav{min-width:0}', '.topic-nav{min-width:0 !important}'],
  ['D. both', '.tn-current{min-width:0 !important}.topic-nav{min-width:0 !important}'],
];

console.log('\n\n===== FIX BISECT @360px, isMobile:true (real phone semantics) =====');
for (const [name, css] of VARIANTS) {
  const { ctx, p } = await boot(360, css);
  const m = await p.evaluate(M);
  const ok = m.overflowPx === 0;
  console.log(`\n${ok ? '[FIXED]  ' : '[BROKEN] '} ${name}`);
  console.log(`    ICB(innerWidth)=${m.icb}  visualVP=${m.vw}  docScrollWidth=${m.docScrollWidth}  overflow=${m.overflowPx}px`);
  console.log(`    #topicnav w=${m.topicnav.w}  |  #tnnext hidden=${m.tnnext.hiddenPct}%`);
  console.log(`    .mockcta  w=${m.mockcta.w} right=${m.mockcta.right} hidden=${m.mockcta.hiddenPct}%  |  #toolsfab hidden=${m.toolsfab.hiddenPct}%`);
  console.log(`    .seg strip w=${m.seg.w} right=${m.seg.right} hidden=${m.seg.hiddenPct}%`);
  console.log(`    topic-name ellipsis firing: ${m.ellipsisFiring} (clientW=${m.tncurClientW} scrollW=${m.tncurScrollW})`);
  if (name.startsWith('A')) await p.screenshot({ path: `${SHOTS}/f1c-360-A-baseline.png` });
  if (name.startsWith('B')) await p.screenshot({ path: `${SHOTS}/f1c-360-B-lens-primary-fix-NOOP.png` });
  if (name.startsWith('C')) await p.screenshot({ path: `${SHOTS}/f1c-360-C-topicnav-minwidth0-WORKS.png` });
  await ctx.close();
}

// Longest-topic-name stress: does the overflow get WORSE on other topics?
console.log('\n\n===== LONGEST-TOPIC STRESS @390 (is 396px the worst case?) =====');
{
  const { ctx, p } = await boot(390, null);
  const res = await p.evaluate(async () => {
    const items = [...document.querySelectorAll('.tn-item')];
    const out = [];
    // just set the label text directly to measure the layout floor per name
    const cur = document.querySelector('#tncurrent');
    const orig = cur.textContent;
    const names = items.map(i => i.querySelector('.tn-i-name')?.textContent.trim()).filter(Boolean);
    for (const n of names) {
      cur.textContent = n;
      // force reflow
      void document.body.offsetWidth;
      out.push({ name: n, topicnavW: +document.querySelector('#topicnav').getBoundingClientRect().width.toFixed(1), docScrollW: document.documentElement.scrollWidth });
    }
    cur.textContent = orig;
    return out;
  });
  res.sort((a, b) => b.topicnavW - a.topicnavW);
  console.log('  WORST 5 topics by forced #topicnav width (viewport 390):');
  res.slice(0, 5).forEach(r => console.log(`    ${String(r.topicnavW).padStart(6)}px  docScrollW=${String(r.docScrollW).padStart(4)}  overflow=${r.docScrollW - 390}px  "${r.name}"`));
  console.log('  BEST 3:');
  res.slice(-3).forEach(r => console.log(`    ${String(r.topicnavW).padStart(6)}px  docScrollW=${String(r.docScrollW).padStart(4)}  overflow=${r.docScrollW - 390}px  "${r.name}"`));
  await ctx.close();
}

await b.close();
