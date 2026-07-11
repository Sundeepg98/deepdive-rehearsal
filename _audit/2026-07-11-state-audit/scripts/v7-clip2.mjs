import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const out = {};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();

// ---- DOM shape of a pane ----
await p.goto(BASE + '#api-design/num', { waitUntil: 'load' });
await p.waitForTimeout(700);
const shape = await p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  const kids = [...pane.children].map(c => ({ tag: c.tagName, id: c.id, hasShadow: !!c.shadowRoot }));
  const host = [...pane.querySelectorAll('*')].find(e => e.shadowRoot);
  let inner = null;
  if (host) inner = [...host.shadowRoot.querySelectorAll('.nrow')].length;
  return { paneId: pane.id, kids, hostTag: host ? host.tagName : null, nrowCount: inner };
});
console.log('=== PANE DOM SHAPE (num) ===', JSON.stringify(shape));

// ---- api-design/num : the .nrow story, exactly ----
const nrowDetail = await p.evaluate(() => {
  const pane = document.querySelector('.pane.on');
  const host = [...pane.querySelectorAll('*')].find(e => e.shadowRoot);
  const root = host.shadowRoot;
  const stage = document.querySelector('.stage');
  const cs = getComputedStyle(stage);
  const contentRight = stage.getBoundingClientRect().right - parseFloat(cs.paddingRight);
  const rows = [...root.querySelectorAll('.nrow')].map(r => {
    const v = r.querySelector('.nrow-v'), k = r.querySelector('.nrow-k');
    const rr = r.getBoundingClientRect(), vr = v ? v.getBoundingClientRect() : null;
    return {
      key: k ? k.textContent.trim().slice(0, 34) : '',
      val: v ? v.textContent.trim().slice(0, 20) : '',
      rowClientW: r.clientWidth, rowScrollW: r.scrollWidth, rowInkOver: r.scrollWidth - r.clientWidth,
      rowRight: +rr.right.toFixed(1),
      valW: vr ? +vr.width.toFixed(1) : null, valRight: vr ? +vr.right.toFixed(1) : null,
      valSpillPastStage: vr ? +(vr.right - contentRight).toFixed(1) : null,
      valWS: v ? getComputedStyle(v).whiteSpace : null
    };
  });
  return {
    stageCW: stage.clientWidth, stageSW: stage.scrollWidth, stageOver: stage.scrollWidth - stage.clientWidth,
    contentRight: +contentRight.toFixed(1),
    gridCols: getComputedStyle(root.querySelector('.nrow')).gridTemplateColumns,
    rowsWithInkOverflow: rows.filter(r => r.rowInkOver > 1).length,
    totalRows: rows.length,
    top: rows.sort((a, b) => b.rowInkOver - a.rowInkOver).slice(0, 5)
  };
});
console.log('\n=== api-design/num .nrow DETAIL @360 ===');
console.log(JSON.stringify(nrowDetail, null, 1));
out.nrowDetail = nrowDetail;

// ---- FULL SWEEP with BOTH metrics ----
const topics = await p.evaluate(() => { const o = []; document.querySelectorAll('[data-topic]').forEach(e => { const v = e.getAttribute('data-topic'); if (v && !o.includes(v)) o.push(v); }); return o; });
const rows = [];
for (const t of topics) {
  for (const pane of PANES) {
    await p.goto(BASE + '#' + t + '/' + pane, { waitUntil: 'load' });
    await p.waitForTimeout(85);
    const m = await p.evaluate(() => {
      const stage = document.querySelector('.stage');
      const pn = document.querySelector('.pane.on');
      // metric A: stage-level scroll overflow (the original lens's metric)
      const stageOver = stage.scrollWidth - stage.clientWidth;
      // metric C: any descendant (incl. shadow) with ink overflow scrollWidth>clientWidth
      const acc = [];
      const walk = n => { for (const c of (n.children || [])) { acc.push(c); if (c.shadowRoot) walk(c.shadowRoot); walk(c); } };
      walk(pn);
      let inkMax = 0, inkCount = 0, inkWorst = null;
      for (const e of acc) {
        const d = e.scrollWidth - e.clientWidth;
        if (d > 1 && e.getBoundingClientRect().width > 0) {
          inkCount++;
          if (d > inkMax) { inkMax = d; inkWorst = { cls: (typeof e.className === 'string' ? e.className : e.tagName), d, txt: (e.textContent || '').trim().slice(0, 45) }; }
        }
      }
      return { stageOver, inkCount, inkMax, inkWorst };
    });
    rows.push({ topic: t, pane, ...m });
  }
}
const byPaneA = {}, byPaneC = {};
for (const pane of PANES) {
  const rs = rows.filter(r => r.pane === pane);
  const a = rs.filter(r => r.stageOver > 0);
  const c = rs.filter(r => r.inkMax > 1);
  byPaneA[pane] = { n: a.length, max: a.length ? Math.max(...a.map(r => r.stageOver)) : 0, worst: a.sort((x, y) => y.stageOver - x.stageOver)[0] };
  byPaneC[pane] = { n: c.length, max: c.length ? Math.max(...c.map(r => r.inkMax)) : 0, worst: c.sort((x, y) => y.inkMax - x.inkMax)[0] };
}
console.log('\n=== METRIC A: .stage scrollWidth > clientWidth (the ORIGINAL LENS metric) @360 ===');
console.log('   total states with stage overflow:', rows.filter(r => r.stageOver > 0).length, '/', rows.length);
for (const pane of PANES) { const v = byPaneA[pane]; console.log(`   ${pane.padEnd(6)} ${String(v.n).padStart(2)}/46  max +${v.max}px  ${v.worst ? 'worst=' + v.worst.topic : ''}`); }
console.log('\n=== METRIC C: descendant ink overflow (scrollWidth>clientWidth) @360 ===');
for (const pane of PANES) { const v = byPaneC[pane]; console.log(`   ${pane.padEnd(6)} ${String(v.n).padStart(2)}/46  max +${v.max}px  ${v.worst ? `worst=${v.worst.topic} [${v.worst.inkWorst.cls}] "${v.worst.inkWorst.txt}"` : ''}`); }
out.byPaneA = byPaneA; out.byPaneC = byPaneC;
out.totalA = rows.filter(r => r.stageOver > 0).length;
out.rows = rows;

// ---- PIVOT chips, correct shadow query ----
const pivBreadth = [];
for (const t of topics) {
  await p.goto(BASE + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(90);
  const r = await p.evaluate(() => {
    const pn = document.getElementById('sys');
    const host = [...pn.querySelectorAll('*')].find(e => e.shadowRoot);
    if (!host) return { pivots: 0, err: 'no shadow host' };
    const root = host.shadowRoot;
    const pivs = [...root.querySelectorAll('.piv')];
    let worst = 0, worstPct = 0, worstTxt = '', paEmpty = 0;
    for (const pv of pivs) {
      const chip = pv.querySelector('.chip'), pa = pv.querySelector('.pa');
      if (!chip) continue;
      const cw = chip.getBoundingClientRect().width, pw = pv.getBoundingClientRect().width;
      const clip = cw - pw;
      if (clip > worst) { worst = clip; worstPct = 100 * clip / cw; worstTxt = chip.textContent.trim().slice(0, 60); }
      const jump = pa ? pa.querySelector('.piv-jump') : null;
      let paT = pa ? pa.textContent.trim() : '';
      if (jump) paT = paT.replace(jump.textContent.trim(), '').trim();
      if (paT.length === 0) paEmpty++;
    }
    return { pivots: pivs.length, worstClip: +worst.toFixed(1), worstPct: +worstPct.toFixed(1), worstTxt, paEmpty, pivOverflow: pivs[0] ? getComputedStyle(pivs[0]).overflow : null, chipFlex: pivs[0] && pivs[0].querySelector('.chip') ? getComputedStyle(pivs[0].querySelector('.chip')).flex : null };
  });
  pivBreadth.push({ topic: t, ...r });
}
const pivBad = pivBreadth.filter(r => r.worstClip > 1);
const paEmptyT = pivBreadth.filter(r => r.paEmpty > 0);
console.log('\n=== PIVOT CHIP (sys) BREADTH @360, 46 topics ===');
console.log('   topics with a CLIPPED pivot chip:', pivBad.length, '/', pivBreadth.length);
console.log('   topics with >=1 EMPTY .pa body  :', paEmptyT.length, '/', pivBreadth.length);
console.log('   piv overflow:', pivBreadth[0].pivOverflow, '| chip flex:', pivBreadth[0].chipFlex);
console.log('   worst 6:');
pivBreadth.sort((a, b) => b.worstClip - a.worstClip).slice(0, 6).forEach(r => console.log(`     ${r.topic.padEnd(28)} clip=+${r.worstClip}px (${r.worstPct}% hidden) paEmpty=${r.paEmpty}/${r.pivots}  "${r.worstTxt}"`));
out.pivBreadth = pivBreadth;
out.pivSummary = { clipped: pivBad.length, paEmpty: paEmptyT.length, total: pivBreadth.length };

// api-design/sys explicit numbers (the lens's exact claim: 1804.7px chip in 284px .piv = 1601.5px / 89%)
await p.goto(BASE + '#api-design/sys', { waitUntil: 'load' });
await p.waitForTimeout(500);
const apiSys = await p.evaluate(() => {
  const pn = document.getElementById('sys');
  const host = [...pn.querySelectorAll('*')].find(e => e.shadowRoot);
  const root = host.shadowRoot;
  return [...root.querySelectorAll('.piv')].map(pv => {
    const chip = pv.querySelector('.chip'), pa = pv.querySelector('.pa'), jump = pa ? pa.querySelector('.piv-jump') : null;
    let paT = pa ? pa.textContent.trim() : ''; if (jump) paT = paT.replace(jump.textContent.trim(), '').trim();
    const cw = chip.getBoundingClientRect().width, pw = pv.getBoundingClientRect().width;
    return { chipW: +cw.toFixed(1), pivW: +pw.toFixed(1), hidden: +(cw - pw).toFixed(1), pct: +(100 * (cw - pw) / cw).toFixed(1), chipChars: chip.textContent.trim().length, chip: chip.textContent.trim().slice(0, 100), paLen: paT.length, paSample: paT.slice(0, 60), hasJump: !!jump };
  });
});
console.log('\n=== api-design/sys chips @360 (lens claimed chipW=1804.7, pivW=284, 1601.5px/89% hidden, paEmpty=true) ===');
apiSys.forEach((v, i) => console.log(`  [${i}] chipW=${v.chipW} pivW=${v.pivW} hidden=${v.hidden}px (${v.pct}%) chars=${v.chipChars} paLen=${v.paLen} hasJump=${v.hasJump}\n       chip="${v.chip}"\n       pa="${v.paSample}"`));
out.apiSys = apiSys;
await p.screenshot({ path: SHOTS + '/v-sys-chip-360.png' });
await ctx.close();
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v7-clip2.json', JSON.stringify(out, null, 1));
await b.close();
