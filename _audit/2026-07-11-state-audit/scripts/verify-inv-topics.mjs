// ADVERSARIAL RE-VERIFICATION of the inv-topics lens.
// Independently re-measures every runtime claim. Does NOT reuse the original lens's scripts.
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const LEGACY = ['content-pipeline','signing','authz','aws-hardening','notifications','eav','desired-state','iac'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);

// ---------- 1. REGISTRY CENSUS (independent) ----------
const census = await p.evaluate((LEGACY) => {
  const ids = TopicRegistry.ids();
  const order = (typeof TOPIC_ORDER !== 'undefined') ? TOPIC_ORDER : null;
  const rows = ids.map(id => {
    const t = TopicRegistry.get(id), d = t.data, idn = t.identity;
    const tiers = {};
    (d.drill.cards || []).forEach(c => { tiers[c.tier] = (tiers[c.tier] || 0) + 1; });
    const pivots = d.sys.pivots || [];
    return {
      id, title: idn.title, group: idn.group, index: idn.index,
      total: idn.total,
      src: LEGACY.includes(id) ? 'legacy' : 'markdown',
      drillCards: (d.drill.cards || []).length,
      tiers,
      walkSteps: (d.walk.steps || []).length,
      wbSteps: (d.wb.steps || []).length,
      sysStages: (d.sys.stages || []).length,
      sysPivots: pivots.length,
      pivotsWithAnswer: pivots.filter(x => x.a && x.a.trim().length).length,
      maxChipLen: pivots.reduce((m, x) => Math.max(m, (x.chip || '').length), 0),
      maxALen: pivots.reduce((m, x) => Math.max(m, (x.a || '').length), 0),
      chipHasNewline: pivots.some(x => (x.chip || '').includes('\n')),
      tradeDecisions: (d.trade.decisions || []).length,
      modelAnswers: (d.model.answers || []).length,
      numInputs: (d.num.inputs || []).length,
      numShape: ['compute','inputs','lead','tell'].filter(k => d.num[k] !== undefined && d.num[k] !== null).length,
      rfFlags: (d.rf.flags || []).length,
      openCards: (d.open.cards || []).length,
      openKinds: (d.open.cards || []).map(c => c.kind).join('+'),
      curveballs: (d.bank.curveballs || []).length,
      mockBeats: (d.bank.mockBeats || []).length,
      cmpKeys: Object.keys(idn.cmpNotes || {}),
      hasVisual: !!d.visual,
      wbDiagram: !!(d.wb.diagram || d.wb.mermaid),
      slicesPresent: ['walk','drill','wb','sys','trade','model','num','rf','open','bank'].filter(v => !!d[v]).length,
    };
  });
  return { n: ids.length, orderN: order ? order.length : null, rows };
}, LEGACY);

console.log('=== REGISTRY CENSUS ===');
console.log('topics registered :', census.n);
console.log('TOPIC_ORDER length:', census.orderN);
console.log('page/console errors:', errs.length, errs.slice(0, 5));

const md = census.rows.filter(r => r.src === 'markdown');
const lg = census.rows.filter(r => r.src === 'legacy');
console.log('markdown:', md.length, ' legacy:', lg.length);

const mean = (a, k) => (a.reduce((s, r) => s + r[k], 0) / a.length).toFixed(1);
console.log('\n=== PER-CLASS MEANS (independent re-measure) ===');
console.log('slice            legacy(n=' + lg.length + ')  markdown(n=' + md.length + ')');
for (const k of ['drillCards','walkSteps','wbSteps','sysStages','sysPivots','tradeDecisions','modelAnswers','numInputs','rfFlags','openCards','curveballs','mockBeats']) {
  console.log(k.padEnd(16), String(mean(lg, k)).padStart(6), String(mean(md, k)).padStart(10));
}

console.log('\n=== HARD ASSERTIONS ===');
console.log('markdown topics with sysStages===0 :', md.filter(r => r.sysStages === 0).length, '/', md.length);
console.log('legacy   topics with sysStages===0 :', lg.filter(r => r.sysStages === 0).length, '/', lg.length);
console.log('legacy   sysStages values          :', [...new Set(lg.map(r => r.sysStages))]);
console.log('TOTAL pivots (markdown)            :', md.reduce((s, r) => s + r.sysPivots, 0));
console.log('markdown pivots WITH answer        :', md.reduce((s, r) => s + r.pivotsWithAnswer, 0));
console.log('legacy   pivots WITH answer        :', lg.reduce((s, r) => s + r.pivotsWithAnswer, 0), 'of', lg.reduce((s, r) => s + r.sysPivots, 0));
console.log('markdown chips containing newline  :', md.filter(r => r.chipHasNewline).length, '/', md.length);
console.log('markdown max chip len (range)      :', Math.min(...md.map(r => r.maxChipLen)), '-', Math.max(...md.map(r => r.maxChipLen)));
console.log('legacy   max chip len (range)      :', Math.min(...lg.map(r => r.maxChipLen)), '-', Math.max(...lg.map(r => r.maxChipLen)));
console.log('markdown openCards===1             :', md.filter(r => r.openCards === 1).length, '/', md.length);
console.log('legacy   openCards===2             :', lg.filter(r => r.openCards === 2).length, '/', lg.length);
console.log('legacy openKinds sample            :', lg[0].openKinds);
console.log('markdown openKinds sample          :', md[0].openKinds);
console.log('markdown cmpKeys (distinct sets)   :', JSON.stringify([...new Set(md.map(r => r.cmpKeys.join(',')))]));
console.log('legacy   cmpKeys (distinct sets)   :', JSON.stringify([...new Set(lg.map(r => r.cmpKeys.join(',')))]));
console.log('topics with visual                 :', census.rows.filter(r => r.hasVisual).map(r => r.id));
console.log('all 10 slices present on all 46    :', census.rows.every(r => r.slicesPresent === 10));
console.log('num has all 4 shape keys on all 46 :', census.rows.every(r => r.numShape === 4));
console.log('wb diagram present on all 46       :', census.rows.every(r => r.wbDiagram));
console.log('identity.total distinct values     :', JSON.stringify([...new Set(census.rows.map(r => r.total))]));

// tier splits
const tierStr = r => ['SDE2','SDE3','Staff','EXTEND'].map(t => r.tiers[t] || 0).join('/');
console.log('\n=== TIER SPLITS (SDE2/SDE3/Staff/EXTEND) ===');
console.log('markdown distinct:', JSON.stringify([...new Set(md.map(tierStr))]));
lg.forEach(r => console.log('  legacy', r.id.padEnd(18), tierStr(r)));
console.log('markdown all exactly 7/7/7/0:', md.every(r => tierStr(r) === '7/7/7/0'));
console.log('total drill cards:', census.rows.reduce((s, r) => s + r.drillCards, 0));

// groups
const groups = await p.evaluate(() => TOPIC_GROUPS.map(g => g.id + ':' + g.label));
const gc = {};
census.rows.forEach(r => { gc[r.group] = (gc[r.group] || 0) + 1; });
console.log('\n=== GROUPS ===', JSON.stringify(gc), 'sum=', Object.values(gc).reduce((a, c) => a + c, 0), 'groupsDefined=', groups.length);

// ---------- 2. DOM-LEVEL SYS PANE (shadow DOM) ----------
async function sysDom(topic) {
  await p.evaluate(id => TopicRegistry.setTopic(id), topic);
  await p.evaluate(() => { const btn = document.querySelector('.sidebar .seg button[data-tab="sys"]'); if (btn) btn.click(); });
  await p.waitForTimeout(450);
  return await p.evaluate(() => {
    const el = document.querySelector('deep-system-map');
    const r = el.shadowRoot;
    const chain = r.getElementById('smChain');
    const stgs = r.querySelectorAll('.stg');
    const pivs = [...r.querySelectorAll('details.piv')];
    pivs.forEach(d => { d.open = true; });
    return {
      stgCount: stgs.length,
      chainH: chain.getBoundingClientRect().height,
      chainHTML: chain.innerHTML.length,
      whereHead: r.getElementById('smWhere').textContent,
      pivots: pivs.map(d => {
        const chip = d.querySelector('.chip'), pa = d.querySelector('.pa');
        const jump = d.querySelector('.piv-jump');
        return {
          q: d.querySelector('.pq').textContent.slice(0, 45),
          chipLen: chip ? chip.textContent.length : -1,
          chipScrollW: chip ? chip.scrollWidth : -1,
          chipClientW: chip ? chip.clientWidth : -1,
          cardW: Math.round(d.getBoundingClientRect().width),
          paLen: pa ? pa.textContent.trim().length : -1,
          paH: pa ? Math.round(pa.getBoundingClientRect().height) : -1,
          hasJump: !!jump,
          jumpLabelLen: jump ? jump.textContent.length : 0,
          jumpTarget: jump ? jump.getAttribute('data-goto') : null,
        };
      }),
    };
  });
}

console.log('\n=== SYS PANE DOM ===');
for (const t of ['caching', 'content-pipeline', 'saga', 'rate-limiting']) {
  const d = await sysDom(t);
  const cls = LEGACY.includes(t) ? 'LEGACY  ' : 'markdown';
  console.log(`${cls} ${t.padEnd(18)} .stg=${d.stgCount}  #smChain h=${Math.round(d.chainH)}px  innerHTML=${d.chainHTML}ch  head="${d.whereHead}"`);
  d.pivots.forEach((pv, i) => {
    console.log(`    piv${i + 1} chip=${pv.chipLen}ch (scrollW ${pv.chipScrollW}px in card ${pv.cardW}px)  .pa=${pv.paLen}ch h=${pv.paH}px  jump=${pv.hasJump ? 'YES->' + pv.jumpTarget + ' (label ' + pv.jumpLabelLen + 'ch)' : 'no'}`);
  });
  await p.screenshot({ path: `${OUT}/shots/verify-inv-topics/sys-${t}.png` });
}

// ---------- 3. SPURIOUS JUMP-BUTTON SWEEP (NEW - not in original lens) ----------
console.log('\n=== SPURIOUS piv-jump SWEEP across all 38 markdown topics ===');
const spurious = [];
for (const r of md) {
  await p.evaluate(id => TopicRegistry.setTopic(id), r.id);
  await p.evaluate(() => { const btn = document.querySelector('.sidebar .seg button[data-tab="sys"]'); if (btn) btn.click(); });
  await p.waitForTimeout(120);
  const j = await p.evaluate(() => {
    const r2 = document.querySelector('deep-system-map').shadowRoot;
    return [...r2.querySelectorAll('.piv-jump')].map(x => ({
      len: x.textContent.length, target: x.getAttribute('data-goto'), label: x.textContent.slice(0, 60),
    }));
  });
  if (j.length) spurious.push({ id: r.id, jumps: j });
}
console.log('markdown topics rendering a .piv-jump button:', spurious.length, '/', md.length);
spurious.forEach(s => s.jumps.forEach(j => console.log(`  ${s.id} -> ${j.target}  labelLen=${j.len}ch  "${j.label}..."`)));

// ---------- 4. CMPNOTE RAIL LEAK (independent repro) ----------
console.log('\n=== CMPNOTE RAIL: WRONG-TOPIC repro ===');
const railTxt = () => p.evaluate(() => {
  const v = document.getElementById('cmpView'), n = document.getElementById('cmpNote'), m = document.getElementById('cmpMove');
  return { view: v ? v.textContent : null, note: n ? n.textContent.slice(0, 90) : null, move: m ? m.textContent.slice(0, 70) : null };
});
const goto = async (topic, tab) => {
  await p.evaluate(id => TopicRegistry.setTopic(id), topic);
  await p.evaluate(t => { const btn = document.querySelector(`.sidebar .seg button[data-tab="${t}"]`); if (btn) btn.click(); }, tab);
  await p.waitForTimeout(300);
};
await goto('content-pipeline', 'sys');
const railA = await railTxt();
console.log('AT content-pipeline/sys :', JSON.stringify(railA));
await p.evaluate(() => TopicRegistry.setTopic('caching'));  // switch topic, STAY on sys
await p.waitForTimeout(400);
const railB = await railTxt();
console.log('AT caching/sys (switched):', JSON.stringify(railB));
const headerTopic = await p.evaluate(() => document.querySelector('.hdr h1').textContent);
console.log('header now reads         :', headerTopic);
console.log('>> RAIL UNCHANGED AFTER TOPIC SWITCH:', JSON.stringify(railA) === JSON.stringify(railB));
await p.screenshot({ path: `${OUT}/shots/verify-inv-topics/cmpleak-caching-sys.png` });

console.log('\n=== CMPNOTE RAIL: WRONG-PANE sweep (markdown topics, 7 uncovered panes) ===');
const PANES = ['walk','drill','wb','sys','trade','model','num','rf','open'];
let wrongPane = 0, totalChecked = 0;
const sample = ['caching','saga','slos','api-design','rate-limiting'];
for (const t of sample) {
  await goto(t, 'walk');           // land on a COVERED pane first
  const base = await railTxt();
  for (const pane of PANES) {
    await p.evaluate(x => { const btn = document.querySelector(`.sidebar .seg button[data-tab="${x}"]`); if (btn) btn.click(); }, pane);
    await p.waitForTimeout(150);
    const rt = await railTxt();
    const expected = await p.evaluate(x => (TOPIC_CMP_NOTES[x] ? TOPIC_CMP_NOTES[x][0] : null), pane);
    totalChecked++;
    const ok = expected !== null ? rt.view === expected : false;
    if (!ok) { wrongPane++; if (wrongPane <= 8) console.log(`  MISMATCH ${t}/${pane}: rail shows "${rt.view}" (topic has no cmpNote for this pane; expected=${expected})`); }
  }
}
console.log(`>> pane-views where rail does NOT match the pane: ${wrongPane} / ${totalChecked}`);

// ---------- 5. OPEN PANE DOM ----------
console.log('\n=== OPEN PANE (.op elements) ===');
for (const t of ['caching', 'content-pipeline']) {
  await goto(t, 'open');
  const n = await p.evaluate(() => {
    const el = document.querySelector('deep-opener');
    return el ? el.shadowRoot.querySelectorAll('.op').length : -1;
  });
  console.log(`  ${t.padEnd(18)} .op count = ${n}`);
  await p.screenshot({ path: `${OUT}/shots/verify-inv-topics/open-${t}.png` });
}

// ---------- 6. VIZ TAB ----------
const viz = await p.evaluate(async () => {
  const out = [];
  for (const id of TopicRegistry.ids()) {
    TopicRegistry.setTopic(id);
    await new Promise(r => setTimeout(r, 12));
    const btn = document.querySelector('.sidebar .seg button[data-tab="viz"]');
    out.push({ id, hidden: btn ? btn.hidden : 'no-btn' });
  }
  return out;
});
console.log('\n=== VIZ TAB ===');
console.log('viz visible on:', viz.filter(v => v.hidden === false).map(v => v.id));
console.log('viz hidden  on:', viz.filter(v => v.hidden === true).length, 'topics');

console.log('\n=== FINAL ERROR TALLY ===', errs.length, errs.slice(0, 8));

fs.writeFileSync(`${OUT}/verify-inv-topics.json`, JSON.stringify({ census, spurious, railA, railB, viz }, null, 2));
await b.close();
