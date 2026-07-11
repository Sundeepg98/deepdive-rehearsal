import { chromium } from 'playwright';
import fs from 'fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/verify-rt-mobile';
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const out = {};
const b = await chromium.launch();

const MEASURE = () => {
  // walk into shadow roots
  function allEls(root, acc) {
    acc = acc || [];
    const walk = (n) => {
      if (!n) return;
      const kids = n.children || [];
      for (const c of kids) {
        acc.push(c);
        if (c.shadowRoot) walk(c.shadowRoot);
        walk(c);
      }
    };
    walk(root);
    return acc;
  }
  const stage = document.querySelector('.stage');
  const sr = stage.getBoundingClientRect();
  const csStage = getComputedStyle(stage);
  const padR = parseFloat(csStage.paddingRight) || 0, padL = parseFloat(csStage.paddingLeft) || 0;
  const contentRight = sr.right - padR;
  const pane = document.querySelector('.pane.on');
  if (!pane) return { err: 'no active pane' };
  const els = allEls(pane);
  const over = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const spill = r.right - contentRight;
    if (spill > 1) {
      const cs = getComputedStyle(e);
      over.push({
        cls: (typeof e.className === 'string' ? e.className : '') || e.tagName,
        tag: e.tagName,
        right: +r.right.toFixed(1), spill: +spill.toFixed(1), w: +r.width.toFixed(1),
        ws: cs.whiteSpace, ovf: cs.overflowX,
        txt: (e.textContent || '').trim().slice(0, 60)
      });
    }
  }
  over.sort((a, b) => b.spill - a.spill);
  return {
    paneId: pane.id,
    stageCW: stage.clientWidth, stageSW: stage.scrollWidth,
    stageOverflow: stage.scrollWidth - stage.clientWidth,
    stageOvfX: csStage.overflowX,
    contentRight: +contentRight.toFixed(1),
    spillCount: over.length,
    maxSpill: over.length ? over[0].spill : 0,
    top: over.slice(0, 4)
  };
};

// ---- 46 topics x 9 panes at 360, overlay suppressed ----
const ctx = await b.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto(BASE + '#api-design/walk', { waitUntil: 'load' });
await p.waitForTimeout(800);
const topics = await p.evaluate(() => { const o = []; document.querySelectorAll('[data-topic]').forEach(e => { const v = e.getAttribute('data-topic'); if (v && !o.includes(v)) o.push(v); }); return o; });
console.log('topics:', topics.length);

const rows = [];
for (const t of topics) {
  for (const pane of PANES) {
    await p.goto(BASE + '#' + t + '/' + pane, { waitUntil: 'load' });
    await p.waitForTimeout(90);
    const m = await p.evaluate(MEASURE);
    rows.push({ topic: t, pane, ...m });
  }
}
const clipped = rows.filter(r => r.spillCount > 0);
const byPane = {};
for (const pane of PANES) {
  const c = clipped.filter(r => r.pane === pane);
  byPane[pane] = { topicsClipped: c.length, maxSpill: c.length ? Math.max(...c.map(r => r.maxSpill)) : 0, worst: c.sort((a, b) => b.maxSpill - a.maxSpill)[0] };
}
console.log('\n=== CONTENT SPILL PAST .stage CONTENT EDGE @360 (46 topics x 9 panes = ' + rows.length + ' states) ===');
console.log('total clipped states:', clipped.length);
for (const pane of PANES) {
  const v = byPane[pane];
  console.log(`  ${pane.padEnd(6)} ${String(v.topicsClipped).padStart(2)}/46 topics  maxSpill +${v.maxSpill}px  ${v.worst ? `worst=${v.worst.topic} [${v.worst.top[0].cls}] "${v.worst.top[0].txt.slice(0,40)}"` : ''}`);
}
out.byPane = byPane; out.totalClipped = clipped.length; out.totalStates = rows.length;
out.clippedRows = clipped.map(r => ({ topic: r.topic, pane: r.pane, maxSpill: r.maxSpill, stageOverflow: r.stageOverflow, top: r.top }));

// ---- api-design/num detail ----
await p.goto(BASE + '#api-design/num', { waitUntil: 'load' });
await p.waitForTimeout(500);
const numDetail = await p.evaluate(MEASURE);
console.log('\n=== api-design/num @360 DETAIL ===');
console.log(JSON.stringify(numDetail, null, 1));
out.numDetail = numDetail;
await p.screenshot({ path: SHOTS + '/v-num-clip-360.png' });

// ---- stream-batch-processing/walk detail (worst walk) ----
await p.goto(BASE + '#stream-batch-processing/walk', { waitUntil: 'load' });
await p.waitForTimeout(500);
const walkDetail = await p.evaluate(MEASURE);
console.log('\n=== stream-batch-processing/walk @360 DETAIL ===');
console.log(JSON.stringify(walkDetail, null, 1));
out.walkDetail = walkDetail;
await p.screenshot({ path: SHOTS + '/v-walk-clip-360.png' });

// ---- PIVOT CHIP (F6): api-design/sys ----
await p.goto(BASE + '#api-design/sys', { waitUntil: 'load' });
await p.waitForTimeout(600);
const piv = await p.evaluate(() => {
  const host = document.querySelector('#sys');
  const root = host.shadowRoot || host;
  const pivs = [...root.querySelectorAll('.piv')];
  return pivs.map(pv => {
    const chip = pv.querySelector('.chip');
    const pa = pv.querySelector('.pa');
    const pq = pv.querySelector('.pq');
    const cr = chip ? chip.getBoundingClientRect() : null;
    const pr = pv.getBoundingClientRect();
    const jump = pa ? pa.querySelector('.piv-jump') : null;
    const paText = pa ? pa.textContent.trim() : '';
    const paTextNoJump = jump ? paText.replace(jump.textContent.trim(), '').trim() : paText;
    return {
      chipW: cr ? +cr.width.toFixed(1) : null,
      pivW: +pr.width.toFixed(1),
      clippedPx: cr ? +(cr.width - pr.width).toFixed(1) : null,
      pctHidden: cr ? +(100 * Math.max(0, cr.width - pr.width) / cr.width).toFixed(1) : null,
      chipLen: chip ? chip.textContent.trim().length : 0,
      chipText: chip ? chip.textContent.trim().slice(0, 90) : '',
      pivOverflow: getComputedStyle(pv).overflow,
      chipFlex: chip ? getComputedStyle(chip).flex : null,
      chipWS: chip ? getComputedStyle(chip).whiteSpace : null,
      paEmpty: paTextNoJump.length === 0,
      paTextLen: paTextNoJump.length,
      paSample: paTextNoJump.slice(0, 70),
      hasJump: !!jump
    };
  });
});
console.log('\n=== api-design/sys PIVOT CHIPS @360 ===');
piv.forEach((v, i) => console.log(`  piv[${i}] chipW=${v.chipW} pivW=${v.pivW} clipped=${v.clippedPx}px (${v.pctHidden}%) chipLen=${v.chipLen} paEmpty=${v.paEmpty} paLen=${v.paTextLen} hasJump=${v.hasJump}\n            chip="${v.chipText}"\n            pa  ="${v.paSample}"`));
out.piv360 = piv;
await p.screenshot({ path: SHOTS + '/v-piv-chip-360.png' });

// breadth: how many topics have a clipped pivot chip?
const pivBreadth = [];
for (const t of topics) {
  await p.goto(BASE + '#' + t + '/sys', { waitUntil: 'load' });
  await p.waitForTimeout(90);
  const r = await p.evaluate(() => {
    const host = document.querySelector('#sys'); const root = host.shadowRoot || host;
    const pivs = [...root.querySelectorAll('.piv')];
    let worst = 0, worstPct = 0, anyPaEmpty = 0, n = pivs.length;
    for (const pv of pivs) {
      const chip = pv.querySelector('.chip'); const pa = pv.querySelector('.pa');
      if (!chip) continue;
      const cw = chip.getBoundingClientRect().width, pw = pv.getBoundingClientRect().width;
      const clip = cw - pw;
      if (clip > worst) { worst = clip; worstPct = 100 * clip / cw; }
      const jump = pa ? pa.querySelector('.piv-jump') : null;
      const paText = pa ? pa.textContent.trim() : '';
      const paNo = jump ? paText.replace(jump.textContent.trim(), '').trim() : paText;
      if (paNo.length === 0) anyPaEmpty++;
    }
    return { pivots: n, worstClip: +worst.toFixed(1), worstPct: +worstPct.toFixed(1), paEmptyCount: anyPaEmpty };
  });
  pivBreadth.push({ topic: t, ...r });
}
const pivBad = pivBreadth.filter(r => r.worstClip > 1);
const paEmptyTopics = pivBreadth.filter(r => r.paEmptyCount > 0);
console.log('\n=== PIVOT CHIP BREADTH (46 topics, sys pane) ===');
console.log('  topics with a clipped pivot chip:', pivBad.length, '/', pivBreadth.length);
console.log('  topics with >=1 EMPTY .pa       :', paEmptyTopics.length, '/', pivBreadth.length);
console.log('  worst 5:', JSON.stringify(pivBreadth.sort((a, b) => b.worstClip - a.worstClip).slice(0, 5).map(r => ({ t: r.topic, clip: r.worstClip, pct: r.worstPct }))));
out.pivBreadth = pivBreadth;
out.pivSummary = { clippedTopics: pivBad.length, paEmptyTopics: paEmptyTopics.length, total: pivBreadth.length };
await ctx.close();

// ---- DESKTOP control: does num/walk/piv clip at 1440 too? ----
const c2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await c2.newPage();
const deskChecks = {};
for (const [t, pane] of [['api-design', 'num'], ['stream-batch-processing', 'walk'], ['api-design', 'sys']]) {
  await p2.goto(BASE + '#' + t + '/' + pane, { waitUntil: 'load' });
  await p2.waitForTimeout(500);
  deskChecks[t + '/' + pane] = await p2.evaluate(MEASURE);
}
console.log('\n=== DESKTOP 1440 control ===');
for (const k in deskChecks) { const d = deskChecks[k]; console.log(`  ${k.padEnd(30)} stageCW=${d.stageCW} stageSW=${d.stageSW} stageOverflow=${d.stageOverflow} spillCount=${d.spillCount} maxSpill=+${d.maxSpill}px`); if (d.top && d.top[0]) console.log(`      worst: [${d.top[0].cls}] +${d.top[0].spill}px "${d.top[0].txt.slice(0,50)}"`); }
out.desk = deskChecks;
await c2.close();

fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/v6-clip.json', JSON.stringify(out, null, 1));
await b.close();
