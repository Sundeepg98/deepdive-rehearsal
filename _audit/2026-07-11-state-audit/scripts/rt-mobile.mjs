import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { PROBE } from './rt-mobile-lib.mjs';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const SHOTS = `${OUT}/shots/rt-mobile`;
mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },   // stress floor (iPhone SE 1)
  { name: '360x640', width: 360, height: 640 },   // common Android
  { name: '390x844', width: 390, height: 844 },   // iPhone 12/13/14
  { name: '414x896', width: 414, height: 896 }    // iPhone XR/11
];
const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const TOPICS = ['content-pipeline', 'kafka-internals', 'sharding-strategies', 'api-design', 'observability'];

const results = [];
const errors = [];

const b = await chromium.launch();

for (const vp of VIEWPORTS) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') errors.push({ vp: vp.name, type: 'console', msg: m.text() }); });
  p.on('pageerror', e => errors.push({ vp: vp.name, type: 'pageerror', msg: e.message }));

  for (const topic of TOPICS) {
    for (const pane of PANES) {
      const hash = `#${topic}/${pane}`;
      await p.goto(URL + hash, { waitUntil: 'load' });
      await p.waitForTimeout(950);  // let entry animations settle (no reduced-motion: audit what users see)

      // confirm the pane actually switched
      const active = await p.evaluate(() => {
        const on = document.querySelector('.pane.on');
        const seg = document.querySelector('.seg button.on');
        return { pane: on?.id, tab: seg?.dataset.tab, topic: typeof TopicRegistry !== 'undefined' ? TopicRegistry.current()?.id : null };
      });
      if (active.pane !== pane || active.topic !== topic) {
        errors.push({ vp: vp.name, type: 'nav', msg: `asked ${topic}/${pane}, got ${active.topic}/${active.pane}` });
      }

      const m = await p.evaluate(PROBE);
      results.push({ vp: vp.name, topic, pane, active, ...m });
      process.stdout.write('.');
    }
  }
  await ctx.close();
}
await b.close();

writeFileSync(`${OUT}/rt-mobile-raw.json`, JSON.stringify({ results, errors }, null, 2));
console.log('\n\n================ SUMMARY ================');
console.log('measurements:', results.length, '| console/page errors:', errors.length);
if (errors.length) console.log('ERRORS:', JSON.stringify(errors.slice(0, 10), null, 2));

// ---- horizontal overflow ----
const hOver = results.filter(r => r.hOverflow > 0);
console.log(`\n--- HORIZONTAL OVERFLOW: ${hOver.length}/${results.length} states ---`);
for (const r of hOver.slice(0, 20)) {
  console.log(`  ${r.vp} ${r.topic}/${r.pane}: scrollW-clientW = +${r.hOverflow}px`);
  for (const o of r.offenders.slice(0, 3)) console.log(`      ^ ${o.sel} | right=${o.right} (vw=${r.vw}) over=+${o.overRight} w=${o.w} pos=${o.pos}`);
}

// ---- bar occlusion ----
console.log(`\n--- FIXED-BAR OCCLUSION (bar height vs .app padding) ---`);
const byVp = {};
for (const r of results) {
  (byVp[r.vp] ||= []).push(r);
}
for (const [vp, rs] of Object.entries(byVp)) {
  const worstTop = Math.max(...rs.map(r => r.bars.topOcclusion));
  const worstBot = Math.max(...rs.map(r => r.bars.bottomOcclusion));
  const segH = [...new Set(rs.map(r => r.bars.segH))];
  const ctaH = [...new Set(rs.map(r => r.bars.ctaH))];
  console.log(`  ${vp}: segH=${segH} padTop=${rs[0].bars.appPadTop} -> topOcclusion=${worstTop}px | ctaH=${ctaH} padBot=${rs[0].bars.appPadBottom} -> bottomOcclusion=${worstBot}px`);
}

// ---- tap targets ----
console.log(`\n--- TAP TARGETS < 44x44 (WCAG 2.5.5) ---`);
const tapAgg = {};
for (const r of results) {
  for (const t of r.under44) {
    const k = `${r.vp}|${t.sel}`;
    if (!tapAgg[k] || t.min < tapAgg[k].min) tapAgg[k] = { vp: r.vp, ...t, where: `${r.topic}/${r.pane}` };
  }
}
const tapList = Object.values(tapAgg).sort((a, b) => a.min - b.min);
console.log(`  distinct undersized targets: ${tapList.length}`);
for (const t of tapList.slice(0, 30)) console.log(`  ${t.vp} ${t.w}x${t.h}  ${t.sel}  "${t.txt}"  [${t.where}]`);

// ---- small text ----
console.log(`\n--- TEXT < 12px ---`);
const smallAgg = {};
for (const r of results) for (const s of r.small) {
  const k = `${s.sel}|${s.fs}`;
  if (!smallAgg[k]) smallAgg[k] = { ...s, where: `${r.vp} ${r.topic}/${r.pane}` };
}
const smallList = Object.values(smallAgg).sort((a, b) => a.fs - b.fs);
console.log(`  distinct <12px text elements: ${smallList.length}`);
for (const s of smallList.slice(0, 20)) console.log(`  ${s.fs}px  ${s.sel}  "${s.txt}"  [${s.where}]`);

// ---- box overflow (tables/diagrams/code) ----
console.log(`\n--- CONTAINER OVERFLOW (scrollW > clientW) ---`);
const boxAgg = {};
for (const r of results) for (const o of r.boxOverflow) {
  const k = `${r.vp}|${o.sel}|${o.kind}`;
  if (!boxAgg[k] || o.over > boxAgg[k].over) boxAgg[k] = { vp: r.vp, ...o, where: `${r.topic}/${r.pane}` };
}
const boxList = Object.values(boxAgg).sort((a, b) => b.over - a.over);
const clipped = boxList.filter(o => o.kind === 'CLIPPED');
const leaks = boxList.filter(o => o.kind === 'LEAKS');
console.log(`  CLIPPED (content cut off): ${clipped.length} | LEAKS (overflow visible): ${leaks.length} | scrollable(ok): ${boxList.length - clipped.length - leaks.length}`);
for (const o of [...clipped, ...leaks].slice(0, 20)) console.log(`  [${o.kind}] ${o.vp} over=+${o.over}px ox=${o.ox} ${o.sel} [${o.where}]`);

// ---- mockbar regression ----
console.log(`\n--- MOCKBAR (RCA root-cause-3 regression check) ---`);
const mb = results[0].bars.mockbar;
console.log(JSON.stringify(mb, null, 2));

// ---- vertical phantom ----
console.log(`\n--- VERTICAL: phantom slack below last content (px) ---`);
for (const [vp, rs] of Object.entries(byVp)) {
  const ph = rs.map(r => r.vScroll.phantom);
  console.log(`  ${vp}: min=${Math.min(...ph).toFixed(1)} max=${Math.max(...ph).toFixed(1)} (appPadBottom=${rs[0].bars.appPadBottom})`);
}
console.log('\nraw -> _audit/2026-07-11-state-audit/rt-mobile-raw.json');
